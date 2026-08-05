const API_BASE_URL = "http://localhost:5000/api";

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

export interface RecommendationResult {
  room: Room;
  similarityScore: number;
  popularityScore: number;
  finalScore: number;
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
  getPersonalizedRecommendations: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/rooms/recommendations?${query}`, {
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

  // Admin
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
