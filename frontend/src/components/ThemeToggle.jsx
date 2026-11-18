import { useTheme } from "../context/ThemeContext";
import { FiMonitor, FiSun, FiMoon } from "react-icons/fi";

const OPTIONS = [
  { value: "system", label: "System", icon: FiMonitor },
  { value: "light",  label: "Light",  icon: FiSun },
  { value: "dark",   label: "Dark",   icon: FiMoon },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px",
        borderRadius: "999px",
        border: "1px solid var(--border-color)",
        background: "var(--card-background)",
        boxShadow: "var(--shadow)",
      }}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            title={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            <Icon size={14} />
            <span className="theme-toggle-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}