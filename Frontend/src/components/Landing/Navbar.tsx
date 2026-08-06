import { useState } from "react";
import { Home, Menu, X } from "lucide-react";

const NAV_LINKS = ["Home", "Browse Rooms", "How It Works", "Features", "About", "Contact"];

interface NavbarProps {
  onNavClick?: (link: string) => void;
  onLogin?: () => void;
  onSignup?: () => void;
  onPostProperty?: () => void;
}

export default function Navbar({ onNavClick, onLogin, onSignup, onPostProperty }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Home size={16} />
          </span>
          <span className="text-lg font-bold text-stone-900">Horizon</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              onClick={() => onNavClick?.(link)}
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              {link}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <button onClick={onLogin} className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Login
          </button>
          <button onClick={onSignup} className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Sign Up
          </button>
          <button
            onClick={onPostProperty}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Post Property
          </button>
        </div>

        <button onClick={() => setMobileOpen((v) => !v)} className="text-stone-600 lg:hidden">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-stone-100 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => {
                  onNavClick?.(link);
                  setMobileOpen(false);
                }}
                className="rounded-lg px-2 py-2 text-left text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                {link}
              </button>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
            <button onClick={onLogin} className="rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700">
              Login
            </button>
            <button onClick={onSignup} className="rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700">
              Sign Up
            </button>
            <button onClick={onPostProperty} className="rounded-lg bg-stone-900 py-2 text-sm font-medium text-white">
              Post Property
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
