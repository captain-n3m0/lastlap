import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function TasksPage() {
  const { refreshUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/tasks").then(({ data }) => setTasks(data));

  useEffect(() => { load(); }, []);

  const handleAction = async (task) => {
    if (busy) return;
    setBusy(true);
    try {
      if (task.status === "available") {
        await api.post(`/tasks/${task.id}/start`);
        if (task.external_url && task.external_url !== "#") {
          window.open(task.external_url, "_blank", "noopener");
        }
        toast.success("STARTED — verifying...", { duration: 1500 });
        setTimeout(async () => {
          try {
            const { data } = await api.post(`/tasks/${task.id}/complete`);
            toast.success(`+${data.reward_lp} LP EARNED`);
            await load();
            await refreshUser();
          } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
          finally { setBusy(false); }
        }, 1500);
        return;
      }
      if (task.status === "started") {
        const { data } = await api.post(`/tasks/${task.id}/complete`);
        toast.success(`+${data.reward_lp} LP EARNED`);
        await load();
        await refreshUser();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]" data-testid="tasks-page">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
        <h1 className="font-brush text-[64px] leading-none mb-2">
          <span className="text-white">RIDER </span><span className="text-[var(--purple)]">GARAGE</span>
        </h1>
        <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mb-8">ALL MISSIONS — STACK YOUR LAP POINTS</div>

        <div className="card-ll p-5 space-y-2">
          {tasks.map((t) => {
            const platformIcon = t.platform === "X" ? "𝕏" : t.platform === "DISCORD" ? "♣" : t.platform === "WALLET" ? "₿" : t.platform === "EMAIL" ? "✉" : "★";
            const done = t.status === "completed";
            const started = t.status === "started";
            return (
              <div key={t.id} className={`card-ll-inner px-4 py-3 flex items-center gap-4 ${done ? "opacity-60" : ""}`} data-testid={`task-row-${t.id}`}>
                <div className="w-10 h-10 rounded bg-black/50 border border-[var(--border)] flex items-center justify-center font-pixel text-white">
                  {platformIcon}
                </div>
                <div className="flex-1">
                  <div className="font-pixel text-[12px] tracking-widest text-white">{t.title.toUpperCase()}</div>
                  <div className="font-mono-crt text-[15px] text-[var(--muted)]">{t.description}</div>
                </div>
                <div className="font-pixel text-[12px] tracking-widest text-[var(--purple-bright)]">{t.reward_lp} LP</div>
                <button
                  onClick={() => handleAction(t)}
                  disabled={done || busy}
                  className="btn-primary-ll min-w-[120px]"
                  data-testid={`task-btn-${t.id}`}
                >
                  {done ? "DONE" : started ? "CLAIM" : "START TASK"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
