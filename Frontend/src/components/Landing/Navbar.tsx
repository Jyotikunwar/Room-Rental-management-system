import { useState } from "react";
import { Home, Menu, X } from "lucide-react";

interface LandingNavbarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onPostPropertyClick: () => void;
}

export default function LandingNavbar({ onLoginClick, onSignupClick, onPostPropertyClick }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <a href="#home" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Home size={18} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Room<span className="text-blue-600">Finder</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          <a href="#home" className="transition hover:text-blue-600">
            Home
          </a>
          <a href="#featured-rooms" className="transition hover:text-blue-600">
            Browse Rooms
          </a>
          <a href="#how-it-works" className="transition hover:text-blue-600">
            How It Works
          </a>
          <a href="#features" className="transition hover:text-blue-600">
            Features
          </a>
          <a href="#faq" className="transition hover:text-blue-600">
            FAQs
          </a>
          <a href="#contact" className="transition hover:text-blue-600">
            Contact
          </a>
        </nav>

        {/* Action Buttons & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="hidden text-sm font-semibold text-gray-700 hover:text-blue-600 sm:block"
          >
            Login
          </button>
          <button
            onClick={onSignupClick}
            className="hidden rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:block"
          >
            Sign Up
          </button>
          <button
            onClick={onPostPropertyClick}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition shadow-sm"
          >
            Post Property
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-gray-100 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-gray-700">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Home
            </a>
            <a
              href="#featured-rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Browse Rooms
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Features
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              FAQs
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Contact
            </a>
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick();
                }}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignupClick();
                }}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Sign Up
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
