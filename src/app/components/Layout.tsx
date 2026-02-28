import { Outlet, useNavigate } from "react-router";
import { Bell, Moon, Sun } from "lucide-react";
import { Sidebar } from "./BottomNav";
import { useTheme } from "../ThemeContext";

export function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-[240px] pt-[57px] lg:pt-0 min-h-screen">
        {/* Shared top bar: theme + notification on every screen */}
        <div className="sticky top-0 z-30 flex justify-end border-b border-border bg-background/95 backdrop-blur-sm px-6 lg:px-10 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-muted-foreground" />
              ) : (
                <Moon size={18} className="text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => navigate("/alert")}
              className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="AI Alerts"
            >
              <Bell size={18} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-background" />
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
