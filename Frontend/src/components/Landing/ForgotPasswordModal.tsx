import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, X, Clock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { api } from "../../services/api";

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccessLogin?: () => void;
  initialToken?: string;
}

export default function ForgotPasswordModal({ onClose, onSuccessLogin, initialToken }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"EMAIL" | "RESET">(initialToken ? "RESET" : "EMAIL");
  
  // Form fields
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState(initialToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Timer state for 2-minute expiration (120 seconds)
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // If opened via URL resetToken
  useEffect(() => {
    if (initialToken) {
      setResetToken(initialToken);
      setStep("RESET");
      api.verifyResetToken(initialToken).then((res) => {
        if (res.success) {
          if (res.remainingSeconds !== undefined) setSecondsLeft(res.remainingSeconds);
          if (res.email) setEmail(res.email);
        } else {
          setError(res.message || "Invalid or expired reset link.");
          if (res.isExpired) setIsExpired(true);
        }
      });
    }
  }, [initialToken]);

  // Countdown timer effect when in RESET step
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === "RESET" && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, secondsLeft]);


  // Request password reset token
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!trimmedEmail.endsWith("@gmail.com")) {
      setError("Email address must end with @gmail.com");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(trimmedEmail);
      if (!res.success) {
        throw new Error(res.message || "Failed to generate password reset link.");
      }

      setResetToken(res.token || "");
      setSecondsLeft(res.expiresInSeconds || 120);
      setIsExpired(false);
      setStep("RESET");
      setSuccessMsg(`Password reset link generated for ${trimmedEmail}! Set your new password below within 2 minutes.`);


    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  // Perform password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isExpired || secondsLeft <= 0) {
      setError("Your 2-minute reset window has expired. Please request a new reset link.");
      return;
    }

    const activeToken = resetToken.trim() || initialToken || "";

    if (!activeToken) {
      setError("Reset token is required.");
      return;
    }

    // Password validation rules
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("New password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError("New password must contain at least one digit.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError("New password must contain at least one special character (!@#$%^&*).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token: activeToken,
        newPassword,
      });


      if (!res.success) {
        if (res.isExpired) {
          setIsExpired(true);
        }
        throw new Error(res.message || "Password reset failed.");
      }

      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        onClose();
        if (onSuccessLogin) onSuccessLogin();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X size={18} />
        </button>

        {/* Title / Header */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            <Lock size={13} /> Account Recovery
          </span>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">
            {step === "EMAIL" ? "Forgot Password?" : "Set New Password"}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            {step === "EMAIL"
              ? "Enter your registered @gmail.com email address to reset your password."
              : `Resetting password for ${email}. Please complete within 2 minutes.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === "EMAIL" ? (
          <form onSubmit={handleSendResetLink} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-700">Email Address</label>
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3.5 py-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                <Mail size={16} className="text-stone-400 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-400">Must end with @gmail.com</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Account...
                </>
              ) : (
                <>
                  Verify & Continue <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>
        ) : (
          /* STEP 2: Enter Token & New Password */
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Countdown Banner */}
            <div
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
                isExpired || secondsLeft <= 0
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : secondsLeft <= 30
                  ? "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={15} />
                <span>
                  {isExpired || secondsLeft <= 0
                    ? "Link Expired (2 min limit reached)"
                    : "Reset Link Expiration Timer:"}
                </span>
              </div>
              <span className="font-mono text-sm font-bold">
                {isExpired || secondsLeft <= 0 ? "0:00" : formatTime(secondsLeft)}
              </span>
            </div>

            {/* New Password (Single Eye Icon) */}

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">New Password</label>
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3.5 py-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                <Lock size={15} className="text-stone-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 upper, 1 digit, 1 special"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Confirm New Password</label>
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3.5 py-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                <Lock size={15} className="text-stone-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            {isExpired || secondsLeft <= 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStep("EMAIL");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 shadow-md"
              >
                Request New Reset Link
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
