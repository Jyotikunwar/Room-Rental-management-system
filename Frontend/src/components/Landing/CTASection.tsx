interface CTASectionProps {
  onBrowseRooms?: () => void;
  onListProperty?: () => void;
}

export default function CTASection({ onBrowseRooms, onListProperty }: CTASectionProps) {
  return (
    <section className="bg-blue-50/60 py-14">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Ready to Find Your Next Home?</h2>
        <p className="mt-2 text-sm text-stone-500">
          Join thousands of tenants and landlords who found their perfect space or tenant.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onBrowseRooms}
            className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Browse Rooms
          </button>
          <button
            onClick={onListProperty}
            className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            List Your Property
          </button>
        </div>
      </div>
    </section>
  );
}
