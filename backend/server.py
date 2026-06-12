from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------- Setup ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
ACCESS_MIN = 60 * 12  # 12h
REFRESH_DAYS = 7

app = FastAPI(title="DEVAM Real Estate CRM")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("devam")


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(payload: dict, minutes: int) -> str:
    data = {**payload, "exp": now_utc() + timedelta(minutes=minutes)}
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LeadIn(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    source: Literal["Website", "Walk-in", "Referral", "Facebook", "Instagram", "99acres", "Magicbricks", "NRI Network"] = "Website"
    budget_min: float = 0
    budget_max: float = 0
    location: str = ""
    property_type: Literal["Apartment", "Villa", "Plot", "Commercial", "Penthouse"] = "Apartment"
    urgency: Literal["Immediate", "1-3 months", "3-6 months", "6+ months"] = "1-3 months"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    stage: Literal["New", "Contacted", "Site Visit", "Negotiation", "Booked", "Lost"] = "New"


class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    urgency: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    stage: Optional[str] = None


class BuilderIn(BaseModel):
    name: str
    contact_person: str = ""
    phone: str = ""
    email: Optional[str] = None
    city: str = "Gandhinagar"
    projects_count: int = 0
    rating: float = 4.5
    notes: Optional[str] = ""


class ProjectIn(BaseModel):
    name: str
    builder_id: Optional[str] = None
    builder_name: str = ""
    city: str = "Gandhinagar"
    location: str = ""
    project_type: Literal["Residential", "Commercial", "Mixed"] = "Residential"
    status: Literal["Pre-launch", "Under Construction", "Ready to Move", "Sold Out"] = "Under Construction"
    price_min: float = 0
    price_max: float = 0
    total_units: int = 0
    available_units: int = 0
    rera_number: Optional[str] = ""
    possession_date: Optional[str] = ""
    description: Optional[str] = ""
    image_url: Optional[str] = ""


class SiteVisitIn(BaseModel):
    lead_id: str
    lead_name: str = ""
    project_id: Optional[str] = None
    project_name: str = ""
    scheduled_at: str  # ISO datetime
    assigned_agent: str = ""
    status: Literal["Scheduled", "Completed", "No-show", "Cancelled"] = "Scheduled"
    feedback: Optional[str] = ""


class BookingIn(BaseModel):
    lead_id: str
    lead_name: str = ""
    project_id: str
    project_name: str = ""
    unit_number: str = ""
    booking_amount: float = 0
    total_value: float = 0
    booking_date: Optional[str] = None
    status: Literal["Token", "Agreement", "Registered", "Cancelled"] = "Token"


class InventoryUnitIn(BaseModel):
    project_id: str
    project_name: str = ""
    tower: str = "A"
    floor: int = 1
    unit_number: str
    unit_type: str = "2BHK"
    carpet_area: float = 0
    price: float = 0
    status: Literal["Available", "Blocked", "Booked", "Sold"] = "Available"


# ---------- Auth Endpoints ----------
def _set_auth_cookies(resp: Response, user_id: str, email: str):
    access = create_token({"sub": user_id, "email": email, "type": "access"}, ACCESS_MIN)
    refresh = create_token({"sub": user_id, "type": "refresh"}, REFRESH_DAYS * 24 * 60)
    resp.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=REFRESH_DAYS * 86400, path="/")
    return access


@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _set_auth_cookies(response, user["id"], user["email"])
    return {
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]
        },
        "access_token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ---------- Dashboard ----------
