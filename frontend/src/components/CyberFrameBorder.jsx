// Cyber frame — split into Fill (behind) and Stroke (in front) so
// the purple outline stays sharp even with translucent/blurred content.

const FRAME_PATH = "M 6 6 L 950 6 L 994 50 L 994 1194 L 50 1194 L 6 1150 Z";

export function CyberFrameFill({ fill = "rgba(0,0,0,0.55)" }) {
  return (
    <svg
      className="cyber-frame-svg"
      viewBox="0 0 1000 1200"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <path d={FRAME_PATH} fill={fill} />
    </svg>
  );
}

export function CyberFrameStroke() {
  return (
    <svg
      className="cyber-frame-svg"
      viewBox="0 0 1000 1200"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ zIndex: 20 }}
    >
      <defs>
        <filter id="purpleGlowF" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={FRAME_PATH}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        filter="url(#purpleGlowF)"
      />

      <g stroke="#A78BFA" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke">
        {/* Top-left — simple L bracket */}
        <path d="M 22 64 L 22 22 L 64 22" />
        {/* Top-right — vertical → diagonal (parallel to notch) → horizontal */}
        <path d="M 922 22 L 956 22 L 982 48 L 982 86" />
        {/* Bottom-left — horizontal → diagonal (parallel to notch) → vertical */}
        <path d="M 22 1114 L 22 1152 L 48 1178 L 86 1178" />
        {/* Bottom-right — simple L bracket */}
        <path d="M 936 1178 L 978 1178 L 978 1136" />
      </g>
    </svg>
  );
}

// Keep default export for backwards compatibility (renders both layered)
export default function CyberFrameBorder({ fill }) {
  return (
    <>
      <CyberFrameFill fill={fill} />
      <CyberFrameStroke />
    </>
  );
}
