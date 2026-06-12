import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, X, Trash2, Star, Edit2 } from "lucide-react";
import { toast } from "sonner";

const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

export default function Builders() {
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/builders");
    setBuilders(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this builder?")) return;
    await api.delete(`/builders/${id}`);
    setBuilders((b) => b.filter((x) => x.id !== id));
    toast.success("Builder deleted");
  };

  return (
    <div className="space-y-6" data-testid="builders-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Builders</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Builder Directory</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Partner builders shaping Gujarat's skyline.</p>
        </div>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium" data-testid="add-builder-button">
          <Plus className="w-4 h-4" /> New Builder
        </button>
      </div>

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      <div className="bg-white border border-[#E6E4DF]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-5 font-medium">Builder</th>
              <th className="py-3 px-5 font-medium">Contact</th>
              <th className="py-3 px-5 font-medium">City</th>
              <th className="py-3 px-5 font-medium">Projects</th>
              <th className="py-3 px-5 font-medium">Rating</th>
              <th className="py-3 px-5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {builders.map((b) => (
              <tr key={b.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50" data-testid={`builder-row-${b.id}`}>
                <td className="py-4 px-5">
                  <div className="text-sm font-medium">{b.name}</div>
                  {b.notes && <div className="text-xs text-[#8A8782] max-w-md">{b.notes}</div>}
                </td>
                <td className="py-4 px-5 text-sm">
                  <div>{b.contact_person}</div>
                  <div className="text-xs text-[#8A8782]">{b.phone}</div>
                  {b.email && <div className="text-xs text-[#8A8782]">{b.email}</div>}
                </td>
                <td className="py-4 px-5 text-sm">{b.city}</td>
                <td className="py-4 px-5 text-sm font-mono">{b.projects_count}</td>
                <td className="py-4 px-5">
                  <div className="inline-flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 fill-[#C25934] text-[#C25934]" />
                    <span className="font-mono">{b.rating?.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => setEditing(b)} className="text-[#5C5A55] hover:text-[#C25934] p-1" data-testid={`builder-edit-${b.id}`}>
                      <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="text-[#5C5A55] hover:text-[#D9423E] p-1" data-testid={`builder-delete-${b.id}`}>
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {builders.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-[#8A8782]">No builders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BuilderForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(b, isNew) => {
            if (isNew) setBuilders((prev) => [b, ...prev]);
            else setBuilders((prev) => prev.map((x) => (x.id === b.id ? b : x)));
            setEditing(null);
            toast.success(isNew ? "Builder added" : "Builder updated");
          }}
        />
      )}
    </div>
  );
}

function BuilderForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    contact_person: initial?.contact_person || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    city: initial?.city || "Gandhinagar",
    projects_count: initial?.projects_count ?? 0,
    rating: initial?.rating ?? 4.5,
    notes: initial?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, projects_count: parseInt(form.projects_count) || 0, rating: parseFloat(form.rating) || 0 };
      if (isEdit) {
        const { data } = await api.patch(`/builders/${initial.id}`, payload);
        onSaved(data, false);
      } else {
        const { data } = await api.post("/builders", payload);
        onSaved(data, true);
      }
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-xl">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="font-display text-2xl">{isEdit ? "Edit Builder" : "New Builder"}</div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="builder-form-name" />
          </Field>
          <Field label="Contact person">
            <input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Projects count">
            <input type="number" value={form.projects_count} onChange={(e) => set("projects_count", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Rating (0-5)">
            <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white" data-testid="builder-form-submit">{isEdit ? "Save changes" : "Save"}</button>
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
