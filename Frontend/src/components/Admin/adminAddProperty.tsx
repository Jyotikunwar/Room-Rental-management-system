import { useState } from "react";
import {
  Search,
  Bell,
  Info,
  MapPin,
  Banknote,
  Loader2,
} from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminAddPropertyProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

interface PropertyFormState {
  title: string;
  propertyType: string;
  description: string;
  addressLine: string;
  city: string;
  areaZip: string;
  monthlyRent: string;
  securityDeposit: string;
  leaseTerm: string;
}

const EMPTY_FORM: PropertyFormState = {
  title: "",
  propertyType: "Apartment",
  description: "",
  addressLine: "",
  city: "",
  areaZip: "",
  monthlyRent: "",
  securityDeposit: "",
  leaseTerm: "12 Months",
};

export default function AdminAddProperty({ user, onLogout, activeRoute, onNavigate }: AdminAddPropertyProps) {
  const [form, setForm] = useState<PropertyFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PropertyFormState>(key: K, value: PropertyFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.addressLine.trim() || !form.city.trim() || !form.monthlyRent) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      // NOTE: adjust field names/method to match your real api.ts —
      // this assumes an api.createRoom() endpoint similar to other
      // admin write calls.
      const res = await api.createRoom({
        title: form.title,
        propertyType: form.propertyType,
        description: form.description,
        location: form.addressLine,
        city: form.city,
        zip: form.areaZip,
        price: Number(form.monthlyRent) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        leaseTerm: form.leaseTerm,
      });

      if (res?.success) {
        setForm(EMPTY_FORM);
        onNavigate("properties");
      } else {
        setError("Failed to create property. Please try again.");
      }
    } catch (err) {
      console.error("Failed to create property:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <button
            className="relative self-end rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 sm:self-auto"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
        </header>

        <main className="mx-auto max-w-3xl p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
            <p className="mt-1 text-sm text-gray-500">Enter the details for the new listing.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Info size={14} />
                </span>
                <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Name</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Sunset Apartments"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
                  <select
                    value={form.propertyType}
                    onChange={(e) => update("propertyType", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option>Apartment</option>
                    <option>Studio</option>
                    <option>House</option>
                    <option>Room</option>
                    <option>Condo</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Brief description of the property..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  />
                </div>
              </div>
            </section>

            {/* Location Details */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MapPin size={14} />
                </span>
                <h2 className="text-base font-semibold text-gray-900">Location Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Address Line</label>
                  <input
                    type="text"
                    value={form.addressLine}
                    onChange={(e) => update("addressLine", e.target.value)}
                    placeholder="123 Main St"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="New York"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Area / ZIP</label>
                    <input
                      type="text"
                      value={form.areaZip}
                      onChange={(e) => update("areaZip", e.target.value)}
                      placeholder="10001"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing & Lease */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Banknote size={14} />
                </span>
                <h2 className="text-base font-semibold text-gray-900">Pricing & Lease</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Monthly Rent (Rs.)</label>
                  <input
                    type="number"
                    value={form.monthlyRent}
                    onChange={(e) => update("monthlyRent", e.target.value)}
                    placeholder="1500"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Security Deposit (Rs.)</label>
                  <input
                    type="number"
                    value={form.securityDeposit}
                    onChange={(e) => update("securityDeposit", e.target.value)}
                    placeholder="1500"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Lease Term</label>
                  <select
                    value={form.leaseTerm}
                    onChange={(e) => update("leaseTerm", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option>6 Months</option>
                    <option>12 Months</option>
                    <option>24 Months</option>
                    <option>Month-to-Month</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onNavigate("properties")}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : "Save Property"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}