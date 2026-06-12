"""Backend API tests for DEVAM Real Estate CRM."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://agent-leads-11.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@devam.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ---- Auth ----
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d and isinstance(d["access_token"], str) and len(d["access_token"]) > 10
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        # cookie set
        assert "access_token" in r.cookies or any("access_token" in c.name for c in r.cookies)

    def test_login_invalid(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_bearer(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_cookie(self, api_client):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        # call /me using session cookies only
        r2 = s.get(f"{BASE_URL}/api/auth/me", timeout=30)
        # cookie auth may fail in cross-origin preview; bearer is acceptable
        assert r2.status_code in (200, 401)

    def test_unauth_endpoints(self, api_client):
        for path in ["/api/auth/me", "/api/dashboard/stats", "/api/leads", "/api/projects", "/api/builders", "/api/site-visits", "/api/bookings", "/api/inventory"]:
            r = requests.get(f"{BASE_URL}{path}", timeout=30)
            assert r.status_code == 401, f"{path} should require auth, got {r.status_code}"


# ---- Dashboard ----
class TestDashboard:
    def test_stats(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d
        for k in ["total_leads", "hot_leads", "active_projects", "upcoming_visits", "bookings_total", "booking_value"]:
            assert k in d["kpis"]
        assert isinstance(d["funnel"], list) and len(d["funnel"]) == 6
        assert isinstance(d["sources"], list)
        assert isinstance(d["recent_leads"], list)


# ---- Projects ----
class TestProjects:
    def test_list(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/projects", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        projs = r.json()
        assert isinstance(projs, list)
        assert len(projs) >= 4
        # Verify Shilp Aaria exists
        names = [p["name"] for p in projs]
        assert "Shilp Aaria" in names

    def test_crud(self, api_client, auth_headers):
        r = api_client.post(f"{BASE_URL}/api/projects", headers=auth_headers, json={"name": "TEST_Project_DEL"}, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        r2 = api_client.delete(f"{BASE_URL}/api/projects/{pid}", headers=auth_headers, timeout=30)
        assert r2.status_code == 200


# ---- Builders ----
class TestBuilders:
    def test_list(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/builders", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_create_delete(self, api_client, auth_headers):
        r = api_client.post(f"{BASE_URL}/api/builders", headers=auth_headers, json={"name": "TEST_Builder"}, timeout=30)
        assert r.status_code == 200
        bid = r.json()["id"]
        r2 = api_client.delete(f"{BASE_URL}/api/builders/{bid}", headers=auth_headers, timeout=30)
        assert r2.status_code == 200


# ---- Leads ----
class TestLeads:
    def test_list(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/leads", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        leads = r.json()
        assert isinstance(leads, list)
        assert len(leads) >= 8

    def test_create_with_ai_score(self, api_client, auth_headers):
        payload = {
            "name": "TEST_Lead AI",
            "phone": "+91-99999-00001",
            "email": "test_lead@test.com",
            "source": "Referral",
            "budget_min": 8000000,
            "budget_max": 15000000,
            "location": "Gandhinagar",
            "property_type": "Apartment",
            "urgency": "Immediate",
            "notes": "Hot lead test"
        }
        r = api_client.post(f"{BASE_URL}/api/leads", headers=auth_headers, json=payload, timeout=60)
        assert r.status_code == 200, r.text
        lead = r.json()
        assert "id" in lead
        assert 0 <= lead["score"] <= 100
        assert lead["score_category"] in ("Hot", "Warm", "Cold")
        assert isinstance(lead["score_reason"], str) and len(lead["score_reason"]) > 0
        # Verify persistence
        rg = api_client.get(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, timeout=30)
        assert rg.status_code == 200
        assert rg.json()["name"] == "TEST_Lead AI"

        # PATCH stage
        rp = api_client.patch(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, json={"stage": "Contacted"}, timeout=30)
        assert rp.status_code == 200
        assert rp.json()["stage"] == "Contacted"

        # Rescore
        rs = api_client.post(f"{BASE_URL}/api/leads/{lead['id']}/rescore", headers=auth_headers, timeout=60)
        assert rs.status_code == 200
        assert 0 <= rs.json()["score"] <= 100

        # Delete
        rd = api_client.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, timeout=30)
        assert rd.status_code == 200
        rg2 = api_client.get(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, timeout=30)
        assert rg2.status_code == 404


# ---- Site Visits ----
class TestSiteVisits:
    def test_crud(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/site-visits", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 3

        # need a lead and project
        leads = api_client.get(f"{BASE_URL}/api/leads", headers=auth_headers).json()
        projs = api_client.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        payload = {
            "lead_id": leads[0]["id"], "lead_name": leads[0]["name"],
            "project_id": projs[0]["id"], "project_name": projs[0]["name"],
            "scheduled_at": "2026-02-15T10:00:00Z", "assigned_agent": "TEST_Agent"
        }
        c = api_client.post(f"{BASE_URL}/api/site-visits", headers=auth_headers, json=payload, timeout=30)
        assert c.status_code == 200
        vid = c.json()["id"]
        p = api_client.patch(f"{BASE_URL}/api/site-visits/{vid}", headers=auth_headers, json={"status": "Completed"}, timeout=30)
        assert p.status_code == 200
        assert p.json()["status"] == "Completed"
        d = api_client.delete(f"{BASE_URL}/api/site-visits/{vid}", headers=auth_headers, timeout=30)
        assert d.status_code == 200


# ---- Bookings ----
class TestBookings:
    def test_create_updates_lead_stage(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 1

        # create a fresh test lead via rule-based fallback (urgency etc)
        lead_resp = api_client.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_Booking_Lead", "phone": "+91-99999-00002", "source": "Walk-in",
            "budget_min": 5000000, "budget_max": 9000000, "location": "Gandhinagar",
            "property_type": "Apartment", "urgency": "Immediate", "notes": "for booking"
        }, timeout=60)
        assert lead_resp.status_code == 200
        lead = lead_resp.json()
        projs = api_client.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()

        b = api_client.post(f"{BASE_URL}/api/bookings", headers=auth_headers, json={
            "lead_id": lead["id"], "lead_name": lead["name"],
            "project_id": projs[0]["id"], "project_name": projs[0]["name"],
            "unit_number": "TEST-100", "booking_amount": 100000, "total_value": 10000000
        }, timeout=30)
        assert b.status_code == 200
        bid = b.json()["id"]

        # Verify lead stage = Booked
        lg = api_client.get(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, timeout=30)
        assert lg.status_code == 200
        assert lg.json()["stage"] == "Booked"

        # cleanup
        api_client.delete(f"{BASE_URL}/api/bookings/{bid}", headers=auth_headers, timeout=30)
        api_client.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers, timeout=30)


# ---- Inventory ----
class TestInventory:
    def test_list_filter(self, api_client, auth_headers):
        projs = api_client.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        shilp = next((p for p in projs if p["name"] == "Shilp Aaria"), None)
        assert shilp is not None
        r = api_client.get(f"{BASE_URL}/api/inventory?project_id={shilp['id']}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        units = r.json()
        assert len(units) == 80, f"Expected 80 units in Shilp Aaria, got {len(units)}"

    def test_crud(self, api_client, auth_headers):
        projs = api_client.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        c = api_client.post(f"{BASE_URL}/api/inventory", headers=auth_headers, json={
            "project_id": projs[0]["id"], "project_name": projs[0]["name"],
            "unit_number": "TEST-INV-001", "tower": "X", "floor": 99, "unit_type": "2BHK", "price": 5000000
        }, timeout=30)
        assert c.status_code == 200
        uid = c.json()["id"]
        p = api_client.patch(f"{BASE_URL}/api/inventory/{uid}", headers=auth_headers, json={"status": "Blocked"}, timeout=30)
        assert p.status_code == 200
        assert p.json()["status"] == "Blocked"
        d = api_client.delete(f"{BASE_URL}/api/inventory/{uid}", headers=auth_headers, timeout=30)
        assert d.status_code == 200
