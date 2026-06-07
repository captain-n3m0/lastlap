import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDown, LogOut, Settings, User, Wallet } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { truncateAddress } from "../lib/wallet";
import WalletButton from "./WalletButton";
import RacerAvatar from "./RacerAvatar";

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
        className={`nav-link font-pixel text-[11px] tracking-widest px-3 py-2 transition-colors ${active ? "text-[var(--purple-bright)]" : "text-white/80 hover:text-white"}`}>
        {label}
      </Link>
    );
  };

  return (
    <nav className="w-full border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md sticky top-0 z-50 nav-slide" data-testid="main-navbar">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-brush text-3xl tracking-tight neon-text" data-testid="navbar-logo">
          <img src="/skull-emblem.png" alt="" className="w-9 h-9 object-contain" />
          <span><span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          <NavLink to="/tasks" label="RIDER GARAGE" testid="nav-garage" />
          <NavLink to="/about" label="ABOUT" testid="nav-about" />
          <NavLink to="/leaderboard" label="LEADERBOARD" testid="nav-community" />
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setOpen(v => !v)} data-testid="profile-menu-button"
            className="flex items-center gap-3 group">
            <RacerAvatar user={user} size="md" className="profile-ring" />
            <div className="hidden sm:block text-left">
              <div className="font-pixel text-[11px] tracking-widest text-white">@{user?.username || "rider"}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--amber)]">{user?.title || "ROOKIE RACER"}</div>
            </div>
            <ChevronDown size={14} className="text-[var(--muted)] group-hover:text-white transition icon-wiggle" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 menu-panel p-2 menu-pop" data-testid="profile-dropdown">
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
              <Link to="/profile" onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-white/90 hover:bg-[var(--bg-card-2)] rounded font-pixel text-[10px] tracking-widest" data-testid="dropdown-settings">
                <Settings size={14} /> PROFILE SETTINGS
              </Link>
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
