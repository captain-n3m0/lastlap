import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Trophy, Flag, TrendingUp, Flame, Gauge, Users, Copy, Award, Shield, Medal } from "lucide-react";
import CheckeredFlag from "../components/CheckeredFlag";
import XLogo from "../components/XLogo";
import TaskPlatformIcon from "../components/TaskPlatformIcon";
import RacerAvatar from "../components/RacerAvatar";

function StatCard({ icon: Icon, label, value, color = "var(--purple-bright)", testid, className = "" }) {
  return (
    <div className={`card-ll px-5 py-4 flex items-center gap-4 ${className}`} data-testid={testid}>
      <div className="w-10 h-10 rounded bg-[var(--bg-card-2)] border border-[var(--border)] flex items-center justify-center icon-wiggle">
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="label-ll mb-1">{label}</div>
        <div className="font-pixel text-[18px] tracking-wide" style={{ color }} data-testid={`${testid}-value`}>{value}</div>
      </div>
    </div>
  );
}

function TaskItem({ task, onAction, isAuthLoading, className = "" }) {
  const isCompleted = task.status === "completed";
  const isStarted = task.status === "started";
  return (
    <div className={`card-ll-inner px-4 py-3 flex flex-wrap items-center gap-3 sm:gap-4 ${isCompleted ? "opacity-60" : ""} ${className}`} data-testid={`task-item-${task.id}`}>
      <div className="w-9 h-9 rounded bg-black/50 border border-[var(--border)] flex items-center justify-center font-pixel text-white text-sm">
        <TaskPlatformIcon platform={task.platform} icon={task.icon} size={15} />
      </div>
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className="font-pixel text-[11px] tracking-widest text-white truncate">{task.title.toUpperCase()}</div>
        <div className="font-mono-crt text-[15px] text-[var(--muted)] truncate">{task.description}</div>
      </div>
      <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:ml-auto">
        <div className="font-pixel text-[12px] tracking-widest text-[var(--purple-bright)] whitespace-nowrap">
          {task.reward_lp} LP
        </div>
        <button
          onClick={() => onAction(task)}
          disabled={isCompleted || isAuthLoading}
          className="btn-primary-ll w-full sm:w-auto sm:min-w-[110px] cta-pulse"
          data-testid={`task-action-${task.id}`}
        >
          {isCompleted ? "DONE" : isStarted ? "CLAIM" : "START TASK"}
        </button>
      </div>
    </div>
  );
}

function CountdownTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.get("/tasks/reset-timer").then(({ data }) => {
      if (mounted) setSeconds(data.seconds);
    }).catch(() => {});
    const interval = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="text-right">
      <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)]">TASKS RESET IN</div>
      <div className="font-pixel text-[20px] tracking-widest timer-pulse" data-testid="countdown-timer">{hh}:{mm}:{ss}</div>
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="w-7 h-7 flex items-center justify-center"><Trophy size={20} className="text-[#FFD700]" /></div>;
  if (rank === 2) return <div className="w-7 h-7 flex items-center justify-center"><Medal size={20} className="text-[#C0C0C0]" /></div>;
  if (rank === 3) return <div className="w-7 h-7 flex items-center justify-center"><Award size={20} className="text-[#CD7F32]" /></div>;
  return <div className="w-7 h-7 flex items-center justify-center font-pixel text-sm text-[var(--muted)]">{rank}</div>;
}

