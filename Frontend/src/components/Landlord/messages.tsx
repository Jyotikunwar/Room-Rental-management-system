import { useEffect, useMemo, useState } from "react";
import { Search, Send, MessageSquare, Loader2 } from "lucide-react";
import { api, type Inquiry, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordMessagesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

interface Thread {
  key: string; // senderId-roomId
  senderId: number;
  senderName: string;
  roomTitle: string;
  messages: Inquiry[];
  lastMessage: Inquiry;
}

export default function LandlordMessages({ user, onLogout, activeRoute, onNavigate }: LandlordMessagesProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, []);

  async function loadInquiries() {
    setLoading(true);
    try {
      const res = await api.getReceivedInquiries();
      if (res.success) setInquiries(res.inquiries || []);
    } catch (e) {
      console.error("Failed to load inquiries:", e);
    } finally {
      setLoading(false);
    }
  }

  // Group flat inquiry list into per-tenant, per-room threads.
  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Thread>();
    for (const inq of inquiries) {
      const key = `${inq.senderId}-${inq.roomId}`;
      const existing = map.get(key);
      if (existing) {
        existing.messages.push(inq);
        if (new Date(inq.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = inq;
        }
      } else {
        map.set(key, {
          key,
          senderId: inq.senderId,
          senderName: inq.sender?.fullName || `Tenant #${inq.senderId}`,
          roomTitle: inq.room?.title || "a room",
          messages: [inq],
          lastMessage: inq,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [inquiries]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) => t.senderName.toLowerCase().includes(q) || t.roomTitle.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const selectedThread = threads.find((t) => t.key === selectedThreadKey) || filteredThreads[0] || null;

  async function handleSendReply() {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    try {
      // NOTE: replyToInquiry is NOT yet in api.ts — add something like:
      //
      //   replyToInquiry: async (roomId: number, receiverId: number, message: string) => {
      //     const res = await fetch(`${API_BASE_URL}/inquiries`, {
      //       method: "POST",
      //       headers: getAuthHeaders(),
      //       body: JSON.stringify({ roomId, receiverId, message }),
      //     });
      //     return res.json();
      //   },
      //
      // and a matching backend route that accepts an explicit receiverId
      // (your current POST /inquiries likely infers the receiver as the
      // room's landlord, which works for tenant->landlord but not the
      // landlord->tenant direction needed here).
      const res = await (api as any).replyToInquiry(
        selectedThread.messages[0].roomId,
        selectedThread.senderId,
        replyText.trim()
      );
      if (res?.success) {
        setReplyText("");
        await loadInquiries();
      }
    } catch (e) {
      console.error("Failed to send reply:", e);
    } finally {
      setSending(false);
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
              placeholder="Search conversations..."
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
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="mt-1 text-sm text-gray-500">Inquiries from tenants about your properties.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Thread list */}
            <div className="rounded-2xl border border-gray-200 bg-white lg:col-span-1">
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="p-5 text-sm text-gray-400">Loading conversations...</p>
                ) : filteredThreads.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">No conversations yet.</p>
                ) : (
                  filteredThreads.map((thread) => (
                    <button
                      key={thread.key}
                      onClick={() => setSelectedThreadKey(thread.key)}
                      className={`flex w-full flex-col gap-1 border-b border-gray-100 px-5 py-4 text-left hover:bg-gray-50 ${
                        selectedThread?.key === thread.key ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{thread.senderName}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(thread.lastMessage.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Re: {thread.roomTitle}</p>
                      <p className="truncate text-sm text-gray-500">{thread.lastMessage.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selected thread */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white lg:col-span-2">
              {!selectedThread ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-gray-400">
                  <MessageSquare size={28} />
                  <p className="text-sm">Select a conversation to view messages.</p>
                </div>
              ) : (
                <>
                  <div className="border-b border-gray-100 px-5 py-4">
                    <p className="font-semibold text-gray-900">{selectedThread.senderName}</p>
                    <p className="text-xs text-gray-400">About: {selectedThread.roomTitle}</p>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {selectedThread.messages
                      .slice()
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((msg) => (
                        <div key={msg.id} className="max-w-[75%] rounded-2xl bg-gray-50 px-4 py-2.5">
                          <p className="text-sm text-gray-800">{msg.message}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-100 p-4">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                      placeholder="Type a reply..."
                      className="h-10 flex-1 rounded-full border border-gray-200 px-4 text-sm outline-none focus:border-gray-900"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}