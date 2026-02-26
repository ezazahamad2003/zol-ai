import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { format } from "date-fns";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("start_time", { ascending: false });

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-gray-400 mt-1">All appointments booked by your AI receptionist</p>
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 px-6 py-4">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 px-6 py-4">Phone</th>
                <th className="text-left text-xs font-medium text-gray-400 px-6 py-4">Date & Time</th>
                <th className="text-left text-xs font-medium text-gray-400 px-6 py-4">Service</th>
                <th className="text-left text-xs font-medium text-gray-400 px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    {booking.caller_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {booking.caller_phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {format(new Date(booking.start_time), "MMM d, yyyy 'at' h:mm a")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {booking.service ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        booking.status === "confirmed"
                          ? "bg-green-950 text-green-400"
                          : booking.status === "cancelled"
                          ? "bg-red-950 text-red-400"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No bookings yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Bookings will appear here once your AI receptionist takes a call.
          </p>
        </div>
      )}
    </div>
  );
}
