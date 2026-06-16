import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import XLogo from "../components/XLogo";
import { completeXOAuth } from "../lib/xOAuth";
import { useAuth } from "../contexts/AuthContext";

export default function XOAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { applyAuthSession, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const handledCallbackRef = useRef("");
  const callbackKey = useMemo(() => params.toString(), [params]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!callbackKey || handledCallbackRef.current === callbackKey) return;
      handledCallbackRef.current = callbackKey;

      const oauthError = params.get("error");
      const denied = params.get("denied");
      const code = params.get("code");
      const state = params.get("state");
      const oauthToken = params.get("oauth_token");
      const oauthVerifier = params.get("oauth_verifier");
      if (oauthError || denied) {
        setError(oauthError || "X authorization was denied");
        return;
      }
      const payload = code && state
        ? { code, state }
        : oauthToken && oauthVerifier
          ? { oauth_token: oauthToken, oauth_verifier: oauthVerifier }
          : null;
      if (!payload) {
        setError("Missing OAuth callback parameters");
        return;
      }
      try {
        const data = await completeXOAuth(payload);
        applyAuthSession(data);
        await refreshUser();
        toast.success(`WELCOME, @${data.user.username.toUpperCase()}`);
        if (mounted) navigate("/", { replace: true });
      } catch (e) {
        if (mounted) setError(e.response?.data?.detail || e.message || "X OAuth failed");
      }
    };
    run();
    return () => { mounted = false; };
  }, [applyAuthSession, callbackKey, navigate, params, refreshUser]);

  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition flex items-center justify-center px-5" data-testid="x-oauth-callback">
      <div className="card-ll p-6 w-full max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-full border border-[var(--border)] bg-black/40 flex items-center justify-center mb-4">
          <XLogo size={20} />
        </div>
        <div className="font-brush text-[32px] text-white leading-none">
          {error ? "X AUTH FAILED" : "CONNECTING X"}
        </div>
        <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-3">
          {error ? error.toUpperCase() : "FINISHING YOUR PIT PASS"}
        </div>
        {error && (
          <Link to="/login" className="btn-primary-ll mt-5 inline-flex">
            BACK TO LOGIN
          </Link>
        )}
      </div>
    </div>
  );
}
