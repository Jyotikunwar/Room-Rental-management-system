import { useMemo, useState } from "react";
import {
  Search, Bell, Send, Paperclip, Phone, ChevronLeft, Check, CheckCheck,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
interface ChatMessage {
  id: number;
  sender: "me" | "them";
  text: string;
  sentAt: string; // ISO datetime
  read: boolean;
}

interface Conversation {
  id: number;
  ownerName: string;
  ownerImg: string;
  roomTitle: string;
  unreadCount: number;
  messages: ChatMessage[];
}

interface MessagesProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data from GET /api/conversations) ----------
const CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    ownerName: "Bishnu Adhikari",
    ownerImg: "/images/avatars/owner-placeholder.jpg",
    roomTitle: "Shanti Niwas, Baneshwor",
    unreadCount: 2,
    messages: [
      { id: 1, sender: "them", text: "Namaste! Your rent for this month has been received, thank you.", sentAt: "2026-08-04T09:12:00", read: true },
      { id: 2, sender: "me", text: "Thank you! Also, the kitchen tap is leaking a bit, could someone take a look?", sentAt: "2026-08-04T09:20:00", read: true },
      { id: 3, sender: "them", text: "Sure, I'll send the plumber tomorrow morning around 10.", sentAt: "2026-08-05T18:02:00", read: false },
      { id: 4, sender: "them", text: "Does that time work for you?", sentAt: "2026-08-05T18:02:30", read: false },
    ],
  },
  {
    id: 2,
    ownerName: "Rita Sharma",
    ownerImg: "/images/avatars/owner-placeholder-2.jpg",
    roomTitle: "Luxury 2BHK, Baneshwor",
    unreadCount: 0,
    messages: [
      { id: 1, sender: "me", text: "Hi, I'd like to move in by mid-August if possible.", sentAt: "2026-08-02T11:00:00", read: true },
      { id: 2, sender: "them", text: "That works, I'll get the paperwork ready.", sentAt: "2026-08-02T14:30:00", read: true },
    ],
  },
  {
    id: 3,
    ownerName: "Sita Karki",
    ownerImg: "/images/avatars/owner-placeholder-3.jpg",
    roomTitle: "Modern Flat, Lalitpur",
    unreadCount: 0,
    messages: [
      { id: 1, sender: "them", text: "Sorry, the flat has already been rented out.", sentAt: "2026-07-11T08:00:00", read: true },
    ],
  },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatListTimestamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday
    ? formatTime(iso)
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function Messages({ user, onLogout, onNavigate }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter(
      (c) =>
        query.trim() === "" ||
        c.ownerName.toLowerCase().includes(query.toLowerCase()) ||
        c.roomTitle.toLowerCase().includes(query.toLowerCase())
    );
  }, [conversations, query]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const openConversation = (id: number) => {
    setSelectedId(id);
    // mark as read locally when opened
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) } : c))
    );
    // TODO: call api.markConversationRead(id)
  };

  const sendMessage = () => {
    if (!draft.trim() || !selected) return;
    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "me",
      text: draft.trim(),
      sentAt: new Date().toISOString(),
      read: false,
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, messages: [...c.messages, newMessage] } : c))
    );
    setDraft("");
    // TODO: call api.sendMessage(selected.id, newMessage.text)
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F6FB] text-stone-900">
      <Sidebar
        active="Messages"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3.5 pl-14 sm:px-6 sm:pl-6">
          <h1 className="hidden shrink-0 text-base font-semibold sm:block">Messages</h1>
          <div className="flex min-w-0 flex-1" />
          <button onClick={() => onNavigate("notifications")} className="relative shrink-0 text-stone-500 hover:text-stone-700">
            <Bell size={18} />
          </button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
              alt={user.fullName}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Two-pane body */}
        <div className="flex min-h-0 flex-1">
          {/* Conversation list — hidden on mobile once a chat is open */}
          <aside
            className={`w-full shrink-0 flex-col border-r border-stone-200 bg-white md:flex md:w-80 ${
              selected ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="shrink-0 border-b border-stone-100 p-3">
              <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
                <Search size={15} className="shrink-0 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((c) => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-stone-50 px-4 py-3 text-left hover:bg-stone-50 ${
                      selectedId === c.id ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <img src={c.ownerImg} alt={c.ownerName} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-stone-900">{c.ownerName}</p>
                        <span className="shrink-0 text-[11px] text-stone-400">
                          {last ? formatListTimestamp(last.sentAt) : ""}
                        </span>
                      </div>
                      <p className="truncate text-xs text-stone-400">{c.roomTitle}</p>
                      <p className={`mt-0.5 truncate text-xs ${c.unreadCount > 0 ? "font-medium text-stone-800" : "text-stone-500"}`}>
                        {last?.sender === "me" ? "You: " : ""}
                        {last?.text}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredConversations.length === 0 && (
                <p className="p-4 text-center text-xs text-stone-400">No conversations found.</p>
              )}
            </div>
          </aside>

          {/* Chat thread */}
          <section className={`min-w-0 flex-1 flex-col md:flex ${selected ? "flex" : "hidden"}`}>
            {!selected ? (
              <div className="hidden h-full flex-1 items-center justify-center md:flex">
                <p className="text-sm text-stone-400">Select a conversation to start messaging.</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
                  <button onClick={() => setSelectedId(null)} className="text-stone-500 hover:text-stone-700 md:hidden">
                    <ChevronLeft size={20} />
                  </button>
                  <img src={selected.ownerImg} alt={selected.ownerName} className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">{selected.ownerName}</p>
                    <p className="truncate text-xs text-stone-400">{selected.roomTitle}</p>
                  </div>
                  <button className="shrink-0 text-stone-500 hover:text-stone-700">
                    <Phone size={17} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {selected.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === "me"
                            ? "rounded-br-sm bg-stone-900 text-white"
                            : "rounded-bl-sm bg-white text-stone-800 shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            m.sender === "me" ? "text-white/60" : "text-stone-400"
                          }`}
                        >
                          {formatTime(m.sentAt)}
                          {m.sender === "me" && (m.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                        </div>
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
                      className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none focus:border-stone-400"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim()}
                      className="flex shrink-0 items-center justify-center rounded-xl bg-stone-900 p-2.5 text-white hover:bg-stone-800 disabled:opacity-40"
                    >
                      <Send size={17} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
