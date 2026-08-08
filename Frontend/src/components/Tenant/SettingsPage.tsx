import { useEffect, useRef, useState } from "react";
import {
  Bell, Settings as SettingsIcon, User as UserIcon, Lock, CreditCard,
  Trash2, Camera, Check, Plus, ShieldCheck, Upload, AlertTriangle, Loader2, X, Star,
} from "lucide-react";
import type { User } from "../../services/api";
import { api, UPLOAD_BASE_URL } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";

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

interface SavedPaymentMethod {
  id: number;
  type: "ESEWA" | "KHALTI" | "BANK";
  label: string;
  detail: string | null;
  isDefault: boolean;
}

const ID_TYPES = [
  { value: "CITIZENSHIP", label: "Citizenship Certificate" },
  { value: "PASSPORT", label: "Passport" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
];

export default function SettingsPage({ user, onLogout, onNavigate }: SettingsPageProps) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [email] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState((user as any).avatarUrl ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [idType, setIdType] = useState((user as any).idType ?? "");
  const [idNumber, setIdNumber] = useState((user as any).idNumber ?? "");
  const [idDocumentUrl, setIdDocumentUrl] = useState((user as any).idDocumentUrl ?? "");
  const [isIdVerified, setIsIdVerified] = useState((user as any).isIdVerified ?? false);
  const [idSaving, setIdSaving] = useState(false);
  const [idUploading, setIdUploading] = useState(false);
  const [idMessage, setIdMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [methods, setMethods] = useState<SavedPaymentMethod[] | undefined>(undefined);
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = () => {
    api.getPaymentMethods().then((res) => {
      if (res.success !== false) setMethods(res.methods || []);
    });
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

  const handleAvatarSelected = async (file: File) => {
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.uploadAvatar(formData);
      if (res.success === false) throw new Error(res.message || "Couldn't upload photo.");
      setAvatarUrl(res.user?.avatarUrl ?? "");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't upload photo.");
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
    if (!idType || !idNumber.trim()) {
      setIdMessage({ text: "Select a document type and enter its number.", ok: false });
      return;
    }
    setIdSaving(true);
    setIdMessage(null);
    try {
      const res = await api.updateIdentification({ idType, idNumber: idNumber.trim() });
      if (res.success === false) throw new Error(res.message || "Couldn't save your identification.");
      setIsIdVerified(false);
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

  const hasIdentification = Boolean(idType && idNumber && idDocumentUrl);
  const idDocumentFullUrl = idDocumentUrl ? `${UPLOAD_BASE_URL}${idDocumentUrl}` : "";
  const avatarFullUrl = avatarUrl
    ? `${UPLOAD_BASE_URL}${avatarUrl}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${fullName || "U"}`;

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar active="Settings" onNavigate={handleNavigate} onSettings={() => {}} onLogout={onLogout} />

      <div className="flex-1">
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
              <img src={avatarFullUrl} alt={fullName} className="h-full w-full object-cover" />
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
                <img src={avatarFullUrl} alt={fullName} className="h-16 w-16 rounded-full bg-stone-200 object-cover" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white disabled:opacity-60"
                  aria-label="Change photo"
                >
                  {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarSelected(file);
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{fullName || "Your name"}</p>
                <p className="text-xs text-stone-500">{email}</p>
              </div>
            </div>

            {profileError && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{profileError}</div>}

            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Full Name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Email Address
                <input type="email" value={email} disabled className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 sm:col-span-2">
                Phone Number
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500" />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button type="submit" disabled={profileSaving} className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60">
                  {profileSaving && <Loader2 size={12} className="animate-spin" />}
                  Save Changes
                </button>
                {profileSaved && <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Check size={13} /> Saved</span>}
              </div>
            </form>
          </section>

          {/* ---- Identity Verification ---- */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold">Identity Verification</h3>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isIdVerified ? "bg-emerald-50 text-emerald-600" : hasIdentification ? "bg-amber-50 text-amber-600" : "bg-stone-100 text-stone-500"
              }`}>
                {isIdVerified ? "Verified" : hasIdentification ? "Pending Verification" : "Not Provided"}
              </span>
            </div>

            <p className="mb-4 text-xs text-stone-500">
              A valid government ID is required before you can book a room. Your landlord and RoomRent Manager use this to confirm your identity.
            </p>

            {idMessage && (
              <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${idMessage.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {idMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Document Type
                <select value={idType} onChange={(e) => setIdType(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500">
                  <option value="">Select document type</option>
                  {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                Document Number
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 12-34-56-78901" className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500" />
              </label>
            </div>

            <button onClick={handleSaveIdentification} disabled={idSaving} className="mt-3 flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60">
              {idSaving && <Loader2 size={12} className="animate-spin" />}
              Save Identification
            </button>

            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                Document Photo (front side)
                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">Required</span>
              </p>
              {idDocumentUrl ? (
                <button type="button" onClick={() => setPreviewOpen(true)} className="mb-2 block">
                  <img src={idDocumentFullUrl} alt="Uploaded ID — click to view full size" className="h-32 w-auto cursor-zoom-in rounded-lg border border-stone-200 object-cover transition hover:opacity-80" />
                </button>
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
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                New Password
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </label>
            </div>
            <button onClick={handleChangePassword} disabled={passwordSaving} className="mt-4 flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">
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

            {methods === undefined ? (
              <p className="py-3 text-center text-xs text-stone-400">Loading...</p>
            ) : methods.length === 0 ? (
              <p className="mb-3 text-xs text-stone-400">No saved payment methods yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-stone-100">
                {methods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      {m.isDefault && <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />}
                      <div>
                        <p className="text-sm font-medium text-stone-800">{m.label}</p>
                        <p className="text-xs text-stone-500">{m.detail || (m.isDefault ? "Default" : "Saved")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingMethod(m); setMethodModalOpen(true); }}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setEditingMethod(null); setMethodModalOpen(true); }}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
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
              {!deleteConfirming ? (
                <button onClick={() => setDeleteConfirming(true)} className="shrink-0 rounded-lg border border-rose-300 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">
                  Delete Account
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={handleDeleteAccount} disabled={deleting} className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60">
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

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewOpen(false)}>
          <img src={idDocumentFullUrl} alt="ID document full size" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button onClick={() => setPreviewOpen(false)} className="absolute right-5 top-5 text-white hover:text-stone-300"><X size={24} /></button>
        </div>
      )}

      {methodModalOpen && (
        <PaymentMethodModal
          method={editingMethod}
          onClose={() => setMethodModalOpen(false)}
          onSaved={() => { setMethodModalOpen(false); loadPaymentMethods(); }}
        />
      )}
    </div>
  );
}

function PaymentMethodModal({
  method,
  onClose,
  onSaved,
}: {
  method: SavedPaymentMethod | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<SavedPaymentMethod["type"]>(method?.type ?? "ESEWA");
  const [label, setLabel] = useState(method?.label ?? "");
  const [detail, setDetail] = useState(method?.detail ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(method);

  async function handleSave() {
    if (!label.trim()) {
      setError("Give this method a label (e.g. \"eSewa\").");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = isEditing
        ? await api.updatePaymentMethod(method!.id, { label: label.trim(), detail: detail.trim() || undefined })
        : await api.addPaymentMethod({ type, label: label.trim(), detail: detail.trim() || undefined });
      if (res.success === false) throw new Error(res.message || "Couldn't save this payment method.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this payment method.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault() {
    if (!method) return;
    setSaving(true);
    try {
      await api.setDefaultPaymentMethod(method.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!method) return;
    if (!confirm("Remove this payment method?")) return;
    setDeleting(true);
    try {
      await api.deletePaymentMethod(method.id);
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">{isEditing ? "Manage Payment Method" : "Add Payment Method"}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{error}</div>}

        {!isEditing && (
          <label className="mb-3 block text-xs font-medium text-stone-500">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as SavedPaymentMethod["type"])} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none">
              <option value="ESEWA">eSewa</option>
              <option value="KHALTI">Khalti</option>
              <option value="BANK">Bank Account</option>
            </select>
          </label>
        )}

        <label className="mb-3 block text-xs font-medium text-stone-500">
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. eSewa" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none" />
        </label>

        <label className="mb-4 block text-xs font-medium text-stone-500">
          Detail (optional — masked number is fine)
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 98XXXXXX21" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none" />
        </label>

        <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60">
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Method"}
        </button>

        {isEditing && (
          <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
            {!method!.isDefault ? (
              <button onClick={handleSetDefault} disabled={saving} className="text-xs font-medium text-blue-600 hover:underline">
                Set as default
              </button>
            ) : (
              <span className="text-xs font-medium text-stone-400">Default method</span>
            )}
            <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium text-rose-600 hover:underline">
              {deleting ? "Removing..." : "Remove"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
