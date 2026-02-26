import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { BillingContent } from "./billing-content";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <BillingContent business={business} />
    </main>
  );
}
