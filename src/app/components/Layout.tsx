import { Outlet } from "react-router";
import { Sidebar } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";

export function Layout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0A0F1E]">
        <Sidebar />
        <main className="lg:ml-[240px] pt-[57px] lg:pt-0 min-h-screen">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}