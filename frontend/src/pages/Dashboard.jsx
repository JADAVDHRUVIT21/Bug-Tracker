import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  CheckCircle2,
  Clock,
  FolderKanban,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import dashboardService from "../services/dashboardService";

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getFormattedDate = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

/* -------------------------------------------------------------------------- */
/*                            Bar Chart Component                             */
/* -------------------------------------------------------------------------- */

const BarChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 220;

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-3 sm:gap-4">
        {data.map((item, index) => {
          const Icon = item.icon;
          const heightPercent = (item.value / maxValue) * 100;
          const isHovered = hovered === index;

          return (
            <div
              key={item.label}
              className="group flex flex-1 flex-col items-center"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`pointer-events-none mb-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-xl backdrop-blur-xl transition-all duration-200 ${
                  isHovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                {item.value} {item.value === 1 ? "item" : "items"}
              </div>

              <div
                className="relative flex w-full max-w-[64px] items-end justify-center"
                style={{ height: chartHeight }}
              >
                <div className="absolute inset-0 rounded-t-lg bg-[var(--surface-hover)]" />
                <div
                  className={`relative w-full rounded-t-lg transition-all duration-500 ease-out ${
                    item.barColor
                  } ${isHovered ? "brightness-125 scale-y-[1.02]" : ""}`}
                  style={{
                    height: `${Math.max(heightPercent, 2)}%`,
                    transformOrigin: "bottom",
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-white/30" />
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center gap-1 text-center">
                <div
                  className={`rounded-md p-1.5 transition-colors ${
                    isHovered ? item.bg : "bg-transparent"
                  }`}
                >
                  <Icon size={16} className={`transition-colors ${item.color}`} />
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors sm:text-xs ${
                    isHovered ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                          Donut / Circle Chart                              */
/* -------------------------------------------------------------------------- */

const DonutChart = ({ segments, total }) => {
  const [hovered, setHovered] = useState(null);

  const size = 220;
  const strokeWidth = 24;
  const hoverStrokeWidth = 32;
  
  const radius = (size - hoverStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dash = fraction * circumference;
    const offset = cumulative;
    cumulative += dash;
    return { ...seg, dash, offset };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 overflow-visible"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-hover)"
            strokeWidth={strokeWidth}
          />

          {arcs.map((arc, index) => {
            const isHovered = hovered === index;
            const isDimmed = hovered !== null && !isHovered;

            return (
              <circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.stroke}
                strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-300 ease-out"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                  filter: isHovered
                    ? `drop-shadow(0 0 8px ${arc.stroke})`
                    : "none",
                }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hovered !== null ? (
            <>
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {segments[hovered].value}
              </span>
              <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                {segments[hovered].label}
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {total}
              </span>
              <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Total
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {segments.map((seg, index) => {
          const isHovered = hovered === index;
          const Icon = seg.icon;

          return (
            <button
              key={seg.label}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                isHovered ? "bg-[var(--surface-hover)]" : "bg-transparent"
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: seg.stroke,
                  transform: isHovered ? "scale(1.4)" : "scale(1)",
                }}
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Icon size={14} className={seg.color} />
                <span className="text-sm text-[var(--text-secondary)]">
                  {seg.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {seg.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                           Line Chart Component                             */
/* -------------------------------------------------------------------------- */

const LineChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);

  const width = 800;
  const height = 260;
  const paddingX = 45;
  const paddingY = 30;

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.created, d.resolved)),
    10 
  );

  const getX = (index) => {
    if (data.length <= 1) return width / 2;
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  };

  const getY = (value) => {
    return height - paddingY - (value / maxValue) * (height - paddingY * 2);
  };

  const generatePath = (key) => {
    if (data.length === 0) return "";
    if (data.length === 1) return `M ${getX(0)} ${getY(data[0][key])}`;

    let path = `M ${getX(0)} ${getY(data[0][key])}`;
    
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(data[i][key]);
      const x2 = getX(i + 1);
      const y2 = getY(data[i + 1][key]);
      
      const cx1 = x1 + (x2 - x1) / 2;
      const cy1 = y1;
      const cx2 = x1 + (x2 - x1) / 2;
      const cy2 = y2;

      path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
    return path;
  };

  const createAreaPath = (key) => {
    const linePath = generatePath(key);
    if (!linePath) return "";
    return `${linePath} L ${getX(data.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * width;
    const stepX = (width - paddingX * 2) / (data.length - 1);
    let index = Math.round((relativeX - paddingX) / stepX);
    index = Math.max(0, Math.min(index, data.length - 1));
    setHovered(index);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {hovered !== null && (
          <line
            x1={getX(hovered)}
            y1={paddingY}
            x2={getX(hovered)}
            y2={height - paddingY}
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}

        {[0, 1, 2, 3, 4].map((tick) => {
          const y = paddingY + (tick / 4) * (height - paddingY * 2);
          const value = Math.round(maxValue - (tick / 4) * maxValue);
          return (
            <g key={tick} className="pointer-events-none">
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 10}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="11"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}

        <path d={createAreaPath("created")} fill="url(#createdGradient)" className="pointer-events-none" />
        <path d={createAreaPath("resolved")} fill="url(#resolvedGradient)" className="pointer-events-none" />

        <path
          d={generatePath("created")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          className="pointer-events-none"
        />
        <path
          d={generatePath("resolved")}
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          className="pointer-events-none"
        />

        {data.map((d, i) => {
          const x = getX(i);
          const isHovered = hovered === i;

          return (
            <g key={d.date} className="pointer-events-none">
              <text
                x={x}
                y={height - 8}
                fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                fontSize="11"
                textAnchor="middle"
                className="transition-colors duration-200"
              >
                {d.date}
              </text>

              <circle
                cx={x}
                cy={getY(d.created)}
                r={isHovered ? 5 : 3.5}
                fill="var(--card-background)"
                stroke="#3b82f6"
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-200"
              />

              <circle
                cx={x}
                cy={getY(d.resolved)}
                r={isHovered ? 5 : 3.5}
                fill="var(--card-background)"
                stroke="#22c55e"
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-200"
              />
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] && (
        <div
          className="pointer-events-none absolute z-10 flex w-32 flex-col gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-elevated)] p-3 text-xs shadow-2xl backdrop-blur-xl transition-all duration-150"
          style={{
            left: `${(getX(hovered) / width) * 100}%`,
            top: "5%",
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-semibold text-[var(--text-secondary)]">
            {data[hovered].fullDate || data[hovered].date}
          </span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[var(--text-secondary)]">Created:</span>
            <span className="ml-auto font-semibold text-[var(--text-primary)]">
              {data[hovered].created}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[var(--text-secondary)]">Resolved:</span>
            <span className="ml-auto font-semibold text-[var(--text-primary)]">
              {data[hovered].resolved}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 Dashboard                                  */
/* -------------------------------------------------------------------------- */

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTickets: 0,
    inProgress: 0,
    completed: 0,
  });

  const [trendData, setTrendData] = useState([
    { date: "Mon", fullDate: "Monday", created: 4, resolved: 2 },
    { date: "Tue", fullDate: "Tuesday", created: 6, resolved: 3 },
    { date: "Wed", fullDate: "Wednesday", created: 3, resolved: 5 },
    { date: "Thu", fullDate: "Thursday", created: 8, resolved: 4 },
    { date: "Fri", fullDate: "Friday", created: 5, resolved: 7 },
    { date: "Sat", fullDate: "Saturday", created: 2, resolved: 6 },
    { date: "Sun", fullDate: "Sunday", created: 1, resolved: 3 },
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Toast State
  const [toast, setToast] = useState(null);

  // --- NEW: Catch the success toast passed from Login.jsx ---
  useEffect(() => {
    if (location.state?.message) {
      setToast({ type: location.state.type, message: location.state.message });
      
      // Clear history state so the toast doesn't reappear on refresh
      window.history.replaceState({}, document.title);

      // Auto-hide toast after 4 seconds
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [location]);

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

  const barData = [
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      barColor: "bg-blue-500",
    },
    {
      label: "Tickets",
      value: stats.totalTickets,
      icon: Bug,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      barColor: "bg-purple-500",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      barColor: "bg-amber-500",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      barColor: "bg-green-500",
    },
  ];

  const openTickets = Math.max(
    stats.totalTickets - stats.inProgress - stats.completed,
    0
  );

  const donutSegments = [
    {
      label: "Completed",
      value: stats.completed,
      stroke: "#22c55e",
      color: "text-green-400",
      icon: CheckCircle2,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      stroke: "#f59e0b",
      color: "text-amber-400",
      icon: Clock,
    },
    {
      label: "Open",
      value: openTickets,
      stroke: "#6366f1",
      color: "text-indigo-400",
      icon: AlertCircle,
    },
  ].filter((seg) => seg.value > 0);

  const donutSum = donutSegments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-4 text-[var(--text-primary)] sm:p-6 md:p-10 transition-colors duration-250 relative">
      
      {/* --- Custom Toast Notification --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed top-6 left-6 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
              toast.type === "success" 
                ? "border-green-500/30 text-green-600 dark:text-green-400" 
                : "border-red-500/30 text-red-600 dark:text-red-400"
            }`}
            style={{ 
              background: toast.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)" 
            }}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Workspace overview</p>

            <h1 className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-3xl">
              {getGreeting()}, {user?.full_name?.split(" ")[0] || "Developer"}!
            </h1>

            <p className="mt-1.5 text-sm text-[var(--text-secondary)] sm:mt-2 sm:text-base">
              Here's what's happening on <span className="font-medium text-[var(--text-primary)]">{getFormattedDate()}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStatistics}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50 sm:px-5 sm:py-3"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-start gap-3 text-sm text-[var(--danger-color)]">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              {error}
            </div>

            <button
              onClick={fetchStatistics}
              className="text-sm font-semibold text-[var(--danger-color)] hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 transition-colors hover:border-[var(--text-muted)] sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {stat.title}
                  </p>

                  <div className={`rounded-lg p-2.5 sm:p-3 ${stat.bg}`}>
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>

                <h2 className="mt-3 text-2xl font-bold sm:mt-5 sm:text-3xl">
                  {loading ? (
                    <span className="inline-block h-8 w-12 animate-pulse rounded bg-[var(--surface-hover)]" />
                  ) : (
                    stat.value
                  )}
                </h2>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 lg:grid-cols-2">
          
          {/* Bar Chart */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <BarChart3 size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold sm:text-lg">
                  Ticket Overview
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                  Counts by category
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-[280px] items-end justify-around gap-4">
                {[60, 80, 40, 70].map((h, i) => (
                  <div
                    key={i}
                    className="w-full max-w-[64px] animate-pulse rounded-t-lg bg-[var(--surface-hover)]"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            ) : (
              <BarChart data={barData} />
            )}
          </div>

          {/* Donut Chart */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <PieChart size={20} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold sm:text-lg">
                  Ticket Distribution
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                  Status breakdown
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-[240px] items-center justify-center">
                <div className="h-40 w-40 animate-pulse rounded-full border-[24px] border-[var(--surface-hover)]" />
              </div>
            ) : donutSum === 0 ? (
              <div className="flex h-[240px] flex-col items-center justify-center text-center">
                <PieChart size={36} className="text-[var(--text-muted)]" />
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  No ticket data yet
                </p>
              </div>
            ) : (
              <DonutChart
                segments={donutSegments}
                total={donutSum}
              />
            )}
          </div>

          {/* Line Chart (Full Width below the first two) */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-6 lg:col-span-2">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2.5">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold sm:text-lg">
                    Ticket Trend
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                    Created vs Resolved over the last 7 days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-[var(--text-secondary)]">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-[var(--text-secondary)]">Resolved</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-[260px] w-full animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            ) : (
              <LineChart data={trendData} />
            )}
          </div>

        </div>

        {/* Getting started */}
        <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-5 sm:mt-8 sm:p-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            Getting started
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your project workspace is ready. Create your first project
            to start organizing bugs, tasks, and feature requests.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;