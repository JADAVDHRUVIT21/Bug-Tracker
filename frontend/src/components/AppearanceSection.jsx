import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun,     desc: "Always use light theme" },
  { value: "dark",   label: "Dark",   icon: Moon,    desc: "Always use dark theme" },
  { value: "system", label: "System", icon: Monitor, desc: "Follow your device setting" },
];

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section
      className="rounded-2xl border p-6"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--card-background)",
        color: "var(--text-primary)",
      }}
    >
      <h2 className="text-lg font-semibold">Appearance</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Choose how Bug Tracker looks to you.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, icon: Icon, desc }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border-color)",
                background: active ? "var(--accent-bg)" : "var(--card-elevated)",
                color: active ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              <Icon size={20} />
              <span className="font-semibold">{label}</span>
              <span
                className="text-xs"
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}