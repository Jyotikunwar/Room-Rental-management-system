import { useEffect, useState } from "react";
import { api } from "../../services/api";

interface PublicStats {
  totalRooms: number;
  totalLandlords: number;
  totalTenants: number;
  satisfactionPercent: number | null;
}

export default function StatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getPublicStats();
        if (res.success) setStats(res.stats);
      } catch (e) {
        console.error("Failed to load platform stats:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = [
    { label: "Properties", value: stats ? `${stats.totalRooms}+` : "—" },
    { label: "Landlords", value: stats ? `${stats.totalLandlords}+` : "—" },
    { label: "Happy Tenants", value: stats ? `${stats.totalTenants}+` : "—" },
    {
      label: "Satisfaction",
      value: stats?.satisfactionPercent != null ? `${stats.satisfactionPercent}%` : "",
    },
  ];

  return (
    <section className="bg-[#0f172a] py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 text-center sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-3xl font-bold text-white">{loading ? "…" : item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
