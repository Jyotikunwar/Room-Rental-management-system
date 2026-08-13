import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Search,
  Bell,
  Plus,
  Phone,
  User as UserIcon,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Building2,
  Loader2,
  ChevronLeft,
  Mail,
  Wrench,
  Banknote,
  X,
  FileText,
  CheckCheck,
} from "lucide-react";
import {
  api,
  type User,
  type ConversationSummary,
  type ChatMessage,
  type MessageContact,
  type AdminMessageThread,
  type AdminThreadMessage,
  type AdminContactProfile,
  type AdminMessageContact,
} from "../../services/api";
import { ADMIN_MESSAGE_CONTACT_KEY } from "../Admin/adminMessageSession";

export type MessagesMode = "tenant" | "landlord" | "admin";

type ContactFilter = "ALL" | "UNREAD" | "LANDLORD" | "LANDLORDS" | "TENANT" | "TENANTS" | "ADMIN";

interface ThreadState {
  contact: MessageContact | { id: number; fullName: string; role: string; phone?: string; email: string; avatarUrl?: string; isOnline: boolean };
  messages: (ChatMessage | AdminThreadMessage)[];
  property: { title: string; address?: string | null; leaseEndDate: string | null; roomId: number } | null;
  recentActivity?: { title: string; date: string }[];
}

interface MessagesInboxProps {
  mode: MessagesMode;
  user: User;
  sidebar: ReactNode;
  topSearchPlaceholder?: string;
  onBellClick?: () => void;
}

import { getImageUrl } from "../../services/api";

function avatarUrl(name: string, url?: string) {
  const resolved = getImageUrl(url);
  return resolved || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatListTimestamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(iso);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function roleLabel(role: string) {
  if (role === "LANDLORD") return "Landlord";
  if (role === "ADMIN") return "Admin";
  return "Tenant";
}

function filterOptions(mode: MessagesMode): { key: ContactFilter; label: string }[] {
  if (mode === "tenant") {
    return [
      { key: "ALL", label: "All" },
      { key: "UNREAD", label: "Unread" },
      { key: "LANDLORD", label: "Landlord" },
      { key: "ADMIN", label: "Admin" },
    ];
  }
  if (mode === "landlord") {
    return [
      { key: "ALL", label: "All" },
      { key: "UNREAD", label: "Unread" },
      { key: "ADMIN", label: "Admin" },
      { key: "TENANT", label: "Tenant" },
    ];
  }
  return [
    { key: "ALL", label: "All" },
    { key: "UNREAD", label: "Unread" },
    { key: "LANDLORDS", label: "Landlords" },
    { key: "TENANTS", label: "Tenants" },
  ];
}

function itemMatchesFilter(_mode: MessagesMode, filter: ContactFilter, role: string, unread: number) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return unread > 0;
  if (filter === "LANDLORD" || filter === "LANDLORDS") return role === "LANDLORD";
  if (filter === "TENANT" || filter === "TENANTS") return role === "TENANT";
  if (filter === "ADMIN") return role === "ADMIN";
  return true;
}

