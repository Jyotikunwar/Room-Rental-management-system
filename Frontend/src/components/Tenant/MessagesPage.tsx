import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, HelpCircle, Send, ChevronLeft, Loader2, Paperclip, Smile, Phone, MoreVertical, Home,
} from "lucide-react";
import type { User, Inquiry } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

interface MessagesProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

interface Conversation {
  key: string; // `${contactId}-${roomId ?? "none"}`
  contactId: number;
  contactName: string;
  contactRole?: string;
  roomId: number | null;
  roomTitle: string;
  messages: Inquiry[]; // sorted oldest -> newest
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatListTimestamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? formatTime(iso) : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDateDivider(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const label = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return isToday ? `Today, ${label}` : label;
}

// Groups the flat sent+received inquiry list into per-contact, per-room threads.
// NOTE: the Inquiry API has no read/unread flag or online-presence data, so this
// view can't show unread badges or "Online" status — that needs an isRead column
// on the Message model plus a presence/websocket layer, respectively. Adding fake
// placeholders for these would be misleading, so they're intentionally left out
// until the backend actually supports them.
function buildConversations(inquiries: Inquiry[], myId: number): Conversation[] {
  const map = new Map<string, Conversation>();

  for (const inq of inquiries) {
    const isMine = inq.senderId === myId;
    const contact = isMine ? inq.receiver : inq.sender;
    const contactId = isMine ? inq.receiverId : inq.senderId;
    const roomId = inq.roomId ?? null;
    const key = `${contactId}-${roomId ?? "none"}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        contactId,
        contactName: contact?.fullName || "Unknown",
        contactRole: contact?.role,
        roomId,
        roomTitle: inq.room?.title || "General inquiry",
        messages: [],
      });
    }
    map.get(key)!.messages.push(inq);
  }

  const conversations = Array.from(map.values());
  for (const c of conversations) {
    c.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  conversations.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.createdAt || "";
    const bLast = b.messages[b.messages.length - 1]?.createdAt || "";
    return bLast.localeCompare(aLast);
  });
  return conversations;
}

const ROLE_LABEL: Record<string, string> = { LANDLORD: "Landlord", TENANT: "Tenant", ADMIN: "Admin" };
const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "😢", "😮", "❤️", "🔥", "👏", "🤔", "😅", "🙌", "✅", "🎊"];

export default function MessagesPage({ user, onLogout, onNavigate }: MessagesProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const loadMessages = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getSentInquiries(), api.getReceivedInquiries()])
      .then(([sentRes, receivedRes]) => {
        const sentFailed = sentRes && sentRes.success === false;
        const receivedFailed = receivedRes && receivedRes.success === false;
        const sent: Inquiry[] = sentFailed
          ? []
          : Array.isArray(sentRes)
          ? sentRes
          : sentRes?.inquiries || sentRes?.data || [];
        const received: Inquiry[] = receivedFailed
          ? []
          : Array.isArray(receivedRes)
          ? receivedRes
          : receivedRes?.inquiries || receivedRes?.data || [];
        setInquiries([...sent, ...received]);
        if (sentFailed && receivedFailed) {
          setError(sentRes.message || receivedRes.message || "Failed to load messages");
        }
      })
      .catch(() => setError("Failed to load messages"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const conversations = useMemo(() => buildConversations(inquiries, user.id), [inquiries, user.id]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(
      (c) =>
        query.trim() === "" ||
        c.contactName.toLowerCase().includes(query.toLowerCase()) ||
        c.roomTitle.toLowerCase().includes(query.toLowerCase())
    );
  }, [conversations, query]);

  const selected = conversations.find((c) => c.key === selectedKey) ?? null;

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const sendMessage = async () => {
    if (!draft.trim() || !selected || !selected.roomId) return;
    setSending(true);
    setSendError(null);
    const text = draft.trim();

    try {
      const res = await api.replyToInquiry(selected.roomId, selected.contactId, text);
      if (res && res.success === false) {
        setSendError(res.message || "Message failed to send.");
      } else {
        setDraft("");
        loadMessages();
      }
    } catch {
      setSendError("Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  const viewRoom = () => {
    setOptionsOpen(false);
    // No dedicated single-room route exists yet in TenantView, so this opens
    // the room-browsing page as the closest available destination.
    onNavigate(NAV_LABEL_TO_VIEW["Find Rooms"]);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F6FB] text-stone-900">
      <Sidebar active="Messages" onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3.5 pl-14 sm:px-6 sm:pl-6">
          <h1 className="shrink-0 text-lg font-bold">Messages</h1>
          <div className="hidden flex-1 items-center justify-center sm:flex">
            <div className="flex w-full max-w-sm items-center gap-2 rounded-full bg-stone-100 px-3.5 py-2">
              <Search size={14} className="shrink-0 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <button onClick={() => onNavigate("notifications")} className="text-stone-500 hover:text-stone-700">
              <Bell size={18} />
            </button>
            <button onClick={() => onNavigate("settings")} className="text-stone-500 hover:text-stone-700">
              <HelpCircle size={18} />
            </button>
            {/* Decorative only — clicking your own avatar shouldn't log you out.
                Use the sidebar's logout control instead. */}
            <div className="h-8 w-8 overflow-hidden rounded-full bg-stone-200">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="animate-spin text-stone-400" size={26} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* Conversation list */}
            <aside
              className={`w-full shrink-0 flex-col border-r border-stone-200 bg-white md:flex md:w-80 ${
                selected ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="shrink-0 border-b border-stone-100 p-3">
                <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2">
                  <Search size={15} className="shrink-0 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search messages"
                    className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {error && <p className="p-4 text-center text-xs text-stone-400">{error}</p>}

                {!error &&
                  filteredConversations.map((c) => {
                    const last = c.messages[c.messages.length - 1];
                    const lastIsMine = last?.senderId === user.id;
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          setSelectedKey(c.key);
                          setOptionsOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left hover:bg-stone-50 ${
                          selectedKey === c.key ? "border-blue-600 bg-blue-50/60" : "border-transparent"
                        }`}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${c.contactName}`}
                          alt={c.contactName}
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-stone-900">{c.contactName}</p>
                            <span className="shrink-0 text-[11px] text-stone-400">
                              {last ? formatListTimestamp(last.createdAt) : ""}
                            </span>
                          </div>
                          {c.contactRole && (
                            <p className="text-[11px] font-medium text-blue-600">{ROLE_LABEL[c.contactRole] ?? c.contactRole}</p>
                          )}
                          <p className="mt-0.5 truncate text-xs text-stone-500">
                            {lastIsMine ? "You: " : ""}
                            {last?.message}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                {!error && filteredConversations.length === 0 && (
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
                  <div className="relative flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
                    <button onClick={() => setSelectedKey(null)} className="text-stone-500 hover:text-stone-700 md:hidden">
                      <ChevronLeft size={20} />
                    </button>
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${selected.contactName}`}
                      alt={selected.contactName}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900">{selected.contactName}</p>
                      <p className="truncate text-xs text-stone-400">{selected.roomTitle}</p>
                    </div>
                    <button
                      className="shrink-0 text-stone-300"
                      aria-label="Call (not available)"
                      title="Voice calling isn't available yet"
                      disabled
                    >
                      <Phone size={17} />
                    </button>
                    <button
                      onClick={() => setOptionsOpen((v) => !v)}
                      className="shrink-0 text-stone-400 hover:text-stone-600"
                      aria-label="More options"
                    >
                      <MoreVertical size={17} />
                    </button>

                    {optionsOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOptionsOpen(false)} />
                        <div className="absolute right-4 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
                          {selected.roomId ? (
                            <button
                              onClick={viewRoom}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              <Home size={14} /> View Room
                            </button>
                          ) : (
                            <p className="px-3 py-2.5 text-xs text-stone-400">No room linked</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-1 overflow-y-auto bg-[#F7F9FC] px-4 py-4">
                    {selected.messages.map((m, i) => {
                      const mine = m.senderId === user.id;
                      const prev = selected.messages[i - 1];
                      const showDateDivider = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                      return (
                        <div key={m.id}>
                          {showDateDivider && (
                            <div className="my-3 flex justify-center">
                              <span className="rounded-full bg-stone-200/70 px-3 py-1 text-[11px] font-medium text-stone-500">
                                {formatDateDivider(m.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={`flex items-end gap-2 py-1 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine && (
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${selected.contactName}`}
                                alt=""
                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <div className="flex max-w-[75%] flex-col">
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-sm ${
                                  mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-white text-stone-800 shadow-sm"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{m.message}</p>
                              </div>
                              <span className={`mt-0.5 text-[10px] text-stone-400 ${mine ? "text-right" : "text-left"}`}>
                                {formatTime(m.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Composer */}
                  <div className="relative shrink-0 border-t border-stone-200 bg-white p-3">
                    {sendError && <p className="mb-2 text-xs font-medium text-rose-600">{sendError}</p>}

                    {emojiOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                        <div className="absolute bottom-full right-3 z-20 mb-2 grid grid-cols-8 gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => {
                                setDraft((d) => d + e);
                                setEmojiOpen(false);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-stone-100"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 rounded-full bg-stone-100 px-2 py-1.5">
                      <button
                        className="shrink-0 rounded-full p-1.5 text-stone-300"
                        aria-label="Attach file (not available)"
                        title="File attachments aren't available yet"
                        disabled
                      >
                        <Paperclip size={17} />
                      </button>
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                      />
                      <button
                        onClick={() => setEmojiOpen((v) => !v)}
                        className={`shrink-0 rounded-full p-1.5 hover:bg-stone-200 ${emojiOpen ? "bg-stone-200 text-stone-700" : "text-stone-400 hover:text-stone-600"}`}
                        aria-label="Emoji picker"
                      >
                        <Smile size={17} />
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!draft.trim() || sending}
                        className="flex shrink-0 items-center justify-center rounded-full bg-blue-600 p-2 text-white hover:bg-blue-500 disabled:opacity-40"
                      >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
