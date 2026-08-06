import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Anisha Shrestha", role: "Tenant, Kathmandu",
    quote: "Very easy to find a room. The earliest landlord dealt was verified when I was moving to Kathmandu.",
    avatar: "/images/avatars/testimonial-1.jpg", rating: 5,
  },
  {
    name: "Sundar Thapa", role: "Tenant, Lalitpur",
    quote: "I'm a landlord managing my properties and I love how landlords can respond quickly and professionally.",
    avatar: "/images/avatars/testimonial-2.jpg", rating: 4,
  },
  {
    name: "Ramesh K.C.", role: "Tenant, Bhaktapur",
    quote: "The smart search saved me hours of scrolling. Found a great flat within my budget in just a few days.",
    avatar: "/images/avatars/testimonial-3.jpg", rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">What Our Users Say</h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} className={i < t.rating ? "fill-amber-400" : "fill-stone-200 text-stone-200"} />
              ))}
            </div>
            <p className="mt-3 text-sm italic text-stone-600">"{t.quote}"</p>
            <div className="mt-4 flex items-center gap-2.5">
              <img src={t.avatar} alt={t.name} className="h-8 w-8 rounded-full object-cover" />
              <div>
                <p className="text-xs font-semibold text-stone-800">{t.name}</p>
                <p className="text-[11px] text-stone-400">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
