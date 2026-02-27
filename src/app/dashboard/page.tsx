import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { PhoneCall, Calendar, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProvisionRetryButton } from "@/components/dashboard/provision-retry-button";

export default async function DashboardPage() {
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

  if (!business) {
    redirect("/onboarding");
  }

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentCalls } = await supabase
    .from("call_logs")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);

  const { count: totalCalls } = await supabase
    .from("call_logs")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);

  const isActive = business.subscription_status === "active";

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          {business.name} — AI Receptionist Overview
        </p>
      </div>

      {/* Provisioning Banner — shown only if number not yet assigned */}
      {isActive && !business.phone_number && (
        <div className="bg-blue-950 border border-blue-800 text-blue-300 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {business.vapi_phone_number_id
                ? "Waiting for your number to activate…"
                : "Setting up your phone number…"}
            </p>
            <p className="text-xs text-blue-400 mt-0.5">
              {business.vapi_phone_number_id
                ? "Vapi is assigning your number. This usually takes 1–2 minutes."
                : "If this takes more than a minute, use the button below to retry."}
            </p>
            <ProvisionRetryButton pendingActivation={!!business.vapi_phone_number_id} />
          </div>
        </div>
      )}

      {/* Phone Number Card */}
      {isActive && business.phone_number && (
        <div className="bg-violet-950 border border-violet-800 rounded-2xl p-6 mb-6">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Your AI Receptionist Number
          </p>
          <p className="text-4xl font-bold text-white tracking-wider">
            {business.phone_number}
          </p>
          <p className="text-violet-300 text-sm mt-2">
            Calls to this number are answered by your AI 24/7
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Bookings",
            value: totalBookings ?? 0,
            icon: <Calendar className="w-4 h-4" />,
          },
          {
            label: "Total Calls",
            value: totalCalls ?? 0,
            icon: <PhoneCall className="w-4 h-4" />,
          },
          {
            label: "Appt Duration",
            value: `${business.appointment_duration_mins}m`,
            icon: <Clock className="w-4 h-4" />,
          },
          {
            label: "Status",
            value: isActive ? "Active" : "Inactive",
            icon: <TrendingUp className="w-4 h-4" />,
            highlight: isActive,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              {stat.icon}
              {stat.label}
            </div>
            <p
              className={`text-2xl font-bold ${
                "highlight" in stat && stat.highlight
                  ? "text-green-400"
                  : "text-white"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Recent Bookings</h2>
          {recentBookings && recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {booking.caller_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(booking.start_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs bg-green-950 text-green-400 px-2 py-1 rounded-full">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No bookings yet.</p>
          )}
        </div>

        {/* Recent Calls */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Recent Calls</h2>
          {recentCalls && recentCalls.length > 0 ? (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {call.caller_number ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(call.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      call.outcome === "booked"
                        ? "bg-green-950 text-green-400"
                        : call.outcome === "failed"
                        ? "bg-red-950 text-red-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {call.outcome}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No calls yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
