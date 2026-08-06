import { Home, Mail, Phone } from "lucide-react";

// lucide-react dropped brand/logo icons (Facebook, Instagram, LinkedIn) in
// recent versions, so these are small inline SVGs instead of lucide imports.
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

const QUICK_LINKS = ["Browse Rooms", "List a Property", "Pricing", "FAQ"];
const COMPANY_LINKS = ["About Us", "Careers", "Blog", "Contact"];

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Home size={16} />
              </span>
              <span className="text-lg font-bold text-white">Horizon</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed">
              The easiest way to find and manage rental rooms and apartments across the city.
            </p>
            <div className="mt-4 flex gap-3">
              <FacebookIcon className="hover:text-white" />
              <InstagramIcon className="hover:text-white" />
              <LinkedinIcon className="hover:text-white" />
            </div>
          </div>

          <FooterColumn title="Quick Links" links={QUICK_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />

          <div>
            <h4 className="text-sm font-semibold text-white">Contact</h4>
            <ul className="mt-3 flex flex-col gap-2 text-xs">
              <li className="flex items-center gap-2">
                <Mail size={13} /> support@horizon.com
              </li>
              <li className="flex items-center gap-2">
                <Phone size={13} /> +977 98XXXXXXXX
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-stone-800 pt-6 text-[11px] sm:flex-row">
          <p>© 2026 Horizon. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 flex flex-col gap-2 text-xs">
        {links.map((link) => (
          <li key={link} className="hover:text-white">
            {link}
          </li>
        ))}
      </ul>
    </div>
  );
}