function LeaderboardRow({ entry, highlighted, className = "" }) {
  return (
    <div className={`px-3 py-2.5 flex items-center gap-3 hover-lift hover-glow ${highlighted ? "card-ll-inner border-[var(--purple)]" : ""} ${className}`}
      data-testid={`leaderboard-row-${entry.rank}`}>
      <RankBadge rank={entry.rank} />
      <RacerAvatar user={entry} username={entry.username} size="sm" className="rounded" />
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[11px] tracking-widest text-white truncate">@{entry.username}</div>
        {highlighted && <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)]">{entry.title}</div>}
      </div>
      <div className="font-pixel text-[11px] tracking-widest text-[var(--purple-bright)]">{entry.lap_points.toLocaleString()} LP</div>
      <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] w-8 text-center hidden sm:block">{entry.tasks_completed}</div>
      <div className="font-pixel text-[10px] tracking-widest text-[var(--amber)] w-8 text-center hidden sm:block">{entry.daily_streak}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [board, setBoard] = useState({ top: [], you: null });
  const [stats, setStats] = useState(null);
  const [refs, setRefs] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [t, l, s, r] = await Promise.all([
        api.get("/tasks"),
        api.get("/leaderboard?limit=6"),
        api.get("/users/me/stats"),
        api.get("/referrals/me"),
      ]);
      setTasks(t.data);
      setBoard(l.data);
      setStats(s.data);
      setRefs(r.data);
    } catch (e) {
      // user might need to relogin
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const handleTaskAction = async (task) => {
    if (busy) return;
    setBusy(true);
    try {
      // Special handling for WALLET task — trigger real wallet link flow
      if (task.platform === "WALLET" && task.status !== "completed") {
        try {
          const { walletLink } = await import("../lib/wallet");
          const linkRes = await walletLink();
          if (linkRes.reward_lp > 0) {
            toast.success(`WALLET LINKED — +${linkRes.reward_lp} LP`);
          }
          // Also mark this task as completed (separate from the +250 LP from link)
          try {
            const { data } = await api.post(`/tasks/${task.id}/complete`);
            toast.success(`+${data.reward_lp} LP — TASK COMPLETE`);
          } catch { /* task may already be complete */ }
          await loadAll();
          await refreshUser();
        } catch (e) {
          const msg = e.response?.data?.detail || e.message || "Wallet connection failed";
          if (e.code === 4001 || /user rejected/i.test(msg)) toast.error("SIGNATURE CANCELLED");
          else toast.error(typeof msg === "string" ? msg.toUpperCase() : "WALLET ERROR");
        } finally { setBusy(false); }
        return;
      }

      if (task.status === "available") {
        await api.post(`/tasks/${task.id}/start`);
        if (task.external_url && task.external_url !== "#") {
          window.open(task.external_url, "_blank", "noopener");
        }
        // Immediately complete after a brief delay (simulating verification)
        toast.success(`STARTED — verifying...`, { duration: 1500 });
        setTimeout(async () => {
          try {
            const { data } = await api.post(`/tasks/${task.id}/complete`);
            toast.success(`+${data.reward_lp} LP EARNED`);
            await loadAll();
            await refreshUser();
          } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to complete task");
          } finally { setBusy(false); }
        }, 1500);
        return;
      }
      if (task.status === "started") {
        const { data } = await api.post(`/tasks/${task.id}/complete`);
        toast.success(`+${data.reward_lp} LP EARNED`);
        await loadAll();
        await refreshUser();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} COPIED`);
  };

  const joinedDate = stats?.joined_on
    ? new Date(stats.joined_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
    : "—";

  const tasksGoal = stats?.tasks_goal ?? 0;
  const tasksProgress = tasksGoal > 0
    ? Math.min(100, ((stats?.tasks_completed || 0) / tasksGoal) * 100)
    : 0;
  const tasksGoalLabel = tasksGoal > 0 ? tasksGoal : "—";

  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition" data-testid="dashboard-page">
      <Navbar />

      {/* HERO */}
      <section className="relative w-full px-5 sm:px-6 lg:px-8 xl:px-10 pt-5 pb-5">
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)] min-h-[260px] md:min-h-[320px] hero-rail">
          {/* Background artwork with fade */}
          <img
            src="/hero-art.png"
            alt="LastLap riders on Route 66"
            className="absolute inset-0 w-full h-full object-cover hero-art"
            data-testid="hero-artwork"
          />
          {/* Left-to-right dark fade so the title is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/85 via-40% to-transparent" />
          {/* Subtle bottom fade into stat cards */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent" />

          {/* Foreground content */}
          <div className="relative z-10 px-6 md:px-10 py-8 md:py-10 max-w-[680px] fade-in-up">
            <h1 className="font-brush text-[44px] sm:text-[60px] md:text-[76px] leading-[0.95] mb-4 hero-title stagger-1" data-testid="hero-title">
              <span className="text-white">RACER </span>
              <span className="text-[var(--purple)]">HUB</span>
            </h1>
            <div className="font-mono-crt text-[16px] sm:text-[20px] text-[var(--muted)] max-w-md hero-sub stagger-2">
              COMPLETE MISSIONS, EARN LAP POINTS,<br/>AND CLIMB THE GLOBAL GRID
            </div>
          </div>
        </div>
      </section>

      {/* TOP STATS */}
      <section className="w-full px-5 sm:px-6 lg:px-8 xl:px-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="RIDER STATUS" value={user?.role || "ROOKIE RIDER"} testid="stat-status" className="card-animate stagger-1" />
        <StatCard icon={Flag} label="LAP POINTS (LP)" value={(stats?.lap_points ?? user?.lap_points ?? 0).toLocaleString()} testid="stat-lp" className="card-animate stagger-2" />
        <StatCard icon={TrendingUp} label="CURRENT RANK" value={`#${stats?.current_rank ?? "—"}`} testid="stat-rank" className="card-animate stagger-3" />
        <StatCard icon={Flame} label="DAILY STREAKS" value={`${stats?.daily_streak ?? 0} DAYS`} testid="stat-streak" color="var(--amber)" className="card-animate stagger-4" />
      </section>

      {/* DAILY TASKS + LEADERBOARD */}
      <section className="w-full px-5 sm:px-6 lg:px-8 xl:px-10 mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Race Tasks */}
        <div className="card-ll p-5 card-animate stagger-1" data-testid="daily-tasks-panel">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="float-drift inline-flex"><CheckeredFlag size={44} /></span>
              <div>
                <div className="font-brush text-[26px] text-white leading-none">DAILY RACE TASKS</div>
                <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">COMPLETE TASKS AND EARN LAP POINTS</div>
              </div>
            </div>
            <CountdownTimer />
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 4).map((t, index) => (
              <TaskItem
                key={t.id}
                task={t}
                onAction={handleTaskAction}
                isAuthLoading={busy}
                className={`row-animate stagger-${(index % 4) + 1}`}
              />
            ))}
          </div>
          <button onClick={() => navigate("/tasks")} className="btn-ghost-ll w-full mt-4 cta-pulse" data-testid="view-all-tasks">VIEW ALL TASKS</button>
        </div>

        {/* Global Leaderboard */}
        <div className="card-ll p-5 blue-ring card-animate stagger-2" data-testid="leaderboard-panel">
          <div className="flex items-center gap-3 mb-5">
            <Trophy size={28} className="text-[#FFD700]" />
            <div>
              <div className="font-brush text-[26px] text-white leading-none">GLOBAL LEADERBOARD</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">TOP RACERS ON THE GLOBAL GRID</div>
            </div>
          </div>
          <div className="space-y-1">
            {board.top?.map((e, index) => (
              <LeaderboardRow key={e.rank} entry={e} className={`row-animate stagger-${(index % 4) + 1}`} />
            ))}
            {board.you && !board.top?.some(t => t.is_you) && (
              <>
                <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)] mt-3 mb-1 px-3">YOUR RANK</div>
                <div className="border border-[var(--purple)] rounded">
                  <LeaderboardRow entry={board.you} highlighted className="row-animate stagger-4" />
                </div>
              </>
            )}
            {board.you && board.top?.some(t => t.is_you) && (
              <>
                <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)] mt-3 mb-1 px-3">YOUR RANK</div>
                <div className="border border-[var(--purple)] rounded">
                  <LeaderboardRow entry={board.you} highlighted className="row-animate stagger-4" />
                </div>
              </>
            )}
          </div>
          <button onClick={() => navigate("/leaderboard")} className="btn-ghost-ll w-full mt-4 cta-pulse" data-testid="view-leaderboard">VIEW FULL LEADERBOARD</button>
        </div>
      </section>

      {/* RACE STATS + BUILD CREW */}
      <section className="w-full px-5 sm:px-6 lg:px-8 xl:px-10 mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Race Stats */}
        <div className="card-ll p-5 card-animate stagger-3" data-testid="race-stats-panel">
          <div className="flex items-center gap-3 mb-5">
            <Gauge size={28} className="text-[var(--amber)]" />
            <div>
              <div className="font-brush text-[26px] text-white leading-none">YOUR RACE STATS</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">YOUR PERFORMANCE OVERVIEW</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="card-ll-inner p-4 row-animate stagger-1">
              <div className="label-ll mb-2">TASKS COMPLETED</div>
              <div className="stat-num">{stats?.tasks_completed ?? 0}<span className="text-[var(--muted)] text-[14px]"> /{tasksGoalLabel}</span></div>
              <div className="w-full bg-[var(--border)] h-1.5 rounded mt-2 overflow-hidden">
                <div className="bg-[var(--purple)] h-full" style={{ width: `${tasksProgress}%` }} />
              </div>
            </div>
            <div className="card-ll-inner p-4 row-animate stagger-2">
              <div className="label-ll mb-2">LP EARNED</div>
              <div className="stat-num">{(stats?.lap_points ?? 0).toLocaleString()}</div>
            </div>
            <div className="card-ll-inner p-4 row-animate stagger-3">
              <div className="label-ll mb-2">CURRENT RANK</div>
              <div className="stat-num">#{stats?.current_rank ?? "—"}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">TOP {stats?.top_percentile ?? "—"}%</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card-ll-inner p-4 row-animate stagger-1">
              <div className="label-ll mb-2">REFERRALS</div>
              <div className="flex items-center gap-2">
                <div className="stat-num">{stats?.referrals_count ?? 0}</div>
                <Users size={16} className="text-[var(--muted)]" />
              </div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">RIDERS</div>
            </div>
            <div className="card-ll-inner p-4 row-animate stagger-2">
              <div className="label-ll mb-2">DAILY STREAK</div>
              <div className="flex items-center gap-2">
                <div className="stat-num">{stats?.daily_streak ?? 0} <span className="text-[14px] text-[var(--muted)]">DAYS</span></div>
                <span className="flame text-[var(--amber)]"><Flame size={16} /></span>
              </div>
            </div>
            <div className="card-ll-inner p-4 row-animate stagger-3">
              <div className="label-ll mb-2">JOINED ON</div>
              <div className="font-pixel text-[14px] tracking-widest text-[var(--purple-bright)]">{joinedDate}</div>
            </div>
          </div>
          <button onClick={() => navigate("/leaderboard")} className="btn-ghost-ll w-full mt-4 cta-pulse" data-testid="view-stats">VIEW DETAILED STATS</button>
        </div>

        {/* Build Crew */}
        <div className="card-ll p-5 card-animate stagger-4" data-testid="crew-panel">
          <div className="flex items-center gap-3 mb-5">
            <Users size={28} className="text-[var(--purple-bright)]" />
            <div>
              <div className="font-brush text-[26px] text-white leading-none">BUILD YOUR CREW</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">INVITE FRIENDS AND EARN MORE LAP POINTS</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="label-ll mb-2">YOUR REFERRAL CODE</div>
            <div className="flex gap-2">
              <input readOnly value={refs?.referral_code || ""} className="input-ll font-pixel text-[14px]" data-testid="referral-code-input" />
              <button onClick={() => copy(refs?.referral_code, "CODE")} className="btn-primary-ll px-4" data-testid="copy-code"><Copy size={14} /></button>
            </div>
          </div>
          <div className="mb-4">
            <div className="label-ll mb-2">YOUR REFERRAL LINK</div>
            <div className="flex gap-2">
              <input readOnly value={refs?.referral_link || ""} className="input-ll text-[14px]" data-testid="referral-link-input" />
              <button onClick={() => copy(refs?.referral_link, "LINK")} className="btn-primary-ll px-4" data-testid="copy-link"><Copy size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="card-ll-inner p-3 row-animate stagger-1">
              <div className="label-ll mb-1">CREW INVITES</div>
              <div className="stat-num">{refs?.crew_invites ?? 0}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">RIDERS</div>
            </div>
            <div className="card-ll-inner p-3 row-animate stagger-2">
              <div className="label-ll mb-1">PENDING</div>
              <div className="stat-num">{refs?.pending_invites ?? 0}</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">RIDERS</div>
            </div>
            <div className="card-ll-inner p-3 row-animate stagger-3">
              <div className="label-ll mb-1">TOTAL EARNED</div>
              <div className="stat-num">{refs?.total_earned ?? 0} LP</div>
              <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">REFERRALS</div>
            </div>
          </div>

          <div className="font-mono-crt text-[15px] text-[var(--muted)] mb-3">
            EARN BONUS LAP POINTS FOR EVERY VERIFIED RIDER WHO JOINS THROUGH YOUR LINK.
          </div>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me on LastLap and earn Lap Points! " + (refs?.referral_link || ""))}`}
            target="_blank" rel="noreferrer"
            className="btn-primary-ll w-full flex items-center justify-center gap-2 py-3 cta-pulse"
            data-testid="share-x"
          >
            <span>SHARE ON</span> <XLogo size={14} />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
