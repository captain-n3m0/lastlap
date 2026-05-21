from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# --- Config ---
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24 * 7  # 7 days for SPA convenience

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="LastLap API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- Helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])


def gen_referral_code() -> str:
    return "LAST-" + "".join(random.choices(string.digits, k=4))


def sanitize_user(user: dict) -> dict:
    if not user:
        return user
    user = dict(user)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


async def get_current_user(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("password_hash", None)
    return user


# --- Models ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=20)
    referral_code: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class TaskOut(BaseModel):
    id: str
    title: str
    description: str
    platform: str
    reward_lp: int
    status: str  # "available" | "started" | "completed"


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    lap_points: int
    tasks_completed: int
    daily_streak: int
    avatar_color: str
    is_you: bool = False


# --- Auth Endpoints ---
@api_router.post("/auth/register", response_model=TokenOut)
async def register(data: RegisterIn):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": data.username.lower()}):
        raise HTTPException(status_code=400, detail="Username already taken")

    referred_by = None
    if data.referral_code:
        ref_owner = await db.users.find_one({"referral_code": data.referral_code.upper()})
        if ref_owner:
            referred_by = ref_owner["id"]

    # Ensure unique referral code
    while True:
        code = gen_referral_code()
        if not await db.users.find_one({"referral_code": code}):
            break

    user_id = str(uuid.uuid4())
    avatar_colors = ["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
    user = {
        "id": user_id,
        "email": email,
        "username": data.username.lower(),
        "password_hash": hash_password(data.password),
        "display_name": data.username,
        "role": "ROOKIE RIDER",
        "title": "ROOKIE RACER",
        "lap_points": 0,
        "tasks_completed": 0,
        "daily_streak": 0,
        "referral_code": code,
        "referred_by": referred_by,
        "avatar_color": random.choice(avatar_colors),
        "joined_on": datetime.now(timezone.utc).isoformat(),
        "last_active": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)

    # If referred, give the referrer LP
    if referred_by:
        await db.users.update_one({"id": referred_by}, {"$inc": {"lap_points": 50}})
        await db.referrals.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": referred_by,
            "invitee_id": user_id,
            "invitee_username": data.username.lower(),
            "status": "verified",
            "lp_earned": 50,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    token = create_token(user_id, email)
    return TokenOut(access_token=token, user=sanitize_user(user))


@api_router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"])
    return TokenOut(access_token=token, user=sanitize_user(user))


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


@api_router.post("/auth/logout")
async def logout():
    return {"ok": True}


# --- Wallet Auth (SIWE-style for EVM) ---
from eth_account.messages import encode_defunct
from eth_account import Account


class WalletNonceIn(BaseModel):
    address: str = Field(min_length=42, max_length=42)


class WalletVerifyIn(BaseModel):
    message: str
    signature: str
    address: str
    chain_id: int = 1


def _normalize_addr(addr: str) -> str:
    a = addr.strip().lower()
    if not a.startswith("0x") or len(a) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    return a


def _recover_signer(message: str, signature: str) -> str:
    try:
        signable = encode_defunct(text=message)
        recovered = Account.recover_message(signable, signature=signature)
        return recovered.lower()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid signature")


@api_router.post("/auth/wallet/nonce")
async def wallet_nonce(data: WalletNonceIn):
    address = _normalize_addr(data.address)
    nonce = uuid.uuid4().hex[:16]
    await db.wallet_nonces.insert_one({
        "address": address,
        "nonce": nonce,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"nonce": nonce, "address": address}


@api_router.post("/auth/wallet/verify", response_model=TokenOut)
async def wallet_verify(data: WalletVerifyIn):
    address = _normalize_addr(data.address)
    # Recover signer
    recovered = _recover_signer(data.message, data.signature)
    if recovered != address:
        raise HTTPException(status_code=401, detail="Signature does not match address")

    # Extract nonce from message (line "Nonce: <nonce>")
    nonce_val = None
    for line in data.message.splitlines():
        if line.lower().startswith("nonce:"):
            nonce_val = line.split(":", 1)[1].strip()
            break
    if not nonce_val:
        raise HTTPException(status_code=400, detail="Nonce missing in message")

    # Check nonce exists & is unused
    nonce_doc = await db.wallet_nonces.find_one({"address": address, "nonce": nonce_val, "used": False})
    if not nonce_doc:
        raise HTTPException(status_code=400, detail="Invalid or used nonce")
    await db.wallet_nonces.update_one(
        {"_id": nonce_doc["_id"]},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Find or create user
    user = await db.users.find_one({"wallet_address": address}, {"_id": 0})
    if not user:
        # Create wallet-only user
        avatar_colors = ["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
        while True:
            code = gen_referral_code()
            if not await db.users.find_one({"referral_code": code}):
                break
        # Generate a username from address (must be unique)
        base_username = f"rider_{address[2:8]}"
        username = base_username
        i = 0
        while await db.users.find_one({"username": username}):
            i += 1
            username = f"{base_username}_{i}"
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": None,
            "username": username,
            "password_hash": None,
            "display_name": username,
            "role": "ROOKIE RIDER",
            "title": "ROOKIE RACER",
            "lap_points": 0,
            "tasks_completed": 0,
            "daily_streak": 0,
            "referral_code": code,
            "referred_by": None,
            "avatar_color": random.choice(avatar_colors),
            "wallet_address": address,
            "wallet_chain_id": data.chain_id,
            "joined_on": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)

    token = create_token(user["id"], user.get("email") or address)
    return TokenOut(access_token=token, user=sanitize_user(user))


@api_router.post("/auth/wallet/link")
async def wallet_link(data: WalletVerifyIn, current=Depends(get_current_user)):
    """Link a wallet to the currently logged-in (email) user."""
    address = _normalize_addr(data.address)
    recovered = _recover_signer(data.message, data.signature)
    if recovered != address:
        raise HTTPException(status_code=401, detail="Signature does not match address")

    # Nonce check
    nonce_val = None
    for line in data.message.splitlines():
        if line.lower().startswith("nonce:"):
            nonce_val = line.split(":", 1)[1].strip()
            break
    if not nonce_val:
        raise HTTPException(status_code=400, detail="Nonce missing")
    nonce_doc = await db.wallet_nonces.find_one({"address": address, "nonce": nonce_val, "used": False})
    if not nonce_doc:
        raise HTTPException(status_code=400, detail="Invalid or used nonce")
    await db.wallet_nonces.update_one(
        {"_id": nonce_doc["_id"]},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Check wallet is not already linked to another user
    existing = await db.users.find_one({"wallet_address": address})
    if existing and existing["id"] != current["id"]:
        raise HTTPException(status_code=400, detail="Wallet already linked to another account")

    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"wallet_address": address, "wallet_chain_id": data.chain_id}},
    )
    # Reward 250 LP for completing the "Connect Wallet" task — only first time
    if not current.get("wallet_address"):
        await db.users.update_one({"id": current["id"]}, {"$inc": {"lap_points": 250}})

    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": sanitize_user(user), "reward_lp": 250 if not current.get("wallet_address") else 0}


@api_router.post("/auth/wallet/unlink")
async def wallet_unlink(current=Depends(get_current_user)):
    """Unlink wallet from the current user. Refuses if user has no email/password (would be locked out)."""
    if not current.get("email") or not current.get("password_hash"):
        raise HTTPException(status_code=400, detail="Cannot unlink wallet from a wallet-only account")
    await db.users.update_one({"id": current["id"]}, {"$unset": {"wallet_address": "", "wallet_chain_id": ""}})
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": sanitize_user(user)}


# --- Tasks ---
@api_router.get("/tasks")
async def list_tasks(current=Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    user_tasks = await db.user_tasks.find({"user_id": current["id"]}, {"_id": 0}).to_list(500)
    status_map = {ut["task_id"]: ut["status"] for ut in user_tasks}
    out = []
    for t in tasks:
        out.append({
            **t,
            "status": status_map.get(t["id"], "available"),
        })
    return out


@api_router.post("/tasks/{task_id}/start")
async def start_task(task_id: str, current=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = await db.user_tasks.find_one({"user_id": current["id"], "task_id": task_id})
    if existing:
        if existing["status"] == "completed":
            raise HTTPException(status_code=400, detail="Task already completed")
        return {"status": existing["status"], "task_id": task_id}
    await db.user_tasks.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "task_id": task_id,
        "status": "started",
        "started_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "started", "task_id": task_id, "external_url": task.get("external_url", "#")}


@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = await db.user_tasks.find_one({"user_id": current["id"], "task_id": task_id})
    if existing and existing["status"] == "completed":
        raise HTTPException(status_code=400, detail="Task already completed")
    reward = int(task.get("reward_lp", 100))
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.user_tasks.update_one(
            {"user_id": current["id"], "task_id": task_id},
            {"$set": {"status": "completed", "completed_at": now}},
        )
    else:
        await db.user_tasks.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current["id"],
            "task_id": task_id,
            "status": "completed",
            "started_at": now,
            "completed_at": now,
        })
    await db.users.update_one(
        {"id": current["id"]},
        {"$inc": {"lap_points": reward, "tasks_completed": 1}},
    )
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "reward_lp": reward, "user": sanitize_user(user)}


# --- Leaderboard ---
@api_router.get("/leaderboard")
async def leaderboard(limit: int = 10, current=Depends(get_current_user)):
    users = await db.users.find(
        {}, {"_id": 0, "password_hash": 0, "email": 0}
    ).sort("lap_points", -1).to_list(1000)
    out = []
    your_rank = None
    your_entry = None
    for idx, u in enumerate(users):
        entry = {
            "rank": idx + 1,
            "username": u.get("username", "racer"),
            "lap_points": u.get("lap_points", 0),
            "tasks_completed": u.get("tasks_completed", 0),
            "daily_streak": u.get("daily_streak", 0),
            "avatar_color": u.get("avatar_color", "#8B5CF6"),
            "title": u.get("title", "ROOKIE RACER"),
            "is_you": u["id"] == current["id"],
        }
        if u["id"] == current["id"]:
            your_rank = idx + 1
            your_entry = entry
        if idx < limit:
            out.append(entry)
    return {
        "top": out,
        "you": your_entry,
        "your_rank": your_rank,
        "total_racers": len(users),
    }


# --- Stats ---
@api_router.get("/users/me/stats")
async def my_stats(current=Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "id": 1, "lap_points": 1}).sort("lap_points", -1).to_list(1000)
    rank = next((i + 1 for i, u in enumerate(users) if u["id"] == current["id"]), len(users))
    total = len(users) or 1
    top_pct = max(1, int((rank / total) * 100))
    referrals_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "verified"})
    pending_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "pending"})
    total_earned = await db.referrals.aggregate([
        {"$match": {"owner_id": current["id"], "status": "verified"}},
        {"$group": {"_id": None, "total": {"$sum": "$lp_earned"}}},
    ]).to_list(1)
    return {
        "tasks_completed": current.get("tasks_completed", 0),
        "tasks_goal": 50,
        "lap_points": current.get("lap_points", 0),
        "current_rank": rank,
        "top_percentile": top_pct,
        "daily_streak": current.get("daily_streak", 0),
        "joined_on": current.get("joined_on"),
        "referrals_count": referrals_count,
        "pending_count": pending_count,
        "total_earned_from_refs": (total_earned[0]["total"] if total_earned else 0),
    }


