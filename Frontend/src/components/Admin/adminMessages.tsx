import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  MessageSquarePlus,
  Phone,
  Info,
  MoreVertical,
  Send,
  Smile,
  Mail,
  Building2,
  Wrench,
  Banknote,
} from "lucide-react";
import { api, type AdminMessageThread, type AdminThreadMessage, type AdminContactProfile, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminMessagesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

type ContactFilter = "ALL" | "UNREAD" | "LANDLORDS" | "TENANTS";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export default function AdminMessages({ onLogout, activeRoute, onNavigate }: AdminMessagesProps) {
  const [threads, setThreads] = useState<AdminMessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [contactSearch, setContactSearch] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("ALL");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const [messages, setMessages] = useState<AdminThreadMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [profile, setProfile] = useState<AdminContactProfile | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setLoadingThreads(true);
    try {
      // NOTE: getAdminMessageThreads doesn't exist yet — see api.ts snippet above.
      const res = await (api as any).getAdminMessageThreads?.();
      if (res?.success) {
        const list: AdminMessageThread[] = res.threads || [];
        setThreads(list);
        if (list.length > 0 && selectedContactId === null) setSelectedContactId(list[0].contactId);
      }
    } catch (e) {
      console.error("Failed to load message threads:", e);
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    if (selectedContactId === null) return;
    loadThreadDetail(selectedContactId);
  }, [selectedContactId]);

  async function loadThreadDetail(contactId: number) {
    setLoadingMessages(true);
    try {
      const [msgRes, profileRes] = await Promise.all([
        (api as any).getAdminThreadMessages?.(contactId),
        (api as any).getAdminContactProfile?.(contactId),
      ]);
      if (msgRes?.success) setMessages(msgRes.messages || []);
      if (profileRes?.success) setProfile(profileRes.profile || null);
    } catch (e) {
      console.error("Failed to load thread detail:", e);
    } finally {
      setLoadingMessages(false);
    }
  }

  const filteredThreads = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    return threads.filter((t) => {
      const matchesQuery = !q || t.contactName.toLowerCase().includes(q);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && t.unread) ||
        (filter === "LANDLORDS" && t.contactRole === "LANDLORD") ||
        (filter === "TENANTS" && t.contactRole === "TENANT");
      return matchesQuery && matchesFilter;
    });
  }, [threads, contactSearch, filter]);

  const selectedThread = threads.find((t) => t.contactId === selectedContactId) || null;

  async function handleSend() {
    if (!selectedContactId || !messageText.trim()) return;
    setSending(true);
    try {
      // NOTE: sendAdminMessage doesn't exist yet — see api.ts snippet above.
      const res = await (api as any).sendAdminMessage?.(selectedContactId, messageText.trim());
      if (res?.success) {
        setMessageText("");
        await loadThreadDetail(selectedContactId);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              <MessageSquarePlus size={16} />
              New Message
            </button>
          </div>
        </header>

        <main className="flex flex-1 gap-4 overflow-hidden p-6">
          {/* Contact list */}
          <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Messages</h2>
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-xs outline-none focus:border-gray-900"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: "ALL", label: "All" },
                  { key: "UNREAD", label: "Unread" },
                  { key: "LANDLORDS", label: "Landlords" },
                  { key: "TENANTS", label: "Tenants" },
                ] as { key: ContactFilter; label: string }[]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      filter === f.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <p className="p-4 text-sm text-gray-400">Loading conversations...</p>
              ) : filteredThreads.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No conversations found.</p>
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={t.contactId}
                    onClick={() => setSelectedContactId(t.contactId)}
                    className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                      selectedContactId === t.contactId ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                      {initials(t.contactName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-gray-900">{t.contactName}</p>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-500">{t.lastMessage}</p>
                    </div>
                    {t.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white">
            {!selectedThread ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                Select a conversation to start messaging.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                      {initials(selectedThread.contactName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedThread.contactName} — {selectedThread.contactRole === "TENANT" ? "Tenant" : "Landlord"}
                      </p>
                      {selectedThread.isOnline && <p className="text-xs text-green-600">Online</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Call"><Phone size={16} /></button>
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Info"><Info size={16} /></button>
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="More"><MoreVertical size={16} /></button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {loadingMessages ? (
                    <p className="text-sm text-gray-400">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-400">No messages yet.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.fromAdmin ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p>{m.text}</p>
                          <p className={`mt-1 text-[10px] ${m.fromAdmin ? "text-gray-300" : "text-gray-400"}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 p-4">
                  <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="Emoji"><Smile size={18} /></button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="h-10 flex-1 rounded-full border border-gray-200 px-4 text-sm outline-none focus:border-gray-900"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Contact profile panel */}
          {profile && (
            <div className="hidden w-72 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 lg:flex">
              <div className="mb-4 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-white">
                  {initials(profile.fullName)}
                </div>
                <p className="font-semibold text-gray-900">{profile.fullName}</p>
                <span className="mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  {profile.role === "TENANT" ? "Tenant" : "Landlord"}
                </span>
              </div>

              <div className="mb-4 space-y-2 border-t border-gray-100 pt-4">
                {profile.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={13} className="text-gray-400" />
                    {profile.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={13} className="text-gray-400" />
                  {profile.email}
                </div>
              </div>

              {profile.property && (
                <div className="mb-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Property Details</p>
                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <Building2 size={13} className="mt-0.5 text-gray-400" />
                    <div>
                      <p>{profile.property.title}</p>
                      {profile.property.leaseEndDate && (
                        <p className="text-gray-400">
                          Lease ends {new Date(profile.property.leaseEndDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {profile.recentActivity && profile.recentActivity.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Recent Activity</p>
                  <div className="space-y-2">
                    {profile.recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        {a.title.toLowerCase().includes("payment") ? (
                          <Banknote size={13} className="mt-0.5 text-green-500" />
                        ) : (
                          <Wrench size={13} className="mt-0.5 text-blue-500" />
                        )}
                        <div>
                          <p>{a.title}</p>
                          <p className="text-gray-400">{new Date(a.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}