import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = auth
  const [loading, setLoading] = useState(true);
  const MIN_LOADING_MS = 2000;

  const fetchMe = useCallback(async () => {
    const startedAt = Date.now();
    const finishLoading = async () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setLoading(false);
    };
    const token = localStorage.getItem("ll_token");
    if (!token) {
      await finishLoading();
      if (!localStorage.getItem("ll_token")) {
        setUser(false);
      }
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      if (localStorage.getItem("ll_token") === token) {
        setUser(data);
      }
    } catch {
      if (localStorage.getItem("ll_token") === token) {
        localStorage.removeItem("ll_token");
        setUser(false);
      }
    } finally {
      await finishLoading();
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const applyAuthSession = useCallback((data) => {
    localStorage.setItem("ll_token", data.access_token);
    setUser(data.user);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      applyAuthSession(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const requestOtp = async (email) => {
    try {
      const { data } = await api.post("/auth/otp/request", { email });
      return { ok: true, resendAfter: data.resend_after || 0 };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const verifyOtp = async (email, code) => {
    try {
      const { data } = await api.post("/auth/otp/verify", { email, code });
      applyAuthSession(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      if (data.otp_required) {
        return {
          ok: false,
          otpRequired: true,
          email: data.email || payload.email,
          resendAfter: data.resend_after || 0,
        };
      }
      applyAuthSession(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    localStorage.removeItem("ll_token");
    setUser(false);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, requestOtp, verifyOtp, register, logout, refreshUser, applyAuthSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
