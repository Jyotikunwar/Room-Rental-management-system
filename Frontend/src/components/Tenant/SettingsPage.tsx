import { useState } from "react";
import {
  Bell, Settings as SettingsIcon, User as UserIcon, Lock, CreditCard,
  Trash2, Camera, Check, Plus,
} from "lucide-react";
import type { User } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";

// Maps the Sidebar's display labels to this app's TenantView route keys.
const LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  "Dashboard": "dashboard",
  "Find Rooms": "search",
  "Saved Rooms": "saved",
  "My Requests": "requests",
  "Current Rental": "rental",
  "Payments": "payments",
  "Messages": "messages",
  "Notifications": "notifications",
};

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

interface Toggle {
  key: string;
  label: string;
  description: string;
}

const NOTIF_TOGGLES: Toggle[] = [
  { key: "payments", label: "Payment reminders", description: "Rent due dates and invoice alerts" },
  { key: "maintenance", label: "Maintenance updates", description: "Repair schedules and status changes" },
  { key: "messages", label: "Messages", description: "New messages from your landlord" },
  { key: "promotions", label: "Recommendations", description: "New rooms that match your saved preferences" },
];

const CHANNELS: Toggle[] = [
  { key: "email", label: "Email", description: "Sent to your registered email address" },
  { key: "sms", label: "SMS", description: "Sent to your registered phone number" },
  { key: "push", label: "Push notifications", description: "In-app and browser alerts" },
];

const PAYMENT_METHODS = [
  { id: 1, label: "eSewa", detail: "Linked · 98XXXXXX21" },
  { id: 2, label: "Khalti", detail: "Not linked" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-stone-200"}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage({ user, onLogout, onNavigate }: SettingsPageProps) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    payments: true, maintenance: true, messages: true, promotions: false,
  });
  const [channelPrefs, setChannelPrefs] = useState<Record<string, boolean>>({
    email: true, sms: false, push: true,
  });

  const toggleNotif = (key: string) => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));
  const toggleChannel = (key: string) => setChannelPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to api.updateProfile({ fullName, email, phone })
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        active="Settings"
        onNavigate={handleNavigate}
        onSettings={() => {}}
        onLogout={onLogout}
      />

      <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <h1 className="text-lg font-semibold text-stone-700">RoomRent Manager</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate("notifications")} className="text-stone-400 hover:text-stone-600" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button className="text-blue-600 hover:text-blue-700" aria-label="Settings">
              <SettingsIcon size={19} />
            </button>
            <button className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200" aria-label="Account">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <h2 className="mb-1 text-2xl font-bold">Settings</h2>
        <p className="mb-6 text-sm text-stone-500">Manage your profile, security, and notification preferences.</p>

        {/* ---- Profile ---- */}
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserIcon size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold">Profile Information</h3>
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div className="relative">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName || "U"}`}
                alt={fullName}
                className="h-16 w-16 rounded-full bg-stone-200 object-cover"
              />
              <button
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white"
                aria-label="Change photo"
              >
                <Camera size={12} />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium">{fullName || "Your name"}</p>
              <p className="text-xs text-stone-500">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
              Full Name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
              Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 sm:col-span-2">
              Phone Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800">
                Save Changes
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check size={13} /> Saved
                </span>
              )}
            </div>
          </form>
        </section>

        {/* ---- Password ---- */}
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold">Change Password</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
              Current Password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <button className="mt-4 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
            Update Password
          </button>
        </section>

        {/* ---- Notification preferences ---- */}
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold">Notification Preferences</h3>
          </div>

          <p className="mb-2 text-xs font-medium text-stone-400">What you get notified about</p>
          <div className="mb-4 flex flex-col divide-y divide-stone-100">
            {NOTIF_TOGGLES.map((t) => (
              <div key={t.key} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-stone-800">{t.label}</p>
                  <p className="text-xs text-stone-500">{t.description}</p>
                </div>
                <Toggle checked={notifPrefs[t.key]} onChange={() => toggleNotif(t.key)} />
              </div>
            ))}
          </div>

          <p className="mb-2 text-xs font-medium text-stone-400">How you get notified</p>
          <div className="flex flex-col divide-y divide-stone-100">
            {CHANNELS.map((c) => (
              <div key={c.key} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-stone-800">{c.label}</p>
                  <p className="text-xs text-stone-500">{c.description}</p>
                </div>
                <Toggle checked={channelPrefs[c.key]} onChange={() => toggleChannel(c.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* ---- Payment methods ---- */}
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold">Payment Methods</h3>
          </div>
          <div className="flex flex-col divide-y divide-stone-100">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-stone-800">{m.label}</p>
                  <p className="text-xs text-stone-500">{m.detail}</p>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:underline">
                  {m.detail === "Not linked" ? "Link" : "Manage"}
                </button>
              </div>
            ))}
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
            <Plus size={13} /> Add another payment method
          </button>
        </section>

        {/* ---- Danger zone ---- */}
        <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trash2 size={16} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-rose-600">Danger Zone</h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">Delete Account</p>
              <p className="text-xs text-stone-500">This permanently removes your account and booking history.</p>
            </div>
            <button className="shrink-0 rounded-lg border border-rose-300 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">
              Delete Account
            </button>
          </div>
          <div className="mt-4 border-t border-rose-100 pt-4">
            <button onClick={onLogout} className="text-xs font-medium text-stone-600 hover:underline">
              Log out of your account
            </button>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
