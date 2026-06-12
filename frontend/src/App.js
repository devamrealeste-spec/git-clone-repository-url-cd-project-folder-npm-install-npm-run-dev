import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DashboardLayout from "@/pages/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Projects from "@/pages/Projects";
import Builders from "@/pages/Builders";
import SiteVisits from "@/pages/SiteVisits";
import Bookings from "@/pages/Bookings";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import PublicCapture from "@/pages/PublicCapture";
import { Toaster } from "sonner";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5C5A55]">
        <div className="font-mono text-xs uppercase tracking-widest">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/capture" element={<PublicCapture />} />
          <Route path="/capture/:projectId" element={<PublicCapture />} />
          <Route
            path="/app"
            element={
              <Protected>
                <DashboardLayout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="projects" element={<Projects />} />
            <Route path="builders" element={<Builders />} />
            <Route path="site-visits" element={<SiteVisits />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
