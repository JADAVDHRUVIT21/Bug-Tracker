
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tickets from "./pages/Tickets";
import KanbanBoard from "./pages/KanbanBoard";
import TicketDetails from "./pages/TicketDetails";
import TeamMembers from "./pages/TeamMembers";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/team-members" element={<TeamMembers />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets/:ticketId" element={<TicketDetails />} />
            </Route>
          </Route>

          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Unknown routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;