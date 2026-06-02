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
from typing import List, Optional, Union

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# --- Config ---
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24 * 7  # 7 days for SPA convenience

OTP_ENABLED = os.environ.get("OTP_ENABLED", "true").lower() == "true"
OTP_TTL_MINUTES = int(os.environ.get("OTP_TTL_MINUTES", "10"))
OTP_RESEND_SECONDS = int(os.environ.get("OTP_RESEND_SECONDS", "60"))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "no-reply@lastlap.com")
OTP_DEBUG = os.environ.get("OTP_DEBUG", "").lower() == "true" or not RESEND_API_KEY

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
    user.pop("otp_hash", None)
    user.pop("otp_expires_at", None)
    user.pop("otp_attempts", None)
    user.pop("otp_last_sent_at", None)
    user.pop("otp_debug_code", None)
    return user


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _otp_resend_after(last_sent: Optional[str]) -> int:
    last = _parse_dt(last_sent)
    if not last:
        return 0
    delta = (_utcnow() - last).total_seconds()
    if delta >= OTP_RESEND_SECONDS:
        return 0
    return int(max(0, OTP_RESEND_SECONDS - delta))


def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def _hash_otp(code: str) -> str:
    return bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_otp(code: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(code.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _send_otp_email(to_email: str, code: str) -> None:
    if not RESEND_API_KEY:
        if OTP_DEBUG:
            logger.warning("RESEND_API_KEY not set; OTP debug mode enabled")
            return
        raise HTTPException(status_code=500, detail="Email provider not configured")

    subject = "Your LastLap verification code"
    text = f"Your verification code is {code}. It expires in {OTP_TTL_MINUTES} minutes."
    html = f"<p>Your verification code is <strong>{code}</strong>.</p><p>It expires in {OTP_TTL_MINUTES} minutes.</p>"
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "text": text,
            "html": html,
        },
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("OTP email send failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to send OTP")


async def issue_otp(user: dict, force: bool = False) -> dict:
    if not user.get("email"):
        raise HTTPException(status_code=400, detail="Email required for OTP")

    resend_after = _otp_resend_after(user.get("otp_last_sent_at"))
    if resend_after > 0 and not force:
        return {
            "resend_after": resend_after,
            "debug_code": user.get("otp_debug_code") if OTP_DEBUG else None,
            "sent": False,
        }

    code = _generate_otp()
    now = _utcnow()
    expires_at = now + timedelta(minutes=OTP_TTL_MINUTES)
    update = {
        "otp_hash": _hash_otp(code),
        "otp_expires_at": expires_at.isoformat(),
        "otp_attempts": 0,
        "otp_last_sent_at": now.isoformat(),
    }
    if OTP_DEBUG:
        update["otp_debug_code"] = code

    update_doc = {"$set": update}
    if not OTP_DEBUG:
        update_doc["$unset"] = {"otp_debug_code": ""}
    await db.users.update_one({"id": user["id"]}, update_doc)
    _send_otp_email(user["email"], code)
    return {
        "resend_after": OTP_RESEND_SECONDS,
        "debug_code": code if OTP_DEBUG else None,
        "sent": True,
    }


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


class OtpRequestIn(BaseModel):
    email: EmailStr


class OtpVerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)


class OtpRequiredOut(BaseModel):
    otp_required: bool = True
    email: EmailStr
    resend_after: int = 0
    debug_code: Optional[str] = None


class ProfileUpdateIn(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20)
    display_name: Optional[str] = Field(None, min_length=2, max_length=32)
    avatar_color: Optional[str] = Field(None, regex=r"^#[0-9a-fA-F]{6}$")


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
@api_router.post("/auth/register", response_model=Union[TokenOut, OtpRequiredOut])
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
    now_iso = datetime.now(timezone.utc).isoformat()
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
        "joined_on": now_iso,
        "last_active": now_iso,
        "email_verified": False,
    }
    await db.users.insert_one(user)

    # If referred, defer the reward until OTP verification (when enabled)
    if referred_by:
        existing_ref = await db.referrals.find_one({"owner_id": referred_by, "invitee_id": user_id})
        if existing_ref is None:
            await db.referrals.insert_one({
                "id": str(uuid.uuid4()),
                "owner_id": referred_by,
                "invitee_id": user_id,
                "invitee_username": data.username.lower(),
                "status": "pending" if OTP_ENABLED else "verified",
                "lp_earned": 0 if OTP_ENABLED else 50,
                "created_at": now_iso,
                **({"verified_at": now_iso} if not OTP_ENABLED else {}),
            })
        if not OTP_ENABLED:
            await db.users.update_one({"id": referred_by}, {"$inc": {"lap_points": 50}})

    if not OTP_ENABLED:
        token = create_token(user_id, email)
        return TokenOut(access_token=token, user=sanitize_user(user))

    otp = await issue_otp(user)
    return OtpRequiredOut(
        otp_required=True,
        email=user["email"],
        resend_after=otp.get("resend_after", 0),
        debug_code=otp.get("debug_code"),
    )


@api_router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"])
    return TokenOut(access_token=token, user=sanitize_user(user))


