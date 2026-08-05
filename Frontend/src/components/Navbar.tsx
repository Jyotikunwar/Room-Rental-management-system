import React from "react";
import type { User } from "../services/api";
import { removeToken, removeUser } from "../services/api";
import { Home, Sparkles, Heart, ShieldCheck, LogIn, LogOut, PlusCircle, Building } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenCreateRoom: () => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenCreateRoom,
  currentUser,
  setCurrentUser,
}) => {
  const handleLogout = () => {
    removeToken();
    removeUser();
    setCurrentUser(null);
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-content">
        {/* Brand Logo */}
        <div className="brand" onClick={() => setActiveTab("browse")}>
          <div className="brand-icon">
            <Building className="icon" />
          </div>
          <span className="brand-name gradient-text">RentPulse</span>
          <span className="badge badge-purple">AI Smart</span>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          <button
            className={`nav-btn ${activeTab === "browse" ? "active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            <Home className="btn-icon" />
            <span>Browse Rooms</span>
          </button>

          <button
            className={`nav-btn ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            <Sparkles className="btn-icon text-amber" />
            <span>AI Matches</span>
          </button>

          {currentUser?.role === "TENANT" && (
            <button
              className={`nav-btn ${activeTab === "favorites" ? "active" : ""}`}
              onClick={() => setActiveTab("favorites")}
            >
              <Heart className="btn-icon text-pink" />
              <span>My Favorites</span>
            </button>
          )}

          {currentUser?.role === "LANDLORD" && (
            <button
              className={`nav-btn ${activeTab === "landlord" ? "active" : ""}`}
              onClick={() => setActiveTab("landlord")}
            >
              <Building className="btn-icon" />
              <span>Landlord Studio</span>
            </button>
          )}

          {currentUser?.role === "ADMIN" && (
            <button
              className={`nav-btn ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              <ShieldCheck className="btn-icon text-cyan" />
              <span>Admin Viva Logs</span>
            </button>
          )}
        </div>

        {/* Auth / Profile Actions */}
        <div className="nav-actions">
          {currentUser ? (
            <div className="user-profile">
              {currentUser.role === "LANDLORD" && (
                <button className="btn btn-cyan btn-sm" onClick={onOpenCreateRoom}>
                  <PlusCircle size={16} />
                  <span>List Room</span>
                </button>
              )}
              <div className="user-badge">
                <span className="user-name">{currentUser.fullName}</span>
                <span className={`badge ${currentUser.role === "LANDLORD" ? "badge-emerald" : currentUser.role === "ADMIN" ? "badge-amber" : "badge-indigo"}`}>
                  {currentUser.role}
                </span>
              </div>
              <button className="btn-icon-only" title="Logout" onClick={handleLogout}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <LogIn size={18} />
              <span>Sign In / Demo</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
