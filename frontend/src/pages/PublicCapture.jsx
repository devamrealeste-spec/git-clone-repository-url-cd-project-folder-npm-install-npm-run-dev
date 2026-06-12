import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";

const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial", "Penthouse"];
const URGENCIES = ["Immediate", "1-3 months", "3-6 months", "6+ months"];

const inputCls = "w-full bg-white border border-[#E6E4DF] px-4 py-3 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

function fmtINR(n) {
  if (!n) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function PublicCapture() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    budget_min: "", budget_max: "",
    property_type: "Apartment", urgency: "1-3 months",
    notes: "",
  });

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    api.get(`/projects/${projectId}`).then((r) => {
      setProject(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        budget_min: parseFloat(form.budget_min) || 0,
        budget_max: parseFloat(form.budget_max) || 0,
        project_id: projectId || null,
        source: "Website",
      };
      const { data } = await api.post("/public/leads", payload);
      setSubmitted(data);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#5C5A55] text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] grain">
      <header className="border-b border-[#E6E4DF]">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1A1A1A] text-[#F9F6F0] flex items-center justify-center font-display text-lg">D</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">DEVAM</div>
              <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Powered by Devam CRM</div>
            </div>
          </Link>
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Private inquiry · Secure</div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Project side */}
        <div className="lg:col-span-5">
          {project?.image_url && (
            <div className="aspect-[4/5] overflow-hidden border border-[#E6E4DF] mb-6">
              <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
            </div>
          )}
          {project ? (
            <>
              <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">{project.builder_name}</div>
              <h1 className="font-display text-4xl mt-2 leading-tight">{project.name}</h1>
              <div className="text-sm text-[#5C5A55] mt-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> {project.location || project.city}
              </div>
              {project.description && <p className="text-sm text-[#5C5A55] mt-4 leading-relaxed">{project.description}</p>}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#E6E4DF]">
                <div>
                  <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Starting</div>
                  <div className="font-mono text-sm mt-1">{fmtINR(project.price_min)}</div>
                </div>
                <div>
                  <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Available</div>
                  <div className="kpi-num text-2xl">{project.available_units}/{project.total_units}</div>
                </div>
                <div>
                  <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Possession</div>
                  <div className="text-xs mt-1">{project.possession_date || "—"}</div>
                </div>
              </div>
              {project.rera_number && <div className="text-[10px] text-[#8A8782] mt-4 font-mono">RERA · {project.rera_number}</div>}
            </>
          ) : (
            <div>
              <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Get in touch</div>
              <h1 className="font-display text-4xl mt-2 leading-tight">Find your home in Gujarat.</h1>
              <p className="text-sm text-[#5C5A55] mt-4 leading-relaxed">
                Share a few details and our sales team will reach out with the best matches from our portfolio of premium projects in Gandhinagar and Ahmedabad.
              </p>
            </div>
          )}
        </div>

        {/* Form side */}
        <div className="lg:col-span-7">
          {submitted ? (
            <div className="bg-white border border-[#E6E4DF] p-10 fade-up" data-testid="public-success">
              <CheckCircle2 className="w-12 h-12 text-[#3E7B7A]" strokeWidth={1.5} />
              <h2 className="font-display text-4xl mt-6 leading-tight">Thank you, {form.name.split(" ")[0]}.</h2>
              <p className="text-[#5C5A55] mt-4 leading-relaxed">
                {submitted.message} Based on what you shared, your inquiry is marked
                {" "}
                <span className="font-medium text-[#1A1A1A]">{submitted.score_category}</span> — a senior agent will call you within 24 hours.
              </p>
              <div className="mt-8 text-xxs uppercase tracking-widest text-[#8A8782]">
                Reference · {new Date().toLocaleDateString("en-IN")}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E6E4DF] p-8 lg:p-10">
              <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Inquiry form</div>
              <h2 className="font-display text-3xl mt-2 leading-tight">Tell us what you're looking for.</h2>
              <form onSubmit={submit} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="public-form">
                <Field label="Your name" required>
                  <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="public-name" />
                </Field>
                <Field label="Phone" required>
                  <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} data-testid="public-phone" />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Property type">
                  <select value={form.property_type} onChange={(e) => set("property_type", e.target.value)} className={inputCls}>
                    {PROPERTY_TYPES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="When do you want to move?">
                  <select value={form.urgency} onChange={(e) => set("urgency", e.target.value)} className={inputCls}>
                    {URGENCIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Budget min (₹)">
                  <input type="number" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Budget max (₹)">
                  <input type="number" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Anything else we should know?" className="sm:col-span-2">
                  <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
                </Field>
                <button
                  type="submit"
                  disabled={submitting}
                  className="sm:col-span-2 group inline-flex items-center justify-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] disabled:opacity-60 text-white px-7 py-3.5 text-sm font-medium transition-colors"
                  data-testid="public-submit"
                >
                  {submitting ? "Sending…" : "Request a call back"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </button>
                <div className="sm:col-span-2 text-xxs uppercase tracking-widest text-[#8A8782] text-center">
                  Your info stays private. No spam — sales calls only.
                </div>
              </form>
            </div>
          )}
        </div>
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
