import { useEffect, useState } from "react";
import type { User } from "../../services/api";
import { api } from "../../services/api";
import { Users, Building2, UserCheck, LogOut } from "lucide-react";

type AdminDashboardProps = {
  user: User;
  onLogout: () => void;
};

type AdminStats = {
  totalUsers: number;
  totalRooms: number;
  totalLandlords: number;
  totalTenants: number;
};

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getAdminStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch admin stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
    { label: "Total Rooms", value: stats?.totalRooms ?? 0, icon: Building2 },
    { label: "Landlords", value: stats?.totalLandlords ?? 0, icon: UserCheck },
    { label: "Tenants", value: stats?.totalTenants ?? 0, icon: Users },
  ];

  return (
    <div className="dashboard-container glass-panel">
      <div className="dashboard-header">
        <div>
          <span className="badge badge-emerald">Admin Workspace</span>
          <h1 className="dashboard-title">Welcome back, {user.fullName}</h1>
        </div>

        <button className="btn btn-secondary" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      {loading ? (
        <div className="empty-state glass-card">
          <p>Loading dashboard stats...</p>
        </div>
      ) : (
        <div className="admin-stats-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card admin-stat-card">
                <Icon size={24} className="text-cyan" />
                <p className="admin-stat-value">{card.value}</p>
                <p className="admin-stat-label">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
