import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (business) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Set up your AI receptionist
          </h1>
          <p className="text-gray-400">
            Tell us about your business so your AI knows how to answer calls.
          </p>
        </div>
        <OnboardingForm userId={user.id} />
      </div>
    </main>
  );
}
