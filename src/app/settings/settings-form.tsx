"use client";

import { useState } from "react";
import { createClient } from "@/server/supabase/client";
import type { Business, WorkingHours } from "@/types";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "Europe/London", "Europe/Paris", "Asia/Dubai",
];

export function SettingsForm({ business }: { business: Business }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: business.name,
    timezone: business.timezone,
    services_description: business.services_description ?? "",
    appointment_duration_mins: business.appointment_duration_mins,
    greeting_tone: business.greeting_tone,
    working_hours: (business.working_hours ?? {}) as WorkingHours,
  });

  function setField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          enabled: !prev.working_hours[day]?.enabled,
        },
      },
    }));
  }

  function setDayHours(day: string, field: "open" | "close", value: string) {
    setForm((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: { ...prev.working_hours[day], [field]: value },
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        timezone: form.timezone,
        services_description: form.services_description,
        appointment_duration_mins: form.appointment_duration_mins,
        greeting_tone: form.greeting_tone,
        working_hours: form.working_hours,
      })
      .eq("id", business.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  const hours = form.working_hours;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5"
    >
      <h2 className="font-semibold text-white">Business Details</h2>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm px-4 py-3 rounded-lg">
          Settings saved successfully!
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Business Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Services</label>
        <textarea
          value={form.services_description}
          onChange={(e) => setField("services_description", e.target.value)}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setField("timezone", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Appointment Duration</label>
          <select
            value={form.appointment_duration_mins}
            onChange={(e) => setField("appointment_duration_mins", parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
          >
            {[15, 30, 45, 60, 90, 120].map((d) => (
              <option key={d} value={d}>{d} minutes</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">AI Tone</label>
        <select
          value={form.greeting_tone}
          onChange={(e) => setField("greeting_tone", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly & Warm</option>
          <option value="concise">Concise & Direct</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Working Hours</label>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-16 text-xs font-medium py-1.5 rounded-md transition-colors capitalize ${
                  hours[day]?.enabled ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-500"
                }`}
              >
                {day.slice(0, 3)}
              </button>
              {hours[day]?.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day]?.open ?? "09:00"}
                    onChange={(e) => setDayHours(day, "open", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="time"
                    value={hours[day]?.close ?? "17:00"}
                    onChange={(e) => setDayHours(day, "close", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs"
                  />
                </div>
              ) : (
                <span className="text-gray-600 text-xs">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors text-white font-semibold py-2.5 rounded-lg text-sm"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
