import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, RefreshCw, X, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Booked", "Lost"];
const SOURCES = ["Website", "Walk-in", "Referral", "Facebook", "Instagram", "99acres", "Magicbricks", "NRI Network"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial", "Penthouse"];
const URGENCIES = ["Immediate", "1-3 months", "3-6 months", "6+ months"];

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function ScoreBadge({ category, score }) {
  const map = {
    Hot: "bg-[#D9423E]/10 text-[#D9423E] border-[#D9423E]/20",
    Warm: "bg-[#D97B29]/10 text-[#D97B29] border-[#D97B29]/20",
    Cold: "bg-[#3E7B7A]/10 text-[#3E7B7A] border-[#3E7B7A]/20",
  };
  const cls = map[category] || "bg-[#F4F3EE] text-[#5C5A55] border-[#E6E4DF]";
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs ${cls}`}>
      <span className="font-mono font-medium">{score ?? "–"}</span>
      <span className="uppercase tracking-widest text-[10px]">{category || "—"}</span>
    </span>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [scoringId, setScoringId] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (stageFilter) params.stage = stageFilter;
    if (search) params.q = search;
    const { data } = await api.get("/leads", { params });
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [stageFilter]);

  const handleRescore = async (id) => {
    setScoringId(id);
    try {
      const { data } = await api.post(`/leads/${id}/rescore`);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
      toast.success(`Re-scored: ${data.score_category} (${data.score})`);
    } catch {
      toast.error("Could not re-score");
    } finally {
      setScoringId(null);
    }
  };

  const handleStageChange = async (id, stage) => {
    try {
      const { data } = await api.patch(`/leads/${id}`, { stage });
      setLeads((prev) => prev.map((l) => (l.id === id ? data : l)));
    } catch {
      toast.error("Could not update stage");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    await api.delete(`/leads/${id}`);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead deleted");
  };

  return (
    <div className="space-y-6" data-testid="leads-view">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Leads</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Lead Intelligence</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">AI-scored. Sorted by urgency. Never miss a hot inquiry.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="add-lead-button"
          className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name, phone, email…"
          className="bg-white border border-[#E6E4DF] px-3 py-2 text-sm w-72 focus:outline-none focus:border-[#C25934]"
          data-testid="leads-search-input"
        />
        <button onClick={load} className="text-xs uppercase tracking-widest text-[#5C5A55] hover:text-[#1A1A1A]">
          Apply
        </button>
        <div className="flex flex-wrap gap-1 ml-auto">
          <FilterChip active={!stageFilter} onClick={() => setStageFilter("")}>All</FilterChip>
          {STAGES.map((s) => (
            <FilterChip key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>
              {s}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E6E4DF] overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-5 font-medium">Lead</th>
              <th className="py-3 px-5 font-medium">Source</th>
              <th className="py-3 px-5 font-medium">Property</th>
              <th className="py-3 px-5 font-medium">Budget</th>
              <th className="py-3 px-5 font-medium">Urgency</th>
              <th className="py-3 px-5 font-medium">Stage</th>
              <th className="py-3 px-5 font-medium">AI Score</th>
              <th className="py-3 px-5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-[#8A8782]">Loading…</td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-[#8A8782]">No leads found.</td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50" data-testid={`lead-row-${l.id}`}>
                <td className="py-4 px-5">
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-[#8A8782]">{l.phone}</div>
                  {l.email && <div className="text-xs text-[#8A8782]">{l.email}</div>}
                </td>
                <td className="py-4 px-5 text-sm text-[#5C5A55]">{l.source}</td>
                <td className="py-4 px-5 text-sm">
                  <div>{l.property_type}</div>
                  <div className="text-xs text-[#8A8782]">{l.location || "—"}</div>
                </td>
                <td className="py-4 px-5 text-sm font-mono">{fmtINR(l.budget_min)} – {fmtINR(l.budget_max)}</td>
                <td className="py-4 px-5 text-sm">{l.urgency}</td>
                <td className="py-4 px-5">
                  <select
                    value={l.stage}
                    onChange={(e) => handleStageChange(l.id, e.target.value)}
                    className="bg-white border border-[#E6E4DF] text-xs px-2 py-1.5 focus:outline-none focus:border-[#C25934]"
                    data-testid={`lead-stage-select-${l.id}`}
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-4 px-5">
                  <ScoreBadge category={l.score_category} score={l.score} />
                  {l.score_reason && <div className="text-[10px] text-[#8A8782] mt-1 max-w-[180px] truncate" title={l.score_reason}>{l.score_reason}</div>}
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => handleRescore(l.id)}
                      disabled={scoringId === l.id}
                      title="Re-score with AI"
                      className="p-1.5 text-[#5C5A55] hover:text-[#C25934] disabled:opacity-50"
                      data-testid={`lead-rescore-${l.id}`}
                    >
                      {scoringId === l.id ? <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Sparkles className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      title="Delete"
                      className="p-1.5 text-[#5C5A55] hover:text-[#D9423E]"
                      data-testid={`lead-delete-${l.id}`}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LeadForm
          onClose={() => setShowForm(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setShowForm(false);
            toast.success(`Lead added · scored ${lead.score_category} (${lead.score})`);
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
        active
          ? "bg-[#1A1A1A] text-[#F9F6F0] border-[#1A1A1A]"
          : "bg-white text-[#5C5A55] border-[#E6E4DF] hover:border-[#C25934] hover:text-[#1A1A1A]"
      }`}
    >
      {children}
    </button>
  );
}

function LeadForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Website",
    budget_min: "",
    budget_max: "",
    location: "",
    property_type: "Apartment",
    urgency: "1-3 months",
    notes: "",
    stage: "New",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        budget_min: parseFloat(form.budget_min) || 0,
        budget_max: parseFloat(form.budget_max) || 0,
      };
      const { data } = await api.post("/leads", payload);
      onCreated(data);
    } catch (err) {
      toast.error("Could not save lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="lead-form-modal">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div>
            <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ New lead</div>
            <div className="font-display text-2xl mt-1">Capture inquiry</div>
          </div>
          <button onClick={onClose} className="p-2 text-[#5C5A55] hover:text-[#1A1A1A]" data-testid="lead-form-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <input data-testid="lead-form-name" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone" required>
            <input data-testid="lead-form-phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input data-testid="lead-form-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Source">
            <select data-testid="lead-form-source" value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Property type">
            <select value={form.property_type} onChange={(e) => set("property_type", e.target.value)} className={inputCls}>
              {PROPERTY_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Urgency">
            <select value={form.urgency} onChange={(e) => set("urgency", e.target.value)} className={inputCls}>
              {URGENCIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Budget min (₹)">
            <input data-testid="lead-form-budget-min" type="number" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Budget max (₹)">
            <input data-testid="lead-form-budget-max" type="number" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Location preference" className="sm:col-span-2">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF] hover:border-[#1A1A1A] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="lead-form-submit"
              className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white inline-flex items-center gap-2 disabled:opacity-60 transition-colors"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              {submitting ? "Scoring with AI…" : "Save & score"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">
        {label}{required && <span className="text-[#C25934]"> *</span>}
      </div>
      {children}
    </label>
  );
}
