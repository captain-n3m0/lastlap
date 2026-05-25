import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import WalletButton from "../components/WalletButton";
import XLogo from "../components/XLogo";
import CyberFrameBorder, { CyberFrameFill, CyberFrameStroke } from "../components/CyberFrameBorder";
import { Mail, Lock, Users, Flame, Trophy, Globe, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-3" data-testid={`hero-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <Icon size={22} style={{ color }} />
      <div>
        <div className="font-mono-crt font-bold text-[20px] leading-none text-white tracking-tight">{value}</div>
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
      <path d="M 18 3 L 4 8 L 4 18 Q 4 28 18 33 Q 32 28 32 18 L 32 8 Z" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="13" y="17" width="10" height="8" rx="1" fill="#9CA3AF" />
      <path d="M 15 17 L 15 14 Q 15 11 18 11 Q 21 11 21 14 L 21 17" fill="none" stroke="#9CA3AF" strokeWidth="1.5" />
      <circle cx="18" cy="21" r="1.2" fill="#0a0a10" />
    </svg>
  );
}
function RacingHelmet({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <path d="M 6 22 Q 6 8 18 8 Q 30 8 30 22 L 30 26 Q 30 28 28 28 L 8 28 Q 6 28 6 26 Z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
      <path d="M 9 18 Q 9 14 18 14 Q 27 14 27 18 L 27 22 L 9 22 Z" fill="#1a1a22" stroke="#6B7280" strokeWidth="1" />
      <rect x="17" y="8" width="2" height="6" fill="#6B7280" />
      <line x1="6" y1="26" x2="30" y2="26" stroke="#6B7280" strokeWidth="1.5" />
      <path d="M 10 28 L 12 32 L 24 32 L 26 28" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    </svg>
  );
}
function CrossedFlags({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <pattern id="cflag2" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#E8E8EC" />
          <rect x="2" y="2" width="2" height="2" fill="#E8E8EC" />
          <rect x="2" y="0" width="2" height="2" fill="#0a0a10" />
          <rect x="0" y="2" width="2" height="2" fill="#0a0a10" />
        </pattern>
      </defs>
      <line x1="9" y1="33" x2="14" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27" y1="33" x2="22" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 13 6 Q 18 4 22 6 Q 24 8 22 12 Q 18 10 13 14 Z" fill="url(#cflag2)" stroke="#0a0a10" strokeWidth="0.5" />
      <path d="M 23 6 Q 18 4 14 6 Q 12 8 14 12 Q 18 10 23 14 Z" fill="url(#cflag2)" stroke="#0a0a10" strokeWidth="0.5" />
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
      <circle cx="46" cy="50" r="46" fill="url(#skullGlow)" />
      <g fill="#A78BFA" stroke="#6B21A8" strokeWidth="0.5">
        <polygon points="22,28 25,8 28,28" />
        <polygon points="32,22 36,4 40,22" />
        <polygon points="44,18 48,2 52,18" />
        <polygon points="56,22 60,4 64,22" />
        <polygon points="66,28 69,8 72,28" />
      </g>
      <polygon points="16,38 4,32 18,46" fill="#A78BFA" />
      <polygon points="76,38 88,32 74,46" fill="#A78BFA" />
      <path d="M 14 40 Q 14 22 46 22 Q 78 22 78 40 L 78 56 Q 78 62 72 64 L 20 64 Q 14 62 14 56 Z" fill="url(#helmetGrad)" stroke="#A78BFA" strokeWidth="1.5" />
      <rect x="20" y="46" width="52" height="3" fill="#1a1a22" />
      <circle cx="46" cy="35" r="6" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1" />
      <path d="M 42 35 L 50 35 M 46 31 L 46 39" stroke="#A78BFA" strokeWidth="1.2" />
      <ellipse cx="46" cy="58" rx="18" ry="12" fill="#E8E8EC" />
      <ellipse cx="40" cy="58" rx="4" ry="5" fill="#0a0a10" />
      <ellipse cx="52" cy="58" rx="4" ry="5" fill="#0a0a10" />
      <circle cx="40" cy="58" r="1.5" fill="#A78BFA" />
      <circle cx="52" cy="58" r="1.5" fill="#A78BFA" />
      <polygon points="46,60 44,66 48,66" fill="#0a0a10" />
      <g fill="#0a0a10">
        <rect x="40" y="68" width="2" height="3" />
        <rect x="43" y="68" width="2" height="3" />
        <rect x="46" y="68" width="2" height="3" />
        <rect x="49" y="68" width="2" height="3" />
      </g>
      <ellipse cx="34" cy="82" rx="9" ry="8" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1.5" />
      <ellipse cx="58" cy="82" rx="9" ry="8" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1.5" />
      <g fill="#A78BFA" opacity="0.7">
        <circle cx="31" cy="82" r="1" /><circle cx="34" cy="82" r="1" /><circle cx="37" cy="82" r="1" />
        <circle cx="55" cy="82" r="1" /><circle cx="58" cy="82" r="1" /><circle cx="61" cy="82" r="1" />
        <circle cx="31" cy="85" r="1" /><circle cx="34" cy="85" r="1" /><circle cx="37" cy="85" r="1" />
        <circle cx="55" cy="85" r="1" /><circle cx="58" cy="85" r="1" /><circle cx="61" cy="85" r="1" />
      </g>
      <rect x="42" y="74" width="8" height="6" fill="#1a1a22" stroke="#A78BFA" strokeWidth="1" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("choose");
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
    <div className="h-screen overflow-hidden relative bg-[var(--bg)]" data-testid="login-page">
      {/* ===== Full-page background ===== */}
      <div className="absolute inset-0 z-0">
        <img src="/login-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* ===== LASTLAP top-left ===== */}
        <div className="px-8 lg:px-12 pt-5 flex-shrink-0">
          <div className="font-brush text-[34px] leading-none flex items-center gap-3">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
            <div className="w-7 h-5 checker-bg border border-white/40 rounded ml-1" />
          </div>
        </div>

        {/* ===== Middle: headline + auth card ===== */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 px-8 lg:px-12 items-center min-h-0">
          {/* Left — headline */}
          <div className="hidden lg:block">
            <h1 className="font-brush text-[56px] xl:text-[64px] leading-[0.95] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">JOIN THE RACE.</h1>
            <h1 className="font-brush text-[56px] xl:text-[64px] leading-[0.95] text-[var(--purple-bright)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] mt-1">OWN THE LEGEND.</h1>
          </div>

          {/* Right — auth card */}
          <div className="relative w-full max-w-[520px] mx-auto" data-testid="auth-card">
            <div className="cyber-frame relative">
              <CyberFrameFill />
              <div className="relative p-7 md:p-9 z-10">
                <div className="flex justify-center mb-3">
                  <SkullEmblem />
                </div>

                <h2 className="font-brush text-[36px] leading-none text-center mb-1.5" data-testid="welcome-heading">
                  <span className="text-white">WELCOME </span>
                  <span className="text-[var(--purple)]">RACER</span>
                </h2>
                <div className="font-mono-crt text-[13px] text-[var(--muted)] text-center mb-5">
                  Log in or sign up to access the Racer Hub
                </div>

                {mode === "choose" && (
                  <>
                    <button
                      onClick={handleXLogin}
                      className="btn-cyber bg-[var(--purple)] hover:bg-[var(--purple-bright)] w-full flex items-center justify-center gap-3 py-3 text-white font-pixel text-[12px]"
                      data-testid="continue-x-btn"
                    >
                      <XLogo size={16} />
                      <span>CONTINUE WITH X (TWITTER)</span>
                    </button>

                    <div className="my-4 flex items-center gap-3">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)]">OR</div>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    <div className="btn-cyber-outline w-full">
                      <button
                        onClick={() => setMode("email")}
                        className="btn-cyber-outline-inner w-full flex items-center justify-center gap-3 py-3 text-white font-pixel text-[12px] hover:text-[var(--purple-bright)] transition"
                        data-testid="continue-email-btn"
                      >
                        <Mail size={14} />
                        <span>CONTINUE WITH EMAIL</span>
                      </button>
                    </div>

                    <div className="mt-2">
                      <WalletButton variant="signin" />
                    </div>

                    <div className="mt-4 text-center font-mono-crt text-[13px] text-[var(--muted)]">
                      Don't have an account?{" "}
                      <Link to="/register" className="text-[var(--purple-bright)] font-pixel text-[11px] tracking-widest ml-1" data-testid="link-register">SIGN UP</Link>
                    </div>
                  </>
                )}

                {mode === "email" && (
                  <form onSubmit={submit} data-testid="login-form">
                    <button type="button" onClick={() => { setMode("choose"); setErr(""); }}
                      className="flex items-center gap-1 font-pixel text-[10px] tracking-widest text-[var(--muted)] hover:text-white transition mb-3"
                      data-testid="back-to-choices">
                      <ChevronLeft size={14} /> BACK
                    </button>
                    <label className="label-ll block mb-1.5">EMAIL</label>
                    <div className="relative mb-3">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="input-ll pl-9 bg-black/40 py-2.5" autoFocus data-testid="login-email" />
                    </div>
                    <label className="label-ll block mb-1.5">PASSWORD</label>
                    <div className="relative mb-4">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="input-ll pl-9 bg-black/40 py-2.5" data-testid="login-password" />
                    </div>
                    {err && (
                      <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-3" data-testid="login-error">
                        {err.toUpperCase()}
                      </div>
                    )}
                    <button disabled={loading} className="btn-cyber bg-[var(--purple)] hover:bg-[var(--purple-bright)] w-full py-3 text-white font-pixel text-[12px]" data-testid="login-submit">
                      {loading ? "STARTING ENGINE..." : "ENTER THE TRACK"}
                    </button>
                    <div className="mt-3 p-2.5 bg-black/40 border border-[var(--border)] rounded">
                      <div className="label-ll mb-1">DEMO ACCESS</div>
                      <div className="font-mono-crt text-[11px] text-[var(--muted)]">riderghost@lastlap.com / Demo2025!</div>
                    </div>
                  </form>
                )}

                <div className="mt-5 pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-3">
                  <FeaturePill icon={ShieldLock} title="SECURE LOGIN" subtitle={"Powered by X\n(Twitter) OAuth"} />
                  <FeaturePill icon={RacingHelmet} title="NO EXTRA PASSWORDS" subtitle={"One-click login\nNo hassle"} />
                  <FeaturePill icon={CrossedFlags} title="INSTANT ACCESS" subtitle={"Jump into races\nin seconds"} />
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 font-mono-crt text-[11px] text-[var(--muted-2)] text-center">
                  <Lock size={11} />
                  <span>We never post without permission. Your data is safe.</span>
                </div>
              </div>
              <CyberFrameStroke />
            </div>
          </div>
        </div>

        {/* ===== Bottom stats bar ===== */}
        <div className="px-8 lg:px-12 pb-4 flex-shrink-0">
          <div className="backdrop-blur-md bg-black/45 border border-[var(--border)] rounded-lg p-3.5 max-w-[820px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} value="12.5K+" label="Riders" color="#A78BFA" />
              <Stat icon={Flame} value="2.4M+" label="LP Burned" color="#EF4444" />
              <Stat icon={Trophy} value="4,892" label="Races Completed" color="#F59E0B" />
              <Stat icon={Globe} value="70+" label="Countries" color="#A78BFA" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
