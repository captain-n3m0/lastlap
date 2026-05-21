import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
            <div className="avatar-pixel" style={{ background: user?.avatar_color || "#8B5CF6" }}>{initial}</div>
            <div className="hidden sm:block text-left">
              <div className="font-pixel text-[11px] tracking-widest text-white">@{user?.username || "rider"}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)]">{user?.title || "ROOKIE RACER"}</div>
            </div>
            <ChevronDown size={14} className="text-[var(--muted)] group-hover:text-white transition" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 card-ll p-2 fade-in-up" data-testid="profile-dropdown">
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
