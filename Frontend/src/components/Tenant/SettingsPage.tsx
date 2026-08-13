import { useEffect, useState } from "react";
import {
  Bell, User as UserIcon, Lock,
  Trash2, Camera, Check, ShieldCheck, Upload, AlertTriangle, Loader2,
} from "lucide-react";
import type { User } from "../../services/api";
import { api } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";
import EnterLocationSection from "./EnterLocationSection";
import Avatar from "../Avatar";

const LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  "Dashboard": "dashboard",
  "Find Property": "search",
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

type IdType = "CITIZENSHIP" | "PASSPORT" | "NATIONAL_ID" | "DRIVING_LICENSE";

// Format-only validation (not a real government lookup) — each pattern is a
// reasonable shape check for the document type, not proof the number exists.
const ID_TYPES: { value: IdType; label: string; placeholder: string; pattern: RegExp; hint: string }[] = [
  {
    value: "CITIZENSHIP",
    label: "Citizenship Certificate",
    placeholder: "e.g. 12-34-56-78901",
    pattern: /^\d{2,3}-\d{2}-\d{2}-\d{4,5}$/,
    hint: "Format: XX-XX-XX-XXXXX (digits and dashes only)",
  },
  {
    value: "PASSPORT",
    label: "Passport",
    placeholder: "e.g. PA1234567",
    pattern: /^[A-Za-z]{1,2}\d{6,8}$/,
    hint: "1–2 letters followed by 6–8 digits",
  },
  {
    value: "NATIONAL_ID",
    label: "National ID",
    placeholder: "e.g. 123456789012",
    pattern: /^\d{9,12}$/,
    hint: "9–12 digits, numbers only",
  },
  {
    value: "DRIVING_LICENSE",
    label: "Driving License",
    placeholder: "e.g. 12-345-678901",
    pattern: /^[A-Za-z0-9-]{6,15}$/,
    hint: "6–15 letters, digits, or dashes",
  },
];

function validateIdNumber(idType: string, idNumber: string): string | null {
  const def = ID_TYPES.find((t) => t.value === idType);
  if (!def) return "Select a document type.";
  if (!idNumber.trim()) return "Enter the document number.";
  if (!def.pattern.test(idNumber.trim())) return `Doesn't look like a valid ${def.label} number. ${def.hint}.`;
  return null;
}

