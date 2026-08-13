import { AlertTriangle, Settings, X, ArrowRight } from "lucide-react";

interface ProfileIncompleteModalProps {
  missingSections: string[];
  onClose: () => void;
  onGoToSettings: () => void;
}

export default function ProfileIncompleteModal({
  missingSections,
  onClose,
  onGoToSettings,
}: ProfileIncompleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-amber-100">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-stone-900">Complete Profile to Book</h3>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
            Before booking a property, you must complete your <strong>Profile Information</strong>, <strong>Enter Location</strong>, and <strong>Identity Verification</strong> in Settings.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Incomplete Sections Required:
            </p>
            <ul className="mt-2 space-y-2">
              {missingSections.map((sec, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-amber-900">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">
                    !
                  </span>
                  <span>{sec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGoToSettings}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Settings size={15} />
            Go to Settings to Fill
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
