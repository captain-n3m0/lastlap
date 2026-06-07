export const AVATAR_COLORS = ["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];

export const AVATAR_PRESETS = [
  { id: "helmet", label: "Helmet" },
  { id: "bolt", label: "Bolt" },
  { id: "flag", label: "Flag" },
  { id: "skull", label: "Skull" },
  { id: "wheel", label: "Wheel" },
  { id: "initial", label: "Initial" },
];

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-[13px]",
  lg: "w-12 h-12 text-[15px]",
  xl: "w-24 h-24 text-[28px]",
};

function getInitial({ user, username, displayName }) {
  const seed = displayName || user?.display_name || username || user?.username || "R";
  return seed.charAt(0).toUpperCase();
}

function PresetSvg({ preset, color, initial }) {
  if (preset === "bolt") {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect width="64" height="64" fill="#0A0A0F" />
        <path d="M36 4 15 35h14l-3 25 23-34H35L36 4Z" fill={color} />
        <path d="M14 48h36" stroke="white" strokeOpacity=".45" strokeWidth="4" />
      </svg>
    );
  }

  if (preset === "flag") {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect width="64" height="64" fill="#0A0A0F" />
        <path d="M18 48V12" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <g transform="translate(20 13) skewX(-12)">
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 8}
                y={row * 7}
                width="8"
                height="7"
                fill={(row + col) % 2 === 0 ? "white" : color}
              />
            ))
          )}
        </g>
      </svg>
    );
  }

  if (preset === "skull") {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect width="64" height="64" fill={color} />
        <path d="M20 27c0-8 5-15 12-15s12 7 12 15c0 5-2 8-5 11v8c0 3-2 5-5 5h-4c-3 0-5-2-5-5v-8c-3-3-5-6-5-11Z" fill="#F5F5F7" />
        <circle cx="27" cy="30" r="4" fill="#0A0A0F" />
        <circle cx="37" cy="30" r="4" fill="#0A0A0F" />
        <path d="M32 34 29 41h6l-3-7Z" fill="#0A0A0F" />
        <path d="M27 46h10" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (preset === "wheel") {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect width="64" height="64" fill="#0A0A0F" />
        <circle cx="32" cy="32" r="22" fill="none" stroke={color} strokeWidth="7" />
        <circle cx="32" cy="32" r="8" fill={color} />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <path
            key={deg}
            d="M32 31v-14"
            stroke="white"
            strokeOpacity=".78"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </svg>
    );
  }

  if (preset === "helmet") {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect width="64" height="64" fill="#0A0A0F" />
        <path d="M13 36c0-14 10-24 24-24 9 0 15 4 18 10l-9 5H27c-4 0-7 3-7 7v10h-4c-2 0-3-1-3-3v-5Z" fill={color} />
        <path d="M22 32h28c0 9-7 17-17 17H22V32Z" fill="#F5F5F7" />
        <path d="M26 37h23" stroke="#0A0A0F" strokeWidth="4" strokeLinecap="round" />
        <path d="M43 16c4 1 7 4 9 8" stroke="white" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <rect width="64" height="64" fill={color} />
      <path d="M0 64 64 0v64H0Z" fill="#0A0A0F" opacity=".42" />
      <text x="32" y="42" textAnchor="middle" fontFamily="Space Mono, monospace" fontWeight="700" fontSize="30" fill="white">
        {initial}
      </text>
    </svg>
  );
}

export default function RacerAvatar({
  user,
  username,
  displayName,
  color,
  preset,
  imageUrl,
  size = "md",
  className = "",
  testid,
}) {
  const avatarColor = color || user?.avatar_color || AVATAR_COLORS[0];
  const avatarPreset = preset || user?.avatar_preset || "helmet";
  const avatarImage = imageUrl || user?.avatar_url || "";
  const initial = getInitial({ user, username, displayName });

  return (
    <div
      className={`racer-avatar ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
      style={{ background: avatarColor }}
      data-testid={testid}
    >
      <PresetSvg preset={avatarPreset} color={avatarColor} initial={initial} />
      {avatarImage && (
        <img
          src={avatarImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}
