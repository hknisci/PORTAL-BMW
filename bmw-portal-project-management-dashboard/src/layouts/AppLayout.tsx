import React, { useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";
import { AuthContext } from "@/contexts/AuthContext";

function titleFromPath(pathname: string, isAdmin: boolean): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/envanter")) return "Envanter";
  if (pathname.startsWith("/self-service")) return "Self Service";

  // ✅ admin değilse Ansible asla seçili görünmesin
  if (pathname.startsWith("/ansible")) return isAdmin ? "Ansible" : "Dashboard";

  if (pathname.startsWith("/performance")) return "Performance";
  if (pathname.startsWith("/askgt")) return "AskGT";
  if (pathname.startsWith("/duty-roster")) return "Nöbet Listesi";
  if (pathname.startsWith("/important-links")) return "Önemli Linkler";
  return "Dashboard";
}

function pathFromTitle(title: string): string {
  switch (title) {
    case "Dashboard":
      return "/dashboard";
    case "Envanter":
      return "/envanter";
    case "Self Service":
      return "/self-service";
    case "Ansible":
      return "/ansible";
    case "Performance":
      return "/performance";
    case "AskGT":
      return "/askgt";
    case "Nöbet Listesi":
      return "/duty-roster";
    case "Önemli Linkler":
      return "/important-links";
    default:
      return "/dashboard";
  }
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, showTimeoutModal, extendSession, logout, countdown } =
    useContext(AuthContext);

  const isAdmin = user?.role === "Admin";

  const activeItem = titleFromPath(location.pathname, isAdmin);

  const handleNavigate = (title: string) => {
    navigate(pathFromTitle(title));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>

      <SessionTimeoutModal
        isOpen={showTimeoutModal}
        countdown={countdown}
        onExtend={extendSession}
        onLogout={logout}
      />
    </div>
  );
}