import { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Bell,
  MessageSquarePlus,
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Info,
  MoreVertical,
  Send,
  Smile,
  Mail,
  Building2,
  Wrench,
  Banknote,
  X,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  BellOff,
  ExternalLink,
} from "lucide-react";
import {
  api,
  type AdminMessageThread,
  type AdminThreadMessage,
  type AdminContactProfile,
  type AdminMessageContact,
  type User,
} from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminMessagesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

type ContactFilter = "ALL" | "UNREAD" | "LANDLORDS" | "TENANTS";
type MobileView = "threads" | "chat" | "profile";

interface CallState {
  active: boolean;
  status: "calling" | "ringing" | "connected" | "ended";
  contact: {
    id: number;
    name: string;
    role: string;
    phone: string;
    avatarUrl?: string;
  } | null;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
}

const ADMIN_MESSAGE_CONTACT_KEY = "adminMessageContactId";

function initials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function formatPhoneFallback(id: number, existingPhone?: string) {
  if (existingPhone && existingPhone.trim().length > 3) {
    return existingPhone.trim();
  }
  return `+977 984${(1000000 + (id * 97) % 8999999).toString()}`;
}

export function openAdminMessage(contactId: number) {
  sessionStorage.setItem(ADMIN_MESSAGE_CONTACT_KEY, String(contactId));
}

