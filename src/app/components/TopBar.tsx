import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useNavigate } from "react-router";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="sticky top-4 z-30 w-full px-4 lg:px-6">
      <div className="mx-auto max-w-6xl min-h-[52px] rounded-2xl border border-white/10 bg-background/70 dark:bg-background/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-xl flex items-center justify-end gap-3 px-4 lg:px-6 py-2.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-muted-foreground" />
          ) : (
            <Moon size={18} className="text-muted-foreground" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate("/alert")}
          className="relative w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="View notifications"
        >
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-background" />
        </button>
      </div>
    </div>
  );
}
