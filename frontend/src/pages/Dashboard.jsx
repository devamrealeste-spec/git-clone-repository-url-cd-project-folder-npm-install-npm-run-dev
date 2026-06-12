import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ArrowUpRight, Flame, Building2, Calendar, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function KPI({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <div className="bg-white border border-[#E6E4DF] p-6 hover-lift" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="text-xxs uppercase tracking-widest text-[#8A8782]">{label}</div>
        {Icon && <Icon className={`w-4 h-4 ${accent || "text-[#8A8782]"}`} strokeWidth={1.5} />}
      </div>
      <div className="kpi-num text-4xl mt-4">{value}</div>
      {sub && <div className="text-xs text-[#8A8782] mt-2">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return <div className="text-sm text-[#8A8782]">Loading dashboard…</div>;
  }

  const { kpis, funnel, sources, recent_leads } = data;
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxSrc = Math.max(1, ...sources.map((s) => s.count));

  return (
    <div className="space-y-8" data-testid="dashboard-view">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ Overview</div>
          <h1 className="font-display text-4xl font-medium mt-2 leading-none">Today at Devam</h1>
        </div>
        <Link
          to="/app/leads"
          className="inline-flex items-center gap-2 text-sm bg-[#1A1A1A] text-[#F9F6F0] hover:bg-[#C25934] px-5 py-2.5 transition-colors"
          data-testid="dashboard-cta-new-lead"
        >
          Go to leads <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Leads" value={kpis.total_leads} sub={`${kpis.hot_leads} hot · ready to close`} icon={Flame} accent="text-[#D9423E]" testid="kpi-total-leads" />
        <KPI label="Active Projects" value={kpis.active_projects} sub="Across all builders" icon={Building2} accent="text-[#C25934]" testid="kpi-active-projects" />
        <KPI label="Upcoming Visits" value={kpis.upcoming_visits} sub="Scheduled site tours" icon={Calendar} accent="text-[#3E7B7A]" testid="kpi-upcoming-visits" />
        <KPI label="Bookings Value" value={fmtINR(kpis.booking_value)} sub={`${kpis.bookings_total} active bookings`} icon={ClipboardList} accent="text-[#1A1A1A]" testid="kpi-bookings-value" />
      </div>

      {/* Funnel + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#E6E4DF] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ Lead Funnel</div>
              <div className="font-display text-2xl mt-1">Pipeline by stage</div>
            </div>
          </div>
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage} className="grid grid-cols-12 items-center gap-4">
                <div className="col-span-3 text-sm text-[#5C5A55]">{f.stage}</div>
                <div className="col-span-8 h-7 bg-[#F4F3EE] relative">
                  <div
                    className="h-full bg-[#C25934] transition-all duration-700"
                    style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                  />
                </div>
                <div className="col-span-1 text-right kpi-num text-lg">{f.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DF] p-6">
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ Lead Sources</div>
          <div className="font-display text-2xl mt-1">Where they come from</div>
          <div className="mt-6 space-y-3">
            {sources.length === 0 && (
              <div className="text-sm text-[#8A8782]">No sources yet.</div>
            )}
            {sources.map((s) => (
              <div key={s.source} className="flex items-center gap-3 text-sm">
                <div className="w-24 truncate text-[#5C5A55]">{s.source}</div>
                <div className="flex-1 h-2 bg-[#F4F3EE] relative">
                  <div className="h-full bg-[#1A1A1A]" style={{ width: `${(s.count / maxSrc) * 100}%` }} />
                </div>
                <div className="kpi-num w-8 text-right">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white border border-[#E6E4DF]">
        <div className="px-6 py-5 border-b border-[#E6E4DF] flex items-center justify-between">
          <div>
            <div className="text-xxs uppercase tracking-widest text-[#8A8782]">/ Recent activity</div>
            <div className="font-display text-2xl mt-1">Latest leads in the system</div>
          </div>
          <Link to="/app/leads" className="text-xs uppercase tracking-widest text-[#C25934] hover:underline">
            View all →
          </Link>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xxs uppercase tracking-widest text-[#8A8782] border-b border-[#E6E4DF]">
              <th className="py-3 px-6 font-medium">Name</th>
              <th className="py-3 px-6 font-medium">Source</th>
              <th className="py-3 px-6 font-medium">Budget</th>
              <th className="py-3 px-6 font-medium">Stage</th>
              <th className="py-3 px-6 font-medium">AI Score</th>
            </tr>
          </thead>
          <tbody>
            {recent_leads.map((l) => (
              <tr key={l.id} className="border-b border-[#E6E4DF] last:border-0 hover:bg-[#F4F3EE]/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-[#8A8782]">{l.phone}</div>
                </td>
                <td className="py-4 px-6 text-sm text-[#5C5A55]">{l.source}</td>
                <td className="py-4 px-6 text-sm font-mono">{fmtINR(l.budget_max)}</td>
                <td className="py-4 px-6 text-sm">{l.stage}</td>
                <td className="py-4 px-6">
                  <ScoreBadge category={l.score_category} score={l.score} />
                </td>
              </tr>
            ))}
            {recent_leads.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[#8A8782]">No leads yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
