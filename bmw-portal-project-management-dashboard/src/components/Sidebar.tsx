// src/components/Sidebar.tsx
import React, { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { AuthContext } from "@/contexts/AuthContext";

type NavItem = {
  id: string;
  label: string;
  to: string;
};

const navItems: NavItem[] = [
  { id: "Dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "Envanter", label: "Envanter", to: "/envanter" },
  { id: "Self Service", label: "Self Service", to: "/self-service" },
  { id: "Ansible", label: "Ansible", to: "/ansible" },
  { id: "Performance", label: "Performance", to: "/performance" },
  { id: "AskGT", label: "AskGT", to: "/askgt" },
  { id: "Nöbet Listesi", label: "Nöbet Listesi", to: "/duty-roster" },
  { id: "Önemli Linkler", label: "Önemli Linkler", to: "/important-links" },
];

const Sidebar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const isAdmin = user?.role === "Admin";

  // ✅ admin değilse Ansible menüde görünmez
  const visibleNavItems = navItems.filter((item) => {
    if (item.id === "Ansible" && !isAdmin) return false;
    return true;
  });

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              BMW Portal
            </h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 justify-center">
            <ul className="flex items-center space-x-6 xl:space-x-8">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-blue-600 font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </ul>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Desktop User */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src="https://picsum.photos/seed/user-avatar/40/40"
                  alt="User Avatar"
                  className="h-9 w-9 rounded-full"
                />
                <p className="font-semibold text-sm text-gray-700 capitalize">
                  {user?.username}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
          <nav className="p-4">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `block p-3 rounded-lg transition-colors duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-gray-600 hover:bg-gray-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}

              <li className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src="https://picsum.photos/seed/user-avatar/40/40"
                      alt="User Avatar"
                      className="h-9 w-9 rounded-full"
                    />
                    <p className="font-semibold text-sm text-gray-700 capitalize">
                      {user?.username}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Sidebar;