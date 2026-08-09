import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { Faq } from "../../services/api";
import { api } from "../../services/api";

export default function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    api
      .getFaqs()
      .then((res) => {
        if (res.success) setFaqs(res.faqs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && faqs.length === 0) return null;

  return (
    <section id="faq" className="bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-stone-500">Everything you need to know before getting started.</p>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="animate-spin text-stone-400" size={24} />
          </div>
        ) : (
          <div className="mt-8 flex flex-col divide-y divide-stone-200 rounded-2xl border border-stone-200">
            {faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={faq.id}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-stone-900 sm:text-base">{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm leading-relaxed text-stone-500">{faq.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

