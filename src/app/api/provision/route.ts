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

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  try {
    await provisionPhoneNumber(business.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Provisioning error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provisioning failed" },
      { status: 500 }
    );
  }
}
