// Pixel-art-style cyberpunk biker illustration built with SVG — no external image dependency.
export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 600 480" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a1a2a" />
          <stop offset="0.5" stopColor="#5a2530" />
          <stop offset="1" stopColor="#8a3a2a" />
        </linearGradient>
        <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a2520" />
          <stop offset="1" stopColor="#1a1015" />
        </linearGradient>
        <radialGradient id="sun" cx="0.8" cy="0.2" r="0.4">
          <stop offset="0" stopColor="#ffb070" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffb070" stopOpacity="0" />
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        </filter>
      </defs>

      {/* sky */}
      <rect width="600" height="320" fill="url(#sky)" />
      <rect width="600" height="320" fill="url(#sun)" />

      {/* far mountains */}
      <polygon points="0,260 90,180 160,230 230,160 320,240 400,170 490,220 600,180 600,320 0,320" fill="#2a1820" />
      <polygon points="0,290 70,240 150,270 240,220 330,280 420,230 510,270 600,240 600,320 0,320" fill="#1f1218" />

      {/* cacti */}
      <g fill="#1a2a1a" stroke="#0e1810" strokeWidth="2">
        <rect x="40" y="220" width="10" height="60" />
        <rect x="35" y="240" width="6" height="20" />
        <rect x="49" y="230" width="6" height="20" />
        <rect x="540" y="200" width="12" height="80" />
        <rect x="534" y="225" width="6" height="22" />
        <rect x="552" y="215" width="6" height="22" />
      </g>

      {/* ground */}
      <rect y="320" width="600" height="160" fill="url(#ground)" />
      <line x1="0" y1="340" x2="600" y2="340" stroke="#1a0e10" strokeWidth="2" />

      {/* motorcycle silhouette + rider */}
      <g>
        {/* shadow */}
        <ellipse cx="320" cy="395" rx="180" ry="14" fill="#000" opacity="0.5" />

        {/* rear wheel */}
        <circle cx="180" cy="370" r="42" fill="#0a0a0f" stroke="#3a3a4a" strokeWidth="3" />
        <circle cx="180" cy="370" r="22" fill="#1a1a24" stroke="#5a5a66" strokeWidth="2" />
        <circle cx="180" cy="370" r="6" fill="#8B5CF6" />

        {/* front wheel */}
        <circle cx="450" cy="380" r="38" fill="#0a0a0f" stroke="#3a3a4a" strokeWidth="3" />
        <circle cx="450" cy="380" r="20" fill="#1a1a24" stroke="#5a5a66" strokeWidth="2" />
        <circle cx="450" cy="380" r="5" fill="#8B5CF6" />

        {/* body */}
        <polygon points="180,360 240,300 380,295 440,360 380,355 250,365" fill="#1a1a24" stroke="#5a5a66" strokeWidth="2" />
        <polygon points="240,300 280,250 360,250 400,295" fill="#2a1a30" stroke="#5a3a66" strokeWidth="2" />
        {/* exhaust */}
        <rect x="170" y="345" width="36" height="10" fill="#3a3a4a" />
        <rect x="190" y="335" width="20" height="6" fill="#5a5a66" />

        {/* fuel tank */}
        <rect x="280" y="265" width="80" height="35" fill="#8B5CF6" />
        <rect x="290" y="270" width="60" height="6" fill="#A78BFA" />

        {/* handle bars */}
        <line x1="400" y1="295" x2="430" y2="270" stroke="#5a5a66" strokeWidth="5" />
        <line x1="420" y1="275" x2="450" y2="275" stroke="#3a3a4a" strokeWidth="4" />

        {/* rider body */}
        <rect x="295" y="200" width="60" height="80" fill="#1a1a1f" stroke="#3a3a4a" strokeWidth="2" />
        <polygon points="295,200 355,200 365,230 285,230" fill="#2a2a30" stroke="#3a3a4a" strokeWidth="2" />
        {/* rider arm */}
        <line x1="355" y1="220" x2="420" y2="265" stroke="#1a1a1f" strokeWidth="14" strokeLinecap="round" />
        <line x1="355" y1="220" x2="420" y2="265" stroke="#3a3a4a" strokeWidth="2" />

        {/* helmet — spiked */}
        <circle cx="325" cy="180" r="32" fill="#0a0a0f" stroke="#5a5a66" strokeWidth="2" />
        {/* visor */}
        <rect x="305" y="170" width="42" height="14" fill="#8B5CF6" />
        <rect x="310" y="173" width="32" height="6" fill="#A78BFA" opacity="0.6" />
        {/* spikes */}
        <polygon points="300,158 305,140 310,158" fill="#5a5a66" />
        <polygon points="315,150 320,128 325,150" fill="#5a5a66" />
        <polygon points="330,150 335,128 340,150" fill="#5a5a66" />
        <polygon points="345,158 350,140 355,158" fill="#5a5a66" />

        {/* gas mask hose */}
        <path d="M 310 200 Q 305 220 315 225" stroke="#3a3a4a" strokeWidth="6" fill="none" />
      </g>

      {/* foreground dust */}
      <ellipse cx="120" cy="395" rx="60" ry="6" fill="#5a3a30" opacity="0.5" />
      <ellipse cx="500" cy="400" rx="60" ry="6" fill="#5a3a30" opacity="0.5" />

      {/* grain */}
      <rect width="600" height="480" filter="url(#grain)" opacity="0.4" />
    </svg>
  );
}
