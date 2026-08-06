import { Search, FileText, ThumbsUp, Key } from "lucide-react";

const STEPS = [
  { icon: <Search size={18} />, title: "Search Rooms", desc: "Find rooms that match your budget and location." },
  { icon: <FileText size={18} />, title: "Send Booking Request", desc: "Apply for the room in a couple of clicks." },
  { icon: <ThumbsUp size={18} />, title: "Owner Approval", desc: "The landlord reviews and confirms your request." },
  { icon: <Key size={18} />, title: "Move In", desc: "Sign the lease online and move in on your date." },
];

export default function HowItWorks() {
  return (
    <section className="bg-stone-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">How It Works</h2>
          <p className="mt-1 text-sm text-stone-500">Find and move into your next room in 4 simple steps.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-stone-200 bg-white p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
                {step.icon}
              </span>
              <span className="absolute right-4 top-4 text-xs font-semibold text-stone-300">0{i + 1}</span>
              <h3 className="mt-3 text-sm font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-1 text-xs text-stone-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
