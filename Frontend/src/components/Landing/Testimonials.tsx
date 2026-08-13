import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { api } from "../../services/api";

interface Testimonial {
  id: number;
  rating: number;
  comment: string | null;
  user?: { fullName: string };
  room?: { city: string };
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getPublicTestimonials();
        if (res.success) {
          setTestimonials(res.testimonials || []);
        }
      } catch (e) {
        console.error("Failed to load testimonials from backend:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!loading && testimonials.length === 0) return null;



  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900">What Our Users Say</h2>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))
          : testimonials.slice(0, 3).map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < t.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-600">"{t.comment}"</p>
                <p className="mt-4 text-sm font-semibold text-gray-900">{t.user?.fullName || "Tenant"}</p>
                {t.room?.city && <p className="text-xs text-gray-400">{t.room.city}</p>}
              </div>
            ))}
      </div>
    </section>
  );
}
