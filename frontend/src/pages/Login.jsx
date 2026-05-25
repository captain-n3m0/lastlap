import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import WalletButton from "../components/WalletButton";
import XLogo from "../components/XLogo";
import CyberFrameBorder from "../components/CyberFrameBorder";
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
    <div className="flex-1 flex flex-col items-center text-center gap-2">
      <Icon size={36} />
      <div className="font-pixel text-[10px] tracking-widest text-white mt-1">{title}</div>
      <div className="font-mono-crt text-[11px] text-[var(--muted)] leading-tight whitespace-pre-line">{subtitle}</div>
    </div>
  );
}

function ShieldLock({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <path d="M 18 3 L 4 8 L 4 18 Q 4 28 18 33 Q 32 28 32 18 L 32 8 Z"
            fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="13" y="17" width="10" height="8" rx="1" fill="#9CA3AF" />
      <path d="M 15 17 L 15 14 Q 15 11 18 11 Q 21 11 21 14 L 21 17" fill="none" stroke="#9CA3AF" strokeWidth="1.5" />
      <circle cx="18" cy="21" r="1.2" fill="#0a0a10" />
    </svg>
  );
}

function RacingHelmet({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      {/* Helmet shell */}
      <path d="M 6 22 Q 6 8 18 8 Q 30 8 30 22 L 30 26 Q 30 28 28 28 L 8 28 Q 6 28 6 26 Z"
            fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
      {/* Visor */}
      <path d="M 9 18 Q 9 14 18 14 Q 27 14 27 18 L 27 22 L 9 22 Z" fill="#1a1a22" stroke="#6B7280" strokeWidth="1" />
      {/* Stripe */}
      <rect x="17" y="8" width="2" height="6" fill="#6B7280" />
      {/* Bottom rim */}
      <line x1="6" y1="26" x2="30" y2="26" stroke="#6B7280" strokeWidth="1.5" />
      {/* Chin strap area */}
      <path d="M 10 28 L 12 32 L 24 32 L 26 28" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    </svg>
  );
}

function CrossedFlags({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <pattern id="cflag" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#E8E8EC" />
          <rect x="2" y="2" width="2" height="2" fill="#E8E8EC" />
          <rect x="2" y="0" width="2" height="2" fill="#0a0a10" />
          <rect x="0" y="2" width="2" height="2" fill="#0a0a10" />
        </pattern>
      </defs>
      {/* Left pole */}
      <line x1="9" y1="33" x2="14" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right pole */}
      <line x1="27" y1="33" x2="22" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left flag */}
      <path d="M 13 6 Q 18 4 22 6 Q 24 8 22 12 Q 18 10 13 14 Z" fill="url(#cflag)" stroke="#0a0a10" strokeWidth="0.5" />
      {/* Right flag */}
      <path d="M 23 6 Q 18 4 14 6 Q 12 8 14 12 Q 18 10 23 14 Z" fill="url(#cflag)" stroke="#0a0a10" strokeWidth="0.5" />
    </svg>
  );
}

