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

type SignupFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  agreedToTerms: boolean;
};
type FieldErrors = Partial<Record<keyof SignupFormValues, string>>;

function validateSignup(values: SignupFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (values.fullName.trim().length < 5) {
    errors.fullName = "Full name must be at least 5 characters";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  } else if (!email.endsWith("@gmail.com")) {
    errors.email = "Email must end with @gmail.com";
  }

  if (!/^[0-9]{10}$/.test(values.phone.trim())) {
    errors.phone = "Phone number must be exactly 10 digits";
  }

  if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/[A-Z]/.test(values.password)) {
    errors.password = "Password must contain at least one uppercase letter";
  } else if (!/[0-9]/.test(values.password)) {
    errors.password = "Password must contain at least one number";
  } else if (!/[^A-Za-z0-9]/.test(values.password)) {
    errors.password = "Password must contain at least one special character";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords don't match";
  }

  if (!values.agreedToTerms) {
    errors.agreedToTerms = "You must agree to the Terms of Service to continue";
  }

  return errors;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const values: SignupFormValues = {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      role,
      agreedToTerms,
    };

    const errors = validateSignup(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await onSignup({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
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

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
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

            <div>
              <FormField label="Full Name" icon={<User size={15} />}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </FormField>
              {fieldErrors.fullName && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.fullName}</p>}
            </div>

            <div>
              <FormField label="Email" icon={<Mail size={15} />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </FormField>
              {fieldErrors.email && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <FormField label="Phone Number" icon={<Phone size={15} />}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone number"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </FormField>
              {fieldErrors.phone && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.phone}</p>}
            </div>

            <div>
              <FormField label="Password" icon={<Lock size={15} />}>
                <input
                  type={showPassword ? "text" : "password"}
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
              {fieldErrors.password ? (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-[11px] text-stone-400">
                  Min 8 characters, 1 uppercase letter, 1 number, 1 special character.
                </p>
              )}
            </div>

            <div>
              <FormField label="Confirm Password" icon={<Lock size={15} />}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </FormField>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <div>
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
              {fieldErrors.agreedToTerms && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.agreedToTerms}</p>
              )}
            </div>

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
