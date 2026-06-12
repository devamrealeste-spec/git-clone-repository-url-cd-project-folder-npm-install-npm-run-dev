import { useEffect, useState } from "react";
import api from "@/lib/api";
import { X, Send, Trash2, Phone, MessageCircle, Mail, Users as UsersIcon, Calendar, Edit } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { v: "Note", icon: Edit },
  { v: "Call", icon: Phone },
  { v: "WhatsApp", icon: MessageCircle },
  { v: "Email", icon: Mail },
  { v: "Meeting", icon: UsersIcon },
];

const typeIcon = (t) => (TYPES.find((x) => x.v === t)?.icon) || Edit;

function fmtRelative(s) {
  if (!s) return "";
  const d = new Date(s);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function LeadDetailDrawer({ lead, onClose, onLeadUpdated }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("Note");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!lead) return;
    let mounted = true;
    api.get(`/leads/${lead.id}/activities`).then((r) => {
      if (!mounted) return;
      setActivities(r.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [lead]);

  if (!lead) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/leads/${lead.id}/activities`, { type, content: content.trim() });
      setActivities((prev) => [data, ...prev]);
      setContent("");
      toast.success("Activity logged");
    } catch {
      toast.error("Could not log activity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (aid) => {
    await api.delete(`/leads/${lead.id}/activities/${aid}`);
    setActivities((prev) => prev.filter((a) => a.id !== aid));
  };

  const setStage = async (stage) => {
    const { data } = await api.patch(`/leads/${lead.id}`, { stage });
    onLeadUpdated?.(data);
    toast.success(`Stage → ${stage}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1A1A1A]/40 backdrop-blur-sm">
      <div className="bg-[#F9F6F0] border-l border-[#E6E4DF] w-full max-w-xl h-full flex flex-col" data-testid="lead-drawer">
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-start justify-between gap-3">
          <div>
            <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ Lead</div>
            <div className="font-display text-2xl mt-1 leading-tight">{lead.name}</div>
            <div className="text-xs text-[#5C5A55] mt-1 font-mono">{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:text-[#C25934]" data-testid="lead-drawer-close"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 border-b border-[#E6E4DF] grid grid-cols-2 gap-3 text-xs">
          <Stat label="Source" value={lead.source} />
          <Stat label="Urgency" value={lead.urgency} />
          <Stat label="Property" value={`${lead.property_type} · ${lead.location || "—"}`} />
          <Stat label="AI Score" value={`${lead.score ?? "–"} · ${lead.score_category || "—"}`} />
        </div>

        <div className="px-6 py-4 border-b border-[#E6E4DF]">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-2">Stage</div>
          <div className="flex flex-wrap gap-1">
            {["New", "Contacted", "Site Visit", "Negotiation", "Booked", "Lost"].map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`px-2.5 py-1 text-xs border transition-colors ${
                  lead.stage === s
                    ? "bg-[#1A1A1A] text-[#F9F6F0] border-[#1A1A1A]"
                    : "bg-white text-[#5C5A55] border-[#E6E4DF] hover:border-[#C25934]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-3">/ Activity timeline</div>
          {loading && <div className="text-sm text-[#8A8782]">Loading…</div>}
          {!loading && activities.length === 0 && (
            <div className="text-sm text-[#8A8782] border border-dashed border-[#E6E4DF] p-6 text-center">
              No activities yet. Log your first call, note, or meeting below.
            </div>
          )}
          <ul className="space-y-4">
            {activities.map((a) => {
              const Icon = typeIcon(a.type);
              return (
                <li key={a.id} className="flex gap-3 group" data-testid={`activity-${a.id}`}>
                  <div className="w-8 h-8 shrink-0 bg-white border border-[#E6E4DF] flex items-center justify-center text-[#C25934]">
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 bg-white border border-[#E6E4DF] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xxs uppercase tracking-widest text-[#8A8782]">{a.type} · {a.created_by_name}</div>
                      <div className="text-xxs text-[#8A8782] font-mono">{fmtRelative(a.created_at)}</div>
                    </div>
                    <div className="text-sm mt-1.5 whitespace-pre-wrap">{a.content}</div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#8A8782] hover:text-[#D9423E] mt-2 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <form onSubmit={submit} className="border-t border-[#E6E4DF] p-4 pb-20 bg-white space-y-3">
          <div className="flex flex-wrap gap-1">
            {TYPES.map(({ v, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`px-2.5 py-1.5 text-xs border inline-flex items-center gap-1.5 transition-colors ${
                  type === v
                    ? "bg-[#1A1A1A] text-[#F9F6F0] border-[#1A1A1A]"
                    : "bg-white text-[#5C5A55] border-[#E6E4DF] hover:border-[#C25934]"
                }`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.5} /> {v}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Add a ${type.toLowerCase()}…`}
              className="flex-1 bg-white border border-[#E6E4DF] px-3 py-2 text-sm focus:outline-none focus:border-[#C25934] resize-none"
              data-testid="activity-content-input"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-[#C25934] hover:bg-[#A64A2A] disabled:opacity-50 text-white px-4 self-stretch inline-flex items-center gap-1"
              data-testid="activity-submit"
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xxs uppercase tracking-widest text-[#8A8782]">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}
