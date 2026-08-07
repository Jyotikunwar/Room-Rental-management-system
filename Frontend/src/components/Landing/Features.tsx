import { Sparkles, MessageCircle, ShieldCheck, FileText, Bell, MapPin } from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "Smart Search", description: "Powerful filters that surface exactly what you're looking for." },
  { icon: MessageCircle, title: "Real-time Chat", description: "Message landlords directly, no back-and-forth emails." },
  { icon: ShieldCheck, title: "Secure Payments", description: "Pay rent safely with tracked transaction history." },
  { icon: FileText, title: "Digital Lease", description: "Booking details recorded and accessible anytime." },
  { icon: Bell, title: "Instant Notifications", description: "Stay updated on requests, payments, and messages." },
  { icon: MapPin, title: "Map-based Search", description: "Browse rooms visually by neighborhood and distance." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900">Features</h2>
      <p className="mt-1 text-center text-sm text-gray-500">Everything you need for a smooth rental experience</p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={18} />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
