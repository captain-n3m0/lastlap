import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { walletSignIn, walletLink, detectWalletName, getInjectedProvider } from "../lib/wallet";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

/**
 * Variant "signin": sign in or auto-create wallet account.
 * Variant "link": link wallet to current authenticated user (gives 250 LP).
 */
export default function WalletButton({ variant = "signin", className = "", onLinked }) {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const walletName = detectWalletName();
  const hasWallet = !!getInjectedProvider();

  const handle = async () => {
    if (busy) return;
    if (!hasWallet) {
      toast.error("No EVM wallet found. Install MetaMask, Coinbase Wallet, or Rabby.");
      return;
    }
    setBusy(true);
    try {
      if (variant === "signin") {
        const data = await walletSignIn();
        localStorage.setItem("ll_token", data.access_token);
        toast.success(`WELCOME, @${data.user.username.toUpperCase()}`);
        // hard reload to re-run AuthContext fetchMe
        window.location.href = "/";
      } else {
        const data = await walletLink();
        if (data.reward_lp > 0) toast.success(`WALLET LINKED — +${data.reward_lp} LP`);
        else toast.success("WALLET UPDATED");
        await refreshUser();
        onLinked?.(data.user);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Wallet sign-in failed";
      // Common MetaMask user rejection
      if (e.code === 4001 || /user rejected/i.test(msg)) {
        toast.error("SIGNATURE CANCELLED");
      } else {
        toast.error(typeof msg === "string" ? msg.toUpperCase() : "WALLET ERROR");
      }
    } finally {
      setBusy(false);
    }
  };

  const label = variant === "signin"
    ? (busy ? "WAITING FOR WALLET..." : (walletName ? `SIGN IN WITH ${walletName.toUpperCase()}` : "SIGN IN WITH WALLET"))
    : (busy ? "WAITING FOR WALLET..." : "CONNECT WALLET");

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={`btn-ghost-ll w-full flex items-center justify-center gap-2 py-3 ${className}`}
      data-testid={`wallet-${variant}-btn`}
    >
      <Wallet size={14} />
      <span>{label}</span>
    </button>
  );
}
