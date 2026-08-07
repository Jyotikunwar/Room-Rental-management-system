import { Home } from "lucide-react";

interface LandingNavbarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onPostPropertyClick: () => void;
}

export default function LandingNavbar({ onLoginClick, onSignupClick, onPostPropertyClick }: LandingNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Home size={16} />
          </div>
          <span className="text-lg font-bold text-gray-900">Horizon</span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          <a href="#home" className="hover:text-gray-900">Home</a>
          <a href="#featured-rooms" className="hover:text-gray-900">Browse Rooms</a>
          <a href="#how-it-works" className="hover:text-gray-900">How It Works</a>
          <a href="#features" className="hover:text-gray-900">Features</a>
          <a href="#contact" className="hover:text-gray-900">Contact</a>
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={onLoginClick} className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:block">
            Login
          </button>
          <button onClick={onSignupClick} className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:block">
            Sign up
          </button>
          <button
            onClick={onPostPropertyClick}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Post Property
          </button>
        </div>
      </div>
    </header>
  );
}
