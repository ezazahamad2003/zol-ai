"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Whether Vapi provisioning has already started (number ID exists but number not yet assigned) */
  pendingActivation: boolean;
}

export function ProvisionRetryButton({ pendingActivation }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError("");
    setPending(false);

    const endpoint = pendingActivation ? "/api/provision/status" : "/api/provision";

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else if (data.ready === false) {
        setPending(true);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
      {pending && (
        <p className="text-xs text-blue-400 mb-1">
          Still being assigned — wait 30 seconds and check again.
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs font-semibold text-blue-300 underline underline-offset-2 hover:text-white disabled:opacity-50 transition-colors"
      >
        {loading
          ? "Checking…"
          : pendingActivation
          ? "Check now"
          : "Retry now"}
      </button>
    </div>
  );
}
