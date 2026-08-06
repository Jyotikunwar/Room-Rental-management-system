import { Search, MessageCircle, ShieldCheck, FileSignature, Bell, Map } from "lucide-react";

const FEATURES = [
  { icon: <Search size={16} />, title: "Smart Search", desc: "Powerful filters to find exactly what you need, fast." },
  { icon: <MessageCircle size={16} />, title: "Real-time Chat", desc: "Message landlords directly, no middlemen." },
  { icon: <ShieldCheck size={16} />, title: "Secure Payments", desc: "Pay rent and deposits safely through the platform." },
  { icon: <FileSignature size={16} />, title: "Digital Lease", desc: "Sign lease agreements online in minutes." },
  { icon: <Bell size={16} />, title: "Instant Notifications", desc: "Never miss a payment, message, or update." },
  { icon: <Map size={16} />, title: "Map-based Search", desc: "See rooms plotted on the map near what matters to you." },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Features</h2>
        <p className="mt-1 text-sm text-stone-500">Everything you need for a smooth renting experience.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              {f.icon}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
              <p className="mt-0.5 text-xs text-stone-500">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