function SkullEmblem() {
  return (
    <svg width="92" height="100" viewBox="0 0 92 100" aria-hidden="true">
      <defs>
        <radialGradient id="skullGlow" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="helmetGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6B21A8" />
          <stop offset="1" stopColor="#1a1a22" />
        </linearGradient>
      </defs>

      {/* Glow */}
      <circle cx="46" cy="50" r="46" fill="url(#skullGlow)" />

      {/* Spikes on top */}
      <g fill="#A78BFA" stroke="#6B21A8" strokeWidth="0.5">
        <polygon points="22,28 25,8 28,28" />
        <polygon points="32,22 36,4 40,22" />
        <polygon points="44,18 48,2 52,18" />
        <polygon points="56,22 60,4 64,22" />
        <polygon points="66,28 69,8 72,28" />
      </g>
      {/* Side spike */}
      <polygon points="16,38 4,32 18,46" fill="#A78BFA" />
      <polygon points="76,38 88,32 74,46" fill="#A78BFA" />

      {/* Helmet dome */}
      <path d="M 14 40 Q 14 22 46 22 Q 78 22 78 40 L 78 56 Q 78 62 72 64 L 20 64 Q 14 62 14 56 Z"
            fill="url(#helmetGrad)" stroke="#A78BFA" strokeWidth="1.5" />

      {/* Helmet decoration band */}
      <rect x="20" y="46" width="52" height="3" fill="#1a1a22" />
      <circle cx="46" cy="35" r="6" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1" />
      <path d="M 42 35 L 50 35 M 46 31 L 46 39" stroke="#A78BFA" strokeWidth="1.2" />

      {/* Skull face (visible under helmet visor) */}
      <ellipse cx="46" cy="58" rx="18" ry="12" fill="#E8E8EC" />
      {/* Eye sockets */}
      <ellipse cx="40" cy="58" rx="4" ry="5" fill="#0a0a10" />
      <ellipse cx="52" cy="58" rx="4" ry="5" fill="#0a0a10" />
      {/* Glowing eye dot */}
      <circle cx="40" cy="58" r="1.5" fill="#A78BFA" />
      <circle cx="52" cy="58" r="1.5" fill="#A78BFA" />
      {/* Nose */}
      <polygon points="46,60 44,66 48,66" fill="#0a0a10" />
      {/* Teeth */}
      <g fill="#0a0a10">
        <rect x="40" y="68" width="2" height="3" />
        <rect x="43" y="68" width="2" height="3" />
        <rect x="46" y="68" width="2" height="3" />
        <rect x="49" y="68" width="2" height="3" />
      </g>

      {/* Gas mask filter */}
      <ellipse cx="34" cy="82" rx="9" ry="8" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1.5" />
      <ellipse cx="58" cy="82" rx="9" ry="8" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1.5" />
      {/* Filter grills */}
      <g fill="#A78BFA" opacity="0.7">
        <circle cx="31" cy="82" r="1" /><circle cx="34" cy="82" r="1" /><circle cx="37" cy="82" r="1" />
        <circle cx="55" cy="82" r="1" /><circle cx="58" cy="82" r="1" /><circle cx="61" cy="82" r="1" />
        <circle cx="31" cy="85" r="1" /><circle cx="34" cy="85" r="1" /><circle cx="37" cy="85" r="1" />
        <circle cx="55" cy="85" r="1" /><circle cx="58" cy="85" r="1" /><circle cx="61" cy="85" r="1" />
      </g>
      {/* Mask connector */}
      <rect x="42" y="74" width="8" height="6" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1" />
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

        <div className="relative w-full max-w-[520px]" data-testid="auth-card">
          <div className="cyber-frame relative">
            <CyberFrameBorder />
            <div className="relative p-10 md:p-12 z-1">
              {/* Skull emblem */}
              <div className="flex justify-center mb-5">
                <SkullEmblem />
              </div>

              <h2 className="font-brush text-[44px] leading-none text-center mb-2" data-testid="welcome-heading">
                <span className="text-white">WELCOME </span>
                <span className="text-[var(--purple)]">RACER</span>
              </h2>
              <div className="font-mono-crt text-[14px] text-[var(--muted)] text-center mb-8">
                Log in or sign up to access the Racer Hub
              </div>

              {mode === "choose" && (
                <>
                  {/* X OAuth */}
                  <button
                    onClick={handleXLogin}
                    className="btn-cyber bg-[var(--purple)] hover:bg-[var(--purple-bright)] w-full flex items-center justify-center gap-3 py-4 text-white font-pixel text-[12px]"
                    data-testid="continue-x-btn"
                  >
                    <XLogo size={18} />
                    <span>CONTINUE WITH X (TWITTER)</span>
                  </button>

                  <div className="my-6 flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <div className="font-pixel text-[11px] tracking-widest text-[var(--muted)]">OR</div>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {/* Email — outline cyber */}
                  <div className="btn-cyber-outline w-full">
                    <button
                      onClick={() => setMode("email")}
                      className="btn-cyber-outline-inner w-full flex items-center justify-center gap-3 py-4 text-white font-pixel text-[12px] hover:text-[var(--purple-bright)] transition"
                      data-testid="continue-email-btn"
                    >
                      <Mail size={16} />
                      <span>CONTINUE WITH EMAIL</span>
                    </button>
                  </div>

                  {/* Wallet */}
                  <div className="mt-3">
                    <WalletButton variant="signin" />
                  </div>

                  <div className="mt-6 text-center font-mono-crt text-[14px] text-[var(--muted)]">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-[var(--purple-bright)] font-pixel text-[11px] tracking-widest ml-1" data-testid="link-register">SIGN UP</Link>
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

                  <button disabled={loading} className="btn-cyber bg-[var(--purple)] hover:bg-[var(--purple-bright)] w-full py-4 text-white font-pixel text-[12px]" data-testid="login-submit">
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
                    <Link to="/register" className="text-[var(--purple-bright)] font-pixel text-[11px] tracking-widest ml-1">SIGN UP</Link>
                  </div>
                </form>
              )}

              {/* Feature row */}
              <div className="mt-8 pt-6 border-t border-[var(--border)] grid grid-cols-3 gap-4">
                <FeaturePill icon={ShieldLock} title="SECURE LOGIN" subtitle={"Powered by X (Twitter)\nOAuth"} />
                <FeaturePill icon={RacingHelmet} title="NO EXTRA PASSWORDS" subtitle={"One-click login\nNo hassle"} />
                <FeaturePill icon={CrossedFlags} title="INSTANT ACCESS" subtitle={"Jump into races\nin seconds"} />
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 font-mono-crt text-[12px] text-[var(--muted-2)] text-center">
                <Lock size={12} />
                <span>We never post without permission.<br/>Your data is safe with us.</span>
              </div>
            </div>
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
