import { useState } from "react";
import { Sun, Moon, LogOut, Menu } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useNavigate, useLocation } from "react-router";
import { Logo } from "./Logo";
import { useAuth } from "../../contexts/AuthContext";
import { useUserAlerts } from "../../hooks/useSupabaseData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";

const navItems = [
  { path: "/home", label: "Dashboard" },
  { path: "/listings", label: "Listings" },
  { path: "/passport", label: "Passport" },
  { path: "/optimize", label: "Optimize" },
  { path: "/alert", label: "AI Alerts" },
];

export function TopBar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { alerts } = useUserAlerts();

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

  const unreadCount = alerts?.filter((a) => !a.is_read)?.length ?? 0;

  return (
    <div className="sticky top-4 z-30 w-full px-4 lg:px-6">
      <div className="mx-auto max-w-6xl min-h-[52px] rounded-2xl border border-white/10 bg-background/70 dark:bg-background/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 py-2.5">
        {/* Logo + brand */}
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2.5"
        >
          <Logo className="w-8 h-8" />
          <span
            className="text-foreground text-[18px] hidden sm:inline"
            style={{ fontWeight: 700 }}
          >
            HomePilot
          </span>
        </button>

        {/* Nav links - same style as landing page (desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-[14px] transition-colors ${
                isActive(item.path)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontWeight: isActive(item.path) ? 500 : 400 }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile nav menu */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <div className="py-4 px-3">
              <p className="text-muted-foreground text-[11px] tracking-wider px-3 mb-2" style={{ fontWeight: 600 }}>
                NAVIGATION
              </p>
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        active
                          ? "text-foreground bg-[#10B981]/15 border border-[#10B981]/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                      }`}
                      style={{ fontWeight: active ? 600 : 400 }}
                    >
                      <span className="text-[14px]">{item.label}</span>
                      {item.path === "/alert" && unreadCount > 0 && (
                        <span className="ml-auto w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center" style={{ fontWeight: 700 }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Right: theme, alerts, profile */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
            aria-label={theme === "dark" ? "Enable light mode" : "Enable dark mode"}
            title={theme === "dark" ? "Enable light mode" : "Enable dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-muted-foreground" />
            ) : (
              <Moon size={18} className="text-muted-foreground" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center overflow-hidden"
                aria-label="Your profile"
                title="Your profile"
              >
                <div
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center text-white text-[13px]"
                  style={{ fontWeight: 700 }}
                >
                  {getUserInitials()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {profile != null ? profile.renter_score : "—"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer"
              >
                View profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                variant="destructive"
                className="cursor-pointer"
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
