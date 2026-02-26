"use client";

import { useState } from "react";
import { Check, PhoneCall, Calendar, Clock, Shield } from "lucide-react";
import type { Business } from "@/types";

export function BillingContent({ business }: { business: Business }) {
  const [loading, setLoading] = useState(false);

  const isActive = business.subscription_status === "active";

  async function handleSubscribe() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(false);
  }

  async function handleManage() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isActive ? "Your Subscription" : "Activate Your Receptionist"}
        </h1>
        <p className="text-gray-400">
          {isActive
            ? "Manage your active subscription below."
            : "One flat monthly fee. No setup costs."}
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        {isActive ? (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-950 text-green-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Subscription Active
            </div>
            {business.phone_number && (
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-1">Your number</p>
                <p className="text-2xl font-bold text-white tracking-wider">
                  {business.phone_number}
                </p>
              </div>
            )}
            <button
              onClick={handleManage}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-60 transition-colors text-white font-semibold py-3 rounded-xl text-sm"
            >
              {loading ? "Loading..." : "Manage Subscription"}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white mb-1">$97</p>
              <p className="text-gray-400 text-sm">per month</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                { icon: PhoneCall, text: "Dedicated AI phone number" },
                { icon: Calendar, text: "Google Calendar integration" },
                { icon: Clock, text: "24/7 call answering" },
                { icon: Shield, text: "Unlimited booking minutes" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-violet-950 border border-violet-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors text-white font-semibold py-3.5 rounded-xl text-sm"
            >
              {loading ? "Redirecting to checkout..." : "Subscribe — $97/month"}
            </button>

            <p className="text-center text-xs text-gray-600 mt-4">
              Cancel anytime. Powered by Stripe.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
