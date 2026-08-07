import { useRef, useState } from "react";
import { User as UserIcon, ShieldCheck, Sliders, LogOut, Info, Camera, Loader2, Check } from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminSettingsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onUserUpdate?: (user: User) => void;
}

// NOTE: language preference has no backend field yet — stored locally for
// now. Wire it to updateProfile (or a dedicated preferences endpoint) once
// the backend supports it.
type Language = "en-US" | "ne";

export default function AdminSettings({ user, onLogout, activeRoute, onNavigate, onUserUpdate }: AdminSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user.fullName || "");
  const [email] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>("en-US");

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);

    if (!fullName.trim()) {
      setProfileError("Name can't be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      if (fileInputRef.current?.files?.[0]) {
        const formData = new FormData();
        formData.append("avatar", fileInputRef.current.files[0]);
        await api.uploadAvatar(formData);
      }
      const res = await api.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (res?.success) {
        setProfileSaved(true);
        onUserUpdate?.(res.user || { ...user, fullName: fullName.trim(), phone: phone.trim() });
        setTimeout(() => setProfileSaved(false), 2500);
      } else {
        setProfileError(res?.message || "Couldn't save changes.");
      }
    } catch (e) {
      console.error("Failed to update profile:", e);
      setProfileError("Couldn't save changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (!currentPassword || !newPassword) {
      setPasswordError("Fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      if (res?.success) {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 2500);
      } else {
        setPasswordError(res?.message || "Couldn't update password.");
      }
    } catch (e) {
      console.error("Failed to update password:", e);
      setPasswordError("Couldn't update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="PROPERTY ADMIN"
      />
      <div className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 py-4">
          <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            + Add Property
          </button>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your account preferences and system configurations.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 xl:col-span-2">
              {/* Profile Settings */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-2">
                  <UserIcon size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Profile Settings</h2>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{profileError}</p>}
                  {profileSaved && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                      <Check size={14} /> Profile updated.
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon size={24} className="text-gray-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800"
                        aria-label="Change profile picture"
                      >
                        <Camera size={12} />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif"
                        onChange={handleAvatarPick}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Profile Picture</p>
                      <p className="text-xs text-gray-400">PNG, JPG or GIF up to 5MB. Recommended size 256×256px.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <label className="mb-1 block text-xs font-medium text-gray-600">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                      placeholder="+1 (555) 000-1234"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {savingProfile && <Loader2 size={14} className="animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Security */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Security</h2>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {passwordError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>}
                  {passwordSaved && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                      <Check size={14} /> Password updated.
                    </p>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {savingPassword && <Loader2 size={14} className="animate-spin" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Preferences */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sliders size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Preferences</h2>
                </div>
                <p className="mb-2 text-xs font-medium text-gray-500">Application Language</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="language"
                      checked={language === "en-US"}
                      onChange={() => setLanguage("en-US")}
                      className="h-4 w-4 accent-gray-900"
                    />
                    English (US)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="language"
                      checked={language === "ne"}
                      onChange={() => setLanguage("ne")}
                      className="h-4 w-4 accent-gray-900"
                    />
                    Nepali
                  </label>
                </div>
              </div>

              {/* Account Actions */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-red-600">Account Actions</h2>
                <p className="mb-4 text-xs text-gray-500">Securely end your current session across this device.</p>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>

              {/* System Information */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Info size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">System Information</h2>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>Version 1.2.4</p>
                  <p>Last Updated: {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}