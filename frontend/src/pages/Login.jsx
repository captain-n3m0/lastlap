import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import WalletButton from "../components/WalletButton";
import XLogo from "../components/XLogo";
import { Mail, Lock, HardHat, Flag, Users, Flame, Trophy, Globe, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-3" data-testid={`hero-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <Icon size={22} style={{ color }} />
      <div>
        <div className="font-brush text-[22px] leading-none text-white">{value}</div>
        <div className="font-mono-crt text-[11px] text-[var(--muted)] mt-1">{label}</div>
      </div>
    </div>
  );
}

function FeaturePill({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center gap-1.5">
      <Icon size={22} className="text-white" />
      <div className="font-pixel text-[10px] tracking-widest text-white">{title}</div>
      <div className="font-mono-crt text-[10px] text-[var(--muted)] leading-tight">{subtitle}</div>
    </div>
  );
}

function SkullEmblem() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="skullGlow" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#skullGlow)" />
      {/* spikes */}
      <g fill="#A78BFA">
        <polygon points="18,16 21,4 24,16" />
        <polygon points="26,12 30,2 34,12" />
        <polygon points="36,12 40,2 44,12" />
        <polygon points="40,16 43,4 46,16" />
      </g>
      {/* helmet */}
      <path d="M 14 22 Q 14 14 32 14 Q 50 14 50 22 L 50 36 Q 50 44 32 44 Q 14 44 14 36 Z" fill="#1a1a22" stroke="#8B5CF6" strokeWidth="1.5" />
      {/* visor */}
      <rect x="18" y="26" width="28" height="8" fill="#8B5CF6" />
      {/* gas mask filter */}
      <ellipse cx="32" cy="48" rx="14" ry="7" fill="#1a1a22" stroke="#8B5CF6" strokeWidth="1.5" />
      <circle cx="27" cy="48" r="1.5" fill="#8B5CF6" />
      <circle cx="32" cy="48" r="1.5" fill="#8B5CF6" />
      <circle cx="37" cy="48" r="1.5" fill="#8B5CF6" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("choose"); // "choose" | "email"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setErr(res.error);
  };

  const handleXLogin = () => {
    toast("X (TWITTER) OAUTH COMING SOON — USE EMAIL OR WALLET", { duration: 3500 });
  };

  return (
    <div className="min-h-screen relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-[var(--bg)]" data-testid="login-page">
      {/* ===== LEFT — BACKGROUND ART ===== */}
      <div className="relative overflow-hidden hidden lg:block">
        <img src="/login-bg.png" alt="LastLap rider" className="absolute inset-0 w-full h-full object-cover" />
        {/* darken */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        {/* LASTLAP top-left */}
        <div className="absolute top-8 left-10 z-10">
          <div className="font-brush text-[44px] leading-none flex items-center gap-3">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
            <div className="w-8 h-6 checker-bg border border-white/40 rounded ml-1" />
          </div>
          <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-2">THE FINAL LAP DEFINES EVERYTHING</div>
        </div>

        {/* Headline */}
        <div className="absolute top-[28%] left-10 z-10 max-w-[560px]">
          <h1 className="font-brush text-[58px] leading-[0.95] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            JOIN THE RACE.
          </h1>
          <h1 className="font-brush text-[58px] leading-[0.95] text-[var(--purple-bright)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] mt-1">
            OWN THE LEGEND.
          </h1>
        </div>

        {/* Stats bar bottom */}
        <div className="absolute bottom-8 left-10 right-10 z-10 card-ll p-5 backdrop-blur-md bg-black/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={Users} value="12.5K+" label="Riders" color="#A78BFA" />
            <Stat icon={Flame} value="2.4M+" label="LP Burned" color="#EF4444" />
            <Stat icon={Trophy} value="4,892" label="Races Completed" color="#F59E0B" />
            <Stat icon={Globe} value="70+" label="Countries" color="#A78BFA" />
          </div>
        </div>
      </div>

      {/* ===== RIGHT — AUTH CARD ===== */}
      <div className="relative flex items-center justify-center p-6 lg:p-10">
        {/* Subtle background for mobile */}
        <div className="absolute inset-0 lg:hidden">
          <img src="/login-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-[var(--bg)]/85" />
        </div>

        <div className="relative w-full max-w-[460px] card-ll p-8 md:p-10 purple-glow" data-testid="auth-card">
          {/* Skull emblem */}
          <div className="flex justify-center mb-4">
            <SkullEmblem />
          </div>

          <h2 className="font-brush text-[42px] leading-none text-center mb-2" data-testid="welcome-heading">
            <span className="text-white">WELCOME </span>
            <span className="text-[var(--purple)]">RACER</span>
          </h2>
          <div className="font-mono-crt text-[13px] text-[var(--muted)] text-center mb-7">
            Log in or sign up to access the Racer Hub
          </div>

          {mode === "choose" && (
            <>
              {/* X OAuth */}
              <button
                onClick={handleXLogin}
                className="btn-primary-ll w-full flex items-center justify-center gap-3 py-3.5 text-[12px]"
                data-testid="continue-x-btn"
              >
                <XLogo size={16} />
                <span>CONTINUE WITH X (TWITTER)</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)]">OR</div>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Email */}
              <button
                onClick={() => setMode("email")}
                className="btn-ghost-ll w-full flex items-center justify-center gap-3 py-3.5"
                data-testid="continue-email-btn"
              >
                <Mail size={14} />
                <span>CONTINUE WITH EMAIL</span>
              </button>

              {/* Wallet */}
              <div className="mt-3">
                <WalletButton variant="signin" />
              </div>

              <div className="mt-6 text-center font-mono-crt text-[13px] text-[var(--muted)]">
                Don't have an account?{" "}
                <Link to="/register" className="text-[var(--purple-bright)] font-pixel text-[10px] tracking-widest ml-1" data-testid="link-register">SIGN UP</Link>
              </div>
            </>
          )}

          {mode === "email" && (
            <form onSubmit={submit} data-testid="login-form">
              <button
                type="button"
                onClick={() => { setMode("choose"); setErr(""); }}
                className="flex items-center gap-1 font-pixel text-[10px] tracking-widest text-[var(--muted)] hover:text-white transition mb-4"
                data-testid="back-to-choices"
              >
                <ChevronLeft size={14} /> BACK
              </button>

              <label className="label-ll block mb-2">EMAIL</label>
              <div className="relative mb-4">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-ll pl-9" autoFocus data-testid="login-email" />
              </div>

              <label className="label-ll block mb-2">PASSWORD</label>
              <div className="relative mb-5">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-ll pl-9" data-testid="login-password" />
              </div>

              {err && (
                <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-4" data-testid="login-error">
                  {err.toUpperCase()}
                </div>
              )}

              <button disabled={loading} className="btn-primary-ll w-full py-3.5 text-[12px]" data-testid="login-submit">
                {loading ? "STARTING ENGINE..." : "ENTER THE TRACK"}
              </button>

              <div className="mt-5 card-ll-inner p-3">
                <div className="label-ll mb-1">DEMO ACCESS</div>
                <div className="font-mono-crt text-[12px] text-[var(--muted)]">
                  riderghost@lastlap.com / Demo2025!
                </div>
              </div>

              <div className="mt-4 text-center font-mono-crt text-[12px] text-[var(--muted)]">
                Don't have an account?{" "}
                <Link to="/register" className="text-[var(--purple-bright)] font-pixel text-[10px] tracking-widest ml-1">SIGN UP</Link>
              </div>
            </form>
          )}

          {/* Feature row */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] grid grid-cols-3 gap-3">
            <FeaturePill icon={Lock} title="SECURE LOGIN" subtitle="Bcrypt + JWT protected" />
            <FeaturePill icon={HardHat} title="NO EXTRA PASSWORDS" subtitle="Sign in with wallet" />
            <FeaturePill icon={Flag} title="INSTANT ACCESS" subtitle="Jump into races in seconds" />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 font-mono-crt text-[11px] text-[var(--muted-2)]">
            <Lock size={11} />
            <span>We never post without permission. Your data is safe with us.</span>
          </div>
        </div>
      </div>

      {/* Footer line */}
      <div className="hidden lg:block absolute bottom-2 left-1/2 -translate-x-1/2 font-pixel text-[9px] tracking-widest text-[var(--muted-2)]">
        © LASTLAP · THE FINAL LAP DEFINES EVERYTHING
      </div>
    </div>
  );
}
