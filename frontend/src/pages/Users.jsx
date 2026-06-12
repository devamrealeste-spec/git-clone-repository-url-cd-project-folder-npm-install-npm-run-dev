import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, X, Trash2, Edit2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const ROLES = [
  { v: "admin", label: "Admin" },
  { v: "sales_manager", label: "Sales Manager" },
  { v: "sales_agent", label: "Sales Agent" },
  { v: "builder_partner", label: "Builder Partner" },
  { v: "viewer", label: "Viewer" },
];

const roleLabel = (r) => ROLES.find((x) => x.v === r)?.label || r;

const inputCls = "w-full bg-white border border-[#E6E4DF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]";

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.get("/users").then((r) => {
      setUsers(r.data);
      setLoading(false);
    }).catch((err) => {
      if (err?.response?.status === 403) setForbidden(true);
      setLoading(false);
    });
  }, []);

  if (forbidden) {
    return (
      <div className="border border-[#E6E4DF] bg-white p-12 text-center" data-testid="users-forbidden">
        <ShieldCheck className="w-10 h-10 mx-auto text-[#C25934]" strokeWidth={1.5} />
        <div className="font-display text-2xl mt-4">Admin access required</div>
        <p className="text-[#5C5A55] mt-2 text-sm">You need admin privileges to manage team members.</p>
      </div>
    );
  }

  const handleDelete = async (u) => {
    if (!confirm(`Remove ${u.name}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("User removed");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not delete");
    }
  };

  const roleClass = (r) => ({
    admin: "bg-[#C25934]/10 text-[#C25934] border-[#C25934]/20",
    sales_manager: "bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/20",
    sales_agent: "bg-[#3E7B7A]/10 text-[#3E7B7A] border-[#3E7B7A]/20",
    builder_partner: "bg-[#D97B29]/10 text-[#D97B29] border-[#D97B29]/20",
    viewer: "bg-[#8A8782]/10 text-[#8A8782] border-[#8A8782]/20",
  }[r] || "");

  return (
    <div className="space-y-6" data-testid="users-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Team</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Users &amp; Roles</h1>
          <p className="text-[#5C5A55] mt-2 text-sm">Invite teammates, assign roles, control access.</p>
        </div>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-5 py-2.5 text-sm font-medium" data-testid="add-user-button">
          <Plus className="w-4 h-4" /> Invite user
        </button>
      </div>

      {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}

      <div className="bg-white border border-[#E6E4DF]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-5 font-medium">Name</th>
              <th className="py-3 px-5 font-medium">Email</th>
              <th className="py-3 px-5 font-medium">Role</th>
              <th className="py-3 px-5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50" data-testid={`user-row-${u.id}`}>
                <td className="py-4 px-5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C25934] text-white flex items-center justify-center text-xs font-medium">{u.name?.[0]}</div>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      {u.id === me?.id && <div className="text-[10px] uppercase tracking-widest text-[#C25934]">You</div>}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5 text-sm font-mono text-[#5C5A55]">{u.email}</td>
                <td className="py-4 px-5">
                  <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest ${roleClass(u.role)}`}>{roleLabel(u.role)}</span>
                </td>
                <td className="py-4 px-5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => setEditing(u)} className="p-1 text-[#5C5A55] hover:text-[#C25934]" data-testid={`user-edit-${u.id}`}>
                      <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-1 text-[#5C5A55] hover:text-[#D9423E]" data-testid={`user-delete-${u.id}`}>
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (<tr><td colSpan={4} className="py-10 text-center text-sm text-[#8A8782]">No users.</td></tr>)}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(u, isNew) => {
            if (isNew) setUsers((prev) => [...prev, u]);
            else setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setEditing(null);
            toast.success(isNew ? "User invited" : "User updated");
          }}
        />
      )}
    </div>
  );
}

function UserForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    role: initial?.role || "sales_agent",
    password: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        const { data } = await api.patch(`/users/${initial.id}`, payload);
        onSaved(data, false);
      } else {
        const { data } = await api.post("/users", form);
        onSaved(data, true);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F9F6F0] border border-[#E6E4DF] w-full max-w-md">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="font-display text-2xl">{isEdit ? "Edit user" : "Invite user"}</div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Full name</div>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="user-form-name" />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Email</div>
            <input required type="email" value={form.email} disabled={isEdit} onChange={(e) => set("email", e.target.value)} className={`${inputCls} disabled:opacity-60`} data-testid="user-form-email" />
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">Role</div>
            <select value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls} data-testid="user-form-role">
              {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1.5">{isEdit ? "New password (leave blank to keep)" : "Initial password"}</div>
            <input type="password" required={!isEdit} value={form.password} onChange={(e) => set("password", e.target.value)} className={inputCls} data-testid="user-form-password" />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-[#E6E4DF]">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-[#C25934] hover:bg-[#A64A2A] text-white" data-testid="user-form-submit">{isEdit ? "Save changes" : "Send invite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
