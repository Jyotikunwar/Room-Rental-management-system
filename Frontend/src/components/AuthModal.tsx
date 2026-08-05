import React, { useState } from "react";
import type { User } from "../services/api";
import { api, setToken, setUser } from "../services/api";
import { X, LogIn, UserPlus, Sparkles } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"TENANT" | "LANDLORD">("TENANT");
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    try {
      if (isLogin) {
        const res = await api.login(email, password);
        setStatus({ success: res.success, message: res.message });
        if (res.success) {
          setToken(res.token);
          setUser(res.user);
          onSuccess(res.user);
          onClose();
        }
      } else {
        const res = await api.signup({ fullName, email, password, phone, role });
        setStatus({ success: res.success, message: res.message });
        if (res.success) {
          setToken(res.token);
          setUser(res.user);
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (e) {
      setStatus({ success: false, message: "Authentication request failed" });
    }
  };

  // Quick Demo Logins for Viva & Testing
  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    try {
      const res = await api.login(demoEmail, demoPass);
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        onSuccess(res.user);
        onClose();
      } else {
        setStatus({ success: false, message: res.message || "Quick login failed" });
      }
    } catch (e) {
      setStatus({ success: false, message: "Quick login failed" });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <span className="badge badge-purple">Account Portal</span>
          <h2>{isLogin ? "Welcome Back to RentPulse" : "Create Your Account"}</h2>
          <p>{isLogin ? "Sign in to access personalized recommendations & favorites." : "Register as a Tenant or Landlord to get started."}</p>
        </div>

        {/* Quick Demo Buttons */}
        <div className="demo-login-box glass-card">
          <div className="demo-title">
            <Sparkles size={16} className="text-amber" />
            <span>1-Click Viva Demo Accounts:</span>
          </div>
          <div className="demo-btn-group">
            <button className="btn btn-secondary btn-xs" onClick={() => handleQuickLogin("tenant@example.com", "password123")}>
              Tenant Demo
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => handleQuickLogin("ram.landlord@rental.com", "password123")}>
              Landlord Demo
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => handleQuickLogin("admin@rental.com", "admin123")}>
              Admin Demo
            </button>
          </div>
        </div>

        {status && (
          <div className={`status-msg ${status.success ? "success" : "error"}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
              <div className="role-selector">
                <span>Account Role:</span>
                <label className={`role-chip ${role === "TENANT" ? "active" : ""}`}>
                  <input type="radio" name="role" value="TENANT" checked={role === "TENANT"} onChange={() => setRole("TENANT")} hidden />
                  Tenant
                </label>
                <label className={`role-chip ${role === "LANDLORD" ? "active" : ""}`}>
                  <input type="radio" name="role" value="LANDLORD" checked={role === "LANDLORD"} onChange={() => setRole("LANDLORD")} hidden />
                  Landlord
                </label>
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />

          <button type="submit" className="btn btn-primary w-full">
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{isLogin ? "Sign In" : "Create Account"}</span>
          </button>
        </form>

        <div className="auth-toggle">
          <button className="btn-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
