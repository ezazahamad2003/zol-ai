import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/server/supabase/server";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
    .select("stripe_customer_id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
