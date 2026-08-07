import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { api, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordSettingsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
  onUserUpdate?: (user: User) => void; // let the parent refresh its stored user, if it tracks one
}

export default function LandlordSettings({ user, onLogout, activeRoute, onNavigate, onUserUpdate }: LandlordSettingsProps) {
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!fullName.trim()) {
      setError("Name can't be empty.");
      return;
    }

    setSaving(true);
    try {
      // NOTE: updateProfile isn't in api.ts yet — see the snippet above this
      // component for what to add.
      const res = await (api as any).updateProfile?.({ fullName: fullName.trim(), phone: phone.trim() });
      if (res?.success) {
        setSaved(true);
        onUserUpdate?.(res.user || { ...user, fullName: fullName.trim(), phone: phone.trim() });
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res?.message || "Couldn't save changes.");
      }
    } catch (e) {
      console.error("Failed to update profile:", e);
      setError("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} />
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-gray-200 bg-white px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onLogout}
          >
            Logout
          </button>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your profile information.</p>
          </div>

          <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6">
            <form onSubmit={handleSave} className="space-y-4">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {saved && (
                <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                  <Check size={14} /> Profile updated.
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Email can't be changed here.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  placeholder="98XXXXXXXX"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}