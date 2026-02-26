import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/server/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId } = await request.json();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Create or retrieve Stripe customer
  let customerId = business.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { business_id: businessId, user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("businesses")
      .update({ stripe_customer_id: customerId })
      .eq("id", businessId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { business_id: businessId },
  });

  return NextResponse.json({ url: session.url });
}
