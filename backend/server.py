from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import random
import string
import re
import base64
import hashlib
import secrets
from urllib.parse import parse_qsl, urlencode, urlparse
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Union

import bcrypt
import jwt
import requests
from requests_oauthlib import OAuth1
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


def _env_first(*names: str, default: str = "") -> str:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return default


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
X_OAUTH_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize"
X_OAUTH_TOKEN_URL = "https://api.x.com/2/oauth2/token"
X_OAUTH_ME_URL = "https://api.x.com/2/users/me"
X_OAUTH1_REQUEST_TOKEN_URL = "https://api.x.com/oauth/request_token"
X_OAUTH1_AUTHORIZE_URL = "https://api.x.com/oauth/authenticate"
X_OAUTH1_ACCESS_TOKEN_URL = "https://api.x.com/oauth/access_token"
X_OAUTH1_VERIFY_CREDENTIALS_URL = "https://api.x.com/1.1/account/verify_credentials.json"
X_OAUTH_CLIENT_ID = _env_first("X_OAUTH_CLIENT_ID", "TWITTER_OAUTH_CLIENT_ID", "TWITTER_CLIENT_ID")
X_OAUTH_CLIENT_SECRET = _env_first("X_OAUTH_CLIENT_SECRET", "TWITTER_OAUTH_CLIENT_SECRET", "TWITTER_CLIENT_SECRET")
X_OAUTH_REDIRECT_URI = _env_first("X_OAUTH_REDIRECT_URI", "TWITTER_OAUTH_REDIRECT_URI", "TWITTER_REDIRECT_URI")
X_OAUTH_SCOPES = _env_first("X_OAUTH_SCOPES", "TWITTER_OAUTH_SCOPES", default="tweet.read users.read offline.access")
X_OAUTH_VERSION = _env_first("X_OAUTH_VERSION", "TWITTER_OAUTH_VERSION", default="auto").lower()
X_CONSUMER_KEY = _env_first("X_CONSUMER_KEY", "X_API_KEY", "TWITTER_CONSUMER_KEY", "TWITTER_API_KEY")
X_CONSUMER_SECRET = _env_first(
    "X_CONSUMER_SECRET",
    "X_API_SECRET",
    "X_API_KEY_SECRET",
    "TWITTER_CONSUMER_SECRET",
    "TWITTER_API_SECRET",
    "TWITTER_API_KEY_SECRET",
)
X_OAUTH_STATE_TTL_MINUTES = int(os.environ.get("X_OAUTH_STATE_TTL_MINUTES", "10"))
TWITTERAPI_IO_API_KEY = _env_first(
    "TWITTERAPI_IO_API_KEY",
    "TWITTERAPI_IO_KEY",
    "TWITTERAPIIO_API_KEY",
)
TWITTERAPI_IO_BASE_URL = os.environ.get("TWITTERAPI_IO_BASE_URL", "https://api.twitterapi.io").rstrip("/")
TWITTERAPI_IO_TIMEOUT = int(os.environ.get("TWITTERAPI_IO_TIMEOUT", "15"))
TWITTERAPI_IO_MAX_PAGES = int(os.environ.get("TWITTERAPI_IO_MAX_PAGES", "5"))

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="LastLap API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

