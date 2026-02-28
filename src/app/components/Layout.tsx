import { Outlet } from "react-router";
import { TopBar } from "./TopBar";
import { ProtectedRoute } from "./ProtectedRoute";

export function Layout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-[72px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}