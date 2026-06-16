import api from "./api";

export async function startXOAuth({ mode = "signin", referralCode = "" } = {}) {
  const payload = { mode };
  if (referralCode) payload.referral_code = referralCode;
  const { data } = await api.post("/auth/x/start", payload);
  if (!data.authorization_url) throw new Error("X OAuth did not return an authorization URL");
  window.location.href = data.authorization_url;
}

export async function completeXOAuth(payload) {
  const { data } = await api.post("/auth/x/callback", payload);
  return data;
}

export async function unlinkXOAuth() {
  const { data } = await api.post("/auth/x/unlink");
  return data;
}
