import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import profileService from "../services/profileService";
import { useTheme } from "../context/ThemeContext";
import {
  Settings as SettingsIcon,
  User,
  Mail,
  ShieldCheck,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Save,
  X,
  LockKeyhole,
  KeyRound,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

// --- NEW ANIMATED THEME TOGGLE ---
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "system", icon: Monitor, label: "System" },
  ];

  const activeIndex = options.findIndex((opt) => opt.id === theme);

  return (
    <div className="flex justify-center pb-6">
      <div className="relative flex w-full max-w-sm items-center justify-between rounded-2xl bg-[var(--surface-hover)] p-1.5 shadow-inner">
        {/* Animated Sliding Background */}
        <div
          className="absolute left-1.5 top-1.5 bottom-1.5 rounded-xl bg-[var(--card-background)] shadow-md transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            width: "calc((100% - 12px) / 3)",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />

        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-300 ${
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon
                size={18}
                className={`transition-transform duration-500 ${
                  isActive ? "scale-110 rotate-12" : "scale-100 rotate-0"
                }`}
              />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
// ---------------------------------

function Settings() {
  const { user, updateUser } = useAuth();

  // Profile states
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Profile editing
  const startEditing = () => {
    setFullName(user?.full_name || "");
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFullName(user?.full_name || "");
    setError("");
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = fullName.trim();

    if (trimmedName.length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    if (trimmedName === user?.full_name) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);

      const updatedUser = await profileService.updateMyProfile({
        full_name: trimmedName,
      });

      updateUser(updatedUser);

      setFullName(updatedUser.full_name);
      setIsEditing(false);
      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Validate password form and open confirmation dialog
  const handleChangePassword = (e) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(
        "New password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password."
      );
      return;
    }

    setShowPasswordConfirm(true);
  };

  // Confirm and update password
  const confirmPasswordChange = async () => {
    try {
      setChangingPassword(true);
      setShowPasswordConfirm(false);
      setPasswordError("");
      setPasswordSuccess("");

      const response = await profileService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      setPasswordSuccess(
        response.message || "Password changed successfully."
      );
    } catch (err) {
      setPasswordError(
        err.response?.data?.detail ||
          "Unable to change your password. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const accountDetails = [
    {
      label: "Full Name",
      value: user?.full_name || "Not available",
      icon: User,
    },
    {
      label: "Email Address",
      value: user?.email || "Not available",
      icon: Mail,
    },
    {
      label: "Role",
      value: user?.role || "Not available",
      icon: ShieldCheck,
    },
    {
      label: "Account Status",
      value: user?.is_active ? "Active" : "Inactive",
      icon: CheckCircle2,
    },
    {
      label: "Member Since",
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : "Not available",
      icon: CalendarDays,
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-color)] p-5 text-[var(--text-primary)] sm:p-8 transition-colors duration-250">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <SettingsIcon size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Manage your account information and security.
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {/* NEW: Appearance Section */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Customize how Bug Tracker looks on your device.
              </p>
            </div>
            <ThemeToggle />
          </section>

          {/* Profile Notifications */}
          {error && (
            <div className="rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)]">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-[var(--success-color)] bg-[var(--success-light-bg)] p-4 text-sm text-[var(--success-color)]">
              {success}
            </div>
          )}

          {/* Edit Profile Form */}
          {isEditing && (
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6">
              <h2 className="text-lg font-semibold">Edit Profile</h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Update your personal account information.
              </p>

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />

                    <input
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-[var(--border-color)] bg-[var(--surface-hover)] py-3 pl-11 pr-4 text-[var(--text-muted)] outline-none"
                    />
                  </div>

                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Your registered email address cannot be changed.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Account Information */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Account Information</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Your registered Bug Tracker account details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {accountDetails.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-hover)] p-4"
                  >
                    <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
                      <Icon size={17} />
                      <span className="text-sm">{item.label}</span>
                    </div>

                    <p className="break-words font-medium text-[var(--text-primary)]">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Application Information */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6">
            <h2 className="text-lg font-semibold">Application Information</h2>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Information about your workspace.
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
              <span className="text-sm text-[var(--text-secondary)]">Application</span>
              <span className="text-sm font-medium">Bug Tracker</span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
          </section>

          {/* Change Password - Last Section */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <LockKeyhole size={22} />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Change Password</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Update your password to keep your account secure.
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-5 rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)]">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-5 rounded-xl border border-[var(--success-color)] bg-[var(--success-light-bg)] p-4 text-sm text-[var(--success-color)]">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Current Password
                </label>

                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] py-3 pl-11 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  New Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] py-3 pl-11 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                    placeholder="Enter new password"
                  />
                </div>

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Password must contain at least 8 characters.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Confirm New Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />

                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] py-3 pl-11 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-5">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockKeyhole size={16} />
                  {changingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Confirmation Dialog rendered directly inside document.body */}
      {showPasswordConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={() => {
              if (!changingPassword) {
                setShowPasswordConfirm(false);
              }
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="password-confirm-title"
              aria-describedby="password-confirm-description"
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--card-background)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pb-7 pt-8 text-center">
                <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--accent-bg)] text-[var(--accent)]">
                  <AlertTriangle size={32} strokeWidth={1.8} />
                </div>

                <h2
                  id="password-confirm-title"
                  className="text-xl font-semibold tracking-tight text-[var(--text-primary)]"
                >
                  Change Password?
                </h2>

                <p
                  id="password-confirm-description"
                  className="mt-3 text-sm leading-6 text-[var(--text-secondary)]"
                >
                  Are you sure you want to change your password? Your
                  current password will no longer work after this change.
                </p>
              </div>

              <div className="grid grid-cols-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  disabled={changingPassword}
                  onClick={() => setShowPasswordConfirm(false)}
                  className="border-r border-[var(--border-color)] px-4 py-[17px] text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={changingPassword}
                  onClick={confirmPasswordChange}
                  className="px-4 py-[17px] text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  {changingPassword ? "Changing..." : "Confirm Change"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Settings;