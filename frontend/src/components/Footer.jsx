import { Link } from "react-router-dom";
import XLogo from "./XLogo";
import DiscordLogo from "./DiscordLogo";

const SOCIAL_LINKS = [
  { label: "X", href: "https://x.com/lastlapdotfun", Icon: XLogo },
  { label: "Discord", href: "https://discord.gg/NkbhjeNjdT", Icon: DiscordLogo },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-6 bg-[var(--bg)] footer-animate">
      <div className="w-full px-5 sm:px-6 lg:px-8 xl:px-10 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="fade-in-up stagger-1">
          <div className="flex items-center gap-3 font-brush text-4xl mb-3">
            <img src="/crossed-flags.png" alt="" className="w-11 h-11 object-contain" />
            <span><span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span></span>
          </div>
          <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] leading-relaxed space-y-1">
            <div>FINAL LAP DEFINES EVERYTHING</div>
            <div>BUILT FOR RIDERS</div>
            <div>MADE FOR CHAMPIONS</div>
          </div>
        </div>
        <div className="fade-in-up stagger-3">
          <div className="font-pixel text-[10px] tracking-widest text-white mb-4">EXPLORE</div>
          <ul className="space-y-2 font-pixel text-[10px] tracking-widest text-[var(--muted)]">
            <li><Link to="/about" className="hover:text-[var(--purple-bright)] transition">ABOUT</Link></li>
            <li><Link to="/privacy" className="hover:text-[var(--purple-bright)] transition">PRIVACY</Link></li>
            <li><Link to="/terms" className="hover:text-[var(--purple-bright)] transition">TERMS</Link></li>
            <li><Link to="/contact" className="hover:text-[var(--purple-bright)] transition">CONTACT</Link></li>
            <li><Link to="/leaderboard" className="hover:text-[var(--purple-bright)] transition">LEADERBOARD</Link></li>
            <li><Link to="/" className="hover:text-[var(--purple-bright)] transition">ENTER LASTLAP</Link></li>
          </ul>
        </div>
        <div className="fade-in-up stagger-4">
          <div className="font-pixel text-[10px] tracking-widest text-white mb-4">FOLLOW US</div>
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map(({ label, href, Icon }, i) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="w-9 h-9 border border-[var(--border)] flex items-center justify-center rounded hover:border-[var(--purple)] hover:bg-[var(--purple)]/10 transition hover-lift hover-glow" data-testid={`social-${i}`}>
                <Icon size={14} className="text-[var(--muted)] icon-wiggle" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)] px-5 py-3 text-center font-pixel text-[9px] tracking-widest text-[var(--muted-2)]">
        © 2025 LASTLAP — ALL LAPS RESERVED
      </div>
    </footer>
  );
}
