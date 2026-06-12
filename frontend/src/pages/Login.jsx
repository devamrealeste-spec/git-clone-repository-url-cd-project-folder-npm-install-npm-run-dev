import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

function formatErr(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

const SIDE_IMG =
  "https://images.unsplash.com/photo-1515263487990-61b07816b324?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjByZXNpZGVudGlhbCUyMGJ1aWxkaW5nJTIwYXJjaGl0ZWN0dXJlJTIwZXh0ZXJpb3J8ZW58MHx8fHwxNzgxMjUzMTAwfDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@devam.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Welcome to DEVAM");
      navigate("/app");
    } catch (err) {
      toast.error(formatErr(err?.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F9F6F0]">
      {/* Left form */}
      <div className="flex items-center justify-center p-8 lg:p-16 grain">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-16" data-testid="login-brand-link">
            <div className="w-10 h-10 bg-[#1A1A1A] text-[#F9F6F0] flex items-center justify-center font-display text-xl">
              D
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">DEVAM CRM</div>
              <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Gujarat Edition</div>
            </div>
          </Link>

          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782] mb-3">/ Authentication</div>
          <h1 className="font-display text-4xl sm:text-5xl font-medium leading-tight">Sign in</h1>
          <p className="text-[#5C5A55] mt-3 text-base">Access your real estate command center.</p>

          <form onSubmit={submit} className="mt-10 space-y-5" data-testid="login-form">
            <div>
              <label className="text-xxs uppercase tracking-widest text-[#8A8782]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full bg-white border border-[#E6E4DF] px-4 py-3 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="text-xxs uppercase tracking-widest text-[#8A8782]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 w-full bg-white border border-[#E6E4DF] px-4 py-3 text-sm focus:outline-none focus:border-[#C25934] focus:ring-1 focus:ring-[#C25934]"
                data-testid="login-password-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] disabled:opacity-60 text-white px-6 py-3.5 text-sm font-medium transition-colors"
              data-testid="login-submit-button"
            >
              {loading ? "Signing in…" : "Sign in"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </button>
          </form>

          <div className="mt-8 border border-dashed border-[#E6E4DF] bg-white/60 p-4 text-xs">
            <div className="text-xxs uppercase tracking-widest text-[#8A8782] mb-1">Demo credentials</div>
            <div className="font-mono">admin@devam.com / Admin@123</div>
          </div>
        </div>
      </div>

      {/* Right image */}
      <div className="hidden lg:block relative">
        <img src={SIDE_IMG} alt="Architecture" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-[#F9F6F0]">
          <div className="text-xxs uppercase tracking-[0.2em] opacity-80">/ Inside Devam</div>
          <div className="font-display text-4xl mt-3 leading-tight">
            "We tripled our site-visit-to-booking rate within a quarter."
          </div>
          <div className="text-sm mt-4 opacity-80">— Sales Head, Sangath Lifespace</div>
        </div>
      </div>
    </div>
  );
}
