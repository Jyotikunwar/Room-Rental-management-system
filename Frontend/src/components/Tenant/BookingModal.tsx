// src/components/Tenant/BookingModal.tsx
import { Calendar, Loader2, X } from "lucide-react";
import type { Room } from "../../services/api";
import { resolveImageUrl } from "./roomDisplayUtils";

interface BookingModalProps {
  room: Room;
  moveInDate: string;
  notes: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
  onMoveInDateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onGoToMyRequests: () => void;
}

export default function BookingModal({
  room,
  moveInDate,
  notes,
  submitting,
  error,
  success,
  onMoveInDateChange,
  onNotesChange,
  onSubmit,
  onClose,
  onGoToMyRequests,
}: BookingModalProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <span className="text-sm font-semibold">{success ? "Booking Requested" : "Book This Room"}</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Calendar size={22} />
            </div>
            <p className="text-sm text-stone-600">
              Your booking request for <span className="font-semibold">{room.title}</span> has been sent to the
              landlord. You'll be notified once it's approved.
            </p>
            <button
              onClick={onGoToMyRequests}
              className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              View My Requests
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 p-3">
              <img
                src={resolveImageUrl(room.roomImages?.[0]?.imageUrl)}
                alt={room.title}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{room.title}</p>
                <p className="text-xs text-stone-500">Rs. {room.price.toLocaleString()}/month</p>
              </div>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Move-in Date</span>
              <input
                type="date"
                min={today}
                value={moveInDate}
                onChange={(e) => onMoveInDateChange(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                placeholder="Anything the landlord should know..."
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            {error && <p className="mb-3 text-xs text-rose-500">{error}</p>}

            <button
              onClick={onSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Sending Request..." : "Confirm Booking Request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}