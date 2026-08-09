import { Home, Mail, Phone } from "lucide-react";

// lucide-react dropped brand/logo icons (Facebook, Instagram, LinkedIn) in
// recent versions, so these are small inline SVGs instead of icon imports.
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06C2 17.06 5.66 21.2 10.44 21.95v-7.03H7.9v-2.86h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.86h-2.34v7.03C18.34 21.2 22 17.06 22 12.06Z" />
    </svg>
  );
}
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4V21H3V9.75Zm7 0h3.83v1.54h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.14V21h-4v-5.13c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4V9.75Z" />
    </svg>
  );
}

// Replace these with your real social profile URLs.
const SOCIAL_LINKS = [
  { icon: FacebookIcon, label: "Facebook", href: "https://facebook.com/horizonrooms" },
  { icon: InstagramIcon, label: "Instagram", href: "https://instagram.com/horizonrooms" },
  { icon: LinkedinIcon, label: "LinkedIn", href: "https://linkedin.com/company/horizonrooms" },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0f172a] text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Home size={16} />
              </div>
              <span className="text-lg font-bold text-white">Horizon</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              The easiest way to find and list rental rooms and flats, connecting tenants with trusted landlords.
            </p>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-600 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">For Tenants</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="#featured-rooms" className="hover:text-white">Browse Rooms</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              <li><a href="#" className="hover:text-white">Saved Rooms</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">For Landlords</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white">List Property</a></li>
              <li><a href="#" className="hover:text-white">Manage Bookings</a></li>
              <li><a href="#" className="hover:text-white">Pricing</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
              <li><a href="#" className="hover:text-white">FAQ</a></li>
            </ul>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <a href="mailto:support@horizon.com" className="flex items-center gap-2 hover:text-white">
                <Mail size={14} /> support@horizon.com
              </a>
              <a href="tel:+9779800000000" className="flex items-center gap-2 hover:text-white">
                <Phone size={14} /> +977 980-0000000
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Horizon. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
