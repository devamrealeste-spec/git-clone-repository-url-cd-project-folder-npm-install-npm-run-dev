"""DEVAM CRM Iteration 2 backend tests: edit-in-place, activities, public leads, bulk inventory, RBAC."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agent-leads-11.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@devam.com")
ADMIN_PASS = os.environ.get("ADMIN_PASSWORD", "Admin@123")


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def some_project(admin_headers):
    r = requests.get(f"{API}/projects", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    projs = r.json()
    assert len(projs) > 0
    return projs[0]


@pytest.fixture(scope="session")
def some_builder(admin_headers):
    r = requests.get(f"{API}/builders", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    bs = r.json()
    assert len(bs) > 0
    return bs[0]


# ---------- Builders PATCH ----------
class TestBuildersPatch:
    def test_patch_builder(self, admin_headers, some_builder):
        bid = some_builder["id"]
        new_notes = f"TEST_updated_{uuid.uuid4().hex[:6]}"
        r = requests.patch(f"{API}/builders/{bid}", headers=admin_headers, json={"notes": new_notes}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["notes"] == new_notes
        # verify persistence
        r2 = requests.get(f"{API}/builders", headers=admin_headers, timeout=15)
        match = [b for b in r2.json() if b["id"] == bid][0]
        assert match["notes"] == new_notes

    def test_patch_builder_404(self, admin_headers):
        r = requests.patch(f"{API}/builders/nonexistent-id", headers=admin_headers, json={"notes": "x"}, timeout=15)
        assert r.status_code == 404


# ---------- Projects PATCH + public GET ----------
class TestProjectsPatchAndPublicGet:
    def test_patch_project(self, admin_headers, some_project):
        pid = some_project["id"]
        new_desc = f"TEST_proj_desc_{uuid.uuid4().hex[:6]}"
        r = requests.patch(f"{API}/projects/{pid}", headers=admin_headers, json={"description": new_desc}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["description"] == new_desc

    def test_get_project_public_no_auth(self, some_project):
        pid = some_project["id"]
        r = requests.get(f"{API}/projects/{pid}", timeout=15)  # no auth
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == pid
        assert "name" in data

    def test_get_project_404(self):
        r = requests.get(f"{API}/projects/nope-id", timeout=15)
        assert r.status_code == 404


# ---------- Lead Activities ----------
class TestLeadActivities:
    @pytest.fixture(scope="class")
    def lead_id(self, admin_headers):
        # create a lead
        payload = {
            "name": "TEST_Activity Lead",
            "phone": "+91-99999-00001",
            "source": "Website",
            "budget_min": 5000000,
            "budget_max": 9000000,
            "urgency": "Immediate",
            "property_type": "Apartment",
            "notes": "TEST"
        }
        r = requests.post(f"{API}/leads", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_add_and_list_activities(self, admin_headers, lead_id):
        for typ, content in [("Note", "First note"), ("Call", "Called once"), ("WhatsApp", "WA sent"), ("Email", "Mail sent"), ("Meeting", "Met today")]:
            r = requests.post(f"{API}/leads/{lead_id}/activities", headers=admin_headers, json={"type": typ, "content": content}, timeout=15)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["type"] == typ
            assert d["content"] == content

        r = requests.get(f"{API}/leads/{lead_id}/activities", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 5
        # newest first
        ts = [it["created_at"] for it in items]
        assert ts == sorted(ts, reverse=True)

    def test_delete_activity(self, admin_headers, lead_id):
        r = requests.post(f"{API}/leads/{lead_id}/activities", headers=admin_headers, json={"type": "Note", "content": "to-delete"}, timeout=15)
        aid = r.json()["id"]
        r2 = requests.delete(f"{API}/leads/{lead_id}/activities/{aid}", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        items = requests.get(f"{API}/leads/{lead_id}/activities", headers=admin_headers, timeout=15).json()
        assert all(it["id"] != aid for it in items)


# ---------- Public Leads ----------
class TestPublicLeads:
    def test_create_public_lead_no_auth(self, admin_headers, some_project):
        unique = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Public_{unique}",
            "phone": "+91-90000-12345",
            "email": f"pub_{unique}@test.com",
            "budget_min": 8000000,
            "budget_max": 15000000,
            "urgency": "Immediate",
            "property_type": "Apartment",
            "notes": "from capture page",
            "project_id": some_project["id"],
            "source": "Website",
        }
        r = requests.post(f"{API}/public/leads", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["score_category"] in ("Hot", "Warm", "Cold")
        # verify in admin list
        leads = requests.get(f"{API}/leads", headers=admin_headers, timeout=15).json()
        match = [ld for ld in leads if ld["name"] == payload["name"]]
        assert len(match) == 1
        assert match[0]["stage"] == "New"
        assert "score" in match[0]


# ---------- Inventory bulk ----------
class TestInventoryBulk:
    def test_bulk_create(self, admin_headers, some_project):
        # use a brand-new project to avoid count collisions
        proj_payload = {"name": f"TEST_BulkProj_{uuid.uuid4().hex[:6]}", "builder_name": "TEST", "city": "Gandhinagar"}
        rp = requests.post(f"{API}/projects", headers=admin_headers, json=proj_payload, timeout=15)
        assert rp.status_code == 200
        pid = rp.json()["id"]

        body = {"project_id": pid, "towers": ["A", "B"], "floors_per_tower": 5, "units_per_floor": 4}
        r = requests.post(f"{API}/inventory/bulk", headers=admin_headers, json=body, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["created"] == 40

        r2 = requests.get(f"{API}/inventory?project_id={pid}", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        assert len(r2.json()) == 40

    def test_bulk_invalid_project(self, admin_headers):
        r = requests.post(f"{API}/inventory/bulk", headers=admin_headers, json={"project_id": "nope", "towers": ["A"], "floors_per_tower": 1, "units_per_floor": 1}, timeout=15)
        assert r.status_code == 404


# ---------- Users RBAC ----------
class TestUsersRBAC:
    def test_list_users_admin(self, admin_headers):
        r = requests.get(f"{API}/users", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert any(u["email"] == ADMIN_EMAIL for u in r.json())

    def test_create_update_delete_user_flow(self, admin_headers):
        unique = uuid.uuid4().hex[:6]
        email = f"test_agent_{unique}@devam.com"
        # create
        r = requests.post(f"{API}/users", headers=admin_headers, json={
            "email": email, "name": "TEST Agent", "password": "Agent@123", "role": "sales_agent"
        }, timeout=15)
        assert r.status_code == 200, r.text
        new_user = r.json()
        assert new_user["role"] == "sales_agent"
        uid = new_user["id"]

        # update role
        r2 = requests.patch(f"{API}/users/{uid}", headers=admin_headers, json={"role": "sales_manager"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["role"] == "sales_manager"

        # non-admin cannot list users
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": "Agent@123"}, timeout=15)
        assert login.status_code == 200, login.text
        agent_token = login.json()["access_token"]
        agent_h = {"Authorization": f"Bearer {agent_token}"}
        rL = requests.get(f"{API}/users", headers=agent_h, timeout=15)
        assert rL.status_code == 403
        rC = requests.post(f"{API}/users", headers=agent_h, json={"email": "x@x.com", "name": "x", "password": "x", "role": "viewer"}, timeout=15)
        assert rC.status_code == 403

        # delete the new user
        rd = requests.delete(f"{API}/users/{uid}", headers=admin_headers, timeout=15)
        assert rd.status_code == 200

    def test_admin_cannot_delete_self(self, admin_headers, admin_token):
        import jwt as _jwt
        payload = _jwt.decode(admin_token, options={"verify_signature": False})
        my_id = payload["sub"]
        r = requests.delete(f"{API}/users/{my_id}", headers=admin_headers, timeout=15)
        assert r.status_code == 400

    def test_cannot_delete_seeded_admin(self, admin_headers):
        # find admin by listing - but admin_cannot_delete_self covers same record (seeded admin == self for this token)
        # create a 2nd admin, login as that admin, then try to delete admin@devam.com
        unique = uuid.uuid4().hex[:6]
        email = f"second_admin_{unique}@devam.com"
        r = requests.post(f"{API}/users", headers=admin_headers, json={
            "email": email, "name": "Second Admin", "password": ADMIN_PASS, "role": "admin"
        }, timeout=15)
        assert r.status_code == 200
        new_admin = r.json()
        # login as the new admin
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": ADMIN_PASS}, timeout=15)
        new_admin_h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # find seeded admin id
        users = requests.get(f"{API}/users", headers=admin_headers, timeout=15).json()
        seeded = [u for u in users if u["email"] == ADMIN_EMAIL][0]
        rd = requests.delete(f"{API}/users/{seeded['id']}", headers=new_admin_h, timeout=15)
        assert rd.status_code == 400, rd.text

        # cleanup the 2nd admin
        requests.delete(f"{API}/users/{new_admin['id']}", headers=admin_headers, timeout=15)


# ---------- Regression: iter1 flows ----------
class TestRegression:
    def test_dashboard_stats(self, admin_headers):
        r = requests.get(f"{API}/dashboard/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and "funnel" in d

    def test_lead_create_with_ai(self, admin_headers):
        payload = {"name": f"TEST_Regress_{uuid.uuid4().hex[:6]}", "phone": "+91-90000-99999", "urgency": "Immediate", "budget_min": 5000000, "budget_max": 10000000}
        r = requests.post(f"{API}/leads", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "score" in d and "score_category" in d
