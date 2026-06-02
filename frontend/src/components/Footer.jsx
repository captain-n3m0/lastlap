import { Link } from "react-router-dom";
import { MessageCircle, Github, Instagram, Youtube } from "lucide-react";
import XLogo from "./XLogo";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-16 bg-[var(--bg)] footer-animate">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="fade-in-up stagger-1">
          <div className="font-brush text-4xl mb-3">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
          </div>
          <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] leading-relaxed space-y-1">
            <div>FINAL LAP DEFINES EVERYTHING</div>
            <div>BUILT FOR RIDERS</div>
            <div>MADE FOR CHAMPIONS</div>
          </div>
        </div>
        <div className="fade-in-up stagger-2">
          <div className="font-pixel text-[10px] tracking-widest text-white mb-4">QUICK LINKS</div>
          <ul className="space-y-2 font-pixel text-[10px] tracking-widest text-[var(--muted)]">
            <li><Link to="/about" className="hover:text-[var(--purple-bright)] transition">ROADMAP</Link></li>
            <li><Link to="/tasks" className="hover:text-[var(--purple-bright)] transition">RIDER GARAGE</Link></li>
            <li><Link to="/about" className="hover:text-[var(--purple-bright)] transition">TOKEN DETAILS</Link></li>
          </ul>
        </div>
        <div className="fade-in-up stagger-3">
          <div className="font-pixel text-[10px] tracking-widest text-white mb-4">EXPLORE</div>
          <ul className="space-y-2 font-pixel text-[10px] tracking-widest text-[var(--muted)]">
            <li><Link to="/about" className="hover:text-[var(--purple-bright)] transition">ABOUT</Link></li>
            <li><Link to="/leaderboard" className="hover:text-[var(--purple-bright)] transition">COMMUNITY</Link></li>
            <li><Link to="/" className="hover:text-[var(--purple-bright)] transition">ENTER LASTLAP</Link></li>
          </ul>
        </div>
        <div className="fade-in-up stagger-4">
          <div className="font-pixel text-[10px] tracking-widest text-white mb-4">FOLLOW US</div>
          <div className="flex items-center gap-2">
            {[XLogo, MessageCircle, Github, Instagram, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 border border-[var(--border)] flex items-center justify-center rounded hover:border-[var(--purple)] hover:bg-[var(--purple)]/10 transition hover-lift hover-glow" data-testid={`social-${i}`}>
                <Icon size={14} className="text-[var(--muted)] icon-wiggle" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center font-pixel text-[9px] tracking-widest text-[var(--muted-2)]">
        © 2025 LASTLAP — ALL LAPS RESERVED
      </div>
    </footer>
  );
}
