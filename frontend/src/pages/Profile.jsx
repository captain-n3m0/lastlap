import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Image, Mail, Palette, Shield, Upload, User, Wallet, X } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WalletButton from "../components/WalletButton";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiErrorDetail } from "../lib/api";
import { truncateAddress } from "../lib/wallet";
import RacerAvatar, { AVATAR_COLORS, AVATAR_PRESETS } from "../components/RacerAvatar";

const MAX_AVATAR_BYTES = 750 * 1024;

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    avatar_color: AVATAR_COLORS[0],
    avatar_preset: "helmet",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      display_name: user.display_name || "",
      avatar_color: user.avatar_color || AVATAR_COLORS[0],
      avatar_preset: user.avatar_preset || "helmet",
      avatar_url: user.avatar_url || "",
    });
  }, [user]);

  const updateField = (key) => (e) => {
    const value = key === "username" ? e.target.value.toLowerCase() : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (!user) return;
    setForm({
      username: user.username || "",
      display_name: user.display_name || "",
      avatar_color: user.avatar_color || AVATAR_COLORS[0],
      avatar_preset: user.avatar_preset || "helmet",
      avatar_url: user.avatar_url || "",
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("AVATAR MUST BE AN IMAGE");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("AVATAR IMAGE MUST BE UNDER 750KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, avatar_url: String(reader.result || "") }));
    };
    reader.onerror = () => toast.error("FAILED TO LOAD AVATAR");
    reader.readAsDataURL(file);
  };

  const clearAvatarImage = () => {
    setForm((prev) => ({ ...prev, avatar_url: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || saving) return;

    const payload = {};
    if (form.username && form.username !== user.username) payload.username = form.username;
    if (form.display_name && form.display_name !== user.display_name) payload.display_name = form.display_name;
    if (form.avatar_color && form.avatar_color !== user.avatar_color) payload.avatar_color = form.avatar_color;
    if (form.avatar_preset && form.avatar_preset !== (user.avatar_preset || "helmet")) payload.avatar_preset = form.avatar_preset;
    if ((form.avatar_url || "") !== (user.avatar_url || "")) payload.avatar_url = form.avatar_url || "";

    if (Object.keys(payload).length === 0) {
      toast("NO CHANGES TO SAVE");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/users/me", payload);
      await refreshUser();
      toast.success("PROFILE UPDATED");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  const unlinkWallet = async () => {
    if (walletBusy) return;
    setWalletBusy(true);
    try {
      await api.post("/auth/wallet/unlink");
      await refreshUser();
      toast.success("WALLET UNLINKED");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setWalletBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition" data-testid="profile-page">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-brush text-[44px] sm:text-[64px] leading-none hero-title">
              <span className="text-white">PROFILE </span><span className="text-[var(--purple)]">SETTINGS</span>
            </h1>
            <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-2 hero-sub">
              TUNE YOUR RACER ID AND WALLET
            </div>
          </div>
          <div className="flex items-center gap-4 card-ll px-4 py-3 card-animate">
            <RacerAvatar
              size="lg"
              color={form.avatar_color}
              preset={form.avatar_preset}
              imageUrl={form.avatar_url}
              username={form.username}
              displayName={form.display_name}
            />
            <div>
              <div className="font-pixel text-[11px] tracking-widest text-white">@{user?.username || "rider"}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)]">{user?.title || "ROOKIE RACER"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form className="card-ll p-5 lg:col-span-2 card-animate" onSubmit={handleSave}>
            <div className="flex items-center gap-2 mb-5">
              <User size={20} className="text-[var(--purple-bright)]" />
              <div className="font-brush text-[24px] text-white">ACCOUNT</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-ll block mb-2">DISPLAY NAME</label>
                <input
                  value={form.display_name}
                  onChange={updateField("display_name")}
                  className="input-ll"
                  maxLength={32}
                  data-testid="profile-display-name"
                />
              </div>
              <div>
                <label className="label-ll block mb-2">USERNAME</label>
                <input
                  value={form.username}
                  onChange={updateField("username")}
                  className="input-ll"
                  minLength={3}
                  maxLength={20}
                  data-testid="profile-username"
                />
              </div>
              <div>
                <label className="label-ll block mb-2">EMAIL</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={user?.email || "WALLET ACCOUNT"}
                    readOnly
                    className="input-ll pl-9 bg-black/40"
                    data-testid="profile-email"
                  />
                </div>
              </div>
              <div>
                <label className="label-ll block mb-2">ROLE</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={user?.role || "ROOKIE RIDER"}
                    readOnly
                    className="input-ll pl-9 bg-black/40"
                    data-testid="profile-role"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="label-ll mb-2 flex items-center gap-2">
                <Palette size={14} />
                AVATAR COLOR
              </div>
              <div className="flex flex-wrap gap-3">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatar_color: color }))}
                    className={`w-10 h-10 rounded-full border ${form.avatar_color === color ? "border-[var(--purple)] blue-ring" : "border-[var(--border)]"}`}
                    style={{ background: color }}
                    aria-label={`Avatar color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="label-ll mb-2 flex items-center gap-2">
                <Image size={14} />
                AVATAR STYLE
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatar_preset: preset.id }))}
                    className={`card-ll-inner px-3 py-3 flex items-center gap-3 text-left ${form.avatar_preset === preset.id ? "border-[var(--purple)] blue-ring" : ""}`}
                    data-testid={`avatar-preset-${preset.id}`}
                  >
                    <RacerAvatar
                      size="sm"
                      color={form.avatar_color}
                      preset={preset.id}
                      imageUrl=""
                      username={form.username}
                      displayName={form.display_name}
                    />
                    <span className="font-pixel text-[10px] tracking-widest text-white">{preset.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="label-ll mb-2 flex items-center gap-2">
                <Upload size={14} />
                CUSTOM AVATAR
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                  data-testid="profile-avatar-file"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost-ll w-full sm:w-auto flex items-center justify-center gap-2"
                  data-testid="profile-avatar-upload"
                >
                  <Upload size={14} /> UPLOAD IMAGE
                </button>
                {form.avatar_url && (
                  <button
                    type="button"
                    onClick={clearAvatarImage}
                    className="btn-ghost-ll w-full sm:w-auto flex items-center justify-center gap-2"
                    data-testid="profile-avatar-clear"
                  >
                    <X size={14} /> REMOVE IMAGE
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary-ll w-full sm:w-auto min-w-[160px] cta-pulse"
                data-testid="profile-save"
              >
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn-ghost-ll w-full sm:w-auto"
                data-testid="profile-reset"
              >
                RESET
              </button>
            </div>
          </form>

          <div className="card-ll p-5 card-animate">
            <div className="flex items-center gap-2 mb-5">
              <Wallet size={18} className="text-[var(--purple-bright)]" />
              <div className="font-brush text-[22px] text-white">WALLET</div>
            </div>

            {user?.wallet_address ? (
              <>
                <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)]">CONNECTED</div>
                <div className="font-mono-crt text-[15px] text-white mt-2">
                  {truncateAddress(user.wallet_address)}
                </div>
                <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-2">
                  CHAIN ID {user.wallet_chain_id || "—"}
                </div>
                <button
                  type="button"
                  disabled={walletBusy}
                  onClick={unlinkWallet}
                  className="btn-ghost-ll w-full mt-4"
                  data-testid="profile-unlink-wallet"
                >
                  {walletBusy ? "UNLINKING..." : "UNLINK WALLET"}
                </button>
              </>
            ) : (
              <div className="mt-3">
                <WalletButton variant="link" onLinked={refreshUser} />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