export default function SettingsPage({ user, onLogout, onNavigate }: SettingsPageProps) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [email] = useState(user.email ?? "");
  const [phone] = useState(user.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState(() => ((user as { avatarUrl?: string }).avatarUrl ?? ""));
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [idType, setIdType] = useState(user.idType ?? "");
  const [idNumber, setIdNumber] = useState(user.idNumber ?? "");
  const [idDocumentUrl, setIdDocumentUrl] = useState(user.idDocumentUrl ?? "");
  const [isIdVerified, setIsIdVerified] = useState(user.isIdVerified ?? false);
  const [idSaving, setIdSaving] = useState(false);
  const [idUploading, setIdUploading] = useState(false);
  const [idMessage, setIdMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [idFieldError, setIdFieldError] = useState<string | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Live-validate the ID number as the user types / changes document type.
  useEffect(() => {
    if (!idType && !idNumber) {
      setIdFieldError(null);
      return;
    }
    setIdFieldError(validateIdNumber(idType, idNumber));
  }, [idType, idNumber]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await api.updateProfile({ fullName, phone });
      if (res.success === false) throw new Error(res.message || "Couldn't save changes.");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.uploadAvatar(formData);
      if (res.success === false) throw new Error(res.message || "Couldn't upload photo.");
      const newUrl = res.user?.avatarUrl ?? res.avatarUrl ?? "";
      setAvatarUrl(newUrl);
      user.avatarUrl = newUrl;
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.avatarUrl = newUrl;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (e) {
          console.error("Failed to update user in localStorage", e);
        }
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Couldn't upload photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordMessage({ text: "Fill in both password fields.", ok: false });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      if (res.success === false) throw new Error(res.message || "Couldn't update password.");
      setPasswordMessage({ text: "Password updated.", ok: true });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMessage({ text: err instanceof Error ? err.message : "Couldn't update password.", ok: false });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveIdentification = async () => {
    const validationError = validateIdNumber(idType, idNumber);
    if (validationError) {
      setIdFieldError(validationError);
      setIdMessage({ text: validationError, ok: false });
      return;
    }
    setIdSaving(true);
    setIdMessage(null);
    try {
      const res = await api.updateIdentification({ idType, idNumber: idNumber.trim() });
      if (res.success === false) throw new Error(res.message || "Couldn't save your identification.");
      
      const updatedUser = res.user || { ...user, idType, idNumber: idNumber.trim() };
      user.idType = updatedUser.idType;
      user.idNumber = updatedUser.idNumber;
      
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.idType = updatedUser.idType;
          parsed.idNumber = updatedUser.idNumber;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (e) {}
      }

      setIsIdVerified(false);
      setIdMessage({ text: "Identification details saved successfully! Upload your document photo below to complete verification.", ok: true });
    } catch (err) {
      setIdMessage({ text: err instanceof Error ? err.message : "Couldn't save your identification.", ok: false });
    } finally {
      setIdSaving(false);
    }
  };

  const handleUploadIdDocument = async (file: File) => {
    setIdUploading(true);
    setIdMessage(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await api.uploadIdDocument(formData);
      if (res.success === false) throw new Error(res.message || "Couldn't upload the document.");
      
      const newDocUrl = res.user?.idDocumentUrl ?? res.idDocumentUrl ?? "";
      setIdDocumentUrl(newDocUrl);

      user.idDocumentUrl = newDocUrl;

      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.idDocumentUrl = newDocUrl;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (e) {}
      }

      setIsIdVerified(false);
      setIdMessage({ text: "ID Document uploaded & saved successfully! You are now eligible to book rooms.", ok: true });
    } catch (err) {
      setIdMessage({ text: err instanceof Error ? err.message : "Couldn't upload the document.", ok: false });
    } finally {
      setIdUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await api.deleteAccount();
      if (res.success === false) throw new Error(res.message || "Couldn't delete your account.");
      onLogout();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  const hasIdentification = Boolean(user.idType && user.idNumber && idDocumentUrl);
  const selectedIdDef = ID_TYPES.find((t) => t.value === idType);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar user={user} active="Settings" onNavigate={handleNavigate} onSettings={() => {}} onLogout={onLogout} />

      <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <h1 className="text-lg font-semibold text-stone-700">RoomRent Manager</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate("notifications")} className="text-stone-400 hover:text-stone-600" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
              <Avatar name={user.fullName ?? "U"} avatarUrl={avatarUrl || user.avatarUrl} size={32} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <h2 className="mb-1 text-2xl font-bold">Settings</h2>
          <p className="mb-6 text-sm text-stone-500">Manage your profile, security, and identity verification.</p>

          {!hasIdentification && (
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                You'll need to add your ID details <span className="font-semibold">and upload a photo of it</span> below before you can book a room.
              </p>
            </div>
          )}

          {/* ---- Profile ---- */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserIcon size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold">Profile Information</h3>
            </div>

            <div className="mb-5 flex items-center gap-4">
              <div className="relative">
                <Avatar name={fullName || "U"} avatarUrl={avatarUrl || user.avatarUrl} size={64} />
                <label
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-800"
                  aria-label="Change photo"
                >
                  {avatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={12} />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">{fullName || "Your name"}</p>
                <p className="text-xs text-stone-500">{email}</p>
                {avatarError && <p className="mt-1 text-xs font-medium text-rose-600">{avatarError}</p>}
              </div>
            </div>

            {profileError && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{profileError}</div>}

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
                  disabled
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 sm:col-span-2">
                Phone Number (Set from Signup)
                <input
                  type="tel"
                  value={phone || "Not set"}
                  disabled
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 outline-none cursor-not-allowed"
                />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                >
                  {profileSaving && <Loader2 size={12} className="animate-spin" />}
                  Save Changes
                </button>
                {profileSaved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check size={13} /> Saved
                  </span>
                )}
              </div>
            </form>
          </section>

          <EnterLocationSection />

          {/* ---- Identity Verification ---- */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold">Identity Verification</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isIdVerified ? "bg-emerald-50 text-emerald-600" : hasIdentification ? "bg-amber-50 text-amber-600" : "bg-stone-100 text-stone-500"
                }`}
              >
                {isIdVerified ? "Verified" : hasIdentification ? "Pending Verification" : "Not Provided"}
              </span>
            </div>

            <p className="mb-4 text-xs text-stone-500">
              A valid government ID is required before you can book a room. Your landlord and RoomRent Manager use this to confirm your identity.
              {" "}This form checks the number's format only — full verification happens after review.
            </p>

            {idMessage && (
              <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${idMessage.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {idMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Document Type
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
                >
                  <option value="">Select document type</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Document Number
                <input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={selectedIdDef?.placeholder ?? "Select a document type first"}
                  className={`rounded-lg border px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500 ${
                    idFieldError ? "border-rose-300" : "border-stone-200"
                  }`}
                />
                {selectedIdDef && (
                  <span className={`mt-0.5 text-[11px] ${idFieldError ? "text-rose-500" : "text-stone-400"}`}>
                    {idFieldError ?? selectedIdDef.hint}
                  </span>
                )}
              </label>
            </div>

            <button
              onClick={handleSaveIdentification}
              disabled={idSaving || Boolean(idFieldError) || !idType || !idNumber.trim()}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-40"
            >
              {idSaving && <Loader2 size={12} className="animate-spin" />}
              Save Identification
            </button>

            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                Document Photo (front side)
                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">Required</span>
              </p>
              {idDocumentUrl ? (
                <img src={idDocumentUrl} alt="Uploaded ID" className="mb-2 h-32 w-auto rounded-lg border border-stone-200 object-cover" />
              ) : (
                <p className="mb-2 text-xs text-stone-400">No document uploaded yet — this is required before you can book a room.</p>
              )}
              <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                {idUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {idDocumentUrl ? "Replace Document" : "Upload Document"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={idUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadIdDocument(file);
                  }}
                />
              </label>
            </div>
          </section>

          {/* ---- Password ---- */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Lock size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold">Change Password</h3>
            </div>

            {passwordMessage && (
              <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${passwordMessage.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {passwordMessage.text}
              </div>
            )}

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
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {passwordSaving && <Loader2 size={12} className="animate-spin" />}
              Update Password
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
              {!deleteConfirming ? (
                <button
                  onClick={() => setDeleteConfirming(true)}
                  className="shrink-0 rounded-lg border border-rose-300 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Delete Account
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button onClick={() => setDeleteConfirming(false)} className="text-xs font-medium text-stone-500 hover:underline">
                    Cancel
                  </button>
                </div>
              )}
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
