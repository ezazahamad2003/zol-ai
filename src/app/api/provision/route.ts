/**
 * BACKEND: Provisions a Vapi phone number + assistant for the authenticated business.
 * Called after onboarding completes.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { provisionPhoneNumber } from "@/server/vapi";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Business not found", detail: bizError?.message },
      { status: 404 }
    );
  }

  if (business.phone_number) {
    return NextResponse.json({ success: true, alreadyProvisioned: true });
  }

  try {
    const fields = await provisionPhoneNumber(business);

    const { error: updateError } = await supabase
      .from("businesses")
      .update(fields)
      .eq("id", business.id);

    if (updateError) {
      console.error("[provision] DB update failed:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, fields });
  } catch (err) {
    console.error("[provision] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provisioning failed" },
      { status: 500 }
    );
  }
}