@api.get("/dashboard/stats")
async def dashboard_stats(_=Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    hot_leads = await db.leads.count_documents({"score_category": "Hot"})
    active_projects = await db.projects.count_documents({"status": {"$in": ["Pre-launch", "Under Construction", "Ready to Move"]}})
    upcoming_visits = await db.site_visits.count_documents({"status": "Scheduled"})
    bookings_total = await db.bookings.count_documents({"status": {"$ne": "Cancelled"}})

    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$booking_amount"}, "value": {"$sum": "$total_value"}}}]
    agg = await db.bookings.aggregate(pipeline).to_list(1)
    booking_amt = agg[0]["total"] if agg else 0
    booking_value = agg[0]["value"] if agg else 0

    # Lead funnel
    stages = ["New", "Contacted", "Site Visit", "Negotiation", "Booked", "Lost"]
    funnel = []
    for s in stages:
        c = await db.leads.count_documents({"stage": s})
        funnel.append({"stage": s, "count": c})

    # Source distribution
    src_pipeline = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}]
    src_agg = await db.leads.aggregate(src_pipeline).to_list(50)
    sources = [{"source": x["_id"] or "Unknown", "count": x["count"]} for x in src_agg]

    # Recent leads
    recent = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)

    return {
        "kpis": {
            "total_leads": total_leads,
            "hot_leads": hot_leads,
            "active_projects": active_projects,
            "upcoming_visits": upcoming_visits,
            "bookings_total": bookings_total,
            "booking_amount": booking_amt,
            "booking_value": booking_value,
        },
        "funnel": funnel,
        "sources": sources,
        "recent_leads": recent,
    }


