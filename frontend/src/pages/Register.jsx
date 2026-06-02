import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import WalletButton from "../components/WalletButton";

export default function Register() {
  const { register, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState("form");
  const [form, setForm] = useState({ email: "", password: "", username: "", referral_code: "" });
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpResendAfter, setOtpResendAfter] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setForm((f) => ({ ...f, referral_code: ref }));
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const payload = { ...form };
    if (!payload.referral_code) delete payload.referral_code;
    const res = await register(payload);
    setLoading(false);
    if (res.otpRequired) {
      setOtpEmail(res.email || payload.email);
      setOtpCode("");
      setOtpResendAfter(res.resendAfter || 0);
      setMode("otp");
      return;
    }
    if (res.ok) navigate("/");
    else setErr(res.error);
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await verifyOtp(otpEmail, otpCode);
    setLoading(false);
    if (res.ok) navigate("/");
    else setErr(res.error);
  };

  const resendOtp = async () => {
    if (!otpEmail || otpResendAfter > 0) return;
    setErr("");
    setLoading(true);
    const res = await requestOtp(otpEmail);
    setLoading(false);
    if (res.ok) {
      setOtpResendAfter(res.resendAfter || 60);
    } else {
      setErr(res.error);
    }
  };

  useEffect(() => {
    if (otpResendAfter <= 0) return;
    const timer = setTimeout(() => {
      setOtpResendAfter((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [otpResendAfter]);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex bg-[var(--bg)] page-transition" data-testid="register-page">
      <div className="hidden lg:flex flex-1 relative border-r border-[var(--border)] overflow-hidden scanline">
        <img
          src="/hero-art.png"
          alt="LastLap riders"
          className="w-full h-full object-cover motion-pan"
        />
        <div className="absolute bottom-0 left-0 p-10">
          <div className="font-brush text-[72px] leading-none hero-title">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
          </div>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-4 hero-sub">BUILT FOR RIDERS — MADE FOR CHAMPIONS</div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        {mode === "form" && (
          <form onSubmit={submit} className="w-full max-w-md card-animate" data-testid="register-form">
            <h1 className="font-brush text-[48px] mb-2 text-white hero-title">JOIN THE<span className="text-[var(--purple)]"> GRID</span></h1>
            <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mb-8 hero-sub">CREATE YOUR LASTLAP ACCOUNT</div>

            <label className="label-ll block mb-2">USERNAME</label>
            <input required minLength={3} maxLength={20} value={form.username} onChange={upd("username")} className="input-ll mb-4" data-testid="register-username" />

            <label className="label-ll block mb-2">EMAIL</label>
            <input type="email" required value={form.email} onChange={upd("email")} className="input-ll mb-4" data-testid="register-email" />

            <label className="label-ll block mb-2">PASSWORD</label>
            <input type="password" required minLength={6} value={form.password} onChange={upd("password")} className="input-ll mb-4" data-testid="register-password" />

            <label className="label-ll block mb-2">REFERRAL CODE (OPTIONAL)</label>
            <input value={form.referral_code} onChange={upd("referral_code")} placeholder="LAST-XXXX" className="input-ll mb-6" data-testid="register-referral" />

            {err && <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-4" data-testid="register-error">{err.toUpperCase()}</div>}

            <button disabled={loading} className="btn-primary-ll w-full py-3 text-[12px] cta-pulse" data-testid="register-submit">
              {loading ? "STARTING..." : "START YOUR ENGINE"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)]">OR</div>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <WalletButton variant="signin" />

            <div className="mt-6 font-pixel text-[10px] tracking-widest text-[var(--muted)] text-center">
              ALREADY A RIDER? <Link to="/login" className="text-[var(--purple-bright)]" data-testid="link-login">ENTER THE PIT</Link>
            </div>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={submitOtp} className="w-full max-w-md card-animate" data-testid="register-otp-form">
            <h1 className="font-brush text-[44px] mb-2 text-white hero-title">VERIFY<span className="text-[var(--purple)]"> EMAIL</span></h1>
            <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mb-6 hero-sub">ENTER THE CODE WE SENT</div>

            <label className="label-ll block mb-2">VERIFICATION CODE</label>
            <input
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="input-ll mb-2 tracking-widest"
              inputMode="numeric"
              maxLength={8}
              data-testid="register-otp-code"
              autoFocus
            />
            <div className="font-mono-crt text-[11px] text-[var(--muted)] mb-4">CODE SENT TO {otpEmail}</div>

            {err && <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-4" data-testid="register-otp-error">{err.toUpperCase()}</div>}

            <button disabled={loading} className="btn-primary-ll w-full py-3 text-[12px] cta-pulse" data-testid="register-otp-submit">
              {loading ? "VERIFYING..." : "VERIFY CODE"}
            </button>
            <button
              type="button"
              onClick={resendOtp}
              disabled={loading || otpResendAfter > 0}
              className="btn-ghost-ll w-full mt-3"
              data-testid="register-otp-resend"
            >
              {otpResendAfter > 0 ? `RESEND IN ${otpResendAfter}s` : "RESEND CODE"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("form"); setErr(""); }}
              className="btn-ghost-ll w-full mt-2"
              data-testid="register-otp-back"
            >
              BACK
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
