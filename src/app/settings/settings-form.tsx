"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { createClient } from "@/server/supabase/client";
import type { Business, WorkingHours } from "@/types";
import type { VoiceOption } from "@/app/api/voices/route";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "Europe/London", "Europe/Paris", "Asia/Dubai",
];

const GENDER_FILTERS = ["all", "female", "male", "neutral"] as const;
type GenderFilter = (typeof GENDER_FILTERS)[number];

function VoicePicker({
  selectedId,
  onChange,
}: {
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [filter, setFilter] = useState<GenderFilter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        setVoices(data);
        setLoadingVoices(false);
      });
  }, []);

  function togglePlay(voice: VoiceOption, e: React.MouseEvent) {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === voice.voice_id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
  }

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const filtered = filter === "all" ? voices : voices.filter((v) => v.gender === filter);
  const selectedVoice = voices.find((v) => v.voice_id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-gray-400">AI Voice</label>
        {selectedVoice && (
          <span className="text-xs text-violet-400 font-medium">
            {selectedVoice.name} · {selectedVoice.accent} · {selectedVoice.gender}
          </span>
        )}
      </div>

      {/* Gender filter tabs */}
      <div className="flex gap-1.5 mb-3">
        {GENDER_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "bg-violet-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loadingVoices ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          Loading voices...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {filtered.map((voice) => {
            const isSelected = selectedId === voice.voice_id;
            const isPlaying = playingId === voice.voice_id;
            return (
              <div
                key={voice.voice_id}
                onClick={() => onChange(voice.voice_id)}
                className={`relative cursor-pointer rounded-xl p-3 border transition-all ${
                  isSelected
                    ? "border-violet-500 bg-violet-950/40"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{voice.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 capitalize">
                      {voice.gender} · {voice.accent}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => togglePlay(voice, e)}
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isPlaying
                        ? "bg-violet-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                    title={isPlaying ? "Pause" : "Preview voice"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 ml-0.5" />
                    )}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {voice.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1 text-xs text-gray-500 mt-2">
        <Volume2 className="w-3 h-3" />
        Click any card to select · Press play to preview
      </p>
    </div>
  );
}

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
    voice_id: business.voice_id ?? "EXAVITQu4vr4xnSDxMaL",
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
        voice_id: form.voice_id,
      })
      .eq("id", business.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sync updated settings (voice + system prompt) to the Vapi assistant
    await fetch("/api/vapi/sync", { method: "POST" }).catch(() => {});

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
          Settings saved and voice synced to your AI receptionist!
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

      {/* Voice Picker */}
      <div className="border border-gray-700/50 rounded-xl p-4 bg-gray-800/20">
        <VoicePicker
          selectedId={form.voice_id}
          onChange={(id) => setField("voice_id", id)}
        />
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
