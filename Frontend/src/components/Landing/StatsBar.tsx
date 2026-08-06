const STATS = [
  { value: "500+", label: "Properties" },
  { value: "200+", label: "Landlords" },
  { value: "1200+", label: "Happy Tenants" },
  { value: "98%", label: "Satisfaction" },
];

export default function StatsBar() {
  return (
    <section className="bg-stone-900 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-bold text-white sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
