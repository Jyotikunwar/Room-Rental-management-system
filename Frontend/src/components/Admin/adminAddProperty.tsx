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

// Matches the real Room schema fields exactly — "propertyType" (free text),
// "zip", and "leaseTerm" from the earlier version don't exist as columns,
// so they've been replaced with roomType (the actual enum) and
// availableFrom, and leaseTerm/zip were dropped.
interface PropertyFormState {
  title: string;
  roomType: "SINGLE" | "DOUBLE" | "FLAT" | "APARTMENT";
  description: string;
  addressLine: string;
  city: string;
  location: string;
  monthlyRent: string;
  securityDeposit: string;
  availableFrom: string;
}

const EMPTY_FORM: PropertyFormState = {
  title: "",
  roomType: "APARTMENT",
  description: "",
  addressLine: "",
  city: "",
  location: "",
  monthlyRent: "",
  securityDeposit: "",
  availableFrom: "",
};

export default function AdminAddProperty({ onLogout, activeRoute, onNavigate }: Omit<AdminAddPropertyProps, 'user'>) {
  const [form, setForm] = useState<PropertyFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PropertyFormState>(key: K, value: PropertyFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.addressLine.trim() || !form.city.trim() || !form.location.trim() || !form.monthlyRent) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.createRoom({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        roomType: form.roomType,
        city: form.city.trim(),
        location: form.location.trim(),
        address: form.addressLine.trim(),
        price: Number(form.monthlyRent) || 0,
        securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : undefined,
        availableFrom: form.availableFrom || undefined,
      });

      if (res?.success) {
        setForm(EMPTY_FORM);
        onNavigate("properties");
      } else {
        setError(res?.message || "Failed to create property. Please try again.");
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Room Type</label>
                  <select
                    value={form.roomType}
                    onChange={(e) => update("roomType", e.target.value as PropertyFormState["roomType"])}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="SINGLE">Single Room</option>
                    <option value="DOUBLE">Double Room</option>
                    <option value="FLAT">Flat</option>
                    <option value="APARTMENT">Apartment</option>
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
                      placeholder="Kathmandu"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Location / Area</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder="Baneshwor"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing & Availability */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Banknote size={14} />
                </span>
                <h2 className="text-base font-semibold text-gray-900">Pricing &amp; Availability</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Monthly Rent (Rs.)</label>
                  <input
                    type="number"
                    value={form.monthlyRent}
                    onChange={(e) => update("monthlyRent", e.target.value)}
                    placeholder="15000"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Security Deposit (Rs.)</label>
                  <input
                    type="number"
                    value={form.securityDeposit}
                    onChange={(e) => update("securityDeposit", e.target.value)}
                    placeholder="15000"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Available From</label>
                  <input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => update("availableFrom", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
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