# ---------- Leads ----------
async def score_lead_with_ai(lead: dict) -> dict:
    """Score a lead using Claude via emergentintegrations. Falls back to rule-based scoring."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"lead-score-{lead.get('id', uuid.uuid4().hex)}",
            system_message=(
                "You are a real estate sales analyst for a Gujarat-based CRM. "
                "Score the lead from 0 to 100 based on quality. Respond ONLY in this exact format on a single line: "
                "SCORE=<int>|CATEGORY=<Hot|Warm|Cold>|REASON=<short reason in 12 words>. "
                "Hot >= 75, Warm 40-74, Cold < 40. Consider budget realism, urgency, source quality, completeness, and clarity of intent."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929").with_max_tokens(200)

        prompt = (
            f"Lead Name: {lead.get('name')}\n"
            f"Phone: {lead.get('phone')}\n"
            f"Source: {lead.get('source')}\n"
            f"Budget: ₹{lead.get('budget_min', 0):,.0f} - ₹{lead.get('budget_max', 0):,.0f}\n"
            f"Location: {lead.get('location')}\n"
            f"Property Type: {lead.get('property_type')}\n"
            f"Urgency: {lead.get('urgency')}\n"
            f"Notes: {lead.get('notes', '')}"
        )
        msg = UserMessage(text=prompt)
        reply = await asyncio.wait_for(chat.send_message(msg), timeout=18)
        # Parse
        parts = {}
        for chunk in str(reply).strip().split("|"):
            if "=" in chunk:
                k, v = chunk.split("=", 1)
                parts[k.strip()] = v.strip()
        score = int(parts.get("SCORE", "50"))
        category = parts.get("CATEGORY", "Warm")
        reason = parts.get("REASON", "Auto-scored by AI")
        if category not in ("Hot", "Warm", "Cold"):
            category = "Hot" if score >= 75 else "Warm" if score >= 40 else "Cold"
        return {"score": max(0, min(100, score)), "category": category, "reason": reason}
    except Exception as e:
        logger.warning(f"AI scoring failed, using fallback: {e}")
        # Rule-based fallback
        score = 30
        if lead.get("urgency") == "Immediate":
            score += 30
        elif lead.get("urgency") == "1-3 months":
            score += 18
        if lead.get("budget_max", 0) >= 10000000:
            score += 20
        elif lead.get("budget_max", 0) >= 5000000:
            score += 12
        if lead.get("source") in ("Referral", "NRI Network"):
            score += 15
        if lead.get("notes"):
            score += 5
        score = max(0, min(100, score))
        category = "Hot" if score >= 75 else "Warm" if score >= 40 else "Cold"
        return {"score": score, "category": category, "reason": "Auto-scored (rule-based)"}


@api.get("/leads")
async def list_leads(_=Depends(get_current_user), stage: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if stage:
        query["stage"] = stage
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return leads


@api.post("/leads")
async def create_lead(data: LeadIn, _=Depends(get_current_user)):
    lead = data.model_dump()
    lead["id"] = str(uuid.uuid4())
    lead["created_at"] = now_utc().isoformat()
    lead["updated_at"] = lead["created_at"]
    ai = await score_lead_with_ai(lead)
    lead["score"] = ai["score"]
    lead["score_category"] = ai["category"]
    lead["score_reason"] = ai["reason"]
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    return lead


@api.get("/leads/{lead_id}")
async def get_lead(lead_id: str, _=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


@api.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadUpdate, _=Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = now_utc().isoformat()
    res = await db.leads.update_one({"id": lead_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return lead


@api.post("/leads/{lead_id}/rescore")
async def rescore_lead(lead_id: str, _=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    ai = await score_lead_with_ai(lead)
    await db.leads.update_one({"id": lead_id}, {"$set": {
        "score": ai["score"], "score_category": ai["category"], "score_reason": ai["reason"], "updated_at": now_utc().isoformat()
    }})
    lead.update({"score": ai["score"], "score_category": ai["category"], "score_reason": ai["reason"]})
    return lead


@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, _=Depends(get_current_user)):
    res = await db.leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"ok": True}


# ---------- Builders ----------
@api.get("/builders")
async def list_builders(_=Depends(get_current_user)):
    return await db.builders.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/builders")
async def create_builder(data: BuilderIn, _=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc().isoformat()
    await db.builders.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/builders/{bid}")
async def delete_builder(bid: str, _=Depends(get_current_user)):
    await db.builders.delete_one({"id": bid})
    return {"ok": True}


# ---------- Projects ----------
@api.get("/projects")
async def list_projects(_=Depends(get_current_user)):
    return await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/projects")
async def create_project(data: ProjectIn, _=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc().isoformat()
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/projects/{pid}")
async def delete_project(pid: str, _=Depends(get_current_user)):
    await db.projects.delete_one({"id": pid})
    return {"ok": True}


# ---------- Site Visits ----------
@api.get("/site-visits")
async def list_visits(_=Depends(get_current_user)):
    return await db.site_visits.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)


@api.post("/site-visits")
async def create_visit(data: SiteVisitIn, _=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc().isoformat()
    await db.site_visits.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/site-visits/{vid}")
async def update_visit(vid: str, payload: dict, _=Depends(get_current_user)):
    payload = {k: v for k, v in payload.items() if v is not None}
    payload["updated_at"] = now_utc().isoformat()
    await db.site_visits.update_one({"id": vid}, {"$set": payload})
    return await db.site_visits.find_one({"id": vid}, {"_id": 0})


@api.delete("/site-visits/{vid}")
async def delete_visit(vid: str, _=Depends(get_current_user)):
    await db.site_visits.delete_one({"id": vid})
    return {"ok": True}


# ---------- Bookings ----------
@api.get("/bookings")
async def list_bookings(_=Depends(get_current_user)):
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/bookings")
async def create_booking(data: BookingIn, _=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc().isoformat()
    if not doc.get("booking_date"):
        doc["booking_date"] = doc["created_at"]
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    # If a lead_id exists, update its stage to Booked
    if doc.get("lead_id"):
        await db.leads.update_one({"id": doc["lead_id"]}, {"$set": {"stage": "Booked", "updated_at": now_utc().isoformat()}})
    return doc


@api.delete("/bookings/{bid}")
async def delete_booking(bid: str, _=Depends(get_current_user)):
    await db.bookings.delete_one({"id": bid})
    return {"ok": True}


# ---------- Inventory ----------
@api.get("/inventory")
async def list_inventory(_=Depends(get_current_user), project_id: Optional[str] = None):
    q = {"project_id": project_id} if project_id else {}
    return await db.inventory.find(q, {"_id": 0}).sort([("tower", 1), ("floor", 1), ("unit_number", 1)]).to_list(1000)


@api.post("/inventory")
async def create_inventory(data: InventoryUnitIn, _=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc().isoformat()
    await db.inventory.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/inventory/{uid}")
async def update_inventory(uid: str, payload: dict, _=Depends(get_current_user)):
    payload = {k: v for k, v in payload.items() if v is not None}
    await db.inventory.update_one({"id": uid}, {"$set": payload})
    return await db.inventory.find_one({"id": uid}, {"_id": 0})


@api.delete("/inventory/{uid}")
async def delete_inventory(uid: str, _=Depends(get_current_user)):
    await db.inventory.delete_one({"id": uid})
    return {"ok": True}


# ---------- Seed ----------
async def seed_data():
    # Admin user
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Devam Admin",
            "role": "admin",
            "password_hash": hash_password(admin_pw),
            "created_at": now_utc().isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    else:
        # Keep password aligned with env in case it changed
        if not verify_password(admin_pw, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Skip demo seeding if already done
    if await db.builders.count_documents({}) > 0:
        return

    logger.info("Seeding demo data...")

    builders = [
        {"name": "Shilp Group", "contact_person": "Mehul Shah", "phone": "+91-79-2323-1100", "email": "info@shilpgroup.in", "city": "Gandhinagar", "projects_count": 12, "rating": 4.7, "notes": "Premium residential developer in GIFT City corridor"},
        {"name": "Goyal & Co.", "contact_person": "Anjali Goyal", "phone": "+91-79-2640-5500", "email": "contact@goyalco.in", "city": "Ahmedabad", "projects_count": 18, "rating": 4.6, "notes": "Established since 1971, mixed-use developer"},
        {"name": "Adani Realty", "contact_person": "Rohit Patel", "phone": "+91-79-2555-5555", "email": "realty@adani.com", "city": "Ahmedabad", "projects_count": 24, "rating": 4.5, "notes": "Large-scale township specialist"},
        {"name": "Sangath Lifespace", "contact_person": "Kavita Joshi", "phone": "+91-79-4040-8080", "email": "sales@sangath.in", "city": "Gandhinagar", "projects_count": 7, "rating": 4.4, "notes": "Boutique luxury villas"},
    ]
    for b in builders:
        b["id"] = str(uuid.uuid4())
        b["created_at"] = now_utc().isoformat()
    await db.builders.insert_many(builders)

    projects = [
        {"name": "Shilp Aaria", "builder_id": builders[0]["id"], "builder_name": "Shilp Group", "city": "Gandhinagar", "location": "Sector 26, near GIFT City", "project_type": "Residential", "status": "Under Construction", "price_min": 8500000, "price_max": 18500000, "total_units": 240, "available_units": 86, "rera_number": "PR/GJ/GANDHINAGAR/050", "possession_date": "Dec 2026", "description": "3 & 4 BHK premium apartments with sky deck and lap pool.", "image_url": "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"},
        {"name": "Goyal Orchid Whitefield", "builder_id": builders[1]["id"], "builder_name": "Goyal & Co.", "city": "Ahmedabad", "location": "Shela, SP Ring Road", "project_type": "Residential", "status": "Ready to Move", "price_min": 6500000, "price_max": 12500000, "total_units": 380, "available_units": 42, "rating": 4.6, "rera_number": "PR/GJ/AHMEDABAD/118", "possession_date": "Ready", "description": "2 & 3 BHK with clubhouse, kids zone, and 70% open space.", "image_url": "https://images.unsplash.com/photo-1515263487990-61b07816b324?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"},
        {"name": "Adani Shantigram Pristine", "builder_id": builders[2]["id"], "builder_name": "Adani Realty", "city": "Ahmedabad", "location": "Shantigram Township, SG Highway", "project_type": "Mixed", "status": "Pre-launch", "price_min": 9500000, "price_max": 28500000, "total_units": 520, "available_units": 520, "rera_number": "PR/GJ/AHMEDABAD/220", "possession_date": "Jun 2028", "description": "Township phase 4 — 3/4/5 BHK + retail blocks.", "image_url": "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"},
        {"name": "Sangath Sentosa Villas", "builder_id": builders[3]["id"], "builder_name": "Sangath Lifespace", "city": "Gandhinagar", "location": "Sargasan, Ch. 3", "project_type": "Residential", "status": "Under Construction", "price_min": 35000000, "price_max": 75000000, "total_units": 48, "available_units": 19, "rera_number": "PR/GJ/GANDHINAGAR/091", "possession_date": "Sep 2026", "description": "4 & 5 BHK private villas with bespoke interiors.", "image_url": "https://images.unsplash.com/photo-1515263487990-61b07816b324?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"},
    ]
    for p in projects:
        p["id"] = str(uuid.uuid4())
        p["created_at"] = now_utc().isoformat()
    await db.projects.insert_many(projects)

    # Inventory for first project
    inv = []
    for tower in ["A", "B"]:
        for floor in range(1, 11):
            for unit in range(1, 5):
                status = "Available"
                if (floor + unit) % 5 == 0:
                    status = "Booked"
                elif (floor * unit) % 7 == 0:
                    status = "Blocked"
                inv.append({
                    "id": str(uuid.uuid4()),
                    "project_id": projects[0]["id"],
                    "project_name": projects[0]["name"],
                    "tower": tower,
                    "floor": floor,
                    "unit_number": f"{tower}-{floor}0{unit}",
                    "unit_type": "3BHK" if unit <= 2 else "4BHK",
                    "carpet_area": 1450 if unit <= 2 else 2150,
                    "price": 12500000 if unit <= 2 else 18500000,
                    "status": status,
                    "created_at": now_utc().isoformat(),
                })
    await db.inventory.insert_many(inv)

    # Demo leads
    demo_leads = [
        {"name": "Rakesh Pandya", "phone": "+91-98250-12345", "email": "rakesh.p@gmail.com", "source": "Referral", "budget_min": 8000000, "budget_max": 12000000, "location": "Gandhinagar Sector 26", "property_type": "Apartment", "urgency": "Immediate", "notes": "Looking for 3BHK near GIFT City, ready to book in 2 weeks. Pre-approved home loan.", "stage": "Negotiation", "project_id": projects[0]["id"]},
        {"name": "Dr. Hetal Mehta", "phone": "+91-94260-78900", "email": "dr.hetal@yahoo.com", "source": "NRI Network", "budget_min": 25000000, "budget_max": 40000000, "location": "Sargasan", "property_type": "Villa", "urgency": "1-3 months", "notes": "NRI from London. Wants premium villa with private garden. Will visit India in March.", "stage": "Site Visit", "project_id": projects[3]["id"]},
        {"name": "Arjun Desai", "phone": "+91-90990-11122", "email": "arjun.desai@hotmail.com", "source": "99acres", "budget_min": 5500000, "budget_max": 7500000, "location": "Shela", "property_type": "Apartment", "urgency": "3-6 months", "notes": "First home buyer, 2BHK preferred. Comparing 3 projects.", "stage": "Contacted", "project_id": projects[1]["id"]},
        {"name": "Pinkal Shah", "phone": "+91-98980-44556", "email": "pinkal.s@gmail.com", "source": "Walk-in", "budget_min": 12000000, "budget_max": 20000000, "location": "Shantigram", "property_type": "Penthouse", "urgency": "Immediate", "notes": "Walked into site office. Serious buyer. Wants top-floor unit with terrace.", "stage": "New", "project_id": projects[2]["id"]},
        {"name": "Nisha Trivedi", "phone": "+91-97250-66778", "email": "nisha.t@outlook.com", "source": "Facebook", "budget_min": 4000000, "budget_max": 5500000, "location": "Anywhere Ahmedabad", "property_type": "Apartment", "urgency": "6+ months", "notes": "Just exploring, budget tight, no urgency.", "stage": "New"},
        {"name": "Kunal Bhatt", "phone": "+91-90999-23457", "email": "kunal.bhatt@gmail.com", "source": "Magicbricks", "budget_min": 9000000, "budget_max": 13500000, "location": "Gandhinagar", "property_type": "Apartment", "urgency": "1-3 months", "notes": "Wants 3BHK Vastu compliant. Compared with Sangath project.", "stage": "Site Visit", "project_id": projects[0]["id"]},
        {"name": "Vihaan Goswami", "phone": "+91-93760-11199", "email": "vihaan@gmail.com", "source": "Instagram", "budget_min": 6000000, "budget_max": 8000000, "location": "Shela", "property_type": "Apartment", "urgency": "Immediate", "notes": "Saw the reel, called immediately. Wants 2BHK ready possession.", "stage": "Contacted", "project_id": projects[1]["id"]},
        {"name": "Asha Parekh", "phone": "+91-93770-88822", "email": "asha.parekh@gmail.com", "source": "Referral", "budget_min": 15000000, "budget_max": 25000000, "location": "Sargasan villa zone", "property_type": "Villa", "urgency": "3-6 months", "notes": "Referred by Dr. Mehta. Spouse joins decision-making.", "stage": "New", "project_id": projects[3]["id"]},
    ]
    for ld in demo_leads:
        ld["id"] = str(uuid.uuid4())
        ld["created_at"] = now_utc().isoformat()
        ld["updated_at"] = ld["created_at"]
        ld["assigned_to"] = "Devam Admin"
        ld["lead_name"] = ld["name"]
        # Use rule-based scoring for the seed (avoid hitting LLM during boot)
        score = 30
        if ld.get("urgency") == "Immediate":
            score += 30
        elif ld.get("urgency") == "1-3 months":
            score += 18
        if ld.get("budget_max", 0) >= 10000000:
            score += 20
        elif ld.get("budget_max", 0) >= 5000000:
            score += 12
        if ld.get("source") in ("Referral", "NRI Network"):
            score += 15
        if ld.get("notes"):
            score += 5
        score = max(0, min(100, score))
        ld["score"] = score
        ld["score_category"] = "Hot" if score >= 75 else "Warm" if score >= 40 else "Cold"
        ld["score_reason"] = "Seeded — rule-based"
    await db.leads.insert_many(demo_leads)

    # Site visits
    visits = [
        {"lead_id": demo_leads[0]["id"], "lead_name": demo_leads[0]["name"], "project_id": projects[0]["id"], "project_name": projects[0]["name"], "scheduled_at": (now_utc() + timedelta(days=2)).isoformat(), "assigned_agent": "Riya Patel", "status": "Scheduled", "feedback": ""},
        {"lead_id": demo_leads[1]["id"], "lead_name": demo_leads[1]["name"], "project_id": projects[3]["id"], "project_name": projects[3]["name"], "scheduled_at": (now_utc() + timedelta(days=5)).isoformat(), "assigned_agent": "Karan Joshi", "status": "Scheduled", "feedback": ""},
        {"lead_id": demo_leads[5]["id"], "lead_name": demo_leads[5]["name"], "project_id": projects[0]["id"], "project_name": projects[0]["name"], "scheduled_at": (now_utc() - timedelta(days=1)).isoformat(), "assigned_agent": "Riya Patel", "status": "Completed", "feedback": "Liked the 3BHK in tower B. Will discuss with family."},
    ]
    for v in visits:
        v["id"] = str(uuid.uuid4())
        v["created_at"] = now_utc().isoformat()
    await db.site_visits.insert_many(visits)

    # Bookings
    bookings = [
        {"id": str(uuid.uuid4()), "lead_id": demo_leads[0]["id"], "lead_name": demo_leads[0]["name"], "project_id": projects[0]["id"], "project_name": projects[0]["name"], "unit_number": "A-501", "booking_amount": 500000, "total_value": 11800000, "booking_date": (now_utc() - timedelta(days=3)).isoformat(), "status": "Token", "created_at": now_utc().isoformat()},
    ]
    await db.bookings.insert_many(bookings)

    logger.info("Demo data seeded.")


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.leads.create_index("id", unique=True)
        await db.projects.create_index("id", unique=True)
        await db.builders.create_index("id", unique=True)
        await db.site_visits.create_index("id", unique=True)
        await db.bookings.create_index("id", unique=True)
        await db.inventory.create_index("id", unique=True)
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")
    await seed_data()


@api.get("/")
async def root():
    return {"app": "DEVAM Real Estate CRM", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
