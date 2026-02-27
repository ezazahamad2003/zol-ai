/**
 * BACKEND: Checks Vapi for the assigned phone number and saves it to the DB.
 * Called from the dashboard when vapi_phone_number_id exists but phone_number is still null.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { getPhoneNumber } from "@/server/vapi";

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
    .select("id, vapi_phone_number_id, phone_number")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (business.phone_number) {
    return NextResponse.json({ ready: true, phone_number: business.phone_number });
  }

  if (!business.vapi_phone_number_id) {
    return NextResponse.json({ ready: false, reason: "not_provisioned" });
  }

  try {
    const vapiNumber = await getPhoneNumber(business.vapi_phone_number_id);
    const number = vapiNumber.number ?? vapiNumber.phoneNumber ?? null;


    if (!number) {
      return NextResponse.json({ ready: false, reason: "pending" });
    }

    await supabase
      .from("businesses")
      .update({ phone_number: number })
      .eq("id", business.id);

    return NextResponse.json({ ready: true, phone_number: number });
  } catch (err) {
    console.error("[provision/status] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Check failed" },
      { status: 500 }
    );
  }
}
