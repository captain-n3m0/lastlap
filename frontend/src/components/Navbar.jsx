import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { truncateAddress } from "../lib/wallet";
import WalletButton from "./WalletButton";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const NavLink = ({ to, label, testid }) => {
    const active = location.pathname === to;
    return (
      <Link to={to} data-testid={testid}
        className={`font-pixel text-[11px] tracking-widest px-3 py-2 transition-colors ${active ? "text-[var(--purple-bright)]" : "text-white/80 hover:text-white"}`}>
        {label}
      </Link>
    );
  };

  const initial = (user?.username || user?.display_name || "R").charAt(0).toUpperCase();
  // Local avatar — deterministic colored circle SVG (no external service)
  const avatarBg = user?.avatar_color || "#8B5CF6";
  const avatarSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='${avatarBg}'/><stop offset='1' stop-color='#0a0a10'/></linearGradient></defs><rect width='40' height='40' fill='url(%23g)'/><text x='20' y='27' text-anchor='middle' font-family='monospace' font-weight='700' font-size='20' fill='white'>${initial}</text></svg>`
  )}`;
  const avatarUrl = avatarSvg;

  return (
    <nav className="w-full border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md sticky top-0 z-50" data-testid="main-navbar">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="font-brush text-3xl tracking-tight" data-testid="navbar-logo">
          <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          <NavLink to="/tasks" label="RIDER GARAGE" testid="nav-garage" />
          <NavLink to="/about" label="ABOUT" testid="nav-about" />
          <NavLink to="/leaderboard" label="COMMUNITY" testid="nav-community" />
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setOpen(v => !v)} data-testid="profile-menu-button"
            className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--purple)] flex-shrink-0" style={{ background: user?.avatar_color || "#8B5CF6" }}>
              <img src={avatarUrl} alt={initial} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-pixel text-[11px] tracking-widest text-white">@{user?.username || "rider"}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--amber)]">{user?.title || "ROOKIE RACER"}</div>
            </div>
            <ChevronDown size={14} className="text-[var(--muted)] group-hover:text-white transition" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 card-ll p-2 fade-in-up" data-testid="profile-dropdown">
              <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                <div className="font-pixel text-[10px] tracking-widest text-white">@{user?.username}</div>
                {user?.wallet_address ? (
                  <div className="font-pixel text-[9px] tracking-widest text-[var(--purple-bright)] flex items-center gap-1 mt-1" data-testid="wallet-address">
                    <Wallet size={10} />
                    {truncateAddress(user.wallet_address)}
                  </div>
                ) : (
                  <div className="mt-2">
                    <WalletButton variant="link" />
                  </div>
                )}
              </div>
              <button onClick={() => { setOpen(false); navigate("/tasks"); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-white/90 hover:bg-[var(--bg-card-2)] rounded font-pixel text-[10px] tracking-widest" data-testid="dropdown-profile">
                <User size={14} /> RIDER GARAGE
              </button>
              <button onClick={() => { setOpen(false); logout(); navigate("/login"); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--red)] hover:bg-[var(--bg-card-2)] rounded font-pixel text-[10px] tracking-widest" data-testid="logout-button">
                <LogOut size={14} /> LOG OUT
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
