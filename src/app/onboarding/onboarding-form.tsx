"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/server/supabase/client";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_HOURS = DAYS.reduce(
  (acc, day) => ({
    ...acc,
    [day]: {
      open: "09:00",
      close: "17:00",
      enabled: !["saturday", "sunday"].includes(day),
    },
  }),
  {} as Record<string, { open: string; close: string; enabled: boolean }>
);

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    timezone: "America/New_York",
    services_description: "",
    appointment_duration_mins: 60,
    greeting_tone: "professional",
    working_hours: DEFAULT_HOURS,
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
          enabled: !prev.working_hours[day].enabled,
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
    if (!form.name.trim()) {
      setError("Business name is required.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase.from("businesses").insert({
      user_id: userId,
      name: form.name.trim(),
      timezone: form.timezone,
      services_description: form.services_description,
      appointment_duration_mins: form.appointment_duration_mins,
      greeting_tone: form.greeting_tone,
      working_hours: form.working_hours,
      subscription_status: "active",
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Provision phone number via server action
    const res = await fetch("/api/provision", { method: "POST" });
    if (!res.ok) {
      // Non-fatal — number will be provisioned on next login if it fails
      console.error("Phone provisioning failed:", await res.text());
    }

    router.push("/dashboard");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6"
    >
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Business Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Business Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="e.g. Bright Smile Dental"
          className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Services */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Services Description
        </label>
        <textarea
          value={form.services_description}
          onChange={(e) => setField("services_description", e.target.value)}
          placeholder="e.g. General dentistry, cleanings, fillings, teeth whitening, emergency appointments"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          This helps the AI answer questions about what you offer.
        </p>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Timezone
        </label>
        <select
          value={form.timezone}
          onChange={(e) => setField("timezone", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Appointment Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Default Appointment Duration
        </label>
        <select
          value={form.appointment_duration_mins}
          onChange={(e) =>
            setField("appointment_duration_mins", parseInt(e.target.value))
          }
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {[15, 30, 45, 60, 90, 120].map((d) => (
            <option key={d} value={d}>
              {d} minutes
            </option>
          ))}
        </select>
      </div>

      {/* Greeting Tone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          AI Greeting Tone
        </label>
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

      {/* Working Hours */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Working Hours
        </label>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-20 text-xs font-medium py-1.5 rounded-md transition-colors capitalize ${
                  form.working_hours[day].enabled
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {day.slice(0, 3)}
              </button>
              {form.working_hours[day].enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={form.working_hours[day].open}
                    onChange={(e) => setDayHours(day, "open", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="time"
                    value={form.working_hours[day].close}
                    onChange={(e) => setDayHours(day, "close", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-violet-500"
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
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors text-white font-semibold py-3 rounded-xl text-sm"
      >
        {loading ? "Setting up your receptionist..." : "Launch My AI Receptionist →"}
      </button>
    </form>
  );
}
