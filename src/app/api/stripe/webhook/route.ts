import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/server/supabase/service";
import { provisionPhoneNumber } from "@/server/vapi";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.business_id;
      if (!businessId) break;

      await supabase
        .from("businesses")
        .update({
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
        })
        .eq("id", businessId);

      // Provision phone number and create Vapi assistant
      await provisionPhoneNumber(businessId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (business) {
        const status =
          sub.status === "active"
            ? "active"
            : sub.status === "past_due"
            ? "past_due"
            : "inactive";
        await supabase
          .from("businesses")
          .update({ subscription_status: status })
          .eq("id", business.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (business) {
        await supabase
          .from("businesses")
          .update({ subscription_status: "canceled" })
          .eq("id", business.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
