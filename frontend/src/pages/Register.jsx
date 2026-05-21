import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import HeroIllustration from "../components/HeroIllustration";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", username: "", referral_code: "" });
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
    if (res.ok) navigate("/");
    else setErr(res.error);
  };

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex bg-[var(--bg)]" data-testid="register-page">
      <div className="hidden lg:flex flex-1 relative grain border-r border-[var(--border)]">
        <HeroIllustration />
        <div className="absolute bottom-0 left-0 p-10">
          <div className="font-brush text-[72px] leading-none">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
          </div>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-4">BUILT FOR RIDERS — MADE FOR CHAMPIONS</div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="register-form">
          <h1 className="font-brush text-[48px] mb-2 text-white">JOIN THE<span className="text-[var(--purple)]"> GRID</span></h1>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mb-8">CREATE YOUR LASTLAP ACCOUNT</div>

          <label className="label-ll block mb-2">USERNAME</label>
          <input required minLength={3} maxLength={20} value={form.username} onChange={upd("username")} className="input-ll mb-4" data-testid="register-username" />

          <label className="label-ll block mb-2">EMAIL</label>
          <input type="email" required value={form.email} onChange={upd("email")} className="input-ll mb-4" data-testid="register-email" />

          <label className="label-ll block mb-2">PASSWORD</label>
          <input type="password" required minLength={6} value={form.password} onChange={upd("password")} className="input-ll mb-4" data-testid="register-password" />

          <label className="label-ll block mb-2">REFERRAL CODE (OPTIONAL)</label>
          <input value={form.referral_code} onChange={upd("referral_code")} placeholder="LAST-XXXX" className="input-ll mb-6" data-testid="register-referral" />

          {err && <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-4" data-testid="register-error">{err.toUpperCase()}</div>}

          <button disabled={loading} className="btn-primary-ll w-full py-3 text-[12px]" data-testid="register-submit">
            {loading ? "STARTING..." : "START YOUR ENGINE"}
          </button>

          <div className="mt-6 font-pixel text-[10px] tracking-widest text-[var(--muted)] text-center">
            ALREADY A RIDER? <Link to="/login" className="text-[var(--purple-bright)]" data-testid="link-login">ENTER THE PIT</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
