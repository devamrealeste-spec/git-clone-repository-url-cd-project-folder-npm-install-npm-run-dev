import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Users,
  Calendar,
  Boxes,
  Sparkles,
  MapPin,
} from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXNpZGVudGlhbCUyMGJ1aWxkaW5nJTIwYXJjaGl0ZWN0dXJlJTIwZXh0ZXJpb3J8ZW58MHx8fHwxNzgxMjUzMTAwfDA&ixlib=rb-4.1.0&q=85";

const MEETING_IMG =
  "https://images.unsplash.com/photo-1549923746-c502d488b3ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxyZWFsJTIwZXN0YXRlJTIwcHJvZmVzc2lvbmFsJTIwdGFsa2luZyUyMHRvJTIwY2xpZW50fGVufDB8fHx8MTc4MTI1MzEwMHww&ixlib=rb-4.1.0&q=85";

const MODULES = [
  { icon: Users, title: "Lead Intelligence", desc: "AI-scored leads from web, walk-ins, portals & NRI networks." },
  { icon: Building2, title: "Project Portfolio", desc: "Track every tower, every floor, every flat — live status." },
  { icon: Calendar, title: "Site Visits", desc: "Schedule, assign agents, capture feedback after every tour." },
  { icon: Boxes, title: "Inventory", desc: "Available · Blocked · Booked · Sold — at a glance, in real time." },
  { icon: Sparkles, title: "AI Lead Scoring", desc: "Claude Sonnet ranks every lead Hot · Warm · Cold with reasoning." },
  { icon: MapPin, title: "Gujarat-first", desc: "Built for Gandhinagar, Ahmedabad, and global NRI investors." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#1A1A1A] grain">
      {/* Top nav */}
      <header className="border-b border-[#E6E4DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
            <div className="w-9 h-9 bg-[#1A1A1A] text-[#F9F6F0] flex items-center justify-center font-display text-lg">D</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">DEVAM</div>
              <div className="text-xxs uppercase tracking-widest text-[#8A8782]">Real Estate CRM · ERP</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[#5C5A55]">
            <a href="#modules" className="hover:text-[#1A1A1A]">Modules</a>
            <a href="#why" className="hover:text-[#1A1A1A]">Why Devam</a>
            <a href="#market" className="hover:text-[#1A1A1A]">Gujarat Market</a>
          </nav>

          <Link
            to="/login"
            className="bg-[#1A1A1A] text-[#F9F6F0] hover:bg-[#C25934] px-5 py-2.5 text-sm font-medium transition-colors"
            data-testid="nav-signin-button"
          >
            Sign in →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#E6E4DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 py-20 lg:py-28 items-end">
          <div className="lg:col-span-7 fade-up">
            <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782] mb-6 flex items-center gap-3">
              <span className="w-8 h-px bg-[#C25934]" /> Built for Gandhinagar · Ahmedabad · NRI
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] font-medium">
              One platform.
              <br />
              <span className="text-[#C25934] italic">Every</span> property deal.
            </h1>
            <p className="mt-8 text-lg text-[#5C5A55] max-w-xl leading-relaxed">
              Manage leads, projects, builders, inventory, site visits and bookings —
              from Gujarat's local lanes to global NRI investors.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-7 py-3.5 text-sm font-medium transition-colors"
                data-testid="hero-cta-signin"
              >
                Open the command center
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:rotate-45" strokeWidth={1.5} />
              </Link>
              <a
                href="#modules"
                className="inline-flex items-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F9F6F0] px-7 py-3.5 text-sm font-medium transition-colors"
              >
                Explore 21 modules
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-10 max-w-xl">
              <div>
                <div className="kpi-num text-4xl">21</div>
                <div className="text-xxs uppercase tracking-widest text-[#8A8782] mt-1">Modules</div>
              </div>
              <div>
                <div className="kpi-num text-4xl">AI</div>
                <div className="text-xxs uppercase tracking-widest text-[#8A8782] mt-1">Lead Score</div>
              </div>
              <div>
                <div className="kpi-num text-4xl">8</div>
                <div className="text-xxs uppercase tracking-widest text-[#8A8782] mt-1">User Roles</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 fade-up">
            <div className="relative aspect-[4/5] overflow-hidden border border-[#E6E4DF]">
              <img src={HERO_IMG} alt="Modern residential" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1A1A1A] to-transparent text-[#F9F6F0]">
                <div className="text-xxs uppercase tracking-widest opacity-70">Shilp Aaria · Gandhinagar</div>
                <div className="font-display text-2xl mt-1">240 units · 86 available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modules" className="border-b border-[#E6E4DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
            <div className="md:col-span-5">
              <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782] mb-4">/ Modules</div>
              <h2 className="font-display text-4xl sm:text-5xl font-medium leading-tight">
                Every workflow a builder runs, finally in one place.
              </h2>
            </div>
            <p className="md:col-span-6 md:col-start-7 text-[#5C5A55] text-base leading-relaxed">
              Devam replaces the spreadsheet sprawl. No more chasing site visit
              feedback in WhatsApp, no more "which flat is blocked" guesswork.
              From a fresh inquiry to a registered booking — every step is
              tracked, scored, and reported.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E6E4DF]">
            {MODULES.map((m, i) => (
              <div
                key={i}
                className="bg-[#F9F6F0] p-8 hover-lift border-0"
                data-testid={`module-card-${i}`}
              >
                <m.icon className="w-7 h-7 text-[#C25934]" strokeWidth={1.5} />
                <div className="font-display text-2xl mt-6">{m.title}</div>
                <div className="text-sm text-[#5C5A55] mt-3 leading-relaxed">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Devam */}
      <section id="why" className="border-b border-[#E6E4DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <img src={MEETING_IMG} alt="Sales conversation" className="w-full aspect-[5/6] object-cover border border-[#E6E4DF]" />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782] mb-4">/ Why Devam</div>
            <h2 className="font-display text-4xl sm:text-5xl font-medium leading-tight">
              Closing the deal is human.
              <br />
              <span className="italic text-[#C25934]">Everything before it</span> should be automated.
            </h2>
            <ul className="mt-10 space-y-6">
              {[
                ["AI scores every lead the moment it lands", "Hot / Warm / Cold with reasoning — never guess who to call first."],
                ["Live inventory across towers, floors and flats", "Block, release and book units with a single tap. No more double-booking."],
                ["Built for the Gujarat real estate motion", "Hindi / Gujarati friendly, RERA-aware, NRI-payment flow ready."],
              ].map(([t, d], i) => (
                <li key={i} className="flex gap-5">
                  <div className="kpi-num text-3xl text-[#C25934] w-10 shrink-0">0{i + 1}</div>
                  <div>
                    <div className="font-medium text-base">{t}</div>
                    <div className="text-sm text-[#5C5A55] mt-1">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="market" className="bg-[#1A1A1A] text-[#F9F6F0] grain">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 text-center">
          <div className="text-xxs uppercase tracking-[0.2em] text-[#8A8782] mb-4">/ Ready when you are</div>
          <h2 className="font-display text-5xl sm:text-6xl font-medium leading-tight max-w-3xl mx-auto">
            Walk into your sales war-room.
          </h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-[#C25934] hover:bg-[#A64A2A] text-white px-8 py-4 text-sm font-medium mt-10 transition-colors"
            data-testid="footer-cta-signin"
          >
            Sign in to DEVAM
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <div className="text-xxs uppercase tracking-widest text-[#8A8782] mt-6">
            Demo credentials · admin@devam.com / Admin@123
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E6E4DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#8A8782]">© 2026 DEVAM · Built for Gandhinagar · Ahmedabad · NRI.</div>
          <div className="text-xxs uppercase tracking-widest text-[#8A8782]">v 1.0 · Gujarat Edition</div>
        </div>
      </footer>
    </div>
  );
}
