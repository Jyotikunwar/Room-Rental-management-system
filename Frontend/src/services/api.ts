const API_BASE = "http://localhost:5000";
export const API_BASE_URL = `${API_BASE}/api`;
export const UPLOAD_BASE_URL = API_BASE;

export function getImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${UPLOAD_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: "TENANT" | "LANDLORD" | "ADMIN";
}

export interface Amenity {
  id: number;
  name: string;
  icon?: string;
}

export interface RoomImage {
  id: number;
  imageUrl: string;
  isPrimary?: boolean;
}
 
export interface Faq {
  id: number;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
 

export interface Room {
  id: number;
  landlordId: number;
  title: string;
  description?: string;
  city: string;
  location: string;
  roomType: "SINGLE" | "DOUBLE" | "FLAT" | "APARTMENT";
  price: number;
  status: "AVAILABLE" | "BOOKED" | "UNDER_MAINTENANCE";
  createdAt?: string;
  roomImages?: RoomImage[];
  roomAmenities?: { amenity: Amenity }[];
  reviews?: { id: number; rating: number; comment?: string; user?: { fullName: string } }[];
  favorites?: { id: number }[];
  landlord?: { id: number; fullName: string; phone?: string; email?: string };
}
export interface MessageContact {
  id: number;
  fullName: string;
  role: "TENANT" | "LANDLORD" | "ADMIN";
  phone?: string;
  email: string;
  avatarUrl?: string;
  isOnline: boolean;
}
 
export interface ConversationSummary {
  contact: MessageContact;
  lastMessage: { text: string; createdAt: string; fromMe: boolean };
  unreadCount: number;
}
 
export interface ChatMessage {
  id: number;
  text: string;
  senderId: number;
  fromMe: boolean;
  isRead: boolean;
  createdAt: string;
}
export interface RecommendationResult {
  room: Room;
  similarityScore: number;
  popularityScore: number;
  finalScore: number;
}
export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: "TENANT" | "LANDLORD" | "ADMIN";
  idType?: "CITIZENSHIP" | "PASSPORT" | "NATIONAL_ID" | "DRIVING_LICENSE";
  idNumber?: string;
  idDocumentUrl?: string;
  isIdVerified?: boolean;
}
export interface RecommendationLog {
  id: number;
  tenantId?: number;
  roomId: number;
  similarityScore: number;
  popularityScore: number;
  finalScore: number;
  createdAt: string;
  room?: Room;
  tenant?: User;
}

export interface Inquiry {
  id: number;
  senderId: number;
  receiverId: number;
  roomId: number;
  message: string;
  createdAt: string;
  sender?: User;
  receiver?: User;
  room?: Room;
}

export interface Booking {
  id: number;
  roomId: number;
  tenantId: number;
  moveInDate: string;
  endDate?: string;
  totalAmount?: number;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  room?: Room;
  payment?: Payment;
  tenant?: User;
  // NOTE: neither field exists in the backend yet — needed for the new
  // Tenants page's "New Tenant Requests" table (credit score, application docs).
  creditScore?: number;
  documentUrl?: string;
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  paymentMethod: "ESEWA" | "KHALTI" | "CASH" | "BANK";
  transactionId?: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paidAt?: string;
  createdAt: string;
  booking?: Booking;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "BOOKING" | "PAYMENT" | "MESSAGE" | "REVIEW" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
}

export interface Favorite {
  id: number;
  userId: number;
  roomId: number;
  createdAt: string;
  room?: Room;
}

export interface DashboardStats {
  availableRooms: number;
  savedRooms: number;
  rentDueInDays: number | null;
  pendingRequests: number;
  nextPaymentDate: string | null;
  leaseProgress: number;
  preferredLocation: string;
  locationMatches: number;
}

export interface TenantDashboardData {
  stats: DashboardStats;
  activeRental: Booking | null;
  recentSaved: Favorite[];
  notifications: Notification[];
  messages: Inquiry[];
  recommendations: RecommendationResult[];
}

