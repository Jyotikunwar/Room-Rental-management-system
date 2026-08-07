import { Search, ClipboardCheck, ShieldCheck, KeyRound } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Search Rooms", description: "Find rooms that match your budget and location." },
  { icon: ClipboardCheck, title: "Send Booking Request", description: "Apply for the room you like in a few clicks." },
  { icon: ShieldCheck, title: "Owner Approval", description: "Landlord reviews and approves your request." },
  { icon: KeyRound, title: "Move In", description: "Confirm payment and move into your new home." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900">How It Works</h2>
        <p className="mt-1 text-center text-sm text-gray-500">Find your ideal room in 4 simple steps</p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-xs font-semibold text-blue-600">Step {index + 1}</p>
                <h3 className="mt-1 font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
