import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Coins,
  Edit3,
  Gauge,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TaskPlatformIcon, { TASK_ICON_OPTIONS } from "../components/TaskPlatformIcon";
import RacerAvatar from "../components/RacerAvatar";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiErrorDetail } from "../lib/api";

const ADMIN_ROLES = new Set(["PIT BOSS", "ADMIN", "SUPER ADMIN"]);

const emptyTask = {
  id: "",
  title: "",
  description: "",
  platform: "LASTLAP",
  icon: "",
  reward_lp: 100,
  external_url: "#",
  order: 100,
  is_active: true,
  cadence: "once",
  verification_type: "",
  verification_target: "",
  verification_query: "",
};

function isAdminUser(user) {
  return Boolean(user?.is_admin || ADMIN_ROLES.has(user?.role));
}

function StatTile({ icon: Icon, label, value, tone = "var(--purple-bright)" }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)] rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded bg-black/40 border border-[var(--border)] flex items-center justify-center">
        <Icon size={18} style={{ color: tone }} />
      </div>
      <div className="min-w-0">
        <div className="label-ll mb-1">{label}</div>
        <div className="font-pixel text-[18px] tracking-widest truncate" style={{ color: tone }}>{value}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, meta }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <Icon size={22} className="text-[var(--purple-bright)]" />
        <div>
          <div className="font-brush text-[26px] text-white leading-none">{title}</div>
          {meta && <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] mt-1">{meta}</div>}
        </div>
      </div>
    </div>
  );
}

