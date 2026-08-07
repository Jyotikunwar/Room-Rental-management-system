import LandingNavbar from "./Navbar";
import Hero from "./Hero";
import FeaturedRooms from "./FeaturedRooms";
import HowItWorks from "./HowItWorks";
import FeaturesSection from "./Features";
import StatsBar from "./StatsBar";
import Testimonials from "./Testimonials";
import CTASection from "./CTASection";
import Footer from "./Footer";

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  onPostProperty: () => void;
  onBrowseRooms: () => void;
}

export default function LandingPage({ onLogin, onSignup, onPostProperty, onBrowseRooms }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar onLoginClick={onLogin} onSignupClick={onSignup} onPostPropertyClick={onPostProperty} />

      <Hero onSearch={onBrowseRooms} onFindRoomClick={onBrowseRooms} onListPropertyClick={onPostProperty} />

      {/* Viewing a room's full details requires an account in this app's
          flow, so featured room cards route into signup like Browse Rooms does. */}
      <FeaturedRooms onViewDetails={onBrowseRooms} />
      <HowItWorks />
      <FeaturesSection />
      <StatsBar />
      <Testimonials />
      <CTASection onBrowseRoomsClick={onBrowseRooms} onListPropertyClick={onPostProperty} />
      <Footer />
    </div>
  );
}
