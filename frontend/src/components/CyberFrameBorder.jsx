/**
 * SVG-based cyber frame that exactly matches the reference:
 *  - Thin purple stroked outline
 *  - Top-right & bottom-left big diagonal notch cuts (~40px)
 *  - Top-left & bottom-right small inner accent ticks
 *  - Renders inside any container via 100% width/height
 */
export default function CyberFrameBorder() {
  return (
    <svg
      className="cyber-frame-svg"
      viewBox="0 0 1000 1200"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="purpleGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer frame — single stroked path */}
      <path
        d="
          M 4 4
          L 956 4
          L 996 44
          L 996 1196
          L 44 1196
          L 4 1156
          Z
        "
        stroke="#8B5CF6"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        filter="url(#purpleGlow)"
      />

      {/* Top-left inner accent — small angled tick */}
      <path
        d="M 4 60 L 4 14 L 50 14"
        stroke="#A78BFA"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Top-right inner accent — mirrors the notch */}
      <path
        d="M 946 14 L 986 54 L 986 100"
        stroke="#A78BFA"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Bottom-left inner accent */}
      <path
        d="M 14 1100 L 14 1146 L 54 1186"
        stroke="#A78BFA"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Bottom-right inner accent */}
      <path
        d="M 950 1186 L 986 1186 L 986 1140"
        stroke="#A78BFA"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
