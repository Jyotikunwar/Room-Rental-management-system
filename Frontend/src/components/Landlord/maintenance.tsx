import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Wrench, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { api, type MaintenanceRequest, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordMaintenanceProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600",
  MEDIUM: "bg-amber-50 text-amber-600",
  LOW: "bg-blue-50 text-blue-600",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  RESOLVED: "bg-green-50 text-green-600",
  REJECTED: "bg-gray-100 text-gray-500",
};


export default function LandlordMaintenance({ user, onLogout, activeRoute, onNavigate }: LandlordMaintenanceProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await api.getMaintenanceRequests();
      if (res.success) setRequests(res.complaints || []);
    } catch (e) {
      console.error("Failed to load maintenance requests:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesPriority = priorityFilter === "ALL" || r.priority === priorityFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesPriority && matchesStatus;
    });
  }, [requests, priorityFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
    resolved: requests.filter((r) => r.status === "RESOLVED").length,
  }), [requests]);

  async function handleStatusChange(req: MaintenanceRequest, status: MaintenanceRequest["status"]) {
    setUpdatingId(req.id);
    const prev = requests;
    setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status } : r))); // optimistic
    try {
      const res = await api.updateMaintenanceStatus(req.id, status);
      if (!res.success) setRequests(prev);
    } catch (e) {
      console.error("Failed to update status:", e);
      setRequests(prev);
    } finally {
      setUpdatingId(null);
    }
  }

  const statCards = [
    { label: "Total Requests", value: stats.total, icon: Wrench, color: "text-gray-900" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600" },
    { label: "In Progress", value: stats.inProgress, icon: Loader2, color: "text-blue-600" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Maintenance Management</h1>
          <p className="mt-1 text-sm text-gray-500">Requests tenants have filed against your properties.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
                  <Icon size={15} className={c.color} />
                </div>
                <p className={`mt-2 text-2xl font-bold ${c.color}`}>{loading ? "—" : c.value}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-base font-semibold text-gray-900">Requests</h2>
            <Select value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "ALL", label: "Priority: All" }, { value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" }]} />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: "ALL", label: "Status: All" }, { value: "PENDING", label: "Pending" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "RESOLVED", label: "Resolved" }, { value: "REJECTED", label: "Rejected" }]} />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading requests...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No requests match your filters.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 font-medium">Request</th>
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Tenant</th>
                      <th className="pb-3 font-medium">Priority</th>
                      <th className="pb-3 font-medium">Filed</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((req) => (
                      <tr key={req.id} className="border-t border-gray-100">
                        <td className="py-3">
                          <p className="font-medium text-gray-900">{req.title}</p>
                          <p className="max-w-xs truncate text-xs text-gray-400">{req.description}</p>
                        </td>
                        <td className="py-3 text-gray-700">{req.booking?.room?.title || "—"}</td>
                        <td className="py-3 text-gray-700">{req.user?.fullName || "—"}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLE[req.priority]}`}>{req.priority}</span>
                        </td>
                        <td className="py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={req.status}
                              onChange={(e) => handleStatusChange(req, e.target.value as MaintenanceRequest["status"])}
                              disabled={updatingId === req.id}
                              className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${STATUS_STYLE[req.status]}`}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                            {updatingId === req.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((req) => (
                  <div key={req.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{req.title}</p>
                        <p className="text-xs text-gray-400">{req.booking?.room?.title || "—"} · {req.user?.fullName || "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[req.priority]}`}>{req.priority}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{req.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req, e.target.value as MaintenanceRequest["status"])}
                        disabled={updatingId === req.id}
                        className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium outline-none ${STATUS_STYLE[req.status]}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}