function Denied() {
  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition flex flex-col" data-testid="admin-denied">
      <Navbar />
      <main className="flex-1 w-full px-5 sm:px-6 lg:px-8 xl:px-10 py-8 flex items-center justify-center">
        <div className="card-ll p-6 max-w-md w-full text-center">
          <Shield size={32} className="mx-auto text-[var(--red)] mb-3" />
          <div className="font-brush text-[32px] text-white leading-none">PIT ACCESS DENIED</div>
          <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-3">ADMIN CREW ONLY</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminDashboard() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [pointForm, setPointForm] = useState({ delta: 0, reason: "" });

  const canAdmin = isAdminUser(user);

  const loadOverview = useCallback(async () => {
    const { data } = await api.get("/admin/overview");
    setOverview(data);
  }, []);

  const loadTasks = useCallback(async () => {
    const { data } = await api.get("/admin/tasks");
    setTasks(data);
  }, []);

  const loadUsers = useCallback(async (search = "") => {
    const { data } = await api.get("/admin/users", { params: { q: search, limit: 80 } });
    setUsers(data.users || []);
    setUserTotal(data.total || 0);
  }, []);

  const loadAll = useCallback(async () => {
    if (!canAdmin) return;
    setLoading(true);
    try {
      await Promise.all([loadOverview(), loadTasks(), loadUsers("")]);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  }, [canAdmin, loadOverview, loadTasks, loadUsers]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!selectedUser) {
      setUserForm({});
      return;
    }
    setUserForm({
      role: selectedUser.role || "",
      title: selectedUser.title || "",
      lap_points: selectedUser.lap_points || 0,
      tasks_completed: selectedUser.tasks_completed || 0,
      daily_streak: selectedUser.daily_streak || 0,
      is_admin: Boolean(selectedUser.is_admin),
      email_verified: Boolean(selectedUser.email_verified),
    });
  }, [selectedUser]);

  const totals = useMemo(() => ({
    racers: overview?.total_users ?? 0,
    activeTasks: overview?.active_tasks ?? 0,
    lp: overview?.total_lp ?? 0,
    completions: overview?.completed_tasks ?? 0,
  }), [overview]);

  if (!canAdmin) return <Denied />;

  const taskField = (key) => (e) => {
    const { value, type, checked } = e.target;
    setTaskForm((prev) => {
      const next = { ...prev, [key]: type === "checkbox" ? checked : value };
      if (key === "platform") {
        if (value === "X" && (!prev.verification_type || prev.verification_type === "profile_update")) next.verification_type = "x_follow";
        if (value === "PROFILE") {
          next.icon = prev.icon || "profile";
          next.external_url = prev.external_url && prev.external_url !== "#" ? prev.external_url : "/profile";
          if (!prev.verification_type || prev.verification_type?.startsWith("x_")) next.verification_type = "profile_update";
        }
        if (value !== "X" && prev.verification_type?.startsWith("x_")) {
          next.verification_type = "";
          next.verification_target = "";
          next.verification_query = "";
        }
        if (value !== "PROFILE" && prev.verification_type === "profile_update") {
          next.verification_type = "";
        }
      }
      return next;
    });
  };

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskForm(emptyTask);
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (savingTask) return;
    setSavingTask(true);
    try {
      const payload = {
        ...taskForm,
        reward_lp: Number(taskForm.reward_lp) || 0,
        order: Number(taskForm.order) || 0,
        external_url: taskForm.external_url || "#",
      };
      if (!payload.id) delete payload.id;
      const { data } = editingTaskId
        ? await api.patch(`/admin/tasks/${editingTaskId}`, payload)
        : await api.post("/admin/tasks", payload);
      toast.success(editingTaskId ? "TASK UPDATED" : "TASK ADDED");
      await Promise.all([loadOverview(), loadTasks()]);
      setEditingTaskId(data.task.id);
      setTaskForm({ ...emptyTask, ...data.task, cadence: data.task.cadence || "once" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const editTask = (task) => {
    setActiveTab("tasks");
    setEditingTaskId(task.id);
    setTaskForm({ ...emptyTask, ...task, cadence: task.cadence || "once" });
  };

  const toggleTask = async (task) => {
    try {
      await api.patch(`/admin/tasks/${task.id}`, { is_active: !task.is_active });
      toast.success(!task.is_active ? "TASK ACTIVATED" : "TASK PAUSED");
      await Promise.all([loadOverview(), loadTasks()]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/admin/tasks/${task.id}`);
      toast.success("TASK REMOVED");
      if (editingTaskId === task.id) resetTaskForm();
      await Promise.all([loadOverview(), loadTasks()]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const searchUsers = async (e) => {
    e.preventDefault();
    try {
      await loadUsers(query);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser || savingUser) return;
    setSavingUser(true);
    try {
      const payload = {
        ...userForm,
        lap_points: Number(userForm.lap_points) || 0,
        tasks_completed: Number(userForm.tasks_completed) || 0,
        daily_streak: Number(userForm.daily_streak) || 0,
      };
      const { data } = await api.patch(`/admin/users/${selectedUser.id}`, payload);
      toast.success("RIDER UPDATED");
      setSelectedUser(data.user);
      await Promise.all([loadOverview(), loadUsers(query)]);
      if (data.user.id === user.id) await refreshUser();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const adjustPoints = async (e) => {
    e.preventDefault();
    if (!selectedUser || savingUser) return;
    const delta = Number(pointForm.delta) || 0;
    if (delta === 0) {
      toast("NO POINT CHANGE");
      return;
    }
    setSavingUser(true);
    try {
      const { data } = await api.post(`/admin/users/${selectedUser.id}/points`, {
        delta,
        reason: pointForm.reason,
      });
      toast.success("POINTS ADJUSTED");
      setSelectedUser(data.user);
      setPointForm({ delta: 0, reason: "" });
      await Promise.all([loadOverview(), loadUsers(query)]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`h-10 px-3 rounded border flex items-center justify-center gap-2 font-pixel text-[10px] tracking-widest transition ${
        activeTab === id
          ? "border-[var(--purple)] bg-[var(--purple)]/15 text-white"
          : "border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--purple)]"
      }`}
      data-testid={`admin-tab-${id}`}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition flex flex-col" data-testid="admin-page">
      <Navbar />
      <main className="flex-1 w-full px-5 sm:px-6 lg:px-8 xl:px-10 py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-brush text-[44px] sm:text-[64px] leading-none hero-title">
              <span className="text-white">PIT </span><span className="text-[var(--purple)]">CONTROL</span>
            </h1>
            <div className="font-pixel text-[10px] tracking-widest text-[var(--muted)] mt-2 hero-sub">ADMIN CONSOLE</div>
          </div>
          <button type="button" onClick={loadAll} className="btn-ghost-ll w-full sm:w-auto flex items-center justify-center gap-2">
            <RefreshCw size={14} /> REFRESH
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          <TabButton id="overview" icon={Gauge} label="OVERVIEW" />
          <TabButton id="tasks" icon={ClipboardList} label="TASKS" />
          <TabButton id="users" icon={UserCog} label="RIDERS" />
        </div>

        {loading ? (
          <div className="card-ll p-6 font-pixel text-[11px] tracking-widest text-[var(--muted)]">LOADING CONTROL ROOM...</div>
        ) : (
          <>
            {activeTab === "overview" && (
              <section className="space-y-5" data-testid="admin-overview">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatTile icon={Users} label="RIDERS" value={totals.racers.toLocaleString()} />
                  <StatTile icon={ClipboardList} label="ACTIVE TASKS" value={totals.activeTasks.toLocaleString()} tone="var(--blue)" />
                  <StatTile icon={Coins} label="TOTAL LP" value={totals.lp.toLocaleString()} tone="var(--amber)" />
                  <StatTile icon={CheckCircle2} label="COMPLETIONS" value={totals.completions.toLocaleString()} tone="var(--green)" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div className="card-ll p-5">
                    <SectionTitle icon={Activity} title="OPS SNAPSHOT" meta="LIVE SYSTEM COUNTS" />
                    <div className="grid grid-cols-2 gap-3">
                      <StatTile icon={Shield} label="ADMINS" value={(overview?.admin_users ?? 0).toLocaleString()} />
                      <StatTile icon={CheckCircle2} label="VERIFIED" value={(overview?.verified_users ?? 0).toLocaleString()} tone="var(--green)" />
                      <StatTile icon={ClipboardList} label="TASKS TOTAL" value={(overview?.total_tasks ?? 0).toLocaleString()} tone="var(--blue)" />
                      <StatTile icon={Activity} label="STARTED" value={(overview?.started_tasks ?? 0).toLocaleString()} tone="var(--amber)" />
                    </div>
                  </div>

                  <div className="card-ll p-5">
                    <SectionTitle icon={Users} title="RECENT RIDERS" meta="NEWEST ACCOUNTS" />
                    <div className="space-y-2">
                      {(overview?.recent_users || []).map((rider) => (
                        <button
                          key={rider.id}
                          type="button"
                          onClick={() => { setSelectedUser(rider); setActiveTab("users"); }}
                          className="w-full border border-[var(--border)] rounded px-3 py-2 flex items-center gap-3 hover:border-[var(--purple)] transition text-left"
                        >
                          <RacerAvatar user={rider} username={rider.username} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-pixel text-[11px] tracking-widest text-white truncate">@{rider.username}</div>
                            <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)] truncate">{rider.title || "ROOKIE RACER"}</div>
                          </div>
                          <div className="font-pixel text-[10px] tracking-widest text-[var(--purple-bright)]">{(rider.lap_points || 0).toLocaleString()} LP</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "tasks" && (
              <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5" data-testid="admin-tasks">
                <div className="card-ll p-5">
                  <SectionTitle icon={ClipboardList} title="TASK GRID" meta={`${tasks.length} CONFIGURED`} />
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-[var(--border)] rounded-lg p-3 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded bg-black/40 border border-[var(--border)] flex items-center justify-center">
                            <TaskPlatformIcon platform={task.platform} icon={task.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-pixel text-[12px] tracking-widest text-white">{task.title}</div>
                              <span className={`font-pixel text-[8px] tracking-widest px-2 py-1 rounded border ${task.is_active ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--muted-2)] text-[var(--muted)]"}`}>
                                {task.is_active ? "ACTIVE" : "PAUSED"}
                              </span>
                              {task.cadence === "daily" && <span className="font-pixel text-[8px] tracking-widest px-2 py-1 rounded border border-[var(--amber)] text-[var(--amber)]">DAILY</span>}
                              {(task.verification_type || task.platform === "PROFILE") && <span className="font-pixel text-[8px] tracking-widest px-2 py-1 rounded border border-[var(--blue)] text-[var(--blue)]">VERIFY</span>}
                            </div>
                            <div className="font-mono-crt text-[14px] text-[var(--muted)] truncate">{task.description}</div>
                            <div className="font-pixel text-[9px] tracking-widest text-[var(--muted-2)] mt-1">
                              {task.reward_lp} LP · {task.completion_count || 0} DONE · {task.started_count || 0} STARTED
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button type="button" onClick={() => editTask(task)} className="btn-ghost-ll flex items-center justify-center gap-2 px-3">
                            <Edit3 size={14} /> EDIT
                          </button>
                          <button type="button" onClick={() => toggleTask(task)} className="btn-ghost-ll flex items-center justify-center gap-2 px-3">
                            {task.is_active ? <X size={14} /> : <CheckCircle2 size={14} />} {task.is_active ? "PAUSE" : "LIVE"}
                          </button>
                          <button type="button" onClick={() => deleteTask(task)} className="btn-ghost-ll flex items-center justify-center gap-2 px-3 text-[var(--red)]">
                            <Trash2 size={14} /> DELETE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={submitTask} className="card-ll p-5 h-fit">
                  <SectionTitle icon={Plus} title={editingTaskId ? "EDIT TASK" : "ADD TASK"} meta={editingTaskId || "NEW MISSION"} />
                  <div className="space-y-4">
                    <div>
                      <label className="label-ll block mb-2">TASK ID</label>
                      <input value={taskForm.id} onChange={taskField("id")} disabled={Boolean(editingTaskId)} className="input-ll disabled:opacity-60" placeholder="auto-from-title" />
                    </div>
                    <div>
                      <label className="label-ll block mb-2">TITLE</label>
                      <input value={taskForm.title} onChange={taskField("title")} className="input-ll" required />
                    </div>
                    <div>
                      <label className="label-ll block mb-2">DESCRIPTION</label>
                      <textarea value={taskForm.description} onChange={taskField("description")} className="input-ll min-h-[88px] resize-y" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-ll block mb-2">PLATFORM</label>
                        <select value={taskForm.platform} onChange={taskField("platform")} className="input-ll">
                          <option value="LASTLAP">LASTLAP</option>
                          <option value="CHECKIN">CHECKIN</option>
                          <option value="X">X</option>
                          <option value="DISCORD">DISCORD</option>
                          <option value="WALLET">WALLET</option>
                          <option value="EMAIL">EMAIL</option>
                          <option value="PROFILE">PROFILE</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-ll block mb-2">CADENCE</label>
                        <select value={taskForm.cadence} onChange={taskField("cadence")} className="input-ll">
                          <option value="once">ONCE</option>
                          <option value="daily">DAILY</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-ll block mb-2">ICON</label>
                        <select value={taskForm.icon || ""} onChange={taskField("icon")} className="input-ll">
                          {TASK_ICON_OPTIONS.map((option) => (
                            <option key={option.value || "auto"} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-ll block mb-2">LP</label>
                        <input type="number" min="0" value={taskForm.reward_lp} onChange={taskField("reward_lp")} className="input-ll" />
                      </div>
                      <div>
                        <label className="label-ll block mb-2">ORDER</label>
                        <input type="number" min="0" value={taskForm.order} onChange={taskField("order")} className="input-ll" />
                      </div>
                    </div>
                    <div>
                      <label className="label-ll block mb-2">EXTERNAL URL</label>
                      <input value={taskForm.external_url} onChange={taskField("external_url")} className="input-ll" />
                    </div>
                    <div className="border border-[var(--border)] rounded-lg p-3 space-y-3">
                      <div className="label-ll">X VERIFICATION</div>
                      <div>
                        <label className="label-ll block mb-2">TYPE</label>
                        <select value={taskForm.verification_type || ""} onChange={taskField("verification_type")} className="input-ll">
                          <option value="">NONE</option>
                          <option value="profile_update">PROFILE UPDATE</option>
                          <option value="x_follow">FOLLOW ACCOUNT</option>
                          <option value="x_post">POST SEARCH QUERY</option>
                          <option value="x_retweet">REPOST TWEET</option>
                          <option value="x_like">LIKE TWEET</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-ll block mb-2">TARGET</label>
                        <input
                          value={taskForm.verification_target || ""}
                          onChange={taskField("verification_target")}
                          className="input-ll"
                          placeholder="@account or tweet URL"
                        />
                      </div>
                      {taskForm.verification_type === "x_post" && (
                        <div>
                          <label className="label-ll block mb-2">SEARCH QUERY</label>
                          <textarea
                            value={taskForm.verification_query || ""}
                            onChange={taskField("verification_query")}
                            className="input-ll min-h-[76px] resize-y"
                            placeholder="@lastlapdotfun OR #LastLap"
                          />
                        </div>
                      )}
                    </div>
                    <label className="flex items-center gap-3 border border-[var(--border)] rounded px-3 py-3">
                      <input type="checkbox" checked={Boolean(taskForm.is_active)} onChange={taskField("is_active")} className="w-4 h-4 accent-[var(--purple)]" />
                      <span className="font-pixel text-[10px] tracking-widest text-white">ACTIVE TASK</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button type="submit" disabled={savingTask} className="btn-primary-ll w-full flex items-center justify-center gap-2">
                        <Save size={14} /> {savingTask ? "SAVING..." : "SAVE TASK"}
                      </button>
                      <button type="button" onClick={resetTaskForm} className="btn-ghost-ll w-full flex items-center justify-center gap-2">
                        <X size={14} /> CLEAR
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            )}

            {activeTab === "users" && (
              <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5" data-testid="admin-users">
                <div className="card-ll p-5">
                  <SectionTitle icon={Users} title="RIDER CRM" meta={`${userTotal} MATCHING RIDERS`} />
                  <form onSubmit={searchUsers} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input value={query} onChange={(e) => setQuery(e.target.value)} className="input-ll pl-9" placeholder="Search riders" />
                    </div>
                    <button type="submit" className="btn-primary-ll flex items-center justify-center gap-2">
                      <Search size={14} /> SEARCH
                    </button>
                  </form>
                  <div className="space-y-2">
                    {users.map((rider) => (
                      <button
                        key={rider.id}
                        type="button"
                        onClick={() => setSelectedUser(rider)}
                        className={`w-full border rounded-lg p-3 flex items-center gap-3 text-left transition ${
                          selectedUser?.id === rider.id ? "border-[var(--purple)] bg-[var(--purple)]/10" : "border-[var(--border)] hover:border-[var(--purple)]"
                        }`}
                      >
                        <RacerAvatar user={rider} username={rider.username} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="font-pixel text-[12px] tracking-widest text-white truncate">@{rider.username}</div>
                          <div className="font-pixel text-[8px] tracking-widest text-[var(--muted)] truncate">{rider.email || "WALLET ACCOUNT"}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-pixel text-[11px] tracking-widest text-[var(--purple-bright)]">{(rider.lap_points || 0).toLocaleString()} LP</div>
                          {rider.is_admin && <div className="font-pixel text-[8px] tracking-widest text-[var(--amber)]">ADMIN</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card-ll p-5 h-fit">
                  <SectionTitle icon={UserCog} title="RIDER EDITOR" meta={selectedUser ? `@${selectedUser.username}` : "SELECT RIDER"} />
                  {selectedUser ? (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 border border-[var(--border)] rounded-lg p-3">
                        <RacerAvatar user={selectedUser} username={selectedUser.username} size="md" />
                        <div className="min-w-0">
                          <div className="font-pixel text-[12px] tracking-widest text-white truncate">@{selectedUser.username}</div>
                          <div className="font-pixel text-[9px] tracking-widest text-[var(--muted)] truncate">{selectedUser.title || "ROOKIE RACER"}</div>
                        </div>
                      </div>

                      <form onSubmit={saveUser} className="space-y-4">
                        <div>
                          <label className="label-ll block mb-2">ROLE</label>
                          <input value={userForm.role || ""} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))} className="input-ll" />
                        </div>
                        <div>
                          <label className="label-ll block mb-2">TITLE</label>
                          <input value={userForm.title || ""} onChange={(e) => setUserForm((p) => ({ ...p, title: e.target.value }))} className="input-ll" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="label-ll block mb-2">LP</label>
                            <input type="number" min="0" value={userForm.lap_points ?? 0} onChange={(e) => setUserForm((p) => ({ ...p, lap_points: e.target.value }))} className="input-ll" />
                          </div>
                          <div>
                            <label className="label-ll block mb-2">TASKS</label>
                            <input type="number" min="0" value={userForm.tasks_completed ?? 0} onChange={(e) => setUserForm((p) => ({ ...p, tasks_completed: e.target.value }))} className="input-ll" />
                          </div>
                          <div>
                            <label className="label-ll block mb-2">STREAK</label>
                            <input type="number" min="0" value={userForm.daily_streak ?? 0} onChange={(e) => setUserForm((p) => ({ ...p, daily_streak: e.target.value }))} className="input-ll" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 border border-[var(--border)] rounded px-3 py-3">
                            <input type="checkbox" checked={Boolean(userForm.is_admin)} onChange={(e) => setUserForm((p) => ({ ...p, is_admin: e.target.checked }))} className="w-4 h-4 accent-[var(--purple)]" />
                            <span className="font-pixel text-[10px] tracking-widest text-white">ADMIN</span>
                          </label>
                          <label className="flex items-center gap-3 border border-[var(--border)] rounded px-3 py-3">
                            <input type="checkbox" checked={Boolean(userForm.email_verified)} onChange={(e) => setUserForm((p) => ({ ...p, email_verified: e.target.checked }))} className="w-4 h-4 accent-[var(--purple)]" />
                            <span className="font-pixel text-[10px] tracking-widest text-white">VERIFIED</span>
                          </label>
                        </div>
                        <button type="submit" disabled={savingUser} className="btn-primary-ll w-full flex items-center justify-center gap-2">
                          <Save size={14} /> {savingUser ? "SAVING..." : "SAVE RIDER"}
                        </button>
                      </form>

                      <form onSubmit={adjustPoints} className="border border-[var(--border)] rounded-lg p-3 space-y-3">
                        <div className="font-pixel text-[10px] tracking-widest text-white flex items-center gap-2">
                          <Coins size={14} className="text-[var(--amber)]" /> POINT ADJUSTMENT
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <input type="number" value={pointForm.delta} onChange={(e) => setPointForm((p) => ({ ...p, delta: e.target.value }))} className="input-ll" />
                          <input value={pointForm.reason} onChange={(e) => setPointForm((p) => ({ ...p, reason: e.target.value }))} className="input-ll" placeholder="Reason" />
                        </div>
                        <button type="submit" disabled={savingUser} className="btn-ghost-ll w-full flex items-center justify-center gap-2">
                          <Coins size={14} /> APPLY POINTS
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="border border-[var(--border)] rounded-lg p-6 text-center font-pixel text-[10px] tracking-widest text-[var(--muted)]">
                      SELECT A RIDER
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
