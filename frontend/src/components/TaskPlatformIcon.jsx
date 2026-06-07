import { CalendarCheck, Mail, Star, Wallet } from "lucide-react";
import DiscordLogo from "./DiscordLogo";
import XLogo from "./XLogo";

export default function TaskPlatformIcon({ platform, size = 14, className = "" }) {
  const normalized = String(platform || "").toUpperCase();

  if (normalized === "X") return <XLogo size={size} className={className} />;
  if (normalized === "DISCORD") return <DiscordLogo size={size} className={className} />;
  if (normalized === "WALLET") return <Wallet size={size} className={className} />;
  if (normalized === "EMAIL") return <Mail size={size} className={className} />;
  if (normalized === "CHECKIN") return <CalendarCheck size={size} className={className} />;

  return <Star size={size} className={className} />;
}
