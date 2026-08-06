import { useState } from "react";

import { FormField } from "./LoginPage";
import {
  Home,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  UserCircle2,
  Building2,
} from "lucide-react";

type UserRole = "TENANT" | "LANDLORD";

interface SignupPageProps {
  onSignup: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }) => Promise<void> | void;
  onNavigateToLogin?: () => void;
}

export default function SignupPage({ onSignup, onNavigateToLogin }: SignupPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("TENANT");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    try {
      await onSignup({ fullName, email, phone, password, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left branding panel — hidden on mobile */}
     

      {/* Right form panel */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Home size={16} />
            </span>
            <span className="text-lg font-bold text-stone-900">Horizon</span>
          </div>

          <h1 className="text-2xl font-bold text-stone-900">Create your account</h1>
          <p className="mt-1 text-sm text-stone-500">Get started finding or listing rooms today.</p>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Role selector */}
            <div>
              <span className="mb-1.5 block text-xs font-medium text-stone-600">I am a</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("TENANT")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    role === "TENANT"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <UserCircle2 size={15} /> Tenant
                </button>
                <button
                  type="button"
                  onClick={() => setRole("LANDLORD")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    role === "LANDLORD"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <Building2 size={15} /> Landlord
                </button>
              </div>
            </div>

            <FormField label="Full Name" icon={<User size={15} />}>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </FormField>

            <FormField label="Email" icon={<Mail size={15} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </FormField>

            <FormField label="Phone Number" icon={<Phone size={15} />}>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </FormField>

            <FormField label="Password" icon={<Lock size={15} />}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </FormField>

            <FormField label="Confirm Password" icon={<Lock size={15} />}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </FormField>

            <label className="flex items-start gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600"
              />
              I agree to the <span className="font-medium text-stone-700">Terms of Service</span> and{" "}
              <span className="font-medium text-stone-700">Privacy Policy</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Already have an account?{" "}
            <button onClick={onNavigateToLogin} className="font-medium text-blue-600 hover:underline">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
