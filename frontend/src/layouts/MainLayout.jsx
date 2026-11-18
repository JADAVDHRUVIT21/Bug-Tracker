import { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug, LayoutDashboard, FolderKanban, Ticket, KanbanSquare,
  Users, Settings, LogOut, Menu, X, ChevronRight, AlertTriangle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Tickets", path: "/tickets", icon: Ticket },
    { name: "Kanban Board", path: "/kanban", icon: KanbanSquare },
    { name: "Team Members", path: "/team-members", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  
  // Updated Logout Logic with Animations
  const confirmLogout = () => {
    setShowLogoutConfirm(false); // Close the modal
    setIsLoggingOut(true);       // Show the full screen loader
    
    // Wait 1.5 seconds for the loading animation to play
    setTimeout(() => {
      setIsLoggingOut(false);
      setSidebarOpen(false);
      
      // 1. Navigate FIRST with the toast message state
      navigate("/login", { 
        replace: true, 
        state: { message: "Logged out successfully.", type: "logout" } 
      });
      
      // 2. Then call logout() right after to clear the token
      // We use a tiny timeout to ensure the navigation state is registered first
      setTimeout(() => {
        logout();
      }, 100);
      
    }, 1500);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div 
        className="min-h-screen transition-colors duration-300"
        style={{ background: "var(--background)", color: "var(--text-primary)" }}
      >
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
          style={{ 
            borderColor: "var(--border-color)", 
            background: "var(--card-background)" 
          }}
        >
          <div className="flex h-16 items-center justify-between border-b px-5" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white">
                <Bug size={21} />
              </div>
              <span className="text-lg font-bold">Bug Tracker</span>
            </div>
            <button type="button" onClick={closeSidebar} className="lg:hidden hover:opacity-70" aria-label="Close menu">
              <X size={21} />
            </button>
          </div>

          <div className="px-4 py-6">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
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
                        isActive ? "bg-blue-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`
                    }
                    style={({ isActive }) => ({
                      color: isActive ? "#fff" : "var(--text-secondary)"
                    })}
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

          <div className="mt-auto border-t p-4" style={{ borderColor: "var(--border-color)" }}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.full_name || "User"}</p>
                <p className="truncate text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
                  {user?.role || "Member"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition hover:bg-red-500/10 hover:text-red-500"
              style={{ color: "var(--text-secondary)" }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="min-h-screen lg:pl-64">
          <header 
            className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-5 backdrop-blur"
            style={{ 
              borderColor: "var(--border-color)", 
              background: "var(--card-background)" 
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden hover:opacity-70"
              aria-label="Open menu"
            >
              <Menu size={23} />
            </button>

            <div className="hidden text-sm sm:block" style={{ color: "var(--text-secondary)" }}>
              Bug Tracker <span className="mx-2">/</span>
              <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Workspace</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm sm:block" style={{ color: "var(--text-primary)" }}>
                {user?.full_name}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>

      {/* --- ANIMATIONS PORTAL --- */}
      {createPortal(
        <>
          {/* Logout Confirmation Modal */}
          <AnimatePresence>
            {showLogoutConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
                onClick={() => setShowLogoutConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="w-full max-w-sm overflow-hidden rounded-[28px] border shadow-2xl"
                  style={{ 
                    borderColor: "var(--border-color)", 
                    background: "var(--card-background)",
                    color: "var(--text-primary)" 
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-7 pb-7 pt-8 text-center">
                    <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-red-500/15 text-red-500">
                      <AlertTriangle size={32} strokeWidth={1.8} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">Confirm Logout?</h2>
                    <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                      Are you sure you want to log out of your Bug Tracker account? You will need to sign in again to access your workspace.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 border-t" style={{ borderColor: "var(--border-color)" }}>
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="border-r px-4 py-[17px] text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmLogout}
                      className="flex items-center justify-center gap-2 px-4 py-[17px] text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                    >
                      <LogOut size={16} />
                      Confirm Logout
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Screen Logout Loader */}
          <AnimatePresence>
            {isLoggingOut && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center rounded-3xl border p-8 shadow-2xl"
                  style={{ background: "var(--card-background)", borderColor: "var(--border-color)" }}
                >
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-red-500/20 border-t-red-500"
                    />
                    <LogOut size={32} className="text-red-500" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Signing you out...</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Cleaning up your secure session.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
};

export default MainLayout;