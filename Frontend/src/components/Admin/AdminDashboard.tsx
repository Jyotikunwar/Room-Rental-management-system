import React, { useState, useEffect } from "react";
import type { RecommendationLog } from "../services/api";
import { api } from "../services/api";
import { Users, Building, Sparkles, Database } from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<RecommendationLog[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.getAdminStats(),
        api.getRecommendationLogs(),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (logsRes.success) setLogs(logsRes.logs || []);
    } catch (e) {
      console.error("Failed to fetch admin data:", e);
    }
  };

  return (
    <div className="admin-container glass-panel">
      <div className="admin-header">
        <div>
          <span className="badge badge-amber">Admin & Viva Audit Workspace</span>
          <h1 className="admin-title">System Analytics & Recommendation Logs</h1>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={fetchAdminData}>
          Refresh Logs
        </button>
      </div>

      {/* System Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card glass-card">
            <Users className="stat-icon text-indigo" />
            <div>
              <span className="stat-label">Total Registered Users</span>
              <h3 className="stat-value">{stats.totalUsers}</h3>
              <p className="stat-sub">{stats.totalTenants} Tenants • {stats.totalLandlords} Landlords</p>
            </div>
          </div>

          <div className="stat-card glass-card">
            <Building className="stat-icon text-cyan" />
            <div>
              <span className="stat-label">Total Room Listings</span>
              <h3 className="stat-value">{stats.totalRooms}</h3>
              <p className="stat-sub">{stats.availableRooms} Available for rent</p>
            </div>
          </div>

          <div className="stat-card glass-card">
            <Sparkles className="stat-icon text-amber" />
            <div>
              <span className="stat-label">Recommendation Log Runs</span>
              <h3 className="stat-value">{logs.length}</h3>
              <p className="stat-sub">Persisted in RecommendationLog DB table</p>
            </div>
          </div>
        </div>
      )}

      {/* Viva Audit Recommendation Logs Table */}
      <div className="logs-section">
        <div className="logs-header">
          <Database size={20} className="text-amber" />
          <h2>Phase 4 Recommendation Engine DB Logs (Viva Demonstration Audit)</h2>
        </div>

        <div className="table-responsive glass-card">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Tenant</th>
                <th>Recommended Room</th>
                <th>Similarity Score (70%)</th>
                <th>Popularity Score (30%)</th>
                <th>Final Score</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No recommendation logs recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                    <td>{log.tenant?.fullName || (log.tenantId ? `Tenant #${log.tenantId}` : "Anonymous / Search")}</td>
                    <td>
                      <strong>{log.room?.title || `Room #${log.roomId}`}</strong>
                      <span className="text-dim block text-xs">{log.room?.city} • NPR {log.room?.price}</span>
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        {(log.similarityScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-amber">
                        {(log.popularityScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-emerald font-bold">
                        {(log.finalScore * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
