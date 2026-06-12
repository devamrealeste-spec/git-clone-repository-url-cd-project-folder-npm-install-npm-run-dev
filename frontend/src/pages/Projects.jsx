import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, X, Trash2, MapPin, Edit2, Share2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Pre-launch", "Under Construction", "Ready to Move", "Sold Out"];
const TYPES = ["Residential", "Commercial", "Mixed"];

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [builders, setBuilders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [p, b] = await Promise.all([api.get("/projects"), api.get("/builders")]);
    setProjects(p.data);
    setBuilders(b.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    await api.delete(`/projects/${id}`);
    setProjects((p) => p.filter((x) => x.id !== id));
    toast.success("Project deleted");
  };

  const statusClass = (s) => {
    if (s === "Ready to Move") return "bg-[#3E7B7A]/10 text-[#3E7B7A] border-[#3E7B7A]/20";
    if (s === "Pre-launch") return "bg-[#C25934]/10 text-[#C25934] border-[#C25934]/20";
    if (s === "Sold Out") return "bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/20";
    return "bg-[#D97B29]/10 text-[#D97B29] border-[#D97B29]/20";
  };

  return (
    <div className="space-y-6" data-testid="projects-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Projects</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Project Portfolio</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Every tower, every floor, every flat — under one roof.</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium"
          data-testid="add-project-button"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-white border border-[#E6E4DF] hover-lift overflow-hidden" data-testid={`project-card-${p.id}`}>
            {p.image_url && (
              <div className="aspect-[16/10] overflow-hidden border-b border-[#E6E4DF]">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xxs uppercase tracking-widest text-[#8A8782]">{p.builder_name || "—"}</div>
                  <div className="font-display text-xl mt-1 leading-tight">{p.name}</div>
                </div>
                <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusClass(p.status)}`}>
                  {p.status}
                </span>
              </div>
              <div className="text-xs text-[#5C5A55] mt-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> {p.location || p.city}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#E6E4DF]">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#8A8782]">Price</div>
                  <div className="text-xs font-mono mt-1">{fmtINR(p.price_min)}+</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#8A8782]">Available</div>
                  <div className="kpi-num text-lg">{p.available_units}/{p.total_units}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#8A8782]">Possession</div>
                  <div className="text-xs mt-1">{p.possession_date || "—"}</div>
                </div>
              </div>
              {p.rera_number && <div className="text-[10px] text-[#8A8782] mt-3 font-mono">RERA · {p.rera_number}</div>}
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => setEditing(p)} className="text-xs text-[#5C5A55] hover:text-[#C25934] inline-flex items-center gap-1" data-testid={`project-edit-${p.id}`}>
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/capture/${p.id}`;
                    navigator.clipboard?.writeText(url);
                    toast.success("Public lead form link copied");
                  }}
                  className="text-xs text-[#5C5A55] hover:text-[#C25934] inline-flex items-center gap-1"
                  data-testid={`project-share-${p.id}`}
                >
                  <Share2 className="w-3 h-3" /> Share form
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-xs text-[#5C5A55] hover:text-[#D9423E] inline-flex items-center gap-1 ml-auto" data-testid={`project-delete-${p.id}`}>
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <div className="text-center py-16 text-sm text-[#8A8782] border border-dashed border-[#E6E4DF]">
          No projects yet. Click "New Project" to add your first.
        </div>
      )}

      {editing && (
        <ProjectForm
          initial={editing === "new" ? null : editing}
          builders={builders}
          onClose={() => setEditing(null)}
          onSaved={(p, isNew) => {
            if (isNew) setProjects((prev) => [p, ...prev]);
            else setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
            toast.success(isNew ? "Project added" : "Project updated");
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({ initial, builders, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    builder_id: initial?.builder_id || "",
    builder_name: initial?.builder_name || "",
    city: initial?.city || "Gandhinagar",
    location: initial?.location || "",
    project_type: initial?.project_type || "Residential",
    status: initial?.status || "Under Construction",
    price_min: initial?.price_min ?? "",
    price_max: initial?.price_max ?? "",
    total_units: initial?.total_units ?? "",
    available_units: initial?.available_units ?? "",
    rera_number: initial?.rera_number || "",
    possession_date: initial?.possession_date || "",
    description: initial?.description || "",
    image_url: initial?.image_url || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price_min: parseFloat(form.price_min) || 0,
        price_max: parseFloat(form.price_max) || 0,
        total_units: parseInt(form.total_units) || 0,
        available_units: parseInt(form.available_units) || 0,
      };
      const b = builders.find((x) => x.id === payload.builder_id);
      if (b) payload.builder_name = b.name;
      if (isEdit) {
        const { data } = await api.patch(`/projects/${initial.id}`, payload);
        onSaved(data, false);
      } else {
        const { data } = await api.post("/projects", payload);
        onSaved(data, true);
      }
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="font-display text-2xl">New Project</div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project name" required>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="project-form-name" />
          </Field>
          <Field label="Builder">
            <select value={form.builder_id} onChange={(e) => set("builder_id", e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {builders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Type">
            <select value={form.project_type} onChange={(e) => set("project_type", e.target.value)} className={inputCls}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Price min (₹)">
            <input type="number" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Price max (₹)">
            <input type="number" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Total units">
            <input type="number" value={form.total_units} onChange={(e) => set("total_units", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Available units">
            <input type="number" value={form.available_units} onChange={(e) => set("available_units", e.target.value)} className={inputCls} />
          </Field>
          <Field label="RERA number">
            <input value={form.rera_number} onChange={(e) => set("rera_number", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Possession date">
            <input value={form.possession_date} onChange={(e) => set("possession_date", e.target.value)} placeholder="e.g. Dec 2026" className={inputCls} />
          </Field>
          <Field label="Image URL" className="sm:col-span-2">
            <input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white" data-testid="project-form-submit">{isEdit ? "Save changes" : "Save project"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">{label}{required && <span className="text-[#C25934]"> *</span>}</div>
      {children}
    </label>
  );
}