# --- Referrals ---
@api_router.get("/referrals/me")
async def my_referrals(current=Depends(get_current_user)):
    code = current.get("referral_code") or gen_referral_code()
    base_url = os.environ.get("FRONTEND_PUBLIC_URL", "https://lastlap.app")
    link = f"{base_url}/register?ref={code}"
    referrals_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "verified"})
    pending_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "pending"})
    total_earned = await db.referrals.aggregate([
        {"$match": {"owner_id": current["id"], "status": "verified"}},
        {"$group": {"_id": None, "total": {"$sum": "$lp_earned"}}},
    ]).to_list(1)
    return {
        "referral_code": code,
        "referral_link": link,
        "crew_invites": referrals_count,
        "pending_invites": pending_count,
        "total_earned": (total_earned[0]["total"] if total_earned else 0),
    }


# --- Timer ---
@api_router.get("/tasks/reset-timer")
async def reset_timer():
    """Seconds until next UTC midnight (daily reset)."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    seconds = int((tomorrow - now).total_seconds())
    return {"seconds": seconds}


# --- Health ---
@api_router.get("/")
async def root():
    return {"app": "LastLap", "ok": True}


# --- Seeding ---
DEMO_TASKS = [
    {"title": "Follow LastLap on X", "description": "Stay updated, lead the race", "platform": "X", "reward_lp": 100, "external_url": "https://x.com/intent/follow?screen_name=lastlap"},
    {"title": "Repost the Launch Tweet", "description": "Spread the word, fuel the hype", "platform": "X", "reward_lp": 150, "external_url": "https://x.com"},
    {"title": "Join the Discord Server", "description": "Meet the crew, talk shop", "platform": "DISCORD", "reward_lp": 200, "external_url": "https://discord.com"},
    {"title": "Connect Your Wallet", "description": "Gear up for on-chain rewards", "platform": "WALLET", "reward_lp": 250, "external_url": "#"},
    {"title": "Refer a Rider", "description": "Bring a friend, climb together", "platform": "REFERRAL", "reward_lp": 300, "external_url": "#"},
    {"title": "Complete Your Profile", "description": "Tell the grid who you are", "platform": "PROFILE", "reward_lp": 100, "external_url": "#"},
    {"title": "Tag 3 Friends in Comments", "description": "Loud and proud, on the timeline", "platform": "X", "reward_lp": 150, "external_url": "https://x.com"},
    {"title": "Subscribe to Newsletter", "description": "Pit-lane updates direct to inbox", "platform": "EMAIL", "reward_lp": 100, "external_url": "#"},
]

FAKE_RACERS = [
    ("rider_alpha", 112832, 45, 89, "#EF4444"),
    ("nitro_queen", 98450, 42, 67, "#EC4899"),
    ("turbo_lord", 87120, 39, 54, "#F59E0B"),
    ("shadowlap", 76340, 36, 48, "#8B5CF6"),
    ("apex_hunter", 65890, 33, 41, "#3B82F6"),
    ("ghost_drift", 58220, 30, 38, "#10B981"),
    ("nova_blaze", 49870, 28, 32, "#EF4444"),
    ("ironwheel", 43120, 25, 28, "#F59E0B"),
    ("crimson_v8", 38450, 23, 25, "#EC4899"),
    ("redline_x", 32890, 21, 22, "#8B5CF6"),
    ("road_warden", 28760, 19, 20, "#3B82F6"),
    ("steel_paws", 24320, 17, 18, "#10B981"),
    ("blackmoon", 21850, 15, 16, "#EF4444"),
    ("dust_demon", 18920, 13, 14, "#F59E0B"),
    ("vortex_kid", 16480, 12, 13, "#EC4899"),
    ("lap_ninja", 14250, 11, 12, "#8B5CF6"),
    ("octane_jr", 12100, 10, 11, "#3B82F6"),
    ("fuel_witch", 10550, 9, 10, "#10B981"),
    ("smoke_signal", 8970, 8, 9, "#EF4444"),
    ("piston_pat", 7820, 7, 8, "#F59E0B"),
    ("midnite_rip", 6650, 6, 7, "#EC4899"),
    ("ash_runner", 5490, 5, 6, "#8B5CF6"),
    ("grid_grit", 4320, 4, 5, "#3B82F6"),
    ("late_brake", 3450, 3, 4, "#10B981"),
    ("first_corner", 2890, 2, 3, "#EF4444"),
]


async def seed():
    # Tasks
    if await db.tasks.count_documents({}) == 0:
        for i, t in enumerate(DEMO_TASKS):
            await db.tasks.insert_one({
                "id": str(uuid.uuid4()),
                "order": i,
                "is_active": True,
                **t,
            })
        logger.info("Seeded %d tasks", len(DEMO_TASKS))

    # Indexes
    # Indexes (sparse for nullable fields like email & wallet_address)
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("referral_code", unique=True)
    await db.users.create_index("wallet_address", unique=True, sparse=True)
    await db.tasks.create_index("id", unique=True)
    await db.user_tasks.create_index([("user_id", 1), ("task_id", 1)], unique=True)
    await db.wallet_nonces.create_index("nonce")

    # Demo user (riderghost)
    demo_email = os.environ.get("DEMO_EMAIL", "riderghost@lastlap.com")
    demo_pw = os.environ.get("DEMO_PASSWORD", "Demo2025!")
    existing_demo = await db.users.find_one({"email": demo_email})
    if not existing_demo:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": demo_email,
            "username": "riderghost",
            "password_hash": hash_password(demo_pw),
            "display_name": "riderghost",
            "role": "ROOKIE RIDER",
            "title": "ROOKIE RACER",
            "lap_points": 2450,
            "tasks_completed": 18,
            "daily_streak": 4,
            "referral_code": "LAST-8842",
            "referred_by": None,
            "avatar_color": "#EF4444",
            "joined_on": datetime(2024, 5, 14, tzinfo=timezone.utc).isoformat(),
        })
        logger.info("Seeded demo user %s", demo_email)
    else:
        # Ensure password matches if env changed
        if not verify_password(demo_pw, existing_demo["password_hash"]):
            await db.users.update_one({"email": demo_email}, {"$set": {"password_hash": hash_password(demo_pw)}})

    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lastlap.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "LastLap2025!")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        while True:
            code = gen_referral_code()
            if not await db.users.find_one({"referral_code": code}):
                break
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "username": "admin",
            "password_hash": hash_password(admin_pw),
            "display_name": "Admin",
            "role": "PIT BOSS",
            "title": "TRACK MARSHAL",
            "lap_points": 0,
            "tasks_completed": 0,
            "daily_streak": 0,
            "referral_code": code,
            "referred_by": None,
            "avatar_color": "#8B5CF6",
            "joined_on": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_pw, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Fake racers (only seed once)
    if await db.users.count_documents({}) < 10:
        for name, lp, tasks_done, streak, color in FAKE_RACERS:
            while True:
                code = gen_referral_code()
                if not await db.users.find_one({"referral_code": code}):
                    break
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": f"{name}@bots.lastlap.com",
                "username": name,
                "password_hash": hash_password(uuid.uuid4().hex),
                "display_name": name,
                "role": "PRO RIDER" if lp > 50000 else ("VETERAN" if lp > 10000 else "ROOKIE RIDER"),
                "title": "GHOST FLEET" if lp > 50000 else "ROOKIE RACER",
                "lap_points": lp,
                "tasks_completed": tasks_done,
                "daily_streak": streak,
                "referral_code": code,
                "referred_by": None,
                "avatar_color": color,
                "joined_on": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).isoformat(),
                "is_bot": True,
            })
        logger.info("Seeded %d fake racers", len(FAKE_RACERS))


@app.on_event("startup")
async def on_startup():
    await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
