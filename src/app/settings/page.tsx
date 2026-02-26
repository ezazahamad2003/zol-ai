import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { SettingsForm } from "./settings-form";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Calendar, CheckCircle, AlertCircle } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
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

  const { data: calendarToken } = await supabase
    .from("google_calendar_tokens")
    .select("id, calendar_id")
    .eq("business_id", business.id)
    .single();

  const params = await searchParams;
  const connected = params.connected === "true";
  const hasError = params.error;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 mb-8">
            Update your business details and calendar connection.
          </p>

          {connected && (
            <div className="flex items-center gap-2 bg-green-950 border border-green-800 text-green-300 text-sm px-4 py-3 rounded-lg mb-6">
              <CheckCircle className="w-4 h-4" />
              Google Calendar connected successfully!
            </div>
          )}
          {hasError && (
            <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4" />
              Failed to connect calendar. Please try again.
            </div>
          )}

          {/* Calendar Connection */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-400" />
                <div>
                  <p className="font-medium text-white text-sm">Google Calendar</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {calendarToken
                      ? `Connected — ${calendarToken.calendar_id}`
                      : "Not connected — required for bookings"}
                  </p>
                </div>
              </div>
              <a
                href="/api/google/connect"
                className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
                  calendarToken
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-violet-600 hover:bg-violet-500 text-white"
                }`}
              >
                {calendarToken ? "Reconnect" : "Connect"}
              </a>
            </div>
          </div>

          {/* Business Settings */}
          <SettingsForm business={business} />
        </div>
      </main>
    </div>
  );
}
