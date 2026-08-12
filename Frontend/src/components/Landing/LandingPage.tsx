import { useState } from "react";
import LandingNavbar from "./Navbar";
import Hero from "./Hero";
import FeaturedRooms from "./FeaturedRooms";
import HowItWorks from "./HowItWorks";
import FeaturesSection from "./Features";
import StatsBar from "./StatsBar";
import Testimonials from "./Testimonials";
import FaqSection from "./FaqSection";
import CTASection from "./CTASection";
import Footer from "./Footer";
import { RoomDetailModal } from "../RoomDetailModal";
import type { Room } from "../../services/api";

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  onPostProperty: () => void;
  onBrowseRooms: () => void;
}

export default function LandingPage({
  onLogin,
  onSignup,
  onPostProperty,
}: LandingPageProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleBrowseRooms = () => {
    const section = document.getElementById("featured-rooms") || document.getElementById("home");
    section?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNavbar
        onLoginClick={onLogin}
        onSignupClick={onSignup}
        onPostPropertyClick={onPostProperty}
      />

      <Hero
        onSearch={handleBrowseRooms}
        onFindRoomClick={handleBrowseRooms}
        onListPropertyClick={onPostProperty}
        onSelectRoom={(room) => setSelectedRoom(room)}
      />

      <FeaturedRooms onViewDetails={(room) => setSelectedRoom(room)} onBrowseRooms={handleBrowseRooms} />


      <HowItWorks />

      <FeaturesSection />

      <StatsBar />

      <Testimonials />

      <FaqSection />

      <CTASection onBrowseRoomsClick={handleBrowseRooms} onListPropertyClick={onPostProperty} />

      <Footer
        onSavedRoomsClick={onLogin}
        onListPropertyClick={onPostProperty}
        onManageBookingsClick={onLogin}
      />

      {/* Room Detail Modal for Landing Page Visitors */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          currentUser={null}
          onClose={() => setSelectedRoom(null)}
          onSelectSimilarRoom={(room) => setSelectedRoom(room)}
        />
      )}
    </div>
  );
}
