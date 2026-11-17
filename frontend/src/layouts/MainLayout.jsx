
import { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bug,
  LayoutDashboard,
  FolderKanban,
  Ticket,
  KanbanSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Tickets", path: "/tickets", icon: Ticket },
    { name: "Kanban Board", path: "/kanban", icon: KanbanSquare },
    { name: "Team Members", path: "/team-members", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // Open logout confirmation dialog
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Confirm logout
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setSidebarOpen(false);

    logout();
    navigate("/login", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Bug size={21} />
              </div>
              <span className="text-lg font-bold">Bug Tracker</span>
            </div>

            <button
              type="button"
              onClick={closeSidebar}
              className="text-slate-400 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X size={21} />
            </button>
          </div>

          {/* Navigation */}
          <div className="px-4 py-6">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={19} />
                      {item.name}
                    </span>
                    <ChevronRight size={15} className="opacity-50" />
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* User Profile and Logout */}
          <div className="mt-auto border-t border-slate-800 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user?.full_name || "User"}
                </p>
                <p className="truncate text-xs capitalize text-slate-400">
                  {user?.role || "Member"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-h-screen lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-5 backdrop-blur">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-300 hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={23} />
            </button>

            <div className="hidden text-sm text-slate-400 sm:block">
              Bug Tracker <span className="mx-2">/</span>
              <span className="text-white">Workspace</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-300 sm:block">
                {user?.full_name}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>

      {/* iOS / macOS Style Logout Confirmation Dialog */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              aria-describedby="logout-confirm-description"
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#202124] shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pb-7 pt-8 text-center">
                <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-red-500/15 text-red-400">
                  <AlertTriangle size={32} strokeWidth={1.8} />
                </div>

                <h2
                  id="logout-confirm-title"
                  className="text-xl font-semibold tracking-tight text-white"
                >
                  Confirm Logout?
                </h2>

                <p
                  id="logout-confirm-description"
                  className="mt-3 text-sm leading-6 text-gray-400"
                >
                  Are you sure you want to log out of your Bug Tracker
                  account? You will need to sign in again to access your
                  workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="border-r border-white/10 px-4 py-[17px] text-sm font-medium text-gray-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="flex items-center justify-center gap-2 px-4 py-[17px] text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Confirm Logout
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default MainLayout;