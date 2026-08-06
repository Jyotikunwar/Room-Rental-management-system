import { useState } from "react";
import LandlordSidebar, { LandlordRoute } from "./LandlordSidebar";

// Example: how any landlord page uses the shared sidebar.
// Swap the <main> content per page — Dashboard, MyProperties, Tenants, etc.
export default function LandlordLayoutExample() {
  const [route, setRoute] = useState<LandlordRoute>("dashboard");

  function handleNavigate(nextRoute: LandlordRoute) {
    setRoute(nextRoute);
    // In a real app with routing (React Router / Next.js), navigate here instead:
    // navigate(`/landlord/${nextRoute}`)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={route} onNavigate={handleNavigate} />

      {/* Page content scrolls independently — sidebar stays fixed via `sticky` */}
      <main className="flex-1 overflow-y-auto p-6">
        {route === "dashboard" && <p>Dashboard content goes here.</p>}
        {route === "properties" && <p>My Properties content goes here.</p>}
        {route === "tenants" && <p>Tenants content goes here.</p>}
        {route === "payments" && <p>Payments content goes here.</p>}
        {route === "maintenance" && <p>Maintenance content goes here.</p>}
        {route === "messages" && <p>Messages content goes here.</p>}
        {route === "settings" && <p>Settings content goes here.</p>}
      </main>
    </div>
  );
}
