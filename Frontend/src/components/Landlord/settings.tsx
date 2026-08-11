import { useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { api, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordSettingsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
  onUserUpdate?: (user: User) => void;
}

export default function LandlordSettings({ user, onLogout, activeRoute, onNavigate, onUserUpdate }: LandlordSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [company, setCompany] = useState(""); // NOTE: not in User type yet
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("USD");

  const [notifPrefs, setNotifPrefs] = useState({
    maintenance: { email: true, sms: true },
    payment: { email: true, sms: false },
    messages: { email: true, sms: false, push: true },
  });

  function togglePref(key: keyof typeof notifPrefs, channel: string) {
    setNotifPrefs((prev) => ({ ...prev, [key]: { ...prev[key], [channel]: !(prev[key] as any)[channel] } }));
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      if (fileInputRef.current?.files?.[0]) {
        const fd = new FormData();
        fd.append("avatar", fileInputRef.current.files[0]);
        await api.uploadAvatar(fd);
      }
      const res = await api.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (res?.success) {
        setProfileSaved(true);
        onUserUpdate?.(res.user || { ...user, fullName, phone });
        setTimeout(() => setProfileSaved(false), 2000);
      }
      await (api as any).updateNotificationPreferences?.(notifPrefs);
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword() {
    setPasswordError(null);
    if (!currentPassword || !newPassword) return setPasswordError("Fill in both password fields.");
    if (newPassword !== confirmPassword) return setPasswordError("New passwords don't match.");
    setSavingPassword(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      if (res?.success) {
        setPasswordSaved(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 2000);
      } else {
        setPasswordError(res?.message || "Couldn't update password.");
      }
      await (api as any).toggleTwoFactor?.(twoFactor);
    } catch (e) {
      console.error("Failed to update password:", e);
      setPasswordError("Couldn't update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account preferences, notifications, and security.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {/* Profile */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 text-base font-semibold text-gray-900">Profile Information</h2>
              <div className="mb-5 flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                    {avatarPreview ? <img src={avatarPreview} className="h-full w-full object-cover" /> : <span className="text-lg font-semibold text-gray-400">{fullName[0]}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Change Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setAvatarPreview(URL.createObjectURL(e.target.files[0]))} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Email Address</label>
                  <input value={user.email} disabled className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Phone Number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Company (Optional)</label>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
                  {savingProfile && <Loader2 size={14} className="animate-spin" />}
                  {profileSaved && <Check size={14} />}
                  Save Profile
                </button>
              </div>
            </div>

            {/* General preferences */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">General Preferences</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                    <option>English</option>
                    <option>Nepali</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Default Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                    <option value="USD">USD ($)</option>
                    <option value="NPR">NPR (Rs.)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Security */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Security</h2>
              {passwordError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{passwordError}</p>}
              {passwordSaved && <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600"><Check size={12} /> Password updated.</p>}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-gray-700">Two-Factor Authentication</p>
                  <p className="text-[11px] text-gray-400">Add an extra layer of security</p>
                </div>
                <button
                  onClick={() => setTwoFactor((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${twoFactor ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${twoFactor ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>

              <button onClick={handleUpdatePassword} disabled={savingPassword} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
                {savingPassword && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Notifications</h2>
              <NotifRow label="Maintenance Requests" hint="When a tenant submits a new request" pref={notifPrefs.maintenance} onToggle={(ch) => togglePref("maintenance", ch)} channels={["email", "sms"]} />
              <NotifRow label="Payment Received" hint="When rent is successfully paid" pref={notifPrefs.payment} onToggle={(ch) => togglePref("payment", ch)} channels={["email", "sms"]} />
              <NotifRow label="New Messages" hint="Direct messages from tenants" pref={notifPrefs.messages} onToggle={(ch) => togglePref("messages", ch)} channels={["email", "push"]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifRow({ label, hint, pref, onToggle, channels }: { label: string; hint: string; pref: Record<string, boolean>; onToggle: (channel: string) => void; channels: string[] }) {
  return (
    <div className="mb-4 border-b border-gray-50 pb-4 last:mb-0 last:border-0 last:pb-0">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="mb-2 text-[11px] text-gray-400">{hint}</p>
      <div className="flex gap-4">
        {channels.map((ch) => (
          <label key={ch} className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={!!pref[ch]} onChange={() => onToggle(ch)} className="h-3.5 w-3.5 accent-blue-600" />
            {ch.toUpperCase()}
          </label>
        ))}
      </div>
    </div>
  );
}