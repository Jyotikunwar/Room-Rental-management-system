import { useEffect, useState } from "react";
import {
  Bell, User as UserIcon, Lock, CreditCard,
  Trash2, Camera, Check, Plus, ShieldCheck, Upload, AlertTriangle, Loader2,
  Landmark, Smartphone, Wallet, X,
} from "lucide-react";
import type { User, PaymentMethod } from "../../services/api";
import { api } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";
import EnterLocationSection from "./EnterLocationSection";

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

const METHOD_ICON: Record<PaymentMethod["type"], typeof Landmark> = {
  ESEWA: Smartphone,
  KHALTI: Smartphone,
  BANK: Landmark,
  CASH: Wallet,
};

const METHOD_TYPES: { value: PaymentMethod["type"]; label: string }[] = [
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
];

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
  const [phone, setPhone] = useState(user.phone ?? "");
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

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [methodBusyId, setMethodBusyId] = useState<number | null>(null);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newMethodType, setNewMethodType] = useState<PaymentMethod["type"]>("ESEWA");
  const [newMethodLabel, setNewMethodLabel] = useState("");
  const [newMethodDetail, setNewMethodDetail] = useState("");
  const [addingMethod, setAddingMethod] = useState(false);

  const loadMethods = () => {
    setMethodsLoading(true);
    api
      .getPaymentMethods()
      .then((res) => {
        if (res.success === false) throw new Error(res.message || "Couldn't load payment methods.");
        setMethods(res.methods ?? []);
      })
      .catch((err) => setMethodsError(err instanceof Error ? err.message : "Couldn't load payment methods."))
      .finally(() => setMethodsLoading(false));
  };

  useEffect(() => {
    loadMethods();
  }, []);

  // Live-validate the ID number as the user types / changes document type.
  useEffect(() => {
    if (!idType && !idNumber) {
      setIdFieldError(null);
      return;
    }
    setIdFieldError(validateIdNumber(idType, idNumber));
  }, [idType, idNumber]);

  const handleAddMethod = async () => {
    if (!newMethodLabel.trim()) return;
    setAddingMethod(true);
    try {
      const res = await api.addPaymentMethod({
        type: newMethodType,
        label: newMethodLabel.trim(),
        detail: newMethodDetail.trim() || undefined,
      });
      if (res.success === false) throw new Error(res.message || "Couldn't add payment method.");
      setMethods((prev) => [...prev.map((m) => ({ ...m, isDefault: res.method.isDefault ? false : m.isDefault })), res.method]);
      setAddMethodOpen(false);
      setNewMethodLabel("");
      setNewMethodDetail("");
      setNewMethodType("ESEWA");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't add payment method.");
    } finally {
      setAddingMethod(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setMethodBusyId(id);
    try {
      const res = await api.setDefaultPaymentMethod(id);
      if (res.success === false) throw new Error(res.message || "Couldn't set default.");
      setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't set default.");
    } finally {
      setMethodBusyId(null);
    }
  };

  const handleDeleteMethod = async (id: number) => {
    setMethodBusyId(id);
    try {
      const res = await api.deletePaymentMethod(id);
      if (res.success === false) throw new Error(res.message || "Couldn't remove payment method.");
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't remove payment method.");
    } finally {
      setMethodBusyId(null);
    }
  };

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
      setAvatarUrl(res.user?.avatarUrl ?? res.avatarUrl ?? "");
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
      setIsIdVerified(false); // any edit resets verification, matches backend behavior
      setIdMessage({ text: "Identification saved. Pending verification.", ok: true });
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
      setIdDocumentUrl(res.user?.idDocumentUrl ?? "");
      setIsIdVerified(false);
      setIdMessage({ text: "Document uploaded. Pending verification.", ok: true });
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
            <button className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200" aria-label="Account">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </button>
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
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName || "U"}`}
                  alt={fullName}
                  className="h-16 w-16 rounded-full bg-stone-200 object-cover"
                />
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

          {/* ---- Payment methods ---- */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold">Payment Methods</h3>
            </div>

            {methodsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-stone-400" />
              </div>
            ) : methodsError ? (
              <p className="py-3 text-xs text-rose-600">{methodsError}</p>
            ) : (
              <>
                {methods.length === 0 ? (
                  <p className="py-3 text-xs text-stone-400">No payment methods added yet.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-stone-100">
                    {methods.map((m) => {
                      const Icon = METHOD_ICON[m.type];
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <Icon size={14} />
                            </span>
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                                {m.label}
                                {m.isDefault && (
                                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                    Default
                                  </span>
                                )}
                              </p>
                              {m.detail && <p className="text-xs text-stone-500">{m.detail}</p>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {methodBusyId === m.id ? (
                              <Loader2 size={13} className="animate-spin text-stone-400" />
                            ) : (
                              <>
                                {!m.isDefault && (
                                  <button
                                    onClick={() => handleSetDefault(m.id)}
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                  >
                                    Set Default
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMethod(m.id)}
                                  className="text-stone-400 hover:text-rose-500"
                                  aria-label="Remove payment method"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!addMethodOpen ? (
                  <button
                    onClick={() => setAddMethodOpen(true)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                  >
                    <Plus size={13} /> Add another payment method
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-700">New Payment Method</p>
                      <button onClick={() => setAddMethodOpen(false)} className="text-stone-400 hover:text-stone-600">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <select
                        value={newMethodType}
                        onChange={(e) => setNewMethodType(e.target.value as PaymentMethod["type"])}
                        className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none"
                      >
                        {METHOD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <input
                        value={newMethodLabel}
                        onChange={(e) => setNewMethodLabel(e.target.value)}
                        placeholder="Label (e.g. My eSewa)"
                        className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none"
                      />
                      <input
                        value={newMethodDetail}
                        onChange={(e) => setNewMethodDetail(e.target.value)}
                        placeholder="Detail (e.g. 98XXXXXX21) — optional"
                        className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none sm:col-span-2"
                      />
                    </div>
                    <button
                      onClick={handleAddMethod}
                      disabled={addingMethod || !newMethodLabel.trim()}
                      className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                    >
                      {addingMethod && <Loader2 size={12} className="animate-spin" />}
                      Add Method
                    </button>
                  </div>
                )}
              </>
            )}
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
