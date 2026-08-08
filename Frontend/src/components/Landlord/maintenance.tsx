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

const PRIORITY_STYLE: Record<string, string> = { HIGH: "bg-red-50 text-red-600", MEDIUM: "bg-amber-50 text-amber-600", LOW: "bg-blue-50 text-blue-600" };
const STATUS_STYLE: Record<string, string> = { OPEN: "bg-amber-50 text-amber-600", IN_PROGRESS: "bg-blue-50 text-blue-600", RESOLVED: "bg-green-50 text-green-600" };
const STATUS_LABEL: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };

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
      const res = await (api as any).getMaintenanceRequests?.();
      if (res?.success) setRequests(res.requests || []);
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
    pending: requests.filter((r) => r.status === "OPEN").length,
    inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
    resolved: requests.filter((r) => r.status === "RESOLVED").length,
  }), [requests]);

  async function advanceStatus(req: MaintenanceRequest) {
    const next = req.status === "OPEN" ? "IN_PROGRESS" : req.status === "IN_PROGRESS" ? "RESOLVED" : "RESOLVED";
    setUpdatingId(req.id);
    try {
      const res = await (api as any).updateMaintenanceStatus?.(req.id, next);
      if (res?.success) await loadRequests();
    } catch (e) {
      console.error("Failed to update status:", e);
    } finally {
      setUpdatingId(null);
    }
  }

  const statCards = [
    { label: "Total Requests", value: stats.total, hint: "+2 this week", icon: Wrench, color: "text-gray-900" },
    { label: "Pending", value: stats.pending, hint: "Requires Attention", icon: Clock, color: "text-amber-600" },
    { label: "In Progress", value: stats.inProgress, hint: "Active", icon: Loader2, color: "text-blue-600" },
    { label: "Resolved", value: stats.resolved, hint: "Past 30 Days", icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
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
                <p className="mt-0.5 text-[11px] text-gray-400">{c.hint}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-base font-semibold text-gray-900">Maintenance Requests</h2>
            <Select value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "ALL", label: "Priority: All" }, { value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" }]} />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: "ALL", label: "Status: All" }, { value: "OPEN", label: "Open" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "RESOLVED", label: "Resolved" }]} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-medium">Ticket ID</th>
                  <th className="pb-3 font-medium">Property / Tenant</th>
                  <th className="pb-3 font-medium">Issue Type</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading requests...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No requests match your filters.</td></tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id} className="border-t border-gray-100">
                      <td className="py-3 font-medium text-gray-900">#REQ-{1000 + req.id}</td>
                      <td className="py-3">
                        <p className="text-gray-900">{req.room?.title || "—"}</p>
                        <p className="text-xs text-gray-400">{req.reportedBy?.fullName || "—"}</p>
                      </td>
                      <td className="py-3 text-gray-700">{req.issueType || "General"}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLE[req.priority]}`}>{req.priority}</span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[req.status]}`}>{STATUS_LABEL[req.status]}</span>
                      </td>
                      <td className="py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-right">
                        {req.status !== "RESOLVED" ? (
                          <button
                            onClick={() => advanceStatus(req)}
                            disabled={updatingId === req.id}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {updatingId === req.id ? "Updating..." : "Update"}
                          </button>
                        ) : (
                          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">View</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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