// NOTE: no backend model exists yet for maintenance requests — add this on
// the server (roomId, description, priority, status, reportedBy, assignedTo,
// issueType, createdAt) before getMaintenanceRequests/updateMaintenanceStatus/
// getAdminMaintenanceRequests below will work.
export interface MaintenanceRequest {
  id: number;
  roomId: number;
  room?: Room;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  reportedBy?: { fullName: string };
  assignedTo?: { fullName: string } | null;
  issueType?: string; // e.g. "Plumbing", "Electrical", "Appliance/Door" — NOTE: not in schema yet
  createdAt: string;
}
export interface PaymentMethod {
  id: number;
  userId: number;
  type: "ESEWA" | "KHALTI" | "BANK" | "CASH";
  label: string;
  detail?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
 
 
// NOTE: none of this exists yet — needs a new admin activity feed, either
// assembled server-side from existing tables (bookings, inquiries,
// maintenance, room creation) or backed by a dedicated ActivityLog table.
export interface AdminActivityEntry {
  id: number;
  category: "PAYMENT" | "MAINTENANCE" | "PROPERTY" | "TENANT" | "LANDLORD" | "MESSAGE";
  title: string;
  description: string;
  createdAt: string;
  status?: string;
}

// NOTE: none of this exists yet — a landlord-scoped activity feed mirroring
// AdminActivityEntry but filtered to the logged-in landlord's own data.
export interface LandlordActivityEntry {
  id: number;
  category: "MESSAGE" | "PAYMENT" | "MAINTENANCE" | "SYSTEM";
  title: string;
  description: string;
  createdAt: string;
}

// NOTE: none of this exists yet — a unified admin inbox needs new tables
// for online presence and merged tenant/landlord threads (Inquiry alone
// doesn't cover this).
export interface AdminMessageThread {
  contactId: number;
  contactName: string;
  contactRole: "TENANT" | "LANDLORD";
  isOnline?: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  avatarUrl?: string;
}

export interface AdminThreadMessage {
  id: number;
  senderId: number;
  text: string;
  createdAt: string;
  fromAdmin: boolean;
}

export interface AdminContactProfile {
  id: number;
  fullName: string;
  role: "TENANT" | "LANDLORD";
  phone?: string;
  email: string;
  avatarUrl?: string;
  property?: { title: string; leaseEndDate?: string };
  recentActivity?: { title: string; date: string }[];
}

// NOTE: none of this exists yet. Room.reviews only covers property reviews
// today — "Landlord Reviews" and "Tenant Reviews" as separate target types
// need a new reviews table (or a targetType column) plus an admin-wide
// aggregation endpoint.
export interface AdminReviewEntry {
  id: number;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  comment: string;
  targetType: "PROPERTY" | "LANDLORD" | "TENANT";
  targetName?: string;
  createdAt: string;
}

export interface AdminReviewStats {
  totalReviews: number;
  totalReviewsGrowthPct?: number;
  averageRating: number;
  positiveReviews: number; // 4-5 stars
  negativeReviews: number; // 1-2 stars
}

// NOTE: doesn't exist yet — a landlord rating a tenant is a new concept
// (Room.reviews only covers tenants/guests rating a property).
export interface TenantReview {
  id: number;
  tenantId: number;
  tenantName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Token helper
export const getToken = (): string | null => localStorage.getItem("token");
export const setToken = (token: string) => localStorage.setItem("token", token);
export const removeToken = () => localStorage.removeItem("token");

export const getUser = (): User | null => {
  const userJson = localStorage.getItem("user");
  return userJson ? JSON.parse(userJson) : null;
};
export const setUser = (user: User) => localStorage.setItem("user", JSON.stringify(user));
export const removeUser = () => localStorage.removeItem("user");

// Helper headers
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// API Methods
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  signup: async (data: { fullName: string; email: string; password: string; phone?: string; role: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  // NOTE: backend route PATCH /auth/me must exist for this to work.
  updateProfile: async (data: { fullName?: string; phone?: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  // NOTE: doesn't exist yet — needs a route accepting multipart/form-data
  // and storing the avatar (e.g. alongside room image uploads).
  uploadAvatar: async (formData: FormData) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return res.json();
  },
  // NOTE: doesn't exist yet — needs a route that verifies currentPassword
  // against the stored hash before updating.
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/me/password`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  },
  // NOTE: doesn't exist yet — needs a route to persist per-channel
  // (email/sms/push) notification preferences per category.
  updateNotificationPreferences: async (prefs: Record<string, { email?: boolean; sms?: boolean; push?: boolean }>) => {
    const res = await fetch(`${API_BASE_URL}/auth/me/notification-preferences`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(prefs),
    });
    return res.json();
  },
  // NOTE: doesn't exist yet — needs a route to enable/disable 2FA on the account.
  toggleTwoFactor: async (enabled: boolean) => {
    const res = await fetch(`${API_BASE_URL}/auth/me/two-factor`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  // Rooms
  getRooms: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/rooms?${query}`);
    return res.json();
  },
  getRoomById: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`);
    return res.json();
  },
  createRoom: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  // NOTE: backend route PATCH /rooms/:id must exist for this to work.
  updateRoom: async (id: number, data: any) => {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  // NOTE: backend route DELETE /rooms/:id must exist for this to work.
  deleteRoom: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getMyRooms: async () => {
    const res = await fetch(`${API_BASE_URL}/rooms/my-rooms`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  uploadRoomImages: async (roomId: number, formData: FormData) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/images`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return res.json();
  },

