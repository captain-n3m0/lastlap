import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Trophy, Medal, Award } from "lucide-react";

function RankIcon({ rank }) {
  if (rank === 1) return <Trophy size={18} className="text-[#FFD700]" />;
  if (rank === 2) return <Medal size={18} className="text-[#C0C0C0]" />;
  if (rank === 3) return <Award size={18} className="text-[#CD7F32]" />;
  return <span className="font-pixel text-sm text-[var(--muted)]">{rank}</span>;
}

export default function Leaderboard() {
  const [data, setData] = useState({ top: [], you: null, total_racers: 0 });

  useEffect(() => {
    api.get("/leaderboard?limit=100").then(({ data }) => setData(data));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]" data-testid="leaderboard-page">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-brush text-[64px] leading-none">
              <span className="text-white">GLOBAL </span><span className="text-[var(--purple)]">GRID</span>
            </h1>
            <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-2">
              {data.total_racers} RIDERS ON THE TRACK
            </div>
          </div>
          {data.you && (
            <div className="card-ll px-5 py-3">
              <div className="label-ll">YOUR RANK</div>
              <div className="font-pixel text-[22px] text-[var(--purple-bright)]">#{data.your_rank}</div>
            </div>
          )}
        </div>

        <div className="card-ll p-4">
          <div className="grid grid-cols-[40px_40px_1fr_120px_80px_80px] gap-3 px-3 py-2 border-b border-[var(--border)] mb-2">
            <div className="label-ll">#</div>
            <div className="label-ll"></div>
            <div className="label-ll">RIDER</div>
            <div className="label-ll text-right">LP</div>
            <div className="label-ll text-center hidden sm:block">TASKS</div>
            <div className="label-ll text-center hidden sm:block">STREAK</div>
          </div>
          <div className="space-y-1">
            {data.top.map((e) => (
              <div key={e.rank}
                className={`grid grid-cols-[40px_40px_1fr_120px_80px_80px] gap-3 px-3 py-3 items-center rounded ${e.is_you ? "border border-[var(--purple)] bg-[var(--purple)]/5" : "hover:bg-[var(--bg-card-2)]"}`}
                data-testid={`lb-row-${e.rank}`}>
                <div className="flex items-center justify-center"><RankIcon rank={e.rank} /></div>
                <div className="avatar-pixel" style={{ background: e.avatar_color }}>{e.username.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-pixel text-[12px] tracking-widest text-white">@{e.username}{e.is_you && <span className="text-[var(--purple-bright)] ml-2">(YOU)</span>}</div>
                  <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)]">{e.title}</div>
                </div>
                <div className="font-pixel text-[13px] tracking-widest text-[var(--purple-bright)] text-right">{e.lap_points.toLocaleString()}</div>
                <div className="font-pixel text-[12px] tracking-widest text-white text-center hidden sm:block">{e.tasks_completed}</div>
                <div className="font-pixel text-[12px] tracking-widest text-[var(--amber)] text-center hidden sm:block">{e.daily_streak}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
