export default function DiscordLogo({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8.15 6.4c1.1-.34 2.28-.52 3.85-.52s2.75.18 3.85.52l.46.14.32.38c1.3 1.53 2.06 3.5 2.25 5.92l.05.58-.36.45c-1.22 1.5-2.84 2.32-4.86 2.47l-.5.04-.3-.4-.58-.8a8.1 8.1 0 0 1-.66 0l-.58.8-.3.4-.5-.04c-2.02-.15-3.64-.97-4.86-2.47l-.36-.45.05-.58c.19-2.42.95-4.39 2.25-5.92l.32-.38.46-.14Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 14.8c.82.46 1.94.72 3.4.72s2.58-.26 3.4-.72"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.4 11.7h.02M14.58 11.7h.02"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