  // Recommendations
  getPersonalizedRecommendations: async (params?: Record<string, string | number>) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
    const res = await fetch(`${API_BASE_URL}/tenant/recommendations?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getTenantDashboard: async () => {
    const res = await fetch(`${API_BASE_URL}/tenant/dashboard`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getSimilarRecommendations: async (roomId: number) => {
    const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/recommendations`);
    return res.json();
  },
  getRecommendationLogs: async () => {
    const res = await fetch(`${API_BASE_URL}/rooms/recommendations/logs`);
    return res.json();
  },

  // Favorites
  getFavorites: async () => {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  toggleFavorite: async (roomId: number) => {
    const res = await fetch(`${API_BASE_URL}/favorites/${roomId}/toggle`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  addFavorite: async (roomId: number) => {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId }),
    });
    return res.json();
  },
  removeFavorite: async (roomId: number) => {
    const res = await fetch(`${API_BASE_URL}/favorites/${roomId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Inquiries
  sendInquiry: async (roomId: number, message: string) => {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId, message }),
    });
    return res.json();
  },
  getReceivedInquiries: async () => {
    const res = await fetch(`${API_BASE_URL}/inquiries/received`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getSentInquiries: async () => {
    const res = await fetch(`${API_BASE_URL}/inquiries/sent`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  // NOTE: backend route POST /inquiries must accept an explicit receiverId
  // for the landlord->tenant direction (the existing sendInquiry likely
  // infers the receiver as the room's landlord, which only covers
  // tenant->landlord). Adjust the route/body shape to match your backend.
  replyToInquiry: async (roomId: number, receiverId: number, message: string) => {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId, receiverId, message }),
    });
    return res.json();
  },

  // Reviews
  getRoomReviews: async (roomId: number) => {
    const res = await fetch(`${API_BASE_URL}/reviews/${roomId}`);
    return res.json();
  },
  createReview: async (roomId: number, rating: number, comment?: string) => {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId, rating, comment }),
    });
    return res.json();
  },
  // NOTE: neither of these exist yet — see AdminReviewEntry/AdminReviewStats
  // comment above. Needs a targetType-aware reviews model.
  getAdminReviews: async (params?: { target?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`${API_BASE_URL}/admin/reviews?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminReviewStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  // NOTE: doesn't exist yet — see TenantReview comment above.
  getTenantReviews: async () => {
    const res = await fetch(`${API_BASE_URL}/landlord/tenant-reviews`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Admin
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  // NOTE: none of these exist yet — see the comment blocks above each
  // matching interface (Landlords, Payments, Bookings, Maintenance,
  // Messages, Activity are all new admin-wide aggregation endpoints).
  getLandlords: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/admin/landlords?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getLandlordStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/landlords/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminBookings: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/admin/bookings?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminPayments: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/admin/payments?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminPaymentStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/payments/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminMaintenanceRequests: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/admin/maintenance?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  assignMaintenanceRequest: async (id: number, assigneeId: number) => {
    const res = await fetch(`${API_BASE_URL}/maintenance/${id}/assign`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ assigneeId }),
    });
    return res.json();
  },
  getAdminMessageThreads: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/messages/threads`, { headers: getAuthHeaders() });
    return res.json();
  },
  getAdminThreadMessages: async (contactId: number) => {
    const res = await fetch(`${API_BASE_URL}/admin/messages/threads/${contactId}`, { headers: getAuthHeaders() });
    return res.json();
  },
  getAdminContactProfile: async (contactId: number) => {
    const res = await fetch(`${API_BASE_URL}/admin/contacts/${contactId}`, { headers: getAuthHeaders() });
    return res.json();
  },
  sendAdminMessage: async (contactId: number, text: string) => {
    const res = await fetch(`${API_BASE_URL}/admin/messages/threads/${contactId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    return res.json();
  },
  getAdminActivity: async (params?: { category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`${API_BASE_URL}/admin/activity?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Landlord — NOTE: none of these three exist yet.
  getLandlordActivity: async (params?: { category?: string; page?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`${API_BASE_URL}/landlord/activity?${query}`, { headers: getAuthHeaders() });
    return res.json();
  },
  getPlatformFeeStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/landlord/platform-fee`, { headers: getAuthHeaders() });
    return res.json();
  },
  payPlatformFee: async () => {
    const res = await fetch(`${API_BASE_URL}/landlord/platform-fee/pay`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Bookings
  createBooking: async (data: { roomId: number; moveInDate: string; endDate?: string; notes?: string }) => {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getTenantBookings: async () => {
    const res = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getLandlordBookings: async () => {
    const res = await fetch(`${API_BASE_URL}/bookings/landlord`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  updateBookingStatus: async (bookingId: number, status: string) => {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  cancelBooking: async (bookingId: number) => {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Notifications
  getNotifications: async (limit = 20) => {
    const res = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  markNotificationRead: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Payments
  getMyPayments: async () => {
    const res = await fetch(`${API_BASE_URL}/payments/my-payments`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createPayment: async (bookingId: number, paymentMethod: string) => {
    const res = await fetch(`${API_BASE_URL}/payments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookingId, paymentMethod }),
    });
    return res.json();
  },

  // Maintenance — NOTE: backend model + routes don't exist yet.
  // Add a MaintenanceRequest table (roomId, description, priority, status,
  // reportedBy, assignedTo, issueType, createdAt) and these two routes
  // before using the landlord-scoped maintenance page.
  getMaintenanceRequests: async () => {
    const res = await fetch(`${API_BASE_URL}/maintenance/landlord`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  updateMaintenanceStatus: async (id: number, status: string) => {
    const res = await fetch(`${API_BASE_URL}/maintenance/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Tenant — composite endpoints (dashboard/requests/rental/payments)
  getMyRequests: async () => {
    const res = await fetch(`${API_BASE_URL}/tenant/requests`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  cancelRequest: async (bookingId: number) => {
    const res = await fetch(`${API_BASE_URL}/tenant/requests/${bookingId}/cancel`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getCurrentRental: async () => {
    const res = await fetch(`${API_BASE_URL}/tenant/rental`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  reportMaintenanceIssue: async (bookingId: number, title: string, description: string) => {
    const res = await fetch(`${API_BASE_URL}/tenant/rental/maintenance`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookingId, title, description }),
    });
    return res.json();
  },
  getPaymentsSummary: async () => {
    const res = await fetch(`${API_BASE_URL}/tenant/payments/summary`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
getNotificationPreferences: async () => {
  const res = await fetch(`${API_BASE_URL}/auth/me/notification-preferences`, {
    headers: getAuthHeaders(),
  });
  return res.json();
},

deleteAccount: async () => {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return res.json();
},
  
// Add inside the `api = { ... }` object in services/api.ts

  // Saved payment methods
  getPaymentMethods: async () => {
    const res = await fetch(`${API_BASE_URL}/payment-methods`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  addPaymentMethod: async (data: { type: string; label: string; detail?: string; isDefault?: boolean }) => {
    const res = await fetch(`${API_BASE_URL}/payment-methods`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updatePaymentMethod: async (id: number, data: { label?: string; detail?: string }) => {
    const res = await fetch(`${API_BASE_URL}/payment-methods/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  setDefaultPaymentMethod: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/payment-methods/${id}/default`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  deletePaymentMethod: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/payment-methods/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  // ---- Add these two methods inside the `api` object in services/api.ts,
// near updateProfile/uploadAvatar (same auth-header / multipart patterns). ----

// NOTE: doesn't exist yet — needs a backend route PATCH /auth/me/identification
// that stores idType + idNumber against the user record (e.g. new columns on
// User, or a separate Identification table if you also want a review/approval flow).
updateIdentification: async (data: { idType: string; idNumber: string }) => {
  const res = await fetch(`${API_BASE_URL}/auth/me/identification`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
},

// NOTE: doesn't exist yet — needs a route accepting multipart/form-data (same
// shape as uploadAvatar/uploadRoomImages) and storing the file, e.g.
// POST /auth/me/id-document with the file field named "idDocument".
uploadIdDocument: async (formData: FormData) => {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/auth/me/id-document`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  return res.json();
},
getConversations: async () => {
    const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getMessagesWithContact: async (contactId: number) => {
    const res = await fetch(`${API_BASE_URL}/messages/${contactId}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  sendMessageTo: async (receiverId: number, message: string, roomId?: number) => {
    const res = await fetch(`${API_BASE_URL}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ receiverId, message, roomId }),
    });
    return res.json();
  },
  markConversationRead: async (contactId: number) => {
    const res = await fetch(`${API_BASE_URL}/messages/${contactId}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getFaqs: async () => {
  const res = await fetch(`${API_BASE_URL}/faqs`);
  return res.json();
},
 
// Admin-only — for a future FAQ management screen
getAllFaqsAdmin: async () => {
  const res = await fetch(`${API_BASE_URL}/faqs/admin/all`, { headers: getAuthHeaders() });
  return res.json();
},
createFaq: async (data: { question: string; answer: string; order?: number }) => {
  const res = await fetch(`${API_BASE_URL}/faqs`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
},
updateFaq: async (id: number, data: { question?: string; answer?: string; order?: number; isActive?: boolean }) => {
  const res = await fetch(`${API_BASE_URL}/faqs/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
},
deleteFaq: async (id: number) => {
  const res = await fetch(`${API_BASE_URL}/faqs/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return res.json();
},
 
};
