import { useEffect, useMemo, useState } from "react";
import { Search, Bell, Plus, MessageSquare, Banknote, Wrench, Building2, Users, UserCog } from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminActivityProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddProperty?: () => void;
}

type CategoryFilter = "ALL" | "PAYMENT" | "MAINTENANCE" | "PROPERTY" | "TENANT" | "LANDLORD";

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAYMENT", label: "Payments" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "PROPERTY", label: "Properties" },
  { key: "TENANT", label: "Tenants" },
  { key: "LANDLORD", label: "Landlords" },
];

export default function AdminActivity({ onLogout, activeRoute, onNavigate, onAddProperty }: AdminActivityProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");

  useEffect(() => {
    loadActivity();
  }, [category]);

  async function loadActivity() {
    setLoading(true);
    try {
      const res = await (api as any).getAdminActivity?.({
        category: category === "ALL" ? undefined : category,
      });
      if (res?.success) {
        setEntries(res.entries || []);
      }
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => {
      const title = entry?.title?.toLowerCase?.() || "";
      const description = entry?.description?.toLowerCase?.() || "";
      return title.includes(q) || description.includes(q);
    });
  }, [entries, headerSearch]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT SYSTEM"
      />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search activity..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              onClick={onAddProperty}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Property
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${category === tab.key ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading activity...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No activity found.</p>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry, index) => (
                  <div key={entry?.id ?? index} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                      {entry?.category === "PAYMENT" ? (
                        <Banknote size={16} className="text-green-600" />
                      ) : entry?.category === "MAINTENANCE" ? (
                        <Wrench size={16} className="text-amber-600" />
                      ) : entry?.category === "PROPERTY" ? (
                        <Building2 size={16} className="text-purple-600" />
                      ) : entry?.category === "TENANT" ? (
                        <Users size={16} className="text-blue-600" />
                      ) : entry?.category === "LANDLORD" ? (
                        <UserCog size={16} className="text-blue-600" />
                      ) : (
                        <MessageSquare size={16} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{entry?.title || "Activity"}</p>
                      <p className="text-sm text-gray-500">{entry?.description || "No details available."}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