AVATAR_COLORS = ["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
AVATAR_PRESETS = ["helmet", "bolt", "flag", "skull", "wheel", "initial"]
ADMIN_ROLES = {"PIT BOSS", "ADMIN", "SUPER ADMIN"}
DAILY_CHECKIN_TASK_ID = "daily-checkin"
DEFAULT_TASKS = [
    {
        "id": DAILY_CHECKIN_TASK_ID,
        "title": "Daily Check-In",
        "description": "Roll through the pit wall once a day.",
        "platform": "CHECKIN",
        "icon": "checkin",
        "reward_lp": 25,
        "external_url": "#",
        "order": 0,
        "is_active": True,
        "cadence": "daily",
    },
    {
        "id": "connect-wallet",
        "title": "Connect Wallet",
        "description": "Link your wallet to your rider profile.",
        "platform": "WALLET",
        "icon": "wallet",
        "reward_lp": 100,
        "external_url": "#",
        "order": 10,
        "is_active": True,
    },
    {
        "id": "join-discord",
        "title": "Join Discord",
        "description": "Join the LastLap Discord garage.",
        "platform": "DISCORD",
        "icon": "discord",
        "reward_lp": 75,
        "external_url": "https://discord.gg/NkbhjeNjdT",
        "order": 20,
        "is_active": True,
    },
    {
        "id": "follow-x",
        "title": "Follow LastLap on X",
        "description": "Follow the official LastLap account.",
        "platform": "X",
        "icon": "x",
        "reward_lp": 75,
        "external_url": "https://x.com/lastlapdotfun",
        "verification_type": "x_follow",
        "verification_target": "lastlapdotfun",
        "order": 30,
        "is_active": True,
    },
    {
        "id": "invite-crew",
        "title": "Invite Your Crew",
        "description": "Share your referral link with another rider.",
        "platform": "LASTLAP",
        "icon": "referral",
        "reward_lp": 100,
        "external_url": "#",
        "order": 40,
        "is_active": True,
    },
]


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
    user.pop("x_access_token", None)
    user.pop("x_access_token_secret", None)
    user.pop("x_refresh_token", None)
    user.pop("x_token_scope", None)
    user.pop("x_token_expires_at", None)
    user.pop("otp_hash", None)
    user.pop("otp_expires_at", None)
    user.pop("otp_attempts", None)
    user.pop("otp_last_sent_at", None)
    user.pop("otp_debug_code", None)
    return user


def _is_admin_user(user: Optional[dict]) -> bool:
    if not user:
        return False
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lastlap.com").lower()
    return bool(
        user.get("is_admin")
        or user.get("role") in ADMIN_ROLES
        or user.get("email", "").lower() == admin_email
    )


def _slugify_task_id(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        slug = f"task-{uuid.uuid4().hex[:8]}"
    return slug[:64]


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _pkce_challenge(verifier: str) -> str:
    return _base64url(hashlib.sha256(verifier.encode("utf-8")).digest())


def _oauth_state() -> str:
    return secrets.token_urlsafe(32)


def _oauth_verifier() -> str:
    return secrets.token_urlsafe(64)[:128]


def _frontend_origin_from_request(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    referer = request.headers.get("referer", "").rstrip("/")
    parsed = urlparse(referer)
    if parsed.scheme and parsed.netloc:
        origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin:
        return origin.rstrip("/")
    return os.environ.get("FRONTEND_PUBLIC_URL", "http://localhost:3000").rstrip("/")


def _x_redirect_uri(request: Request) -> str:
    if X_OAUTH_REDIRECT_URI:
        return X_OAUTH_REDIRECT_URI
    return f"{_frontend_origin_from_request(request)}/oauth/x/callback"


def _normalize_x_username(username: str) -> str:
    base = re.sub(r"[^a-z0-9_]+", "", (username or "").lower()).strip("_")
    if len(base) < 3:
        base = f"x_rider_{uuid.uuid4().hex[:6]}"
    return base[:20]


async def _unique_username(base: str) -> str:
    username = _normalize_x_username(base)
    candidate = username
    suffix = 1
    max_base = 20
    while await db.users.find_one({"username": candidate}):
        suffix += 1
        suffix_text = str(suffix)
        max_base = max(3, 20 - len(suffix_text) - 1)
        candidate = f"{username[:max_base]}_{suffix_text}"
    return candidate


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _utc_date_key(value: Optional[datetime] = None) -> str:
    dt = value or _utcnow()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).date().isoformat()


def _date_key_from_iso(value: Optional[str]) -> Optional[str]:
    dt = _parse_dt(value)
    if not dt:
        return None
    return _utc_date_key(dt)


def _normalize_x_handle(value: Optional[str]) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if "://" in raw:
        parsed = urlparse(raw)
        raw = parsed.path.strip("/").split("/", 1)[0]
    raw = raw.strip().lstrip("@").split("?", 1)[0].split("/", 1)[0]
    return re.sub(r"[^a-zA-Z0-9_]", "", raw).lower()[:15]


def _extract_x_tweet_id(value: Optional[str]) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    status_match = re.search(r"/status(?:es)?/(\d+)", raw)
    if status_match:
        return status_match.group(1)
    id_match = re.search(r"\b(\d{10,25})\b", raw)
    return id_match.group(1) if id_match else ""


def _task_verification_type(task: dict) -> str:
    verification_type = (task.get("verification_type") or "").strip().lower()
    if verification_type in {"", "none"}:
        return ""
    return verification_type


def _is_daily_task(task: dict) -> bool:
    return task.get("cadence") == "daily" or task.get("id") == DAILY_CHECKIN_TASK_ID


def _user_task_status(task: dict, user_task: Optional[dict]) -> str:
    if not user_task:
        return "available"
    status = user_task.get("status", "available")
    if not _is_daily_task(task):
        return status
    today = _utc_date_key()
    if status == "completed" and _date_key_from_iso(user_task.get("completed_at")) == today:
        return "completed"
    if status == "started" and _date_key_from_iso(user_task.get("started_at")) == today:
        return "started"
    return "available"


def _validate_avatar_url(value: Optional[str]) -> str:
    avatar_url = (value or "").strip()
    if not avatar_url:
        return ""
    allowed = (
        avatar_url.startswith("data:image/"),
        avatar_url.startswith("https://"),
        avatar_url.startswith("http://"),
    )
    if not any(allowed):
        raise HTTPException(status_code=400, detail="Avatar image must be an image data URL or http(s) URL")
    return avatar_url


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


async def get_optional_current_user(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.InvalidTokenError:
        return None
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        return None
    user.pop("password_hash", None)
    return user


async def require_admin(current=Depends(get_current_user)) -> dict:
    if not _is_admin_user(current):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


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
    avatar_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    avatar_preset: Optional[str] = Field(None, pattern=r"^(helmet|bolt|flag|skull|wheel|initial)$")
    avatar_url: Optional[str] = Field(None, max_length=200000)


class TaskOut(BaseModel):
    id: str
    title: str
    description: str
    platform: str
    icon: Optional[str] = None
    reward_lp: int
    status: str  # "available" | "started" | "completed"
    verification_type: Optional[str] = None
    verification_target: Optional[str] = None
    verification_query: Optional[str] = None


class AdminTaskIn(BaseModel):
    id: Optional[str] = Field(None, min_length=3, max_length=64, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=3, max_length=240)
    platform: str = Field(min_length=1, max_length=24)
    icon: Optional[str] = Field(None, max_length=40, pattern=r"^[a-z0-9-]*$")
    reward_lp: int = Field(ge=0, le=100000)
    external_url: Optional[str] = Field("#", max_length=500)
    order: int = Field(100, ge=0, le=10000)
    is_active: bool = True
    cadence: Optional[str] = Field(None, pattern=r"^(daily|once)$")
    verification_type: Optional[str] = Field(None, max_length=32, pattern=r"^(|none|x_follow|x_post|x_retweet)$")
    verification_target: Optional[str] = Field(None, max_length=500)
    verification_query: Optional[str] = Field(None, max_length=500)


class AdminTaskPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=80)
    description: Optional[str] = Field(None, min_length=3, max_length=240)
    platform: Optional[str] = Field(None, min_length=1, max_length=24)
    icon: Optional[str] = Field(None, max_length=40, pattern=r"^[a-z0-9-]*$")
    reward_lp: Optional[int] = Field(None, ge=0, le=100000)
    external_url: Optional[str] = Field(None, max_length=500)
    order: Optional[int] = Field(None, ge=0, le=10000)
    is_active: Optional[bool] = None
    cadence: Optional[str] = Field(None, pattern=r"^(daily|once)$")
    verification_type: Optional[str] = Field(None, max_length=32, pattern=r"^(|none|x_follow|x_post|x_retweet)$")
    verification_target: Optional[str] = Field(None, max_length=500)
    verification_query: Optional[str] = Field(None, max_length=500)


class AdminUserPatch(BaseModel):
    role: Optional[str] = Field(None, min_length=2, max_length=40)
    title: Optional[str] = Field(None, min_length=2, max_length=40)
    lap_points: Optional[int] = Field(None, ge=0, le=10000000)
    tasks_completed: Optional[int] = Field(None, ge=0, le=1000000)
    daily_streak: Optional[int] = Field(None, ge=0, le=10000)
    is_admin: Optional[bool] = None
    email_verified: Optional[bool] = None


class AdminPointsAdjustIn(BaseModel):
    delta: int = Field(ge=-100000, le=100000)
    reason: Optional[str] = Field(None, max_length=160)


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    lap_points: int
    tasks_completed: int
    daily_streak: int
    avatar_color: str
    avatar_preset: str = "helmet"
    avatar_url: Optional[str] = None
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
        "is_admin": False,
        "avatar_color": random.choice(AVATAR_COLORS),
        "avatar_preset": random.choice(AVATAR_PRESETS),
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
    fields_set = getattr(data, "model_fields_set", getattr(data, "__fields_set__", set()))

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

    if data.avatar_preset:
        if data.avatar_preset != current.get("avatar_preset", "helmet"):
            update["avatar_preset"] = data.avatar_preset

    if "avatar_url" in fields_set:
        avatar_url = _validate_avatar_url(data.avatar_url)
        if avatar_url != current.get("avatar_url", ""):
            update["avatar_url"] = avatar_url

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


class XOAuthStartIn(BaseModel):
    mode: str = Field("signin", pattern=r"^(signin|link)$")
    referral_code: Optional[str] = None


class XOAuthCallbackIn(BaseModel):
    code: Optional[str] = None
    state: Optional[str] = None
    oauth_token: Optional[str] = None
    oauth_verifier: Optional[str] = None


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
            "username": username,
            "display_name": username,
            "role": "ROOKIE RIDER",
            "title": "ROOKIE RACER",
            "lap_points": 0,
            "tasks_completed": 0,
            "daily_streak": 0,
            "referral_code": code,
            "referred_by": None,
            "is_admin": False,
            "avatar_color": random.choice(AVATAR_COLORS),
            "avatar_preset": random.choice(AVATAR_PRESETS),
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


# --- X / Twitter OAuth ---
def _x_oauth_flow() -> str:
    if X_OAUTH_VERSION in {"1", "1.0", "1.0a", "oauth1", "oauth1a"}:
        return "oauth1"
    if X_OAUTH_VERSION in {"2", "2.0", "oauth2"}:
        return "oauth2"
    if X_OAUTH_CLIENT_ID:
        return "oauth2"
    if X_CONSUMER_KEY and X_CONSUMER_SECRET:
        return "oauth1"
    return ""


def _require_x_oauth_config() -> None:
    flow = _x_oauth_flow()
    if flow == "oauth2" and X_OAUTH_CLIENT_ID:
        return
    if flow == "oauth1" and X_CONSUMER_KEY and X_CONSUMER_SECRET:
        return
    raise HTTPException(
        status_code=500,
        detail=(
            "X OAuth is not configured. Set X_OAUTH_CLIENT_ID for OAuth 2.0, "
            "or X_CONSUMER_KEY and X_CONSUMER_SECRET for OAuth 1.0a."
        ),
    )


def _x_token_auth_header() -> dict:
    if not X_OAUTH_CLIENT_SECRET:
        return {}
    raw = f"{X_OAUTH_CLIENT_ID}:{X_OAUTH_CLIENT_SECRET}".encode("utf-8")
    return {"Authorization": f"Basic {base64.b64encode(raw).decode('utf-8')}"}


def _parse_oauth1_response(text: str) -> dict:
    return dict(parse_qsl(text, keep_blank_values=True))


def _oauth1_client(**kwargs) -> OAuth1:
    return OAuth1(X_CONSUMER_KEY, client_secret=X_CONSUMER_SECRET, **kwargs)


async def _award_referral_if_needed(referral_code: Optional[str], user: dict) -> None:
    if not referral_code or user.get("referred_by"):
        return
    ref_owner = await db.users.find_one({"referral_code": referral_code.upper()}, {"_id": 0})
    if not ref_owner or ref_owner["id"] == user["id"]:
        return
    existing_ref = await db.referrals.find_one({"owner_id": ref_owner["id"], "invitee_id": user["id"]})
    if existing_ref:
        return
    now_iso = _utcnow().isoformat()
    await db.referrals.insert_one({
        "id": str(uuid.uuid4()),
        "owner_id": ref_owner["id"],
        "invitee_id": user["id"],
        "invitee_username": user.get("username"),
        "status": "verified",
        "lp_earned": 50,
        "created_at": now_iso,
        "verified_at": now_iso,
    })
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"referred_by": ref_owner["id"]}},
    )
    await db.users.update_one({"id": ref_owner["id"]}, {"$inc": {"lap_points": 50}})


