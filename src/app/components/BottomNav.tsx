import { useNavigate, useLocation } from "react-router";
import { Home, Search, Shield, User, Zap, Bell, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { path: "/home", label: "Dashboard", icon: Home },
  { path: "/listings", label: "Listings", icon: Search },
  { path: "/passport", label: "Passport", icon: Shield },
  { path: "/profile", label: "Optimize", icon: User },
  { path: "/alert", label: "AI Alerts", icon: Bell },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (!profile) return "??";
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "??";
  };

  const getUserDisplayName = () => {
    if (!profile) return "Loading...";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email || "User";
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-sidebar-foreground text-[18px]" style={{ fontWeight: 700 }}>
              HomePilot
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center"
          >
            {mobileOpen ? (
              <X size={18} className="text-sidebar-foreground" />
            ) : (
              <Menu size={18} className="text-sidebar-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-[57px] left-0 right-0 bg-sidebar border-b border-sidebar-border py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-all ${
                    active
                      ? "text-[#10B981] bg-[#10B981]/10"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[14px]" style={{ fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/20">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-sidebar-foreground text-[20px]" style={{ fontWeight: 700 }}>
            HomePilot
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3">
          <p className="text-muted-foreground text-[11px] tracking-wider px-3 mb-2" style={{ fontWeight: 600 }}>
            NAVIGATION
          </p>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    active
                      ? "text-sidebar-foreground bg-[#10B981]/15 border border-[#10B981]/20"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent border border-transparent"
                  }`}
                >
                  <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[14px]" style={{ fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                  {item.path === "/alert" && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center" style={{ fontWeight: 700 }}>
                      2
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User - from Supabase profile */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center text-white text-[13px]" style={{ fontWeight: 700 }}>
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-[13px] truncate" style={{ fontWeight: 600 }}>
                {getUserDisplayName()}
              </p>
              <p className="text-muted-foreground text-[11px] truncate">
                Score: {profile != null ? profile.renter_score : "—"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
              title="Sign out"
            >
              <LogOut size={14} className="text-[#8B95A5]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
