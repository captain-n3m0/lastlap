"""LastLap backend API tests covering auth, tasks, leaderboard, stats, referrals, reset-timer."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pit-stop-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "riderghost@lastlap.com"
DEMO_PASS = "Demo2025!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=30)
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# --- Health ---
def test_health(session):
    r = session.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# --- Auth ---
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 20
        assert data["user"]["email"] == DEMO_EMAIL
        assert data["user"]["username"] == "riderghost"
        assert data["user"]["referral_code"] == "LAST-8842"
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_bearer(self, session, demo_headers):
        r = session.get(f"{API}/auth/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == DEMO_EMAIL
        assert "password_hash" not in d

    def test_me_no_token(self, session):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_new_user(self, session):
        suffix = uuid.uuid4().hex[:8]
        email = f"test_{suffix}@lastlap.com"
        username = f"test_{suffix}"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "Test1234!", "username": username
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        assert data["user"]["referral_code"].startswith("LAST-")
        assert "access_token" in data

    def test_register_duplicate_email(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": DEMO_EMAIL, "password": "Test1234!", "username": f"u{uuid.uuid4().hex[:6]}"
        }, timeout=15)
        assert r.status_code == 400

    def test_register_with_referral_awards_referrer(self, session, demo_headers):
        stats_before = session.get(f"{API}/users/me/stats", headers=demo_headers, timeout=15).json()
        lp_before = stats_before["lap_points"]
        suffix = uuid.uuid4().hex[:8]
        r = session.post(f"{API}/auth/register", json={
            "email": f"ref_{suffix}@lastlap.com",
            "password": "Test1234!",
            "username": f"ref_{suffix}",
            "referral_code": "LAST-8842",
        }, timeout=20)
        assert r.status_code == 200
        stats_after = session.get(f"{API}/users/me/stats", headers=demo_headers, timeout=15).json()
        assert stats_after["lap_points"] == lp_before + 50, "Referrer should gain 50 LP"


# --- Tasks ---
class TestTasks:
    def test_list_tasks(self, session, demo_headers):
        r = session.get(f"{API}/tasks", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list) and len(tasks) == 8
        t0 = tasks[0]
        for k in ("id", "title", "description", "platform", "reward_lp", "status"):
            assert k in t0
        assert t0["status"] in ("available", "started", "completed")

    def test_reset_timer(self, session, demo_headers):
        r = session.get(f"{API}/tasks/reset-timer", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        secs = r.json()["seconds"]
        assert isinstance(secs, int) and 0 < secs <= 86400

    def test_start_and_complete_increments_lp(self, session):
        # Create a fresh user so we have at least one untouched task
        suffix = uuid.uuid4().hex[:8]
        reg = session.post(f"{API}/auth/register", json={
            "email": f"task_{suffix}@lastlap.com",
            "password": "Test1234!",
            "username": f"task_{suffix}",
        }, timeout=20)
        assert reg.status_code == 200
        token = reg.json()["access_token"]
        hdr = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        tasks = session.get(f"{API}/tasks", headers=hdr, timeout=15).json()
        available = [t for t in tasks if t["status"] == "available"]
        assert available, "Should have available tasks"
        task = available[0]
        tid = task["id"]
        reward = task["reward_lp"]

        # initial stats
        s0 = session.get(f"{API}/users/me/stats", headers=hdr, timeout=15).json()
        lp0, tc0 = s0["lap_points"], s0["tasks_completed"]

        # start
        rs = session.post(f"{API}/tasks/{tid}/start", headers=hdr, timeout=15)
        assert rs.status_code == 200
        assert rs.json()["status"] == "started"

        # complete
        rc = session.post(f"{API}/tasks/{tid}/complete", headers=hdr, timeout=15)
        assert rc.status_code == 200
        body = rc.json()
        assert body["reward_lp"] == reward
        assert body["user"]["lap_points"] == lp0 + reward
        assert body["user"]["tasks_completed"] == tc0 + 1

        # double-complete blocked
        rc2 = session.post(f"{API}/tasks/{tid}/complete", headers=hdr, timeout=15)
        assert rc2.status_code == 400

        # GET to verify persistence
        tasks_after = session.get(f"{API}/tasks", headers=hdr, timeout=15).json()
        t_after = next(t for t in tasks_after if t["id"] == tid)
        assert t_after["status"] == "completed"

    def test_start_invalid_task(self, session, demo_headers):
        r = session.post(f"{API}/tasks/does-not-exist/start", headers=demo_headers, timeout=15)
        assert r.status_code == 404


# --- Leaderboard ---
class TestLeaderboard:
    def test_leaderboard(self, session, demo_headers):
        r = session.get(f"{API}/leaderboard?limit=10", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "top" in d and "you" in d and "your_rank" in d
        assert len(d["top"]) <= 10
        # sorted desc by lap_points
        lps = [e["lap_points"] for e in d["top"]]
        assert lps == sorted(lps, reverse=True)
        # 25 fake racers + at least demo + admin
        assert d["total_racers"] >= 26
        assert d["you"]["username"] == "riderghost"
        assert d["your_rank"] == d["you"]["rank"]


# --- Stats ---
class TestStats:
    def test_stats_shape(self, session, demo_headers):
        r = session.get(f"{API}/users/me/stats", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("tasks_completed", "lap_points", "current_rank", "top_percentile", "daily_streak", "joined_on", "referrals_count"):
            assert k in d
        assert isinstance(d["current_rank"], int) and d["current_rank"] >= 1
        assert 1 <= d["top_percentile"] <= 100


# --- Referrals ---
class TestReferrals:
    def test_referrals_me(self, session, demo_headers):
        r = session.get(f"{API}/referrals/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["referral_code"] == "LAST-8842"
        assert "register?ref=LAST-8842" in d["referral_link"]
        for k in ("crew_invites", "pending_invites", "total_earned"):
            assert k in d and isinstance(d[k], int)
