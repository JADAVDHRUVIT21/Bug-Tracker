
import { useEffect, useState } from "react";
import {
  Bug,
  CheckCircle2,
  Clock,
  FolderKanban,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import dashboardService from "../services/dashboardService";

const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTickets: 0,
    inProgress: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatistics = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await dashboardService.getStatistics();
      setStats(data);
    } catch (err) {
      console.error("Dashboard statistics error:", err);
      setError("Unable to load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const statCards = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: Bug,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-400">
              Workspace overview
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome back, {user?.full_name || "Developer"}!
            </h1>

            <p className="mt-2 text-slate-400">
              Here's what's happening with your projects today.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStatistics}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3 text-sm text-red-400">
              <AlertCircle size={20} />
              {error}
            </div>

            <button
              onClick={fetchStatistics}
              className="text-sm font-semibold text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    {stat.title}
                  </p>

                  <div className={`rounded-lg p-3 ${stat.bg}`}>
                    <Icon size={21} className={stat.color} />
                  </div>
                </div>

                <h2 className="mt-5 text-3xl font-bold">
                  {loading ? (
                    <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-700" />
                  ) : (
                    stat.value
                  )}
                </h2>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-semibold">
            Getting started
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Your project workspace is ready. Create your first project
            to start organizing bugs, tasks, and feature requests.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;