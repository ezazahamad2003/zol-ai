import Link from "next/link";
import { PhoneCall, Calendar, Clock, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-violet-400" />
          <span className="text-xl font-bold tracking-tight">Zol</span>
        </div>
        <Link
          href="/login"
          className="bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-lg"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-950 border border-violet-800 text-violet-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI Receptionist — 24/7
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Never miss a call.{" "}
          <span className="text-violet-400">Never lose a booking.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Your business gets a dedicated phone number powered by AI. It answers
          calls, understands intent, and books appointments directly into your
          Google Calendar — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold px-8 py-3.5 rounded-xl text-base"
          >
            Start Free Trial
          </Link>
          <a
            href="#how-it-works"
            className="bg-gray-800 hover:bg-gray-700 transition-colors text-gray-200 font-semibold px-8 py-3.5 rounded-xl text-base"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <PhoneCall className="w-6 h-6 text-violet-400" />,
              title: "Dedicated Phone Number",
              desc: "Each business gets its own number. Calls route directly to your AI receptionist.",
            },
            {
              icon: <Calendar className="w-6 h-6 text-violet-400" />,
              title: "Google Calendar Sync",
              desc: "Bookings appear instantly in your real calendar. No double-booking, ever.",
            },
            {
              icon: <Clock className="w-6 h-6 text-violet-400" />,
              title: "24/7 Availability",
              desc: "Your AI answers at 2am on a Sunday. You wake up to confirmed appointments.",
            },
            {
              icon: <Shield className="w-6 h-6 text-violet-400" />,
              title: "Respects Your Hours",
              desc: "Set your working hours once. The AI only books within them.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to stop missing calls?</h2>
        <p className="text-gray-400 mb-8">
          Set up in under 5 minutes. No technical skills required.
        </p>
        <Link
          href="/login"
          className="inline-block bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold px-10 py-4 rounded-xl text-base"
        >
          Get Your AI Receptionist
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 px-6 py-8 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Zol. All rights reserved.
      </footer>
    </main>
  );
}
