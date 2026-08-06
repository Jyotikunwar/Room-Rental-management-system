import Navbar from "./Navbar";
import Hero from "./Hero";
import FeaturedRooms from "./FeaturedRooms";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import StatsBar from "./StatsBar";
import Testimonials from "./Testimonials";
import CTASection from "./CTASection";
import Footer from "./Footer";

interface LandingPageProps {
  onLogin?: () => void;
  onSignup?: () => void;
  onPostProperty?: () => void;
  onViewRoom?: (roomId: number) => void;
  onBrowseRooms?: () => void;
}

export default function LandingPage({
  onLogin,
  onSignup,
  onPostProperty,
  onViewRoom,
  onBrowseRooms,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar onLogin={onLogin} onSignup={onSignup} onPostProperty={onPostProperty} />
      <Hero onPostRoom={onBrowseRooms} onListProperty={onPostProperty} />
      <FeaturedRooms onViewDetails={onViewRoom} onSeeAll={onBrowseRooms} />
      <HowItWorks />
      <Features />
      <StatsBar />
      <Testimonials />
      <CTASection onBrowseRooms={onBrowseRooms} onListProperty={onPostProperty} />
      <Footer />
    </div>
  );
}
