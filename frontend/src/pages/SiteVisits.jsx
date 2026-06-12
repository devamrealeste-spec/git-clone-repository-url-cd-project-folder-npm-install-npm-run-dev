import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, X, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Scheduled", "Completed", "No-show", "Cancelled"];
const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SiteVisits() {
  const [visits, setVisits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [v, l, p] = await Promise.all([api.get("/site-visits"), api.get("/leads"), api.get("/projects")]);
    setVisits(v.data);
    setLeads(l.data);
    setProjects(p.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    const { data } = await api.patch(`/site-visits/${id}`, { status });
    setVisits((prev) => prev.map((x) => (x.id === id ? data : x)));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete?")) return;
    await api.delete(`/site-visits/${id}`);
    setVisits((p) => p.filter((x) => x.id !== id));
  };

  const statusCls = (s) => ({
    "Scheduled": "bg-[#D97B29]/10 text-[#D97B29] border-[#D97B29]/20",
    "Completed": "bg-[#3E7B7A]/10 text-[#3E7B7A] border-[#3E7B7A]/20",
    "No-show": "bg-[#D9423E]/10 text-[#D9423E] border-[#D9423E]/20",
    "Cancelled": "bg-[#8A8782]/10 text-[#8A8782] border-[#8A8782]/20",
  }[s] || "");

  return (
    <div className="space-y-6" data-testid="site-visits-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Site Visits</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Site Visits</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Schedule tours, assign agents, capture feedback.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium" data-testid="add-visit-button">
          <Plus className="w-4 h-4" /> Schedule visit
        </button>
      </div>

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      <div className="bg-white border border-[#E6E4DF]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-5 font-medium">Lead</th>
              <th className="py-3 px-5 font-medium">Project</th>
              <th className="py-3 px-5 font-medium">Agent</th>
              <th className="py-3 px-5 font-medium">When</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th className="py-3 px-5 font-medium">Feedback</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50" data-testid={`visit-row-${v.id}`}>
                <td className="py-4 px-5 text-sm">{v.lead_name || "—"}</td>
                <td className="py-4 px-5 text-sm">{v.project_name || "—"}</td>
                <td className="py-4 px-5 text-sm">{v.assigned_agent || "—"}</td>
                <td className="py-4 px-5 text-sm font-mono">{fmtDate(v.scheduled_at)}</td>
                <td className="py-4 px-5">
                  <select value={v.status} onChange={(e) => setStatus(v.id, e.target.value)} className={`text-xs border px-2 py-1 ${statusCls(v.status)}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-4 px-5 text-xs text-[#5C5A55] max-w-[260px] truncate" title={v.feedback}>{v.feedback || "—"}</td>
                <td className="py-4 px-5 text-right">
                  <button onClick={() => handleDelete(v.id)} className="text-[#5C5A55] hover:text-[#D9423E]" data-testid={`visit-delete-${v.id}`}>
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </td>
              </tr>
            ))}
            {visits.length === 0 && !loading && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-[#8A8782]">No visits scheduled.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <VisitForm
          leads={leads}
          projects={projects}
          onClose={() => setShowForm(false)}
          onCreated={(v) => {
            setVisits((p) => [v, ...p]);
            setShowForm(false);
            toast.success("Site visit scheduled");
          }}
        />
      )}
    </div>
  );
}

function VisitForm({ leads, projects, onClose, onCreated }) {
  const [form, setForm] = useState({
    lead_id: "", lead_name: "", project_id: "", project_name: "",
    scheduled_at: "", assigned_agent: "", feedback: "", status: "Scheduled",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const lead = leads.find((x) => x.id === form.lead_id);
    const proj = projects.find((x) => x.id === form.project_id);
    if (!lead) return toast.error("Pick a lead");
    if (!form.scheduled_at) return toast.error("Pick a date/time");
    const payload = {
      ...form,
      lead_name: lead.name,
      project_name: proj ? proj.name : "",
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };
    const { data } = await api.post("/site-visits", payload);
    onCreated(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-xl">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="font-display text-2xl">Schedule Site Visit</div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lead" required>
            <select required value={form.lead_id} onChange={(e) => set("lead_id", e.target.value)} className={inputCls} data-testid="visit-form-lead">
              <option value="">— Select —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Project">
            <select value={form.project_id} onChange={(e) => set("project_id", e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Date & time" required>
            <input required type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} className={inputCls} data-testid="visit-form-datetime" />
          </Field>
          <Field label="Assigned agent">
            <input value={form.assigned_agent} onChange={(e) => set("assigned_agent", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Initial notes" className="sm:col-span-2">
            <textarea rows={2} value={form.feedback} onChange={(e) => set("feedback", e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white inline-flex items-center gap-2" data-testid="visit-form-submit">
              <CalendarIcon className="w-4 h-4" strokeWidth={1.5} /> Schedule
            </button>
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
