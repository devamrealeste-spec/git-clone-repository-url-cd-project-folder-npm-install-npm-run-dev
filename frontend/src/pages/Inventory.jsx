import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Boxes, X } from "lucide-react";

const STATUSES = ["Available", "Blocked", "Booked", "Sold"];

const statusCls = {
  Available: "bg-white text-[#1A1A1A] border-[#E6E4DF] hover:border-[#C25934]",
  Blocked: "bg-[#D97B29]/15 text-[#D97B29] border-[#D97B29]/30",
  Booked: "bg-[#3E7B7A]/15 text-[#3E7B7A] border-[#3E7B7A]/30",
  Sold: "bg-[#1A1A1A] text-[#F9F6F0] border-[#1A1A1A]",
};

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function Inventory() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api.get("/projects");
      setProjects(r.data);
      if (!r.data.length) return;
      // Default to the first project that actually has inventory; fall back to the first project.
      let chosen = r.data[0].id;
      for (const p of r.data) {
        const inv = await api.get("/inventory", { params: { project_id: p.id } });
        if (inv.data.length > 0) { chosen = p.id; break; }
      }
      setProjectId(chosen);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get("/inventory", { params: { project_id: projectId } }).then((r) => {
      setUnits(r.data);
      setLoading(false);
    });
  }, [projectId]);

  // Pre-sorted nested structure: [[tower, [[floor, [units sorted by unit_number]]]]]
  // sorted by tower asc, floor desc, unit_number asc — so JSX iterates without extra work.
  const groupedSorted = useMemo(() => {
    const byTower = {};
    units.forEach((u) => {
      byTower[u.tower] = byTower[u.tower] || {};
      byTower[u.tower][u.floor] = byTower[u.tower][u.floor] || [];
      byTower[u.tower][u.floor].push(u);
    });
    return Object.entries(byTower)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tower, floors]) => [
        tower,
        Object.entries(floors)
          .sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
          .map(([floor, list]) => [
            floor,
            [...list].sort((a, b) => a.unit_number.localeCompare(b.unit_number)),
          ]),
      ]);
  }, [units]);

  const counts = useMemo(() => {
    const c = { Available: 0, Blocked: 0, Booked: 0, Sold: 0 };
    units.forEach((u) => { c[u.status] = (c[u.status] || 0) + 1; });
    return c;
  }, [units]);

  const cycleStatus = async (u) => {
    const i = STATUSES.indexOf(u.status);
    const next = STATUSES[(i + 1) % STATUSES.length];
    try {
      const { data } = await api.patch(`/inventory/${u.id}`, { status: next });
      setUnits((prev) => prev.map((x) => (x.id === u.id ? data : x)));
    } catch {
      toast.error("Could not update");
    }
  };

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6" data-testid="inventory-view">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Inventory</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Live Inventory</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Click any unit to cycle through Available → Blocked → Booked → Sold.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934]" data-testid="inventory-project-select">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={() => setShowBulk(true)}
            disabled={!projectId}
            className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            data-testid="inventory-bulk-button"
          >
            <Boxes className="w-4 h-4" strokeWidth={1.5} /> Bulk generate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map((s) => (
          <div key={s} className={`border p-4 ${statusCls[s]}`}>
            <div className="text-xxs uppercase tracking-widest opacity-80">{s}</div>
            <div className="kpi-num text-3xl mt-2">{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      {currentProject && (
        <div className="text-xs text-[#8A8782]">
          Showing {units.length} units in <span className="font-medium text-[#1A1A1A]">{currentProject.name}</span> · {currentProject.location}
        </div>
      )}

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      {!loading && units.length === 0 && (
        <div className="border border-dashed border-[#E6E4DF] py-16 text-center text-sm text-[#8A8782]">
          No inventory units found for this project.
        </div>
      )}

      <div className="space-y-8">
        {groupedSorted.map(([tower, floors]) => (
          <div key={tower} className="bg-white border border-[#E6E4DF] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Tower</div>
                <div className="font-display text-3xl">{tower}</div>
              </div>
            </div>
            <div className="space-y-2">
              {floors.map(([floor, floorUnits]) => (
                <div key={floor} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xxs uppercase tracking-widest text-[#8A8782] font-mono">Floor {floor}</div>
                  <div className="col-span-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {floorUnits.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => cycleStatus(u)}
                        title={`${u.unit_type} · ${u.carpet_area} sqft · ${fmtINR(u.price)}`}
                        className={`border px-2 py-2 text-xs font-mono transition-all ${statusCls[u.status]}`}
                        data-testid={`unit-${u.unit_number}`}
                      >
                        <div>{u.unit_number}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{u.unit_type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showBulk && (
        <BulkInventoryForm
          projectId={projectId}
          projectName={currentProject?.name}
          onClose={() => setShowBulk(false)}
          onCreated={(count) => {
            setShowBulk(false);
            toast.success(`${count} units generated`);
            // refresh
            api.get("/inventory", { params: { project_id: projectId } }).then((r) => setUnits(r.data));
          }}
        />
      )}
    </div>
  );
}

function BulkInventoryForm({ projectId, projectName, onClose, onCreated }) {
  const [form, setForm] = useState({
    towers: "A,B",
    floors_per_tower: 10,
    units_per_floor: 4,
    unit_type: "2BHK",
    carpet_area: 1200,
    price: 8000000,
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalUnits = (form.towers.split(",").filter(Boolean).length) * Number(form.floors_per_tower) * Number(form.units_per_floor);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        project_id: projectId,
        towers: form.towers.split(",").map((t) => t.trim()).filter(Boolean),
        floors_per_tower: parseInt(form.floors_per_tower) || 1,
        units_per_floor: parseInt(form.units_per_floor) || 1,
        unit_type: form.unit_type,
        carpet_area: parseFloat(form.carpet_area) || 0,
        price: parseFloat(form.price) || 0,
      };
      const { data } = await api.post("/inventory/bulk", payload);
      onCreated(data.created);
    } catch {
      toast.error("Could not generate inventory");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-xl" data-testid="bulk-inventory-modal">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div>
            <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ Bulk inventory</div>
            <div className="font-display text-2xl mt-1">Generate units in {projectName}</div>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Towers (comma separated)</div>
            <input value={form.towers} onChange={(e) => set("towers", e.target.value)} className={inputCls} placeholder="A,B,C" data-testid="bulk-towers" />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Floors per tower</div>
            <input type="number" min="1" value={form.floors_per_tower} onChange={(e) => set("floors_per_tower", e.target.value)} className={inputCls} data-testid="bulk-floors" />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Units per floor</div>
            <input type="number" min="1" value={form.units_per_floor} onChange={(e) => set("units_per_floor", e.target.value)} className={inputCls} data-testid="bulk-units-per-floor" />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Unit type</div>
            <input value={form.unit_type} onChange={(e) => set("unit_type", e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Carpet area (sqft)</div>
            <input type="number" value={form.carpet_area} onChange={(e) => set("carpet_area", e.target.value)} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Price per unit (₹)</div>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
          </label>
          <div className="sm:col-span-2 text-sm bg-[#C25934]/10 border border-[#C25934]/30 px-4 py-3">
            Will generate <span className="kpi-num text-lg text-[#C25934]">{totalUnits}</span> units — all marked Available.
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white disabled:opacity-60" data-testid="bulk-submit">
              {submitting ? "Generating…" : `Generate ${totalUnits} units`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
