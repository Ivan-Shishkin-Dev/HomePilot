import { Outlet } from "react-router";
import { Sidebar } from "./BottomNav";
import { TopBar } from "./TopBar";
import { ProtectedRoute } from "./ProtectedRoute";

export function Layout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <TopBar />
        <Sidebar />
        <main className="lg:ml-[240px] pt-[72px] lg:pt-0 min-h-screen">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}