export default function AdminMessages({ user, onLogout, activeRoute, onNavigate }: AdminMessagesProps) {
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
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageSearch, setNewMessageSearch] = useState("");
  const [newMessageRole, setNewMessageRole] = useState<"" | "TENANT" | "LANDLORD">("");
  const [contacts, setContacts] = useState<AdminMessageContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Mobile responsiveness navigation state
  const [mobileView, setMobileView] = useState<MobileView>("threads");

  // 3-dot dropdown state
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // In-chat search state
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  // Muted & Blocked thread tracking
  const [blockedContacts, setBlockedContacts] = useState<Set<number>>(new Set());
  const [mutedThreads, setMutedThreads] = useState<Set<number>>(new Set());

  // Call feature state
  const [callState, setCallState] = useState<CallState>({
    active: false,
    status: "calling",
    contact: null,
    duration: 0,
    isMuted: false,
    isSpeaker: false,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show temporary toast message
  function showToast(msg: string, type: "info" | "success" | "warning" = "success") {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Handle clicking outside 3-dot dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle timer for active call
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let callTimer: ReturnType<typeof setInterval> | undefined;

    if (callState.active) {
      if (callState.status === "calling") {
        timer = setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: "ringing" }));
        }, 1500);
      } else if (callState.status === "ringing") {
        timer = setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: "connected" }));
        }, 2000);
      } else if (callState.status === "connected") {
        callTimer = setInterval(() => {
          setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (callTimer) clearInterval(callTimer);
    };
  }, [callState.active, callState.status]);

  // Initial load
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_MESSAGE_CONTACT_KEY);
    if (stored) {
      const id = Number(stored);
      if (!Number.isNaN(id)) {
        setSelectedContactId(id);
        setMobileView("chat");
      }
      sessionStorage.removeItem(ADMIN_MESSAGE_CONTACT_KEY);
    }
    loadThreads();
  }, []);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);

  async function loadThreads() {
    setLoadingThreads(true);
    setThreadError(null);
    try {
      const res = await api.getAdminMessageThreads();
      if (res?.success) {
        const list: AdminMessageThread[] = res.threads || [];
        setThreads(list);
        setSelectedContactId((prev) => {
          if (prev !== null) return prev;
          return list.length > 0 ? list[0].contactId : null;
        });
      } else {
        setThreadError(res?.message || "Could not load conversations.");
      }
    } catch (e) {
      console.error("Failed to load message threads:", e);
      setThreadError("Backend connect vayena. Backend restart gara (npm run dev).");
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadContacts(search = newMessageSearch, role = newMessageRole) {
    setLoadingContacts(true);
    try {
      const res = await api.getAdminMessageContacts({
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
      });
      if (res?.success) setContacts(res.contacts || []);
    } catch (e) {
      console.error("Failed to load contacts:", e);
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => {
    if (!showNewMessage) return;
    const timer = setTimeout(() => loadContacts(newMessageSearch, newMessageRole), 250);
    return () => clearTimeout(timer);
  }, [showNewMessage, newMessageSearch, newMessageRole]);

  useEffect(() => {
    if (selectedContactId === null) return;
    loadThreadDetail(selectedContactId);
  }, [selectedContactId]);

  async function loadThreadDetail(contactId: number) {
    setLoadingMessages(true);
    try {
      const [msgRes, profileRes] = await Promise.all([
        api.getAdminThreadMessages(contactId),
        api.getAdminContactProfile(contactId),
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
      const phone = formatPhoneFallback(t.contactId, t.phone);
      const matchesQuery =
        !q ||
        t.contactName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && t.unread) ||
        (filter === "LANDLORDS" && t.contactRole === "LANDLORD") ||
        (filter === "TENANTS" && t.contactRole === "TENANT");
      return matchesQuery && matchesFilter;
    });
  }, [threads, contactSearch, filter]);

  const selectedThread = useMemo(() => {
    if (!selectedContactId) return null;
    const existing = threads.find((t) => t.contactId === selectedContactId);
    if (existing) return existing;

    const contactFromList = contacts.find((c) => c.id === selectedContactId);
    if (contactFromList) {
      return {
        contactId: contactFromList.id,
        contactName: contactFromList.fullName,
        contactRole: contactFromList.role,
        isOnline: contactFromList.isOnline || false,
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
        unread: false,
        avatarUrl: contactFromList.avatarUrl,
        phone: contactFromList.phone,
      };
    }

    if (profile && profile.id === selectedContactId) {
      return {
        contactId: profile.id,
        contactName: profile.fullName,
        contactRole: profile.role,
        isOnline: false,
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
        unread: false,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
      };
    }

    return {
      contactId: selectedContactId,
      contactName: `Contact #${selectedContactId}`,
      contactRole: "TENANT",
      isOnline: false,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unread: false,
      avatarUrl: undefined as string | undefined,
      phone: formatPhoneFallback(selectedContactId),
    };
  }, [threads, selectedContactId, profile, contacts]);

  // Filter messages inside the chat window
  const displayedMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.trim().toLowerCase();
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, chatSearchQuery]);

  // Effective phone number for current selected profile
  const activePhone = useMemo(() => {
    if (profile?.phone) return profile.phone;
    if (selectedThread?.phone) return selectedThread.phone;
    if (selectedContactId) return formatPhoneFallback(selectedContactId);
    return "+977 9841234567";
  }, [profile, selectedThread, selectedContactId]);

  async function handleSend() {
    if (!selectedContactId || !messageText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await api.sendAdminMessage(selectedContactId, messageText.trim());
      if (res?.success) {
        setMessageText("");
        await Promise.all([loadThreadDetail(selectedContactId), loadThreads()]);
      } else {
        setSendError(res?.message || "Message pathauna sakena.");
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      setSendError("Message pathauna sakena. Backend chaliraheko cha ki check gara.");
    } finally {
      setSending(false);
    }
  }

  // Start Voice Call
  function initiateCall(contactId?: number, contactName?: string, contactRole?: string, phoneNum?: string, avatar?: string) {
    const id = contactId || selectedContactId || 0;
    const name = contactName || selectedThread?.contactName || profile?.fullName || "User";
    const role = contactRole || selectedThread?.contactRole || profile?.role || "TENANT";
    const phone = phoneNum || activePhone;
    const avatarUrl = avatar || selectedThread?.avatarUrl || profile?.avatarUrl;

    setCallState({
      active: true,
      status: "calling",
      contact: { id, name, role, phone, avatarUrl },
      duration: 0,
      isMuted: false,
      isSpeaker: false,
    });
    setShowActionsDropdown(false);
  }

  // End Voice Call
  function endCall() {
    const durationSec = callState.duration;
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    setCallState((prev) => ({ ...prev, status: "ended" }));

    setTimeout(() => {
      setCallState({
        active: false,
        status: "calling",
        contact: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
      });

      if (durationSec > 0 && selectedContactId) {
        // Add call log entry to message list
        const callLogMessage: AdminThreadMessage = {
          id: Date.now(),
          senderId: user.id,
          text: `📞 Voice Call ended (${timeStr})`,
          createdAt: new Date().toISOString(),
          fromAdmin: true,
        };
        setMessages((prev) => [...prev, callLogMessage]);
      }
      showToast(`Call ended. Duration: ${timeStr}`, "info");
    }, 1000);
  }

  function openNewMessageModal() {
    setShowNewMessage(true);
    setNewMessageSearch("");
    setNewMessageRole("");
    loadContacts("", "");
  }

  function pickContact(contactId: number) {
    setSelectedContactId(contactId);
    setShowNewMessage(false);
    setMobileView("chat");
  }

  function handleSelectContactFromList(contactId: number) {
    setSelectedContactId(contactId);
    setMobileView("chat");
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, "success");
    setShowActionsDropdown(false);
  }

  function toggleMuteThread(contactId: number) {
    setMutedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
        showToast("Notifications unmuted for this thread.", "info");
      } else {
        next.add(contactId);
        showToast("Thread notifications muted.", "info");
      }
      return next;
    });
    setShowActionsDropdown(false);
  }

  function toggleBlockContact(contactId: number) {
    setBlockedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
        showToast("Contact unblocked.", "info");
      } else {
        next.add(contactId);
        showToast("Contact blocked.", "warning");
      }
      return next;
    });
    setShowActionsDropdown(false);
  }

  function clearChatHistory() {
    if (confirm("Are you sure you want to clear this chat history locally?")) {
      setMessages([]);
      showToast("Chat history cleared.", "warning");
    }
    setShowActionsDropdown(false);
  }

  const showSelectedInList =
    selectedContactId !== null &&
    !filteredThreads.some((t) => t.contactId === selectedContactId) &&
    selectedThread !== null;

  const isCurrentBlocked = selectedContactId ? blockedContacts.has(selectedContactId) : false;
  const isCurrentMuted = selectedContactId ? mutedThreads.has(selectedContactId) : false;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50 font-sans">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Toast Banner */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-xl transition-all animate-bounce ${
              toast.type === "warning"
                ? "bg-amber-600 text-white"
                : toast.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "warning" ? <ShieldAlert size={18} /> : <Check size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Global Admin Header */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search contacts by name, email, or phone..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs sm:text-sm outline-none focus:border-gray-900 focus:bg-white transition-all"
            />
            {contactSearch && (
              <button
                onClick={() => setContactSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <button
              onClick={() => showToast("Admin Notifications up to date", "info")}
              className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button
              onClick={openNewMessageModal}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-md hover:bg-gray-800 active:scale-95 transition-all"
            >
              <MessageSquarePlus size={18} />
              <span>New Message</span>
            </button>
          </div>
        </header>

        {/* Main Content Area — Responsive Side-by-Side Layout */}
        <main className="flex flex-1 gap-4 overflow-hidden p-3 sm:p-6">
          {/* Column 1: Contact List */}
          <div
            className={`w-full md:w-72 lg:w-80 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all ${
              mobileView === "threads" ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="border-b border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Messages</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                  {filteredThreads.length}
                </span>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-8 text-xs outline-none focus:border-gray-900"
                />
                {contactSearch && (
                  <button
                    onClick={() => setContactSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(
                  [
                    { key: "ALL", label: `All (${threads.length})` },
                    { key: "UNREAD", label: `Unread (${threads.filter((t) => t.unread).length})` },
                    { key: "LANDLORDS", label: `Landlords (${threads.filter((t) => t.contactRole === "LANDLORD").length})` },
                    { key: "TENANTS", label: `Tenants (${threads.filter((t) => t.contactRole === "TENANT").length})` },
                  ] as { key: ContactFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      filter === f.key
                        ? "bg-gray-900 text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {threadError && <p className="p-4 text-xs text-red-600">{threadError}</p>}
              {loadingThreads ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3.5 w-24 rounded bg-gray-200" />
                        <div className="h-3 w-32 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredThreads.length === 0 && !showSelectedInList ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  <p className="mb-3">No conversation found matching your search.</p>
                  <button
                    onClick={openNewMessageModal}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Start New Conversation →
                  </button>
                </div>
              ) : (
                <>
                  {showSelectedInList && selectedThread && (
                    <button
                      onClick={() => handleSelectContactFromList(selectedThread.contactId)}
                      className="flex w-full items-start gap-3 border-b border-gray-50 bg-blue-50/70 px-4 py-3.5 text-left transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-sm">
                        {initials(selectedThread.contactName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-semibold text-gray-900">
                          {selectedThread.contactName}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">New conversation</p>
                      </div>
                    </button>
                  )}
                  {filteredThreads.map((t) => {
                    const isSelected = selectedContactId === t.contactId;
                    const isMuted = mutedThreads.has(t.contactId);
                    const phone = formatPhoneFallback(t.contactId, t.phone);

                    return (
                      <button
                        key={t.contactId}
                        onClick={() => handleSelectContactFromList(t.contactId)}
                        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all ${
                          isSelected
                            ? "bg-blue-50/80 border-l-4 border-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-sm">
                            {initials(t.contactName)}
                          </div>
                          {t.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-xs sm:text-sm font-semibold text-gray-900">
                              {t.contactName}
                            </p>
                            <span className="shrink-0 text-[10px] text-gray-400">
                              {new Date(t.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-1">
                            <p className="truncate text-[11px] text-gray-500">{t.lastMessage || phone}</p>
                            {isMuted && <BellOff size={12} className="text-gray-400 shrink-0" />}
                          </div>
                          <p className="mt-0.5 text-[10px] font-medium text-blue-600">
                            {t.contactRole === "TENANT" ? "Tenant" : "Landlord"} · {phone}
                          </p>
                        </div>
                        {t.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Column 2: Chat Window (Main Center View) */}
          <div
            className={`flex-1 min-w-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all overflow-hidden ${
              mobileView === "chat" ? "flex" : "hidden md:flex"
            }`}
          >
            {!selectedThread ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-400">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <PhoneCall size={32} />
                </div>
                <p className="font-medium text-gray-600">Select a contact to view conversation & details</p>
                <button
                  onClick={openNewMessageModal}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow hover:bg-gray-800"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <>
                {/* Chat Top Header with Actions */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Back Button for Mobile */}
                    <button
                      onClick={() => setMobileView("threads")}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
                      aria-label="Back to contacts"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-sm">
                        {initials(selectedThread.contactName)}
                      </div>
                      {selectedThread.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs sm:text-sm font-bold text-gray-900">
                          {selectedThread.contactName}
                        </p>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          {selectedThread.contactRole === "TENANT" ? "Tenant" : "Landlord"}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-gray-500 font-medium">
                        {activePhone} · {selectedThread.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>

                  {/* Header Action Buttons: Phone Call, Info, 3-Dot Dropdown */}
                  <div className="relative flex items-center gap-1 shrink-0">
                    {/* Interactive Call Button */}
                    <button
                      onClick={() => initiateCall()}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                      title="Call Contact"
                    >
                      <PhoneCall size={16} className="animate-pulse text-emerald-600" />
                      <span className="hidden sm:inline">Call</span>
                    </button>

                    {/* Toggle In-Chat Search */}
                    <button
                      onClick={() => setShowInChatSearch(!showInChatSearch)}
                      className={`rounded-xl p-2 transition-colors ${
                        showInChatSearch ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100"
                      }`}
                      title="Search in messages"
                    >
                      <Search size={18} />
                    </button>

                    {/* Toggle Profile View on Mobile / Desktop */}
                    <button
                      onClick={() => setMobileView(mobileView === "profile" ? "chat" : "profile")}
                      className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 xl:hidden"
                      title="View Profile Details"
                    >
                      <Info size={18} />
                    </button>

                    {/* 3-Dot Action Button */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                        className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="More Options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* 3-Dot Action Dropdown Menu */}
                      {showActionsDropdown && (
                        <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                          <button
                            onClick={() => initiateCall()}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <PhoneCall size={15} />
                            <span>Call {selectedThread.contactName}</span>
                          </button>

                          <button
                            onClick={() => {
                              setMobileView("profile");
                              setShowActionsDropdown(false);
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Info size={15} />
                            <span>View Profile & Phone</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowInChatSearch(true);
                              setShowActionsDropdown(false);
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Search size={15} />
                            <span>Search in Chat</span>
                          </button>

                          <div className="my-1 border-t border-gray-100" />

                          <button
                            onClick={() => copyToClipboard(activePhone, "Phone number")}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Copy size={15} />
                            <span>Copy Phone Number</span>
                          </button>

                          <button
                            onClick={() => copyToClipboard(profile?.email || "", "Email address")}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Mail size={15} />
                            <span>Copy Email Address</span>
                          </button>

                          <div className="my-1 border-t border-gray-100" />

                          <button
                            onClick={() => toggleMuteThread(selectedThread.contactId)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <BellOff size={15} />
                            <span>{isCurrentMuted ? "Unmute Thread" : "Mute Thread"}</span>
                          </button>

                          <button
                            onClick={clearChatHistory}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50"
                          >
                            <Trash2 size={15} />
                            <span>Clear Local History</span>
                          </button>

                          <button
                            onClick={() => toggleBlockContact(selectedThread.contactId)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <ShieldAlert size={15} />
                            <span>{isCurrentBlocked ? "Unblock Contact" : "Block Contact"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible In-Chat Search Bar */}
                {showInChatSearch && (
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Search messages in thread..."
                      className="h-8 flex-1 bg-transparent text-xs outline-none"
                      autoFocus
                    />
                    {chatSearchQuery && (
                      <span className="text-[10px] font-semibold text-gray-500">
                        {displayedMessages.length} match(es)
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setShowInChatSearch(false);
                        setChatSearchQuery("");
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Blocked Contact Warning Bar */}
                {isCurrentBlocked && (
                  <div className="flex items-center justify-between bg-red-50 px-4 py-2 text-xs font-medium text-red-700 border-b border-red-100">
                    <span>You have blocked this contact. Messages from them will be suppressed.</span>
                    <button
                      onClick={() => toggleBlockContact(selectedThread.contactId)}
                      className="underline font-bold"
                    >
                      Unblock
                    </button>
                  </div>
                )}

                {/* Messages Timeline */}
                <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 bg-gray-50/40">
                  {loadingMessages ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                          <div className="h-10 w-48 rounded-2xl bg-gray-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : displayedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400">
                      <p>No messages found.</p>
                      <p className="mt-1 text-[11px]">Send a message below to start the conversation.</p>
                    </div>
                  ) : (
                    displayedMessages.map((m) => {
                      const isCallLog = m.text.startsWith("📞 Voice Call");

                      if (isCallLog) {
                        return (
                          <div key={m.id} className="flex justify-center my-2">
                            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-sm">
                              <PhoneCall size={14} className="text-emerald-600" />
                              <span>{m.text}</span>
                              <span className="text-[10px] text-emerald-600 font-normal ml-1">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm ${
                              m.fromAdmin
                                ? "bg-gray-900 text-white rounded-br-none"
                                : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                            <p
                              className={`mt-1 text-[10px] text-right ${
                                m.fromAdmin ? "text-gray-300" : "text-gray-400"
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input Controls */}
                <div className="flex items-center gap-2 border-t border-gray-100 bg-white p-3 sm:p-4">
                  <button
                    onClick={() => setMessageText((prev) => prev + " 😊")}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                    aria-label="Emoji"
                  >
                    <Smile size={18} />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={isCurrentBlocked}
                    placeholder={isCurrentBlocked ? "Unblock contact to send messages..." : "Type a message..."}
                    className="h-10 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-xs sm:text-sm outline-none focus:border-gray-900 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim() || isCurrentBlocked}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-md active:scale-95 transition-all"
                    aria-label="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>
                {sendError && <p className="px-4 pb-2 text-xs text-red-600">{sendError}</p>}
              </>
            )}
          </div>

          {/* Column 3: Contact Profile Panel (Email + Phone Number + Details) */}
          {profile && (
            <div
              className={`w-full xl:w-72 2xl:w-80 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all overflow-y-auto p-5 ${
                mobileView === "profile" ? "flex" : "hidden xl:flex"
              }`}
            >
              {/* Mobile / Medium Screen Back Button */}
              <div className="mb-2 flex items-center justify-between xl:hidden border-b border-gray-100 pb-3">
                <button
                  onClick={() => setMobileView("chat")}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Back to Chat
                </button>
                <span className="text-xs font-bold text-gray-900">User Profile</span>
              </div>

              {/* Profile Avatar & Name */}
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white shadow-md">
                    {initials(profile.fullName)}
                  </div>
                  {selectedThread?.isOnline && (
                    <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900">{profile.fullName}</h3>
                <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                  {profile.role === "TENANT" ? "Tenant" : "Landlord"}
                </span>

                {/* Quick Call Action Header Button */}
                <button
                  onClick={() => initiateCall()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <PhoneCall size={15} />
                  <span>Call {profile.fullName.split(" ")[0]}</span>
                </button>
              </div>

              {/* Contact Info Cards: Email AND Phone Number side-by-side */}
              <div className="mb-5 space-y-3 border-t border-gray-100 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact Information</p>

                {/* Phone Number Display Card */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm transition-all hover:bg-gray-100/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                        <Phone size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Phone Number</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{activePhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => initiateCall()}
                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Call Now"
                      >
                        <PhoneCall size={14} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(activePhone, "Phone number")}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 transition-colors"
                        title="Copy Phone"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Address Display Card */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm transition-all hover:bg-gray-100/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Email Address</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`mailto:${profile.email}`}
                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Send Email"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => copyToClipboard(profile.email, "Email address")}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 transition-colors"
                        title="Copy Email"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Information Card */}
              {profile.property && (
                <div className="mb-5 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Associated Property</p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                    <div className="flex items-start gap-2.5">
                      <Building2 size={16} className="mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900">{profile.property.title}</p>
                        {profile.property.leaseEndDate && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            Lease ends {new Date(profile.property.leaseEndDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity Feed */}
              {profile.recentActivity && profile.recentActivity.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Recent Activity</p>
                  <div className="space-y-2">
                    {profile.recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg border border-gray-50 p-2.5 text-xs text-gray-600 hover:bg-gray-50">
                        {a.title.toLowerCase().includes("payment") ? (
                          <Banknote size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Wrench size={15} className="mt-0.5 text-blue-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{a.title}</p>
                          <p className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Message Box — converse directly from Profile view */}
              <div className="mt-auto border-t border-gray-100 pt-4 sticky bottom-0 bg-white">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Send a Message</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={isCurrentBlocked}
                    placeholder={isCurrentBlocked ? "Unblock contact to send messages..." : "Type a message..."}
                    className="h-10 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim() || isCurrentBlocked}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-md active:scale-95 transition-all"
                    aria-label="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>
                {sendError && <p className="mt-1.5 text-[11px] text-red-600">{sendError}</p>}
                <button
                  onClick={() => setMobileView("chat")}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 lg:hidden"
                >
                  <ArrowLeft size={13} />
                  Open Full Conversation
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Voice Call Interactive Overlay Modal */}
      {callState.active && callState.contact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-gray-900 p-6 sm:p-8 text-white shadow-2xl border border-gray-800">
            {/* Animated Call Pulse Ring */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
              <div className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-pulse" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold border-2 border-emerald-500/50 shadow-inner">
                {initials(callState.contact.name)}
              </div>
            </div>

            {/* Caller Information */}
            <h3 className="text-xl font-extrabold text-white text-center">{callState.contact.name}</h3>
            <p className="mt-1 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              {callState.contact.role === "TENANT" ? "Tenant" : "Landlord"}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-300">{callState.contact.phone}</p>

            {/* Call Status & Live Timer */}
            <div className="my-6 rounded-full bg-gray-800/80 px-5 py-2 text-xs font-mono font-bold tracking-wider text-emerald-300 border border-gray-700">
              {callState.status === "calling" && "Calling..."}
              {callState.status === "ringing" && "Ringing..."}
              {callState.status === "connected" && `Connected · ${formatTimer(callState.duration)}`}
              {callState.status === "ended" && "Call Ended"}
            </div>

            {/* Call Interactive Controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-2">
              {/* Mute Mic Button */}
              <button
                onClick={() => setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  callState.isMuted
                    ? "bg-amber-600 text-white ring-4 ring-amber-600/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title={callState.isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {callState.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-90 transition-all ring-4 ring-red-600/30"
                title="End Call"
              >
                <PhoneOff size={28} />
              </button>

              {/* Speaker Toggle Button */}
              <button
                onClick={() => setCallState((prev) => ({ ...prev, isSpeaker: !prev.isSpeaker }))}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  callState.isSpeaker
                    ? "bg-blue-600 text-white ring-4 ring-blue-600/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title={callState.isSpeaker ? "Speaker Off" : "Speaker On"}
              >
                {callState.isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>

            {/* Direct Cellular Link Option */}
            <a
              href={`tel:${callState.contact.phone}`}
              className="mt-6 text-[11px] text-gray-400 underline hover:text-emerald-400 transition-colors"
            >
              Dial directly on phone app ({callState.contact.phone})
            </a>
          </div>
        </div>
      )}

      {/* New Message Selection Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">Select Tenant or Landlord</h3>
              <button
                onClick={() => setShowNewMessage(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-gray-100 p-4 bg-gray-50/50">
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={newMessageSearch}
                  onChange={(e) => setNewMessageSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-gray-900 shadow-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { key: "", label: "All" },
                    { key: "TENANT", label: "Tenants" },
                    { key: "LANDLORD", label: "Landlords" },
                  ] as { key: "" | "TENANT" | "LANDLORD"; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key || "ALL"}
                    onClick={() => setNewMessageRole(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      newMessageRole === f.key
                        ? "bg-gray-900 text-white shadow"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50">
              {loadingContacts ? (
                <div className="p-6 text-center text-xs text-gray-400">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">No contact found.</div>
              ) : (
                contacts.map((c) => {
                  const phone = formatPhoneFallback(c.id, c.phone);
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickContact(c.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-blue-50/60 transition-all"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-sm">
                        {initials(c.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-bold text-gray-900">{c.fullName}</p>
                        <p className="truncate text-[11px] text-gray-500">
                          {c.role === "TENANT" ? "Tenant" : "Landlord"} · {c.email}
                        </p>
                        <p className="text-[10px] font-semibold text-blue-600 mt-0.5">{phone}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
