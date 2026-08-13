import { useEffect, useState, useMemo } from "react";
import { ChevronDown, Loader2, Search, HelpCircle, Sparkles } from "lucide-react";
import type { Faq } from "../../services/api";
import { api } from "../../services/api";

export default function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api
      .getFaqs()
      .then((res) => {
        if (res.success) setFaqs(res.faqs || []);
      })
      .catch((err) => {
        console.error("Failed to load FAQs from backend:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [faqs, searchQuery]);

  return (
    <section id="faq" className="bg-slate-50/70 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-3 py-1 text-xs font-semibold text-blue-700">
            <HelpCircle size={14} /> Got Questions?
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Everything you need to know about finding and listing rooms on RoomFinder.
          </p>

          {/* Search FAQs */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="relative flex items-center">
              <Search size={16} className="pointer-events-none absolute left-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. deposit, booking, rent)..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs text-gray-500">Loading FAQs from server...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No questions found matching "{searchQuery}".</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="mt-10 space-y-3">
            {filteredFaqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={faq.id || i}
                  className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? "border-blue-200 bg-white shadow-md shadow-blue-500/5"
                      : "border-gray-200/80 bg-white hover:border-gray-300"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-medium text-gray-900"
                  >
                    <span className="flex items-center gap-3 text-sm sm:text-base">
                      <Sparkles size={16} className={isOpen ? "text-blue-600" : "text-gray-400"} />
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-slate-50/50 px-6 py-4 text-sm leading-relaxed text-gray-600">
                      {faq.answer}
                    </div>
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