export default function MessagesInbox({ mode, user: _user, sidebar, topSearchPlaceholder, onBellClick }: MessagesInboxProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [adminThreads, setAdminThreads] = useState<AdminMessageThread[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("ALL");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminContactProfile | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageSearch, setNewMessageSearch] = useState("");
  const [contacts, setContacts] = useState<(MessageContact | AdminMessageContact)[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    setConvLoading(true);
    setConvError(null);
    if (mode === "admin") {
      api
        .getAdminMessageThreads()
        .then((res) => {
          if (res.success === false) throw new Error(res.message || "Couldn't load messages.");
          setAdminThreads(res.threads ?? []);
        })
        .catch((err) => setConvError(err instanceof Error ? err.message : "Couldn't load messages."))
        .finally(() => setConvLoading(false));
    } else {
      api
        .getConversations()
        .then((res) => {
          if (res.success === false) throw new Error(res.message || "Couldn't load messages.");
          setConversations(res.conversations ?? []);
        })
        .catch((err) => setConvError(err instanceof Error ? err.message : "Couldn't load messages."))
        .finally(() => setConvLoading(false));
    }
  };

  useEffect(() => {
    if (mode === "admin") {
      const stored = sessionStorage.getItem(ADMIN_MESSAGE_CONTACT_KEY);
      if (stored) {
        const id = Number(stored);
        if (!Number.isNaN(id)) setSelectedId(id);
        sessionStorage.removeItem(ADMIN_MESSAGE_CONTACT_KEY);
      }
    }
    loadConversations();
  }, [mode]);

  const loadContacts = (search = "") => {
    setLoadingContacts(true);
    const promise =
      mode === "admin"
        ? api.getAdminMessageContacts(search ? { search } : undefined)
        : api.getMessageContacts(search ? { search } : undefined);
    promise
      .then((res) => {
        if (res.success) setContacts(res.contacts || []);
      })
      .finally(() => setLoadingContacts(false));
  };

  const openConversation = (contactId: number) => {
    setSelectedId(contactId);
    setThreadLoading(true);
    if (mode === "admin") {
      Promise.all([api.getAdminThreadMessages(contactId), api.getAdminContactProfile(contactId)])
        .then(([msgRes, profileRes]) => {
          if (msgRes.success === false) throw new Error(msgRes.message);
          const contact = msgRes.contact || profileRes.profile;
          setThread({
            contact: contact || { id: contactId, fullName: "Contact", role: "TENANT", email: "", isOnline: false },
            messages: msgRes.messages ?? [],
            property: profileRes.profile?.property
              ? { title: profileRes.profile.property.title, leaseEndDate: profileRes.profile.property.leaseEndDate ?? null, roomId: 0 }
              : null,
            recentActivity: profileRes.profile?.recentActivity,
          });
          setAdminProfile(profileRes.profile || null);
          setAdminThreads((prev) => prev.map((t) => (t.contactId === contactId ? { ...t, unread: false } : t)));
        })
        .catch(() => setThread(null))
        .finally(() => setThreadLoading(false));
    } else {
      api
        .getMessagesWithContact(contactId)
        .then((res) => {
          if (res.success === false) throw new Error(res.message || "Couldn't load this conversation.");
          setThread({
            contact: res.contact,
            messages: res.messages ?? [],
            property: res.property,
            recentActivity: res.recentActivity,
          });
          setAdminProfile(null);
          setConversations((prev) => prev.map((c) => (c.contact.id === contactId ? { ...c, unreadCount: 0 } : c)));
        })
        .catch(() => setThread(null))
        .finally(() => setThreadLoading(false));
    }
  };

  useEffect(() => {
    if (selectedId !== null) openConversation(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const displayContact = useMemo(() => {
    if (!thread) return null;
    if (mode === "admin" && adminProfile) {
      return {
        ...thread.contact,
        email: adminProfile.email || thread.contact.email,
        phone: adminProfile.phone || thread.contact.phone,
      };
    }
    return thread.contact;
  }, [thread, adminProfile, mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !thread) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      const res =
        mode === "admin"
          ? await api.sendAdminMessage(thread.contact.id, text)
          : await api.sendMessageTo(thread.contact.id, text, thread.property?.roomId);
      if (res.success === false) throw new Error(res.message);
      const newMsg =
        mode === "admin"
          ? (res.message as AdminThreadMessage)
          : (res.data as ChatMessage);
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev));
      loadConversations();
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const listItems = useMemo(() => {
    if (mode === "admin") {
      return adminThreads.map((t) => ({
        id: t.contactId,
        name: t.contactName,
        role: t.contactRole,
        avatarUrl: t.avatarUrl,
        isOnline: t.isOnline ?? false,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unread: t.unread ? 1 : 0,
        phone: t.phone,
      }));
    }
    return conversations.map((c) => ({
      id: c.contact.id,
      name: c.contact.fullName,
      role: c.contact.role,
      avatarUrl: c.contact.avatarUrl,
      isOnline: c.contact.isOnline,
      lastMessage: c.lastMessage.text,
      lastMessageAt: c.lastMessage.createdAt,
      unread: c.unreadCount,
      phone: c.contact.phone,
      fromMe: c.lastMessage.fromMe,
    }));
  }, [mode, adminThreads, conversations]);

  const filteredList = useMemo(() => {
    return listItems.filter((item) => {
      const matchesQuery = query.trim() === "" || item.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilterRole = itemMatchesFilter(mode, filter, item.role, item.unread);
      return matchesQuery && matchesFilterRole;
    });
  }, [listItems, query, filter, mode]);

  useEffect(() => {
    if (!convLoading && selectedId === null && listItems.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedId(listItems[0].id);
    }
  }, [convLoading, listItems, selectedId]);

  const totalUnread = listItems.reduce((sum, c) => sum + c.unread, 0);
  const isFromMe = (m: ChatMessage | AdminThreadMessage) =>
    mode === "admin" ? (m as AdminThreadMessage).fromAdmin : (m as ChatMessage).fromMe;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900">
      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
            <Search size={15} className="shrink-0 text-gray-400" />
            <input
              placeholder={topSearchPlaceholder || "Search properties, tenants..."}
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={onBellClick}
            className="relative shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Bell size={18} />
            {totalUnread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
          </button>
          <button
            onClick={() => {
              setShowNewMessage(true);
              loadContacts("");
            }}
            className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 sm:flex"
          >
            <Plus size={14} /> New Message
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Conversation list */}
          <aside className={`w-full shrink-0 flex-col border-r border-gray-200 bg-white md:flex md:w-80 ${selectedId ? "hidden md:flex" : "flex"}`}>
            <div className="shrink-0 border-b border-gray-100 p-4">
              <h2 className="mb-3 text-base font-bold text-gray-900">Messages</h2>
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <Search size={14} className="shrink-0 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions(mode).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      filter === f.key ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : convError ? (
                <p className="p-4 text-center text-xs text-red-500">{convError}</p>
              ) : filteredList.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-400">No conversations found.</p>
              ) : (
                filteredList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
                      selectedId === c.id ? "border-l-4 border-l-blue-600 bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={avatarUrl(c.name, c.avatarUrl)} alt={c.name} className="h-11 w-11 rounded-full object-cover" />
                      {c.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                        <span className="shrink-0 text-[11px] text-gray-400">{formatListTimestamp(c.lastMessageAt)}</span>
                      </div>
                      <p className={`mt-0.5 truncate text-xs ${c.unread > 0 ? "font-medium text-gray-800" : "text-gray-500"}`}>
                        {"fromMe" in c && c.fromMe ? "You: " : ""}
                        {c.lastMessage}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {roleLabel(c.role)}
                      </span>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat thread */}
          <section className={`min-w-0 flex-1 flex-col md:flex ${selectedId ? "flex" : "hidden"}`}>
            {!selectedId ? (
              <div className="hidden h-full flex-1 items-center justify-center md:flex">
                <p className="text-sm text-gray-400">Select a conversation to start messaging.</p>
              </div>
            ) : threadLoading || !thread ? (
              <div className="flex h-full flex-1 items-center justify-center">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
                  <button onClick={() => setSelectedId(null)} className="text-gray-500 hover:text-gray-700 md:hidden">
                    <ChevronLeft size={20} />
                  </button>
                  <img
                    src={avatarUrl(displayContact!.fullName, displayContact!.avatarUrl)}
                    alt={displayContact!.fullName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {displayContact!.fullName}
                      <span className="font-normal text-gray-400"> · {roleLabel(displayContact!.role)}</span>
                    </p>
                    <p className={`text-xs font-medium ${displayContact!.isOnline ? "text-emerald-600" : "text-gray-400"}`}>
                      {displayContact!.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                  {displayContact!.phone && (
                    <a href={`tel:${displayContact!.phone}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                      <Phone size={15} />
                    </a>
                  )}
                  <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                    <UserIcon size={15} />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 px-4 py-4 sm:px-6">
                  {thread.messages.length > 0 && (
                    <div className="text-center">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                        {formatDayLabel(thread.messages[0].createdAt)}
                      </span>
                    </div>
                  )}
                  {thread.messages.map((m) => (
                    <div key={m.id} className={`flex ${isFromMe(m) ? "justify-end" : "justify-start items-end gap-2"}`}>
                      {!isFromMe(m) && (
                        <img
                          src={avatarUrl(displayContact!.fullName, displayContact!.avatarUrl)}
                          alt=""
                          className="mb-1 h-7 w-7 rounded-full object-cover"
                        />
                      )}
                      <div className="max-w-[75%]">
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isFromMe(m)
                              ? "rounded-br-sm bg-gray-900 text-white"
                              : "rounded-bl-sm border border-gray-200 bg-white text-gray-800 shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        </div>
                        <div className={`mt-1 flex items-center gap-1 text-[10px] ${isFromMe(m) ? "justify-end text-gray-400" : "text-gray-400"}`}>
                          {formatTime(m.createdAt)}
                          {isFromMe(m) && <CheckCheck size={12} className="text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    <button className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Paperclip size={18} />
                    </button>
                    <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
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
                      <Smile size={17} className="shrink-0 text-gray-400" />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-500 disabled:opacity-40"
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
            <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white p-5 lg:flex xl:w-80">
              <div className="flex flex-col items-center text-center">
                <img
                  src={avatarUrl(displayContact!.fullName, displayContact!.avatarUrl)}
                  alt={displayContact!.fullName}
                  className="h-20 w-20 rounded-full object-cover"
                />
                <p className="mt-3 text-base font-bold text-gray-900">{displayContact!.fullName}</p>
                <span className="mt-1 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-600">
                  {roleLabel(displayContact!.role)}
                </span>

                <div className="mt-5 flex w-full gap-2">
                  {displayContact!.phone && (
                    <a
                      href={`tel:${displayContact!.phone}`}
                      className="flex flex-1 items-center justify-center rounded-full border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                  <a
                    href={`mailto:${displayContact!.email}`}
                    className="flex flex-1 items-center justify-center rounded-full border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50"
                  >
                    <Mail size={16} />
                  </a>
                </div>

                <div className="mt-4 flex w-full flex-col gap-2 text-left text-xs text-gray-600">
                  {displayContact!.phone && (
                    <span className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-400" /> {displayContact!.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-2 truncate">
                    <Mail size={12} className="shrink-0 text-gray-400" /> {displayContact!.email}
                  </span>
                </div>
              </div>

              {thread.property && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {mode === "tenant" ? "Related Property" : "Property Details"}
                  </p>
                  <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <Building2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{thread.property.title}</p>
                      {thread.property.address && (
                        <p className="text-[11px] text-gray-500">{thread.property.address}</p>
                      )}
                      {thread.property.leaseEndDate && (
                        <p className="text-[11px] text-gray-500">
                          Lease ends: {new Date(thread.property.leaseEndDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mode === "tenant" && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Recent Documents</p>
                  <div className="space-y-2">
                    {thread.property ? (
                      <>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 text-xs text-gray-600">
                          <FileText size={14} className="shrink-0 text-red-500" />
                          <span className="truncate">Lease_Agreement.pdf</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 text-xs text-gray-600">
                          <FileText size={14} className="shrink-0 text-red-500" />
                          <span className="truncate">Move_In_Checklist.pdf</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No documents available.</p>
                    )}
                  </div>
                </div>
              )}

              {thread.recentActivity && thread.recentActivity.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Recent Activity</p>
                  <div className="space-y-2">
                    {thread.recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg border border-gray-50 p-2.5 text-xs text-gray-600">
                        {a.title.toLowerCase().includes("payment") ? (
                          <Banknote size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                        ) : (
                          <Wrench size={14} className="mt-0.5 shrink-0 text-blue-600" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">{a.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* New Message modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-gray-100 p-4">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={newMessageSearch}
                  onChange={(e) => {
                    setNewMessageSearch(e.target.value);
                    loadContacts(e.target.value);
                  }}
                  placeholder="Search contacts..."
                  className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : contacts.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-400">No contacts available to message.</p>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setShowNewMessage(false);
                      setSelectedId(c.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-blue-50"
                  >
                    <img src={avatarUrl(c.fullName, c.avatarUrl)} alt={c.fullName} className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{c.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {roleLabel(c.role)} · {c.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
