import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { FileText, Mail, ShieldCheck } from "lucide-react";

const PAGES = {
  privacy: {
    testId: "privacy-page",
    eyebrow: "PRIVACY",
    title: "Privacy",
    icon: ShieldCheck,
    intro: "LastLap uses only the account information needed to run the community hub, task progress, referrals, and leaderboard.",
    sections: [
      {
        heading: "Information We Use",
        body: "We may store your username, email address, profile preferences, task progress, referral activity, and login session details. If you choose to connect X or a wallet, we store the public account details needed to verify your account and complete requested actions.",
      },
      {
        heading: "Wallet Safety",
        body: "LastLap never asks for seed phrases, recovery phrases, private keys, or token approvals. Wallet login uses a signed message to prove account ownership.",
      },
      {
        heading: "Third-Party Services",
        body: "X, Discord, wallet providers, email delivery, hosting, and analytics or infrastructure providers operate under their own terms and privacy practices.",
      },
      {
        heading: "Data Requests",
        body: "For account, privacy, or security questions, contact the LastLap team through the official channels listed on the contact page.",
      },
    ],
  },
  terms: {
    testId: "terms-page",
    eyebrow: "TERMS",
    title: "Terms",
    icon: FileText,
    intro: "Use LastLap fairly, only with accounts you control, and do not abuse the task, referral, or leaderboard systems.",
    sections: [
      {
        heading: "Community Use",
        body: "You are responsible for activity from your account. Do not automate abuse, impersonate others, submit false task claims, or attempt to disrupt the service.",
      },
      {
        heading: "Lap Points",
        body: "Lap Points are in-app community progress points. They are not money, securities, or a promise of financial value.",
      },
      {
        heading: "Connected Accounts",
        body: "Only connect X accounts or wallets that you own or are authorized to use. LastLap may refuse or reverse points earned through suspicious or abusive activity.",
      },
      {
        heading: "Service Changes",
        body: "Features, rewards, verification rules, and access may change as the LastLap community hub evolves.",
      },
    ],
  },
  contact: {
    testId: "contact-page",
    eyebrow: "CONTACT",
    title: "Contact",
    icon: Mail,
    intro: "For support, security reports, or link-safety reviews, contact LastLap through the official community channels.",
    sections: [
      {
        heading: "Support",
        body: "For account or task issues, message the team through X or Discord and include your username, the affected URL, and a short description of the issue.",
      },
      {
        heading: "Security Reports",
        body: "For suspected vulnerabilities or browser safety warnings, include the exact URL, browser, warning text, screenshots if available, and reproducible steps.",
      },
    ],
    links: [
      { label: "X: @lastlapdotfun", href: "https://x.com/lastlapdotfun" },
      { label: "Discord Community", href: "https://discord.gg/NkbhjeNjdT" },
    ],
  },
};

export default function TrustPage({ page = "privacy" }) {
  const { user } = useAuth();
  const content = PAGES[page] || PAGES.privacy;
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition flex flex-col" data-testid={content.testId}>
      {user ? (
        <Navbar />
      ) : (
        <header className="w-full border-b border-[var(--border)] bg-[var(--bg)]/95">
          <div className="w-full px-5 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between">
            <Link to="/login" className="flex items-center gap-2 font-brush text-3xl tracking-tight neon-text">
              <img src="/crossed-flags.png" alt="" className="w-9 h-9 object-contain" />
              <span><span className="text-white">LAST</span><span className="text-[var(--purple)]">LAP</span></span>
            </Link>
            <Link to="/about" className="nav-link font-pixel text-[11px] tracking-widest px-3 py-2 text-white/80 hover:text-white">
              ABOUT
            </Link>
          </div>
        </header>
      )}
      <main className="flex-1 w-full px-5 sm:px-6 lg:px-8 xl:px-10 py-10">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 font-pixel text-[10px] tracking-widest text-[var(--purple-bright)] mb-4">
            <Icon size={18} />
            {content.eyebrow}
          </div>
          <h1 className="font-brush text-[48px] sm:text-[64px] leading-none mb-4 text-white hero-title">
            {content.title}
          </h1>
          <p className="font-mono-crt text-[18px] sm:text-[20px] text-[var(--muted)] leading-relaxed mb-10 max-w-3xl hero-sub">
            {content.intro}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.sections.map((section, index) => (
              <section key={section.heading} className={`card-ll p-5 row-animate stagger-${(index % 4) + 1}`}>
                <h2 className="font-pixel text-[11px] tracking-widest text-white mb-3">{section.heading.toUpperCase()}</h2>
                <p className="font-mono-crt text-[16px] text-[var(--muted)] leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
          {content.links && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {content.links.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="btn-primary-ll py-3 px-6 w-full sm:w-auto text-center">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
