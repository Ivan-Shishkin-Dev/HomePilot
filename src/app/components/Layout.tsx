import { Outlet } from "react-router";
import { Sidebar } from "./BottomNav";
import { TopBar } from "./TopBar";

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-[240px] pt-[57px] lg:pt-0 min-h-screen">
        <TopBar />
        <Outlet />
      </main>
    </div>
  );
}