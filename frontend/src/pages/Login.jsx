import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import HeroIllustration from "../components/HeroIllustration";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen flex bg-[var(--bg)]" data-testid="login-page">
      <div className="hidden lg:flex flex-1 relative grain border-r border-[var(--border)]">
        <HeroIllustration />
        <div className="absolute bottom-0 left-0 p-10">
          <div className="font-brush text-[72px] leading-none">
            <span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span>
          </div>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-4">FINAL LAP DEFINES EVERYTHING</div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <h1 className="font-brush text-[48px] mb-2 text-white">ENTER<span className="text-[var(--purple)]"> PIT</span></h1>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mb-8">SIGN IN TO YOUR LASTLAP ACCOUNT</div>

          <label className="label-ll block mb-2">EMAIL</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-ll mb-4" data-testid="login-email" />

          <label className="label-ll block mb-2">PASSWORD</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-ll mb-6" data-testid="login-password" />

          {err && <div className="font-pixel text-[10px] tracking-widest text-[var(--red)] mb-4" data-testid="login-error">{err.toUpperCase()}</div>}

          <button disabled={loading} className="btn-primary-ll w-full py-3 text-[12px]" data-testid="login-submit">
            {loading ? "STARTING..." : "ENTER THE TRACK"}
          </button>

          <div className="mt-6 font-pixel text-[10px] tracking-widest text-[var(--muted)] text-center">
            NEW RIDER? <Link to="/register" className="text-[var(--purple-bright)]" data-testid="link-register">JOIN THE GRID</Link>
          </div>

          <div className="mt-8 p-4 card-ll-inner">
            <div className="label-ll mb-2">DEMO ACCESS</div>
            <div className="font-mono-crt text-[14px] text-[var(--muted)] space-y-1">
              <div>EMAIL: riderghost@lastlap.com</div>
              <div>PASS: Demo2025!</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
