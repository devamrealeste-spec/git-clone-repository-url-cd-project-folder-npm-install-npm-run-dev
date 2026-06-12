import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

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

  useEffect(() => {
    api.get("/projects").then((r) => {
      setProjects(r.data);
      if (r.data[0]) setProjectId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get("/inventory", { params: { project_id: projectId } }).then((r) => {
      setUnits(r.data);
      setLoading(false);
    });
  }, [projectId]);

  const grouped = useMemo(() => {
    const m = {};
    units.forEach((u) => {
      m[u.tower] = m[u.tower] || {};
      m[u.tower][u.floor] = m[u.tower][u.floor] || [];
      m[u.tower][u.floor].push(u);
    });
    return m;
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
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934]" data-testid="inventory-project-select">
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
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
        {Object.entries(grouped).sort().map(([tower, floors]) => (
          <div key={tower} className="bg-white border border-[#E6E4DF] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Tower</div>
                <div className="font-display text-3xl">{tower}</div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.keys(floors).sort((a, b) => parseInt(b) - parseInt(a)).map((floor) => (
                <div key={floor} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xxs uppercase tracking-widest text-[#8A8782] font-mono">Floor {floor}</div>
                  <div className="col-span-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {floors[floor].sort((a, b) => a.unit_number.localeCompare(b.unit_number)).map((u) => (
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
    </div>
  );
}
