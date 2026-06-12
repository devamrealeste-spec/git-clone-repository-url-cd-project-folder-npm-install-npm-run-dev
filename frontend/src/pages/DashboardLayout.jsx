import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutGrid,
  Users,
  Building2,
  HardHat,
  Calendar,
  ClipboardList,
  Boxes,
  LogOut,
  Search,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

const NAV = [
  { to: "/app", icon: LayoutGrid, label: "Overview", end: true, testid: "nav-dashboard" },
  { to: "/app/leads", icon: Users, label: "Leads", testid: "nav-leads" },
  { to: "/app/projects", icon: Building2, label: "Projects", testid: "nav-projects" },
  { to: "/app/builders", icon: HardHat, label: "Builders", testid: "nav-builders" },
  { to: "/app/site-visits", icon: Calendar, label: "Site Visits", testid: "nav-site-visits" },
  { to: "/app/bookings", icon: ClipboardList, label: "Bookings", testid: "nav-bookings" },
  { to: "/app/inventory", icon: Boxes, label: "Inventory", testid: "nav-inventory" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-[#F4F3EE] text-[#1A1A1A]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#F9F6F0] border-r border-[#E6E4DF] flex flex-col">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E6E4DF]">
          <div className="w-9 h-9 bg-[#1A1A1A] text-[#F9F6F0] flex items-center justify-center font-display text-lg">D</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">DEVAM</div>
            <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Gujarat Edition</div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-5 text-xxs uppercase tracking-widest text-[#8A8782] mb-2">Workspace</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-[#1A1A1A] text-[#F9F6F0]"
                    : "text-[#5C5A55] hover:bg-[#F0EFEA] hover:text-[#1A1A1A]"
                }`
              }
            >
              <n.icon className="w-4 h-4" strokeWidth={1.5} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#E6E4DF] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#C25934] text-white flex items-center justify-center font-medium">
              {user?.name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" data-testid="topbar-user-name">{user?.name || "User"}</div>
              <div className="text-xxs uppercase tracking-widest text-[#8A8782] truncate">{user?.role || "—"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 border border-[#E6E4DF] hover:border-[#C25934] hover:text-[#C25934] px-3 py-2 text-xs uppercase tracking-widest transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#F9F6F0] border-b border-[#E6E4DF] flex items-center px-6 lg:px-8 gap-4 sticky top-0 z-10">
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782]">/ {current?.label || "Workspace"}</div>
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8782]" strokeWidth={1.5} />
            <input
              placeholder="Search leads, projects, units…"
              className="w-full bg-white border border-[#E6E4DF] pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-[#C25934]"
              data-testid="topbar-search"
            />
          </div>
          <button className="p-2 text-[#5C5A55] hover:text-[#1A1A1A]" data-testid="notif-button">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="text-xxs uppercase tracking-widest text-[#8A8782] hidden md:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