def _x_token_fields(token_data: dict) -> dict:
    now = _utcnow()
    expires_in = token_data.get("expires_in")
    token_fields = {
        "x_access_token": token_data.get("access_token") or token_data.get("oauth_token"),
        "x_access_token_secret": token_data.get("oauth_token_secret"),
        "x_refresh_token": token_data.get("refresh_token"),
        "x_token_scope": token_data.get("scope"),
        "x_oauth_version": token_data.get("oauth_version"),
        "x_connected_at": now.isoformat(),
    }
    if expires_in:
        token_fields["x_token_expires_at"] = (now + timedelta(seconds=int(expires_in))).isoformat()
    return {k: v for k, v in token_fields.items() if v is not None}


def _x_profile_fields(profile: dict, token_data: dict) -> dict:
    return {
        "x_id": str(profile["id"]),
        "x_username": profile.get("username"),
        "x_name": profile.get("name"),
        "x_profile_image_url": profile.get("profile_image_url"),
        "x_verified": profile.get("verified", False),
        **_x_token_fields(token_data),
    }


def _request_x_oauth1_token(redirect_uri: str) -> dict:
    resp = requests.post(
        X_OAUTH1_REQUEST_TOKEN_URL,
        auth=_oauth1_client(callback_uri=redirect_uri),
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("X OAuth 1.0a request token failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="X OAuth request token failed")
    data = _parse_oauth1_response(resp.text)
    if data.get("oauth_callback_confirmed") != "true" or not data.get("oauth_token") or not data.get("oauth_token_secret"):
        logger.error("X OAuth 1.0a request token response was incomplete: %s", data)
        raise HTTPException(status_code=502, detail="X OAuth request token was incomplete")
    return data


def _exchange_x_oauth1_verifier(oauth_verifier: str, state_doc: dict) -> dict:
    resp = requests.post(
        X_OAUTH1_ACCESS_TOKEN_URL,
        auth=_oauth1_client(
            resource_owner_key=state_doc["oauth_token"],
            resource_owner_secret=state_doc["oauth_token_secret"],
            verifier=oauth_verifier,
        ),
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("X OAuth 1.0a access token failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="X OAuth access token exchange failed")
    data = _parse_oauth1_response(resp.text)
    if not data.get("oauth_token") or not data.get("oauth_token_secret"):
        logger.error("X OAuth 1.0a access token response was incomplete: %s", data)
        raise HTTPException(status_code=502, detail="X OAuth access token was incomplete")
    data["oauth_version"] = "1.0a"
    return data


def _fetch_x_oauth1_profile(token_data: dict) -> dict:
    resp = requests.get(
        X_OAUTH1_VERIFY_CREDENTIALS_URL,
        auth=_oauth1_client(
            resource_owner_key=token_data["oauth_token"],
            resource_owner_secret=token_data["oauth_token_secret"],
        ),
        params={"skip_status": "true", "include_entities": "false"},
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("X OAuth 1.0a profile lookup failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="X profile lookup failed")
    data = resp.json()
    x_id = data.get("id_str") or data.get("id")
    if not x_id:
        raise HTTPException(status_code=502, detail="X profile lookup returned no user")
    return {
        "id": str(x_id),
        "username": data.get("screen_name"),
        "name": data.get("name"),
        "profile_image_url": data.get("profile_image_url_https") or data.get("profile_image_url"),
        "verified": data.get("verified", False),
    }


def _exchange_x_code(code: str, state_doc: dict) -> dict:
    data = {
        "grant_type": "authorization_code",
        "client_id": X_OAUTH_CLIENT_ID,
        "code": code,
        "redirect_uri": state_doc["redirect_uri"],
        "code_verifier": state_doc["code_verifier"],
    }
    resp = requests.post(
        X_OAUTH_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            **_x_token_auth_header(),
        },
        data=data,
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("X OAuth token exchange failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="X OAuth token exchange failed")
    data = resp.json()
    data["oauth_version"] = "2.0"
    return data


def _fetch_x_profile(access_token: str) -> dict:
    resp = requests.get(
        X_OAUTH_ME_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"user.fields": "profile_image_url,verified,protected"},
        timeout=15,
    )
    if resp.status_code >= 400:
        logger.error("X OAuth user lookup failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="X profile lookup failed")
    data = resp.json().get("data")
    if not data or not data.get("id"):
        raise HTTPException(status_code=502, detail="X profile lookup returned no user")
    return data


async def _upsert_x_user(profile: dict, token_data: dict, referral_code: Optional[str]) -> dict:
    x_id = str(profile["id"])
    profile_fields = _x_profile_fields(profile, token_data)
    existing = await db.users.find_one({"x_id": x_id}, {"_id": 0})
    if existing:
        await db.users.update_one({"id": existing["id"]}, {"$set": profile_fields})
        return await db.users.find_one({"id": existing["id"]}, {"_id": 0})

    username = await _unique_username(profile.get("username") or profile.get("name") or f"x_{x_id}")
    while True:
        code = gen_referral_code()
        if not await db.users.find_one({"referral_code": code}):
            break
    now_iso = _utcnow().isoformat()
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "display_name": profile.get("name") or username,
        "role": "ROOKIE RIDER",
        "title": "ROOKIE RACER",
        "lap_points": 0,
        "tasks_completed": 0,
        "daily_streak": 0,
        "referral_code": code,
        "referred_by": None,
        "is_admin": False,
        "avatar_color": random.choice(AVATAR_COLORS),
        "avatar_preset": "helmet",
        "avatar_url": profile.get("profile_image_url"),
        "joined_on": now_iso,
        "last_active": now_iso,
        "email_verified": False,
        **profile_fields,
    }
    await db.users.insert_one(user)
    await _award_referral_if_needed(referral_code, user)
    return await db.users.find_one({"id": user["id"]}, {"_id": 0})


@api_router.post("/auth/x/start")
async def x_oauth_start(data: XOAuthStartIn, request: Request, current=Depends(get_optional_current_user)):
    _require_x_oauth_config()
    if data.mode == "link" and not current:
        raise HTTPException(status_code=401, detail="Log in before linking X")
    redirect_uri = _x_redirect_uri(request)
    expires_at = _utcnow() + timedelta(minutes=X_OAUTH_STATE_TTL_MINUTES)

    state_doc = {
        "provider": "x",
        "redirect_uri": redirect_uri,
        "mode": data.mode,
        "user_id": current.get("id") if current else None,
        "referral_code": data.referral_code.upper() if data.referral_code else None,
        "used": False,
        "created_at": _utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }

    if _x_oauth_flow() == "oauth1":
        request_token = _request_x_oauth1_token(redirect_uri)
        oauth_token = request_token["oauth_token"]
        await db.oauth_states.insert_one({
            **state_doc,
            "state": oauth_token,
            "oauth_version": "1.0a",
            "oauth_token": oauth_token,
            "oauth_token_secret": request_token["oauth_token_secret"],
        })
        return {
            "authorization_url": f"{X_OAUTH1_AUTHORIZE_URL}?{urlencode({'oauth_token': oauth_token})}",
            "state": oauth_token,
            "oauth_version": "1.0a",
        }

    state = _oauth_state()
    code_verifier = _oauth_verifier()
    await db.oauth_states.insert_one({
        **state_doc,
        "state": state,
        "oauth_version": "2.0",
        "code_verifier": code_verifier,
    })
    params = {
        "response_type": "code",
        "client_id": X_OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": X_OAUTH_SCOPES,
        "state": state,
        "code_challenge": _pkce_challenge(code_verifier),
        "code_challenge_method": "S256",
    }
    return {"authorization_url": f"{X_OAUTH_AUTHORIZE_URL}?{urlencode(params)}", "state": state, "oauth_version": "2.0"}


@api_router.post("/auth/x/callback", response_model=TokenOut)
async def x_oauth_callback(data: XOAuthCallbackIn):
    _require_x_oauth_config()

    if data.oauth_token or data.oauth_verifier:
        if not data.oauth_token or not data.oauth_verifier:
            raise HTTPException(status_code=400, detail="Missing OAuth token or verifier")
        state_doc = await db.oauth_states.find_one({
            "oauth_token": data.oauth_token,
            "provider": "x",
            "used": False,
        })
    else:
        if not data.code or not data.state:
            raise HTTPException(status_code=400, detail="Missing OAuth code or state")
        state_doc = await db.oauth_states.find_one({"state": data.state, "provider": "x", "used": False})

    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    expires_at = _parse_dt(state_doc.get("expires_at"))
    if not expires_at or _utcnow() > expires_at:
        await db.oauth_states.update_one({"_id": state_doc["_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="OAuth state expired")

    if state_doc.get("oauth_version") == "1.0a":
        token_data = _exchange_x_oauth1_verifier(data.oauth_verifier, state_doc)
        profile = _fetch_x_oauth1_profile(token_data)
    else:
        token_data = _exchange_x_code(data.code, state_doc)
        profile = _fetch_x_profile(token_data["access_token"])

    x_id = str(profile["id"])
    profile_fields = _x_profile_fields(profile, token_data)

    if state_doc.get("mode") == "link":
        target = await db.users.find_one({"id": state_doc.get("user_id")}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=401, detail="Linked account no longer exists")
        existing = await db.users.find_one({"x_id": x_id}, {"_id": 0})
        if existing and existing["id"] != target["id"]:
            raise HTTPException(status_code=400, detail="X account already linked to another rider")
        update = dict(profile_fields)
        if profile.get("profile_image_url") and not target.get("avatar_url"):
            update["avatar_url"] = profile.get("profile_image_url")
        await db.users.update_one({"id": target["id"]}, {"$set": update})
        user = await db.users.find_one({"id": target["id"]}, {"_id": 0})
    else:
        user = await _upsert_x_user(profile, token_data, state_doc.get("referral_code"))

    await db.oauth_states.update_one(
        {"_id": state_doc["_id"]},
        {"$set": {"used": True, "used_at": _utcnow().isoformat(), "x_id": x_id}},
    )
    token = create_token(user["id"], user.get("email") or f"x:{x_id}")
    return TokenOut(access_token=token, user=sanitize_user(user))


@api_router.post("/auth/x/unlink")
async def x_oauth_unlink(current=Depends(get_current_user)):
    if not current.get("email") and not current.get("wallet_address"):
        raise HTTPException(status_code=400, detail="Cannot unlink X from an X-only account")
    await db.users.update_one(
        {"id": current["id"]},
        {"$unset": {
            "x_id": "",
            "x_username": "",
            "x_name": "",
            "x_profile_image_url": "",
            "x_verified": "",
            "x_access_token": "",
            "x_access_token_secret": "",
            "x_refresh_token": "",
            "x_token_scope": "",
            "x_oauth_version": "",
            "x_token_expires_at": "",
            "x_connected_at": "",
        }},
    )
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": sanitize_user(user)}


# --- Admin ---
async def _task_engagement_counts() -> dict:
    rows = await db.user_tasks.aggregate([
        {"$group": {
            "_id": {"task_id": "$task_id", "status": "$status"},
            "count": {"$sum": 1},
        }},
    ]).to_list(1000)
    counts = {}
    for row in rows:
        task_id = row["_id"]["task_id"]
        status = row["_id"].get("status", "unknown")
        counts.setdefault(task_id, {"started_count": 0, "completion_count": 0})
        if status == "completed":
            counts[task_id]["completion_count"] += row["count"]
        elif status == "started":
            counts[task_id]["started_count"] += row["count"]
    return counts


def _normalize_task_payload(payload: dict, task_id: Optional[str] = None) -> dict:
    normalized = dict(payload)
    if "platform" in normalized and normalized["platform"] is not None:
        normalized["platform"] = normalized["platform"].strip().upper()
    if "icon" in normalized and normalized["icon"] is not None:
        normalized["icon"] = normalized["icon"].strip().lower()
    if "title" in normalized and normalized["title"] is not None:
        normalized["title"] = normalized["title"].strip()
    if "description" in normalized and normalized["description"] is not None:
        normalized["description"] = normalized["description"].strip()
    if "external_url" in normalized:
        normalized["external_url"] = (normalized.get("external_url") or "#").strip() or "#"
    if "verification_type" in normalized:
        verification_type = (normalized.get("verification_type") or "").strip().lower()
        if verification_type in {"", "none"}:
            normalized.pop("verification_type", None)
        else:
            normalized["verification_type"] = verification_type
    if "verification_target" in normalized and normalized["verification_target"] is not None:
        normalized["verification_target"] = normalized["verification_target"].strip()
    if "verification_query" in normalized and normalized["verification_query"] is not None:
        normalized["verification_query"] = normalized["verification_query"].strip()
    if normalized.get("cadence") == "once":
        normalized.pop("cadence", None)
    if task_id:
        normalized["id"] = task_id
    return normalized


@api_router.get("/admin/overview")
async def admin_overview(admin=Depends(require_admin)):
    user_filter = {"is_bot": {"$ne": True}}
    total_users = await db.users.count_documents(user_filter)
    verified_users = await db.users.count_documents({**user_filter, "email_verified": True})
    admin_users = await db.users.count_documents({**user_filter, "is_admin": True})
    total_tasks = await db.tasks.count_documents({})
    active_tasks = await db.tasks.count_documents({"is_active": {"$ne": False}})
    completed_tasks = await db.user_tasks.count_documents({"status": "completed"})
    started_tasks = await db.user_tasks.count_documents({"status": "started"})
    pending_referrals = await db.referrals.count_documents({"status": "pending"})
    verified_referrals = await db.referrals.count_documents({"status": "verified"})
    totals = await db.users.aggregate([
        {"$match": user_filter},
        {"$group": {
            "_id": None,
            "lap_points": {"$sum": {"$ifNull": ["$lap_points", 0]}},
            "tasks_completed": {"$sum": {"$ifNull": ["$tasks_completed", 0]}},
        }},
    ]).to_list(1)
    totals = totals[0] if totals else {}
    recent_users = await db.users.find(user_filter, {"_id": 0, "password_hash": 0}).sort("joined_on", -1).to_list(6)
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "admin_users": admin_users,
        "total_tasks": total_tasks,
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks,
        "started_tasks": started_tasks,
        "pending_referrals": pending_referrals,
        "verified_referrals": verified_referrals,
        "total_lp": totals.get("lap_points", 0),
        "total_tasks_completed": totals.get("tasks_completed", 0),
        "recent_users": [sanitize_user(u) for u in recent_users],
    }


@api_router.get("/admin/tasks")
async def admin_list_tasks(admin=Depends(require_admin)):
    tasks = await db.tasks.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    counts = await _task_engagement_counts()
    return [
        {
            **task,
            "is_active": task.get("is_active", True),
            "cadence": task.get("cadence", "once"),
            **counts.get(task["id"], {"started_count": 0, "completion_count": 0}),
        }
        for task in tasks
    ]


@api_router.post("/admin/tasks")
async def admin_create_task(data: AdminTaskIn, admin=Depends(require_admin)):
    task_id = data.id or _slugify_task_id(data.title)
    if await db.tasks.find_one({"id": task_id}):
        raise HTTPException(status_code=400, detail="Task id already exists")
    task = _normalize_task_payload(data.model_dump(exclude_none=True), task_id=task_id)
    await db.tasks.insert_one(task)
    created = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return {"ok": True, "task": {**created, "cadence": created.get("cadence", "once")}}


@api_router.patch("/admin/tasks/{task_id}")
async def admin_update_task(task_id: str, data: AdminTaskPatch, admin=Depends(require_admin)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    fields_set = getattr(data, "model_fields_set", set())
    update = data.model_dump(exclude_unset=True, exclude_none=False)
    update = _normalize_task_payload(update)
    if not update and "cadence" not in fields_set and "verification_type" not in fields_set:
        return {"ok": True, "task": {**existing, "cadence": existing.get("cadence", "once")}}
    update_doc = {}
    if update:
        update_doc["$set"] = {k: v for k, v in update.items() if not (k == "cadence" and v is None)}
    unset_fields = {}
    if "cadence" in fields_set and update.get("cadence") is None:
        unset_fields["cadence"] = ""
    if "verification_type" in fields_set and "verification_type" not in update:
        unset_fields["verification_type"] = ""
    if unset_fields:
        update_doc["$unset"] = unset_fields
    await db.tasks.update_one({"id": task_id}, update_doc)
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return {"ok": True, "task": {**task, "cadence": task.get("cadence", "once")}}


@api_router.delete("/admin/tasks/{task_id}")
async def admin_delete_task(task_id: str, admin=Depends(require_admin)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.user_tasks.delete_many({"task_id": task_id})
    return {"ok": True, "deleted": task_id}


@api_router.get("/admin/users")
async def admin_list_users(q: str = "", limit: int = 50, admin=Depends(require_admin)):
    safe_limit = max(1, min(limit, 200))
    user_filter = {"is_bot": {"$ne": True}}
    query = q.strip()
    if query:
        user_filter["$or"] = [
            {"username": {"$regex": re.escape(query), "$options": "i"}},
            {"email": {"$regex": re.escape(query), "$options": "i"}},
            {"display_name": {"$regex": re.escape(query), "$options": "i"}},
        ]
    total = await db.users.count_documents(user_filter)
    users = await db.users.find(user_filter, {"_id": 0, "password_hash": 0}).sort("joined_on", -1).to_list(safe_limit)
    return {"total": total, "users": [sanitize_user(u) for u in users]}


@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserPatch, admin=Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    update = data.model_dump(exclude_unset=True)
    if admin["id"] == user_id and update.get("is_admin") is False:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")
    if not update:
        return {"ok": True, "user": sanitize_user(target)}
    await db.users.update_one({"id": user_id}, {"$set": update})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": sanitize_user(user)}


@api_router.post("/admin/users/{user_id}/points")
async def admin_adjust_points(user_id: str, data: AdminPointsAdjustIn, admin=Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    next_points = max(0, int(target.get("lap_points", 0)) + data.delta)
    now_iso = _utcnow().isoformat()
    await db.users.update_one({"id": user_id}, {"$set": {"lap_points": next_points}})
    await db.admin_events.insert_one({
        "id": str(uuid.uuid4()),
        "type": "points_adjustment",
        "admin_id": admin["id"],
        "target_user_id": user_id,
        "delta": data.delta,
        "reason": data.reason or "",
        "created_at": now_iso,
    })
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": sanitize_user(user)}


# --- Task Verification ---
def _twitterapi_get(path: str, params: dict) -> dict:
    if not TWITTERAPI_IO_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Twitter verification is not configured. Set TWITTERAPI_IO_API_KEY on the backend.",
        )
    try:
        resp = requests.get(
            f"{TWITTERAPI_IO_BASE_URL}{path}",
            headers={"X-API-Key": TWITTERAPI_IO_API_KEY},
            params=params,
            timeout=TWITTERAPI_IO_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("TwitterAPI.io request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Twitter verification service is unavailable")

    try:
        data = resp.json()
    except ValueError:
        logger.error("TwitterAPI.io returned non-JSON response: %s %s", resp.status_code, resp.text[:500])
        raise HTTPException(status_code=502, detail="Twitter verification returned an invalid response")

    if resp.status_code >= 400 or data.get("status") == "error":
        message = data.get("message") or data.get("msg") or "Twitter verification failed"
        logger.error("TwitterAPI.io error: %s %s", resp.status_code, data)
        raise HTTPException(status_code=502, detail=message)
    return data


def _current_x_username(current: dict) -> str:
    if not current.get("x_id"):
        return ""
    return _normalize_x_handle(current.get("x_username"))


def _x_task_target_handle(task: dict) -> str:
    return _normalize_x_handle(task.get("verification_target") or task.get("external_url"))


def _x_task_target_tweet_id(task: dict) -> str:
    return _extract_x_tweet_id(task.get("verification_target") or task.get("external_url"))


def _verify_x_follow(source_username: str, task: dict) -> dict:
    target_username = _x_task_target_handle(task)
    if not target_username:
        raise HTTPException(status_code=500, detail="X follow task is missing a target account")
    data = _twitterapi_get(
        "/twitter/user/check_follow_relationship",
        {
            "source_user_name": source_username,
            "target_user_name": target_username,
        },
    )
    is_following = bool((data.get("data") or {}).get("following"))
    return {
        "verified": is_following,
        "evidence": {
            "type": "x_follow",
            "source_user_name": source_username,
            "target_user_name": target_username,
        },
    }


def _verify_x_post(source_username: str, task: dict, user_task: dict) -> dict:
    query = (task.get("verification_query") or "").strip()
    if not query:
        target = (task.get("verification_target") or "").strip()
        target_handle = _normalize_x_handle(target)
        query = f"@{target_handle}" if target_handle else target
    if not query:
        raise HTTPException(status_code=500, detail="X post task is missing a verification query")

    started_at = _parse_dt(user_task.get("started_at"))
    search_query = f"{query} from:{source_username}"
    if started_at:
        search_query = f"{search_query} since_time:{int(started_at.timestamp())}"

    cursor = ""
    pages_checked = 0
    latest_match = None
    while pages_checked < TWITTERAPI_IO_MAX_PAGES:
        params = {"query": search_query, "queryType": "Latest"}
        if cursor:
            params["cursor"] = cursor
        data = _twitterapi_get("/twitter/tweet/advanced_search", params)
        tweets = data.get("tweets") or []
        for tweet in tweets:
            author = _normalize_x_handle((tweet.get("author") or {}).get("userName"))
            if author == source_username:
                latest_match = {
                    "tweet_id": str(tweet.get("id", "")),
                    "tweet_url": tweet.get("url"),
                    "created_at": tweet.get("createdAt"),
                }
                break
        if latest_match or not data.get("has_next_page") or not data.get("next_cursor"):
            break
        cursor = data.get("next_cursor")
        pages_checked += 1

    return {
        "verified": bool(latest_match),
        "evidence": {
            "type": "x_post",
            "source_user_name": source_username,
            "query": search_query,
            **(latest_match or {}),
        },
    }


def _verify_x_retweet(source_username: str, task: dict) -> dict:
    tweet_id = _x_task_target_tweet_id(task)
    if not tweet_id:
        raise HTTPException(status_code=500, detail="X retweet task is missing a tweet id")

    cursor = ""
    pages_checked = 0
    found = False
    while pages_checked < TWITTERAPI_IO_MAX_PAGES:
        params = {"tweetId": tweet_id}
        if cursor:
            params["cursor"] = cursor
        data = _twitterapi_get("/twitter/tweet/retweeters", params)
        users = data.get("users") or []
        found = any(_normalize_x_handle(u.get("userName")) == source_username for u in users)
        if found or not data.get("has_next_page") or not data.get("next_cursor"):
            break
        cursor = data.get("next_cursor")
        pages_checked += 1

    return {
        "verified": found,
        "evidence": {
            "type": "x_retweet",
            "source_user_name": source_username,
            "tweet_id": tweet_id,
            "pages_checked": pages_checked + 1,
        },
    }


async def _ensure_task_verified(task: dict, user_task: Optional[dict], current: dict) -> dict:
    verification_type = _task_verification_type(task)
    if not verification_type:
        if (task.get("platform") or "").upper() == "X":
            raise HTTPException(status_code=500, detail="X task verification is not configured")
        return {}
    if not user_task:
        raise HTTPException(status_code=400, detail="Start this task before claiming it")

    checked_at = _utcnow().isoformat()
    if not verification_type.startswith("x_"):
        raise HTTPException(status_code=500, detail="Task verification type is not supported")

    source_username = _current_x_username(current)
    if not source_username:
        await db.user_tasks.update_one(
            {"id": user_task["id"]},
            {"$set": {
                "verification_status": "failed",
                "verification_checked_at": checked_at,
                "verification_message": "X account is not linked",
            }},
        )
        raise HTTPException(status_code=400, detail="Link your X account before claiming this task")

    if verification_type == "x_follow":
        result = _verify_x_follow(source_username, task)
    elif verification_type == "x_post":
        result = _verify_x_post(source_username, task, user_task)
    elif verification_type == "x_retweet":
        result = _verify_x_retweet(source_username, task)
    else:
        raise HTTPException(status_code=500, detail="Task verification type is not supported")

    update = {
        "verification_status": "verified" if result.get("verified") else "failed",
        "verification_checked_at": checked_at,
        "verification_type": verification_type,
        "verification_evidence": result.get("evidence") or {},
    }
    if not result.get("verified"):
        update["verification_message"] = "X action was not found"
        await db.user_tasks.update_one({"id": user_task["id"]}, {"$set": update})
        raise HTTPException(
            status_code=400,
            detail="We could not verify this X task yet. Complete it on X, then try again.",
        )

    update["verification_message"] = "Verified"
    await db.user_tasks.update_one({"id": user_task["id"]}, {"$set": update})
    return result.get("evidence") or {}


# --- Tasks ---
@api_router.get("/tasks")
async def list_tasks(current=Depends(get_current_user)):
    tasks = await db.tasks.find({"is_active": {"$ne": False}}, {"_id": 0}).sort("order", 1).to_list(100)
    user_tasks = await db.user_tasks.find({"user_id": current["id"]}, {"_id": 0}).to_list(500)
    status_map = {ut["task_id"]: ut["status"] for ut in user_tasks}
    task_map = {ut["task_id"]: ut for ut in user_tasks}
    out = []
    for t in tasks:
        out.append({
            **t,
            "status": _user_task_status(t, task_map.get(t["id"])) if _is_daily_task(t) else status_map.get(t["id"], "available"),
        })
    return out


@api_router.post("/tasks/{task_id}/start")
async def start_task(task_id: str, current=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "is_active": {"$ne": False}}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = await db.user_tasks.find_one({"user_id": current["id"], "task_id": task_id})
    current_status = _user_task_status(task, existing)
    if existing and current_status != "available":
        if current_status == "completed":
            raise HTTPException(status_code=400, detail="Task already completed")
        return {"status": current_status, "task_id": task_id}

    started_at = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.user_tasks.update_one(
            {"user_id": current["id"], "task_id": task_id},
            {"$set": {"status": "started", "started_at": started_at}, "$unset": {"completed_at": ""}},
        )
    else:
        await db.user_tasks.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current["id"],
            "task_id": task_id,
            "status": "started",
            "started_at": started_at,
        })
    return {"status": "started", "task_id": task_id, "external_url": task.get("external_url", "#")}


@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "is_active": {"$ne": False}}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = await db.user_tasks.find_one({"user_id": current["id"], "task_id": task_id})
    if existing and _user_task_status(task, existing) == "completed":
        raise HTTPException(status_code=400, detail="Task already completed")
    verification_evidence = await _ensure_task_verified(task, existing, current)
    reward = int(task.get("reward_lp", 100))
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    if existing:
        completion_set = {"status": "completed", "completed_at": now}
        if verification_evidence:
            completion_set["verification_evidence"] = verification_evidence
        await db.user_tasks.update_one(
            {"user_id": current["id"], "task_id": task_id},
            {"$set": completion_set},
        )
    else:
        user_task_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current["id"],
            "task_id": task_id,
            "status": "completed",
            "started_at": now,
            "completed_at": now,
        }
        if verification_evidence:
            user_task_doc["verification_evidence"] = verification_evidence
        await db.user_tasks.insert_one(user_task_doc)

    user_update = {"$inc": {"lap_points": reward, "tasks_completed": 1}}
    if _is_daily_task(task):
        today = _utc_date_key(now_dt)
        yesterday = (now_dt - timedelta(days=1)).date().isoformat()
        current_streak = int(current.get("daily_streak", 0))
        next_streak = current_streak + 1 if current.get("last_checkin_date") == yesterday else 1
        user_update["$set"] = {"daily_streak": next_streak, "last_checkin_date": today}

    await db.users.update_one({"id": current["id"]}, user_update)
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
            "avatar_preset": u.get("avatar_preset", "helmet"),
            "avatar_url": u.get("avatar_url"),
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
    await db.users.create_index("x_id", unique=True, sparse=True)
    await db.tasks.create_index("id", unique=True)
    await db.user_tasks.create_index([("user_id", 1), ("task_id", 1)], unique=True)
    await db.wallet_nonces.create_index("nonce")
    await db.oauth_states.create_index("state", unique=True)
    await db.oauth_states.create_index("expires_at")
    await db.admin_events.create_index("created_at")

    await db.users.update_many(
        {"avatar_preset": {"$exists": False}},
        {"$set": {"avatar_preset": "helmet"}},
    )
    await db.users.update_many(
        {"is_admin": {"$exists": False}},
        {"$set": {"is_admin": False}},
    )

    task_count = await db.tasks.count_documents({})
    tasks_to_seed = DEFAULT_TASKS if task_count == 0 else [DEFAULT_TASKS[0]]
    for task in tasks_to_seed:
        await db.tasks.update_one({"id": task["id"]}, {"$set": task}, upsert=True)
    for task in DEFAULT_TASKS:
        if task.get("icon"):
            await db.tasks.update_one(
                {"id": task["id"], "$or": [{"icon": {"$exists": False}}, {"icon": ""}]},
                {"$set": {"icon": task["icon"]}},
            )
        if task.get("external_url") and task["external_url"] != "#":
            await db.tasks.update_one(
                {"id": task["id"], "$or": [{"external_url": {"$exists": False}}, {"external_url": ""}, {"external_url": "#"}]},
                {"$set": {"external_url": task["external_url"]}},
            )
        verification_defaults = {
            key: task[key]
            for key in ("verification_type", "verification_target", "verification_query")
            if task.get(key)
        }
        if verification_defaults:
            await db.tasks.update_one(
                {"id": task["id"]},
                {"$set": verification_defaults},
            )

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
            "is_admin": True,
            "lap_points": 0,
            "tasks_completed": 0,
            "daily_streak": 0,
            "referral_code": code,
            "referred_by": None,
            "avatar_color": "#8B5CF6",
            "avatar_preset": "helmet",
            "joined_on": datetime.now(timezone.utc).isoformat(),
        })
    else:
        admin_update = {"is_admin": True, "role": "PIT BOSS", "title": "TRACK MARSHAL"}
        if not verify_password(admin_pw, existing_admin["password_hash"]):
            admin_update["password_hash"] = hash_password(admin_pw)
        await db.users.update_one({"email": admin_email}, {"$set": admin_update})

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
