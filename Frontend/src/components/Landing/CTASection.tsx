interface CTASectionProps {
  onBrowseRoomsClick: () => void;
  onListPropertyClick: () => void;
}

export default function CTASection({ onBrowseRoomsClick, onListPropertyClick }: CTASectionProps) {
  return (
    <section className="bg-blue-50 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Find Your Next Home?</h2>
        <p className="mt-2 text-sm text-gray-500">
          Join thousands of tenants who found their perfect space or rental home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={onBrowseRoomsClick}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse Rooms
          </button>
          <button
            onClick={onListPropertyClick}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            List my Property
          </button>
        </div>
      </div>
    </section>
  );
}