@api_router.post("/auth/otp/request")
async def otp_request(data: OtpRequestIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user:
        return {"ok": True, "resend_after": 0}
    otp = await issue_otp(user, force=False)
    out = {"ok": True, "resend_after": otp.get("resend_after", 0)}
    if otp.get("debug_code"):
        out["debug_code"] = otp["debug_code"]
    return out


@api_router.post("/auth/otp/verify", response_model=TokenOut)
async def otp_verify(data: OtpVerifyIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    attempts = int(user.get("otp_attempts", 0))
    if attempts >= OTP_MAX_ATTEMPTS:
        await db.users.update_one(
            {"id": user["id"]},
            {"$unset": {"otp_hash": "", "otp_expires_at": "", "otp_attempts": "", "otp_last_sent_at": "", "otp_debug_code": ""}},
        )
        raise HTTPException(status_code=400, detail="OTP attempts exceeded")

    expires_at = _parse_dt(user.get("otp_expires_at"))
    if not expires_at or _utcnow() > expires_at:
        await db.users.update_one(
            {"id": user["id"]},
            {"$unset": {"otp_hash": "", "otp_expires_at": "", "otp_attempts": "", "otp_last_sent_at": "", "otp_debug_code": ""}},
        )
        raise HTTPException(status_code=400, detail="OTP expired")

    if not user.get("otp_hash") or not _verify_otp(data.code, user["otp_hash"]):
        await db.users.update_one({"id": user["id"]}, {"$inc": {"otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid verification code")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True}, "$unset": {"otp_hash": "", "otp_expires_at": "", "otp_attempts": "", "otp_last_sent_at": "", "otp_debug_code": ""}},
    )

    # Award referral credit on first successful verification
    referrer_id = user.get("referred_by")
    if referrer_id:
        now_iso = _utcnow().isoformat()
        existing_ref = await db.referrals.find_one({"owner_id": referrer_id, "invitee_id": user["id"]})
        if not existing_ref or existing_ref.get("status") != "verified":
            await db.users.update_one({"id": referrer_id}, {"$inc": {"lap_points": 50}})
            if existing_ref:
                await db.referrals.update_one(
                    {"_id": existing_ref["_id"]},
                    {"$set": {"status": "verified", "lp_earned": 50, "verified_at": now_iso}},
                )
            else:
                await db.referrals.insert_one({
                    "id": str(uuid.uuid4()),
                    "owner_id": referrer_id,
                    "invitee_id": user["id"],
                    "invitee_username": user.get("username"),
                    "status": "verified",
                    "lp_earned": 50,
                    "created_at": now_iso,
                    "verified_at": now_iso,
                })
    token = create_token(user["id"], user["email"])
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return TokenOut(access_token=token, user=sanitize_user(fresh))


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


@api_router.patch("/users/me")
async def update_profile(data: ProfileUpdateIn, current=Depends(get_current_user)):
    update = {}

    if data.username:
        new_username = data.username.lower()
        if new_username != current.get("username"):
            if await db.users.find_one({"username": new_username}):
                raise HTTPException(status_code=400, detail="Username already taken")
            update["username"] = new_username

    if data.display_name is not None:
        display_name = data.display_name.strip()
        if not display_name:
            raise HTTPException(status_code=400, detail="Display name is required")
        if display_name != current.get("display_name"):
            update["display_name"] = display_name

    if data.avatar_color:
        if data.avatar_color != current.get("avatar_color"):
            update["avatar_color"] = data.avatar_color

    if not update:
        return {"ok": True, "user": sanitize_user(current)}

    await db.users.update_one({"id": current["id"]}, {"$set": update})
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0})
    return {"ok": True, "user": sanitize_user(user)}


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
    user_filter = {"is_bot": {"$ne": True}}
    users = await db.users.find(
        user_filter, {"_id": 0, "password_hash": 0, "email": 0}
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


# --- Global Stats ---
@api_router.get("/stats/global")
async def global_stats():
    user_filter = {"is_bot": {"$ne": True}}
    total_riders = await db.users.count_documents(user_filter)
    totals = await db.users.aggregate([
        {"$match": user_filter},
        {"$group": {
            "_id": None,
            "lap_points": {"$sum": {"$ifNull": ["$lap_points", 0]}},
            "tasks_completed": {"$sum": {"$ifNull": ["$tasks_completed", 0]}},
        }},
    ]).to_list(1)
    totals = totals[0] if totals else {}
    active_racers = await db.users.count_documents({
        **user_filter,
        "tasks_completed": {"$gt": 0},
    })
    return {
        "total_riders": total_riders,
        "total_lp": totals.get("lap_points", 0),
        "total_tasks_completed": totals.get("tasks_completed", 0),
        "active_racers": active_racers,
    }


# --- Stats ---
@api_router.get("/users/me/stats")
async def my_stats(current=Depends(get_current_user)):
    user_filter = {"is_bot": {"$ne": True}}
    users = await db.users.find(user_filter, {"_id": 0, "id": 1, "lap_points": 1}).sort("lap_points", -1).to_list(1000)
    rank = next((i + 1 for i, u in enumerate(users) if u["id"] == current["id"]), len(users))
    total = len(users) or 1
    top_pct = max(1, int((rank / total) * 100))
    tasks_goal = await db.tasks.count_documents({"is_active": True})
    if tasks_goal == 0:
        tasks_goal = await db.tasks.count_documents({})
    referrals_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "verified"})
    pending_count = await db.referrals.count_documents({"owner_id": current["id"], "status": "pending"})
    total_earned = await db.referrals.aggregate([
        {"$match": {"owner_id": current["id"], "status": "verified"}},
        {"$group": {"_id": None, "total": {"$sum": "$lp_earned"}}},
    ]).to_list(1)
    return {
        "tasks_completed": current.get("tasks_completed", 0),
        "tasks_goal": tasks_goal,
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
async def seed():
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
