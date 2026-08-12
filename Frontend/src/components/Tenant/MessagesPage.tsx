import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Bell, Plus, Phone, User as UserIcon, MoreVertical,
  Paperclip, Smile, Send, Building2, Loader2, ChevronLeft,
} from "lucide-react";
import type { User, ConversationSummary, ChatMessage } from "../../services/api";
import { api } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";

const LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  "Dashboard": "dashboard",
  "Find Property": "search",
  "Saved Rooms": "saved",
  "My Requests": "requests",
  "Current Rental": "rental",
  "Payments": "payments",
  "Messages": "messages",
  "Notifications": "notifications",
};

interface MessagesPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatListTimestamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isToday) return formatTime(iso);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MessagesPage({ user, onLogout, onNavigate }: MessagesPageProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<{
    contact: ConversationSummary["contact"];
    messages: ChatMessage[];
    property: { title: string; leaseEndDate: string | null; roomId: number } | null;
  } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    setConvLoading(true);
    api
      .getConversations()
      .then((res) => {
        if (res.success === false) throw new Error(res.message || "Couldn't load messages.");
        setConversations(res.conversations ?? []);
      })
      .catch((err) => setConvError(err instanceof Error ? err.message : "Couldn't load messages."))
      .finally(() => setConvLoading(false));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const openConversation = (contactId: number) => {
    setSelectedId(contactId);
    setThreadLoading(true);
    api
      .getMessagesWithContact(contactId)
      .then((res) => {
        if (res.success === false) throw new Error(res.message || "Couldn't load this conversation.");
        setThread({ contact: res.contact, messages: res.messages ?? [], property: res.property });
        // reflect read state in the list without a full refetch
        setConversations((prev) => prev.map((c) => (c.contact.id === contactId ? { ...c, unreadCount: 0 } : c)));
      })
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false));
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !thread) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      const res = await api.sendMessageTo(thread.contact.id, text, thread.property?.roomId);
      if (res.success === false) throw new Error(res.message);
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, res.data] } : prev));
      setConversations((prev) => {
        const next = prev.filter((c) => c.contact.id !== thread.contact.id);
        return [
          { contact: thread.contact, lastMessage: { text, createdAt: res.data.createdAt, fromMe: true }, unreadCount: 0 },
          ...next,
        ];
      });
    } catch {
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesQuery = query.trim() === "" || c.contact.fullName.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "ALL" || c.unreadCount > 0;
      return matchesQuery && matchesFilter;
    });
  }, [conversations, query, filter]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-stone-50 text-stone-900">
      <Sidebar user={user} active="Messages" onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={15} className="shrink-0 text-stone-400" />
            <input
              placeholder="Search properties, landlords..."
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => onNavigate("notifications")} className="relative shrink-0 text-stone-500 hover:text-stone-700">
            <Bell size={18} />
            {totalUnread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />}
          </button>
          <button className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 sm:flex">
            <Plus size={14} /> New Message
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Conversation list */}
          <aside className={`w-full shrink-0 flex-col border-r border-stone-200 bg-white md:flex md:w-80 ${selectedId ? "hidden md:flex" : "flex"}`}>
            <div className="shrink-0 border-b border-stone-100 p-3">
              <h2 className="mb-2 px-1 text-sm font-semibold text-stone-900">Messages</h2>
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
                <Search size={14} className="shrink-0 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
              <div className="flex gap-1.5">
                {(["ALL", "UNREAD"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      filter === f ? "bg-blue-600 text-white" : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {f === "ALL" ? "All" : "Unread"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-stone-400" /></div>
              ) : convError ? (
                <p className="p-4 text-center text-xs text-rose-500">{convError}</p>
              ) : (
                <>
                  {filteredConversations.map((c) => (
                    <button
                      key={c.contact.id}
                      onClick={() => openConversation(c.contact.id)}
                      className={`flex w-full items-start gap-3 border-b border-stone-50 px-4 py-3 text-left hover:bg-stone-50 ${
                        selectedId === c.contact.id ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={c.contact.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${c.contact.fullName}`}
                          alt={c.contact.fullName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        {c.contact.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-stone-900">{c.contact.fullName}</p>
                          <span className="shrink-0 text-[11px] text-stone-400">{formatListTimestamp(c.lastMessage.createdAt)}</span>
                        </div>
                        <p className={`mt-0.5 truncate text-xs ${c.unreadCount > 0 ? "font-medium text-stone-800" : "text-stone-500"}`}>
                          {c.lastMessage.fromMe ? "You: " : ""}
                          {c.lastMessage.text}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredConversations.length === 0 && (
                    <p className="p-4 text-center text-xs text-stone-400">No conversations found.</p>
                  )}
                </>
              )}
            </div>
          </aside>

          {/* Chat thread */}
          <section className={`min-w-0 flex-1 flex-col md:flex ${selectedId ? "flex" : "hidden"}`}>
            {!selectedId ? (
              <div className="hidden h-full flex-1 items-center justify-center md:flex">
                <p className="text-sm text-stone-400">Select a conversation to start messaging.</p>
              </div>
            ) : threadLoading || !thread ? (
              <div className="flex h-full flex-1 items-center justify-center"><Loader2 size={18} className="animate-spin text-stone-400" /></div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
                  <button onClick={() => setSelectedId(null)} className="text-stone-500 hover:text-stone-700 md:hidden">
                    <ChevronLeft size={20} />
                  </button>
                  <img
                    src={thread.contact.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${thread.contact.fullName}`}
                    alt={thread.contact.fullName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {thread.contact.fullName} <span className="font-normal text-stone-400">· {thread.contact.role === "LANDLORD" ? "Landlord" : "Tenant"}</span>
                    </p>
                    <p className={`text-xs ${thread.contact.isOnline ? "text-emerald-600" : "text-stone-400"}`}>
                      {thread.contact.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                  {thread.contact.phone && (
                    <a href={`tel:${thread.contact.phone}`} className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50">
                      <Phone size={15} />
                    </a>
                  )}
                  <button className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50">
                    <UserIcon size={15} />
                  </button>
                  <button className="text-stone-400 hover:text-stone-600">
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-stone-50 px-4 py-4">
                  {thread.messages.length > 0 && (
                    <div className="mb-2 text-center">
                      <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-500">
                        {formatDayLabel(thread.messages[0].createdAt)}
                      </span>
                    </div>
                  )}
                  {thread.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.fromMe ? "rounded-br-sm bg-stone-900 text-white" : "rounded-bl-sm bg-white text-stone-800 shadow-sm"}`}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <div className={`mt-1 text-right text-[10px] ${m.fromMe ? "text-white/60" : "text-stone-400"}`}>{formatTime(m.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-stone-200 bg-white p-3">
                  <div className="flex items-end gap-2">
                    <button className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                      <Paperclip size={18} />
                    </button>
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="max-h-28 min-h-[22px] flex-1 resize-none bg-transparent text-sm outline-none"
                      />
                      <Smile size={17} className="shrink-0 text-stone-400" />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-500 disabled:opacity-40"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Contact profile panel */}
          {thread && !threadLoading && (
            <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-stone-200 bg-white p-5 lg:flex">
              <div className="flex flex-col items-center text-center">
                <img
                  src={thread.contact.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${thread.contact.fullName}`}
                  alt={thread.contact.fullName}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <p className="mt-3 text-sm font-semibold text-stone-900">{thread.contact.fullName}</p>
                <span className="mt-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                  {thread.contact.role === "LANDLORD" ? "Landlord" : "Tenant"}
                </span>

                <div className="mt-4 flex w-full flex-col gap-2 text-left text-xs text-stone-500">
                  {thread.contact.phone && (
                    <span className="flex items-center gap-2">
                      <Phone size={12} /> {thread.contact.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-2 truncate">
                    <UserIcon size={12} /> {thread.contact.email}
                  </span>
                </div>
              </div>

              {thread.property && (
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Property Details</p>
                  <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/60 p-3">
                    <Building2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-stone-800">{thread.property.title}</p>
                      {thread.property.leaseEndDate && (
                        <p className="text-[11px] text-stone-500">
                          Lease ends: {new Date(thread.property.leaseEndDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
