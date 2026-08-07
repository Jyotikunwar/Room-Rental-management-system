import { useEffect, useMemo, useState } from "react";
import { Search, Wrench, Loader2 } from "lucide-react";
import { api, type Room, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordMaintenanceProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

// NOT in api.ts yet. Add this interface there once the backend model exists,
// and add matching methods to `api`:
//
//   getMaintenanceRequests: async () => {
//     const res = await fetch(`${API_BASE_URL}/maintenance/landlord`, { headers: getAuthHeaders() });
//     return res.json();
//   },
//   updateMaintenanceStatus: async (id: number, status: string) => {
//     const res = await fetch(`${API_BASE_URL}/maintenance/${id}/status`, {
//       method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify({ status }),
//     });
//     return res.json();
//   },
interface MaintenanceRequest {
  id: number;
  roomId: number;
  room?: Room;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  reportedBy?: { fullName: string };
  createdAt: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-amber-50 text-amber-600",
  HIGH: "bg-red-50 text-red-600",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-red-50 text-red-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  RESOLVED: "bg-green-50 text-green-600",
};

export default function LandlordMaintenance({ user, onLogout, activeRoute, onNavigate }: LandlordMaintenanceProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setLoadFailed(false);
    try {
      // NOTE: (api as any) because getMaintenanceRequests doesn't exist in
      // api.ts yet — see comment above. Replace with a real typed call once added.
      const res = await (api as any).getMaintenanceRequests?.();
      if (res?.success) {
        setRequests(res.requests || []);
      } else {
        setLoadFailed(true);
      }
    } catch (e) {
      console.error("Failed to load maintenance requests:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) => r.room?.title?.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  async function handleStatusChange(req: MaintenanceRequest, status: MaintenanceRequest["status"]) {
    setUpdatingId(req.id);
    const prev = requests;
    setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status } : r))); // optimistic
    try {
      const res = await (api as any).updateMaintenanceStatus?.(req.id, status);
      if (!res?.success) setRequests(prev);
    } catch (e) {
      console.error("Failed to update maintenance status:", e);
      setRequests(prev);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <button
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onLogout}
          >
            Logout
          </button>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
            <p className="mt-1 text-sm text-gray-500">Repair and upkeep requests from tenants.</p>
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Maintenance requests couldn't load — this backend endpoint likely doesn't exist yet
              (see the comment at the top of <code>maintenance.tsx</code> for what to add).
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Issue</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Reported</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Loading requests...</td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        <Wrench size={20} className="mx-auto mb-2 text-gray-300" />
                        No maintenance requests.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="border-t border-gray-100">
                        <td className="py-3 text-gray-700">{req.room?.title || "—"}</td>
                        <td className="py-3 max-w-xs truncate text-gray-700">{req.description}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLE[req.priority]}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={req.status}
                              onChange={(e) => handleStatusChange(req, e.target.value as MaintenanceRequest["status"])}
                              disabled={updatingId === req.id}
                              className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${STATUS_STYLE[req.status]}`}
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                            {updatingId === req.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}