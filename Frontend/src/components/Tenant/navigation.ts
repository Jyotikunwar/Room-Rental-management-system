import type { NavLabel } from "./Sidebar";

// Every screen the tenant portal can show. Add a new entry here whenever a
// new page is wired up, then handle it in App.tsx's switch.
export type TenantView =
  | "dashboard"
  | "search"
  | "saved"
  | "requests"
  | "rental"
  | "payments"
  | "messages"
  | "notifications"
  | "settings";

// Maps each Sidebar nav label to the view it should open.
export const NAV_LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  "Dashboard": "dashboard",
  "Find Property": "search",
  "Saved Rooms": "saved",
  "My Requests": "requests",
  "Current Rental": "rental",
  "Payments": "payments",
  "Messages": "messages",
  "Notifications": "notifications",
};