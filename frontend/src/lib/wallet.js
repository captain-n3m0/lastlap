import api from "./api";

// Detect any injected EVM provider (MetaMask, Coinbase Wallet, Rabby, Brave, etc.)
export function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  // EIP-6963 / common pattern
  return window.ethereum || null;
}

export function detectWalletName() {
  const eth = getInjectedProvider();
  if (!eth) return null;
  if (eth.isRabby) return "Rabby";
  if (eth.isCoinbaseWallet || eth.providers?.some?.((p) => p.isCoinbaseWallet)) return "Coinbase Wallet";
  if (eth.isMetaMask) return "MetaMask";
  return "Browser Wallet";
}

export function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function requestAccounts(provider) {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) throw new Error("No account selected");
  return accounts[0].toLowerCase();
}

async function getChainId(provider) {
  const hex = await provider.request({ method: "eth_chainId" });
  return parseInt(hex, 16);
}

function buildSiweMessage({ domain, address, nonce, chainId, statement }) {
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();
  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n\n` +
    `${statement}\n\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}`
  );
}

async function signSiwe(provider, address, chainId, statement) {
  // 1. Get nonce from backend
  const { data: nonceRes } = await api.post("/auth/wallet/nonce", { address });
  const message = buildSiweMessage({
    domain: window.location.host,
    address,
    nonce: nonceRes.nonce,
    chainId,
    statement,
  });
  // 2. Sign with wallet (personal_sign)
  const signature = await provider.request({
    method: "personal_sign",
    params: [message, address],
  });
  return { message, signature, address, chain_id: chainId };
}

/** Sign-in (or auto-register) via wallet. Returns { access_token, user }. */
export async function walletSignIn() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No EVM wallet detected. Install MetaMask, Coinbase Wallet, or Rabby.");
  const address = await requestAccounts(provider);
  const chainId = await getChainId(provider);
  const payload = await signSiwe(provider, address, chainId, "Sign in to LastLap — final lap defines everything.");
  const { data } = await api.post("/auth/wallet/verify", payload);
  return data; // { access_token, token_type, user }
}

/** Link the current wallet to the currently-logged-in (email) account. */
export async function walletLink() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No EVM wallet detected. Install MetaMask, Coinbase Wallet, or Rabby.");
  const address = await requestAccounts(provider);
  const chainId = await getChainId(provider);
  const payload = await signSiwe(provider, address, chainId, "Link this wallet to your LastLap account.");
  const { data } = await api.post("/auth/wallet/link", payload);
  return data; // { ok, user, reward_lp }
}
