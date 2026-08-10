interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

// A palette so different names get visually distinct (but consistent) colors —
// picked by hashing the name, not randomly, so the same person always gets
// the same color across renders/pages.
const COLORS = [
  { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
  { bg: "#DCFCE7", text: "#15803D" }, // green
  { bg: "#FEF3C7", text: "#B45309" }, // amber
  { bg: "#FCE7F3", text: "#BE185D" }, // pink
  { bg: "#EDE9FE", text: "#6D28D9" }, // violet
  { bg: "#FFEDD5", text: "#C2410C" }, // orange
  { bg: "#CFFAFE", text: "#0E7490" }, // cyan
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Renders the person's uploaded photo if there is one (served from our own
// backend, so still no third-party network call). Otherwise renders their
// initials on a colored circle — pure CSS, zero network requests, instant
// on every page load (this is what replaced the Dicebear calls).
export default function Avatar({ name, avatarUrl, size = 32, className = "" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = getInitials(name || "U");
  const color = getColor(name || "U");

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color.bg,
        color: color.text,
        fontSize: size * 0.4,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
