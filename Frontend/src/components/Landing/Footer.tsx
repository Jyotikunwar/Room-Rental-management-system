import { Home, Mail, Phone } from "lucide-react";

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
              <p className="flex items-center gap-2"><Mail size={14} /> support@horizon.com</p>
              <p className="flex items-center gap-2"><Phone size={14} /> +977 980-0000000</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Horizon. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <a href="#" className="hover:text-white">Facebook</a>
            <a href="#" className="hover:text-white">Instagram</a>
            <a href="#" className="hover:text-white">LinkedIn</a>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
