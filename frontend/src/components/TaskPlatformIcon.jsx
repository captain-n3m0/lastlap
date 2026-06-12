import {
  CalendarCheck,
  CheckCircle2,
  Flame,
  Flag,
  Gift,
  Link2,
  Mail,
  Star,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import DiscordLogo from "./DiscordLogo";
import XLogo from "./XLogo";

export const TASK_ICON_OPTIONS = [
  { value: "", label: "AUTO" },
  { value: "referral", label: "REFER RIDER" },
  { value: "x", label: "X" },
  { value: "discord", label: "DISCORD" },
  { value: "wallet", label: "WALLET" },
  { value: "checkin", label: "CHECK-IN" },
  { value: "email", label: "EMAIL" },
  { value: "users", label: "CREW" },
  { value: "gift", label: "REWARD" },
  { value: "flag", label: "FLAG" },
  { value: "trophy", label: "TROPHY" },
  { value: "flame", label: "STREAK" },
  { value: "link", label: "LINK" },
  { value: "star", label: "STAR" },
  { value: "complete", label: "COMPLETE" },
];

export default function TaskPlatformIcon({ platform, icon, size = 14, className = "" }) {
  const normalizedIcon = String(icon || "").toLowerCase();
  const normalized = String(platform || "").toUpperCase();

  if (normalizedIcon === "x") return <XLogo size={size} className={className} />;
  if (normalizedIcon === "discord") return <DiscordLogo size={size} className={className} />;
  if (normalizedIcon === "wallet") return <Wallet size={size} className={className} />;
  if (normalizedIcon === "email") return <Mail size={size} className={className} />;
  if (normalizedIcon === "checkin") return <CalendarCheck size={size} className={className} />;
  if (normalizedIcon === "referral") return <UserPlus size={size} className={className} />;
  if (normalizedIcon === "users") return <Users size={size} className={className} />;
  if (normalizedIcon === "gift") return <Gift size={size} className={className} />;
  if (normalizedIcon === "flag") return <Flag size={size} className={className} />;
  if (normalizedIcon === "trophy") return <Trophy size={size} className={className} />;
  if (normalizedIcon === "flame") return <Flame size={size} className={className} />;
  if (normalizedIcon === "link") return <Link2 size={size} className={className} />;
  if (normalizedIcon === "star") return <Star size={size} className={className} />;
  if (normalizedIcon === "complete") return <CheckCircle2 size={size} className={className} />;

  if (normalized === "X") return <XLogo size={size} className={className} />;
  if (normalized === "DISCORD") return <DiscordLogo size={size} className={className} />;
  if (normalized === "WALLET") return <Wallet size={size} className={className} />;
  if (normalized === "EMAIL") return <Mail size={size} className={className} />;
  if (normalized === "CHECKIN") return <CalendarCheck size={size} className={className} />;
  if (normalized === "LASTLAP") return <Star size={size} className={className} />;

  return <Star size={size} className={className} />;
}
