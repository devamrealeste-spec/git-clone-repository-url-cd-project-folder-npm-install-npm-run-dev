import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Token", "Agreement", "Registered", "Cancelled"];
const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [b, l, p] = await Promise.all([api.get("/bookings"), api.get("/leads"), api.get("/projects")]);
    setBookings(b.data); setLeads(l.data); setProjects(p.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this booking?")) return;
    await api.delete(`/bookings/${id}`);
    setBookings((p) => p.filter((x) => x.id !== id));
  };

  const totalValue = bookings.filter((b) => b.status !== "Cancelled").reduce((s, b) => s + (b.total_value || 0), 0);
  const totalAmount = bookings.filter((b) => b.status !== "Cancelled").reduce((s, b) => s + (b.booking_amount || 0), 0);

  return (
    <div className="space-y-6" data-testid="bookings-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Bookings</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Booking Tracker</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Tokens, agreements and registrations — in chronological clarity.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium" data-testid="add-booking-button">
          <Plus className="w-4 h-4" /> New booking
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E4DF] p-5">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Active bookings</div>
          <div className="kpi-num text-3xl mt-3">{bookings.filter((b) => b.status !== "Cancelled").length}</div>
        </div>
        <div className="bg-white border border-[#E6E4DF] p-5">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Token amount</div>
          <div className="kpi-num text-3xl mt-3">{fmtINR(totalAmount)}</div>
        </div>
        <div className="bg-white border border-[#E6E4DF] p-5">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Total value</div>
          <div className="kpi-num text-3xl mt-3 text-[#C25934]">{fmtINR(totalValue)}</div>
        </div>
      </div>

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      <div className="bg-white border border-[#E6E4DF] overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-5 font-medium">Lead</th>
              <th className="py-3 px-5 font-medium">Project · Unit</th>
              <th className="py-3 px-5 font-medium">Date</th>
              <th className="py-3 px-5 font-medium">Token</th>
              <th className="py-3 px-5 font-medium">Total value</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50" data-testid={`booking-row-${b.id}`}>
                <td className="py-4 px-5 text-sm">{b.lead_name}</td>
                <td className="py-4 px-5 text-sm">
                  <div>{b.project_name}</div>
                  <div className="text-xs text-[#8A8782] font-mono">{b.unit_number}</div>
                </td>
                <td className="py-4 px-5 text-sm font-mono">{fmtDate(b.booking_date)}</td>
                <td className="py-4 px-5 text-sm font-mono">{fmtINR(b.booking_amount)}</td>
                <td className="py-4 px-5 text-sm font-mono">{fmtINR(b.total_value)}</td>
                <td className="py-4 px-5">
                  <span className="text-xs uppercase tracking-widest border px-2 py-0.5 border-[#E6E4DF]">{b.status}</span>
                </td>
                <td className="py-4 px-5 text-right">
                  <button onClick={() => handleDelete(b.id)} className="text-[#5C5A55] hover:text-[#D9423E]" data-testid={`booking-delete-${b.id}`}>
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && !loading && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-[#8A8782]">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BookingForm
          leads={leads}
          projects={projects}
          onClose={() => setShowForm(false)}
          onCreated={(b) => {
            setBookings((p) => [b, ...p]);
            setShowForm(false);
            toast.success("Booking recorded");
          }}
        />
      )}
    </div>
  );
}

function BookingForm({ leads, projects, onClose, onCreated }) {
  const [form, setForm] = useState({
    lead_id: "", project_id: "", unit_number: "",
    booking_amount: "", total_value: "", status: "Token",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const lead = leads.find((x) => x.id === form.lead_id);
    const proj = projects.find((x) => x.id === form.project_id);
    if (!lead || !proj) return toast.error("Pick a lead and project");
    const payload = {
      lead_id: form.lead_id, lead_name: lead.name,
      project_id: form.project_id, project_name: proj.name,
      unit_number: form.unit_number,
      booking_amount: parseFloat(form.booking_amount) || 0,
      total_value: parseFloat(form.total_value) || 0,
      status: form.status,
    };
    const { data } = await api.post("/bookings", payload);
    onCreated(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-xl">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="font-display text-2xl">Record Booking</div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lead" required>
            <select required value={form.lead_id} onChange={(e) => set("lead_id", e.target.value)} className={inputCls} data-testid="booking-form-lead">
              <option value="">— Select —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Project" required>
            <select required value={form.project_id} onChange={(e) => set("project_id", e.target.value)} className={inputCls} data-testid="booking-form-project">
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Unit number">
            <input value={form.unit_number} onChange={(e) => set("unit_number", e.target.value)} className={inputCls} placeholder="e.g. A-501" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Booking amount (₹)">
            <input type="number" value={form.booking_amount} onChange={(e) => set("booking_amount", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Total value (₹)">
            <input type="number" value={form.total_value} onChange={(e) => set("total_value", e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white" data-testid="booking-form-submit">Record booking</button>
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
