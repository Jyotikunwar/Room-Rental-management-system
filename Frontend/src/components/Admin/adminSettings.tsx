import { useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  ShieldCheck,
  Sliders,
  LogOut,
  Camera,
  Loader2,
  Check,
  Search,
  Bell,
  X,
  Server,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { api, type User, getImageUrl } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminSettingsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onUserUpdate?: (user: User) => void;
  onAddProperty?: () => void;
}

type SettingsCategory = "ALL" | "PROFILE" | "PLATFORM" | "SECURITY" | "NOTIFICATIONS";

const CATEGORY_TABS: { key: SettingsCategory; label: string }[] = [
  { key: "ALL", label: "All Settings" },
  { key: "PROFILE", label: "Profile & Account" },
  { key: "PLATFORM", label: "Platform Controls" },
  { key: "NOTIFICATIONS", label: "Notifications" },
  { key: "SECURITY", label: "Security & Passwords" },
];

export default function AdminSettings({
  user,
  onLogout,
  activeRoute,
  onNavigate,
  onUserUpdate,
  onAddProperty: _onAddProperty,
}: AdminSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Navigation Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("ALL");

  // Profile State
  const [fullName, setFullName] = useState(user.fullName || "");
  const [email] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Platform & System Control Preferences
  const [systemPrefs, setSystemPrefs] = useState({
    systemMaintenanceMode: false,
    autoApproveListings: false,
    requireIdVerification: true,
    emailAlerts: true,
    bookingAlerts: true,
    paymentAlerts: true,
    maintenanceAlerts: true,
    auditLogging: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await api.getAdminSettings();
      if (res?.success && res.settings) {
        if (res.settings.fullName) setFullName(res.settings.fullName);
        if (res.settings.phone) setPhone(res.settings.phone);
        if (res.settings.notificationPrefs) {
          setSystemPrefs((prev) => ({ ...prev, ...res.settings.notificationPrefs }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch admin settings:", e);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

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
      setProfileError("Name cannot be empty.");
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
        showToast("Profile updated successfully.");
        setTimeout(() => setProfileSaved(false), 2500);
      } else {
        setProfileError(res?.message || "Could not save changes.");
      }
    } catch (e) {
      console.error("Failed to update profile:", e);
      setProfileError("Could not save changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill in both current and new password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
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
        showToast("Password updated successfully.");
        setTimeout(() => setPasswordSaved(false), 2500);
      } else {
        setPasswordError(res?.message || "Could not update password.");
      }
    } catch (e) {
      console.error("Failed to update password:", e);
      setPasswordError("Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleTogglePref(key: keyof typeof systemPrefs) {
    const updated = { ...systemPrefs, [key]: !systemPrefs[key] };
    setSystemPrefs(updated);
    setSavingPrefs(true);
    try {
      const res = await api.updateAdminSettings({ notificationPrefs: updated });
      if (res?.success) {
        showToast("Setting preference updated.");
      }
    } catch (e) {
      console.error("Failed to save settings preference:", e);
      showToast("Error updating preference.");
    } finally {
      setSavingPrefs(false);
    }
  }

  // Filter sections visibility based on search & activeCategory
  const q = searchQuery.trim().toLowerCase();

  const showProfile =
    (activeCategory === "ALL" || activeCategory === "PROFILE") &&
    (!q || "profile account name email phone avatar".includes(q));

  const showPlatform =
    (activeCategory === "ALL" || activeCategory === "PLATFORM") &&
    (!q || "platform system maintenance auto approve id verification audit logging controls".includes(q));

  const showNotifications =
    (activeCategory === "ALL" || activeCategory === "NOTIFICATIONS") &&
    (!q || "notifications email alerts booking payment maintenance digest alerts".includes(q));

  const showSecurity =
    (activeCategory === "ALL" || activeCategory === "SECURITY") &&
    (!q || "security password change lock credentials reset".includes(q));

  const currentAvatar = avatarPreview || (user.avatarUrl ? getImageUrl(user.avatarUrl) : null);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 font-sans">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT CONSOLE"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setting options..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex gap-3 items-center">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 flex-1">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-4 rounded-xl bg-gray-900 text-white px-4 py-3 text-sm font-medium shadow-md flex items-center justify-between animate-in fade-in">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Configure profile, system parameters, security controls, and notifications.</p>
          </div>

          {/* Category Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm w-fit">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === tab.key ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left Column (Main Controls) */}
            <div className="space-y-6 xl:col-span-2">
              {/* Profile Settings Section */}
              {showProfile && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <UserIcon size={18} className="text-gray-700" />
                    <h2 className="text-base font-bold text-gray-900">Profile Settings</h2>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {profileError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 font-medium">{profileError}</p>}
                    {profileSaved && (
                      <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 font-medium">
                        <Check size={14} /> Profile updated successfully.
                      </p>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                          {currentAvatar ? (
                            <img src={currentAvatar} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <UserIcon size={28} className="text-gray-400" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
                          aria-label="Change profile picture"
                        >
                          <Camera size={13} />
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
                        <p className="text-sm font-semibold text-gray-800">Profile Photo</p>
                        <p className="text-xs text-gray-500">JPG, PNG or GIF. Max file size 5MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-gray-900 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Email Address (Read-only)</label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-500 outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-gray-900"
                        placeholder="+977-9800000000"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors shadow-sm"
                      >
                        {savingProfile && <Loader2 size={14} className="animate-spin" />}
                        Save Profile Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Platform & System Control Center */}
              {showPlatform && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-gray-700" />
                      <h2 className="text-base font-bold text-gray-900">Platform & System Controls</h2>
                    </div>
                    {savingPrefs && <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">Manage critical system rules, approval policies, and operational modes.</p>

                  <div className="space-y-4 divide-y divide-gray-100">
                    {/* Maintenance mode */}
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">System Maintenance Mode</p>
                          {systemPrefs.systemMaintenanceMode && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">ACTIVE</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Temporarily restrict public listing access for scheduled maintenance.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("systemMaintenanceMode")}
                        className="text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        {systemPrefs.systemMaintenanceMode ? (
                          <ToggleRight size={32} className="text-red-600" />
                        ) : (
                          <ToggleLeft size={32} className="text-gray-300" />
                        )}
                      </button>
                    </div>

                    {/* Auto approve listings */}
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Auto-Approve Room Listings</p>
                        <p className="text-xs text-gray-500">Automatically approve new property listings submitted by landlords without manual review.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("autoApproveListings")}
                        className="text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        {systemPrefs.autoApproveListings ? (
                          <ToggleRight size={32} className="text-blue-600" />
                        ) : (
                          <ToggleLeft size={32} className="text-gray-300" />
                        )}
                      </button>
                    </div>

                    {/* Tenant ID verification requirement */}
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Require Tenant ID Verification</p>
                        <p className="text-xs text-gray-500">Mandate official document upload (Citizenship/Passport) before booking confirmation.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("requireIdVerification")}
                        className="text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        {systemPrefs.requireIdVerification ? (
                          <ToggleRight size={32} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={32} className="text-gray-300" />
                        )}
                      </button>
                    </div>

                    {/* System Audit logging */}
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Enable Comprehensive Audit Logging</p>
                        <p className="text-xs text-gray-500">Track and record detailed system activities, logins, and administrative actions.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("auditLogging")}
                        className="text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        {systemPrefs.auditLogging ? (
                          <ToggleRight size={32} className="text-gray-900" />
                        ) : (
                          <ToggleLeft size={32} className="text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security & Password Section */}
              {showSecurity && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <ShieldCheck size={18} className="text-gray-700" />
                    <h2 className="text-base font-bold text-gray-900">Security & Password</h2>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {passwordError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 font-medium">{passwordError}</p>}
                    {passwordSaved && (
                      <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 font-medium">
                        <Check size={14} /> Password updated successfully.
                      </p>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-gray-900"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-gray-900"
                          placeholder="At least 8 characters"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-gray-900"
                          placeholder="Re-enter new password"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors shadow-sm"
                      >
                        {savingPassword && <Loader2 size={14} className="animate-spin" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column (Notifications & Account Actions) */}
            <div className="space-y-6">
              {/* Notification Preferences */}
              {showNotifications && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Bell size={18} className="text-gray-700" />
                    <h2 className="text-base font-bold text-gray-900">Email & Alerts</h2>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                      <span>Booking Requests Notification</span>
                      <input
                        type="checkbox"
                        checked={systemPrefs.bookingAlerts}
                        onChange={() => handleTogglePref("bookingAlerts")}
                        className="h-4 w-4 accent-gray-900 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                      <span>Payment & Invoice Alerts</span>
                      <input
                        type="checkbox"
                        checked={systemPrefs.paymentAlerts}
                        onChange={() => handleTogglePref("paymentAlerts")}
                        className="h-4 w-4 accent-gray-900 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                      <span>Urgent Maintenance Alerts</span>
                      <input
                        type="checkbox"
                        checked={systemPrefs.maintenanceAlerts}
                        onChange={() => handleTogglePref("maintenanceAlerts")}
                        className="h-4 w-4 accent-gray-900 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                      <span>Platform Summary Digest</span>
                      <input
                        type="checkbox"
                        checked={systemPrefs.emailAlerts}
                        onChange={() => handleTogglePref("emailAlerts")}
                        className="h-4 w-4 accent-gray-900 rounded"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* System Information */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Server size={18} className="text-gray-700" />
                  <h2 className="text-base font-bold text-gray-900">System Information</h2>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Platform Version:</span>
                    <span className="font-semibold text-gray-800">v2.4.0 (Enterprise)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Engine:</span>
                    <span className="font-semibold text-gray-800">PostgreSQL (Prisma)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System Status:</span>
                    <span className="font-semibold text-green-600 flex items-center gap-1">● Operational</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span>Last Updated:</span>
                    <span className="text-gray-500">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base font-bold text-red-600">Account Session</h2>
                <p className="mb-4 text-xs text-gray-500">Securely sign out of your administrator account session.</p>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out of Account
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Sign Out</h3>
                <p className="text-xs text-gray-500">Confirm session termination</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-5">
              Are you sure you want to end your current administrator session?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout?.();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}