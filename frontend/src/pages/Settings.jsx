
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import profileService from "../services/profileService";
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
} from "lucide-react";

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
      <div className="min-h-full space-y-8 p-5 text-slate-100 sm:p-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <SettingsIcon size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage your account information and security.
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium transition hover:bg-blue-500"
            >
              <Pencil size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Notifications */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
            {success}
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Edit Profile</h2>

            <p className="mt-1 text-sm text-slate-400">
              Update your personal account information.
            </p>

            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-slate-400 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Your registered email address cannot be changed.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Account Information */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Account Information</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your registered Bug Tracker account details.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {accountDetails.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-slate-400">
                    <Icon size={17} />
                    <span className="text-sm">{item.label}</span>
                  </div>

                  <p className="break-words font-medium text-slate-100">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application Information */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Application Information</h2>

          <p className="mt-1 text-sm text-slate-400">
            Information about your workspace.
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-slate-700 pt-4">
            <span className="text-sm text-slate-400">Application</span>
            <span className="text-sm font-medium">Bug Tracker</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">Version</span>
            <span className="text-sm font-medium">1.0.0</span>
          </div>
        </section>

        {/* Change Password - Last Section */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <LockKeyhole size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="mt-1 text-sm text-slate-400">
                Update your password to keep your account secure.
              </p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Current Password
              </label>

              <div className="relative">
                <KeyRound
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={changingPassword}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                New Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                  placeholder="Enter new password"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Password must contain at least 8 characters.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Confirm New Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="border-t border-slate-700 pt-5">
              <button
                type="submit"
                disabled={changingPassword}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LockKeyhole size={16} />
                {changingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>
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
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#202124] shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pb-7 pt-8 text-center">
                <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-purple-500/15 text-purple-400">
                  <AlertTriangle size={32} strokeWidth={1.8} />
                </div>

                <h2
                  id="password-confirm-title"
                  className="text-xl font-semibold tracking-tight text-white"
                >
                  Change Password?
                </h2>

                <p
                  id="password-confirm-description"
                  className="mt-3 text-sm leading-6 text-gray-400"
                >
                  Are you sure you want to change your password? Your
                  current password will no longer work after this change.
                </p>
              </div>

              <div className="grid grid-cols-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={changingPassword}
                  onClick={() => setShowPasswordConfirm(false)}
                  className="border-r border-white/10 px-4 py-[17px] text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={changingPassword}
                  onClick={confirmPasswordChange}
                  className="px-4 py-[17px] text-sm font-semibold text-purple-400 transition hover:bg-purple-500/10 disabled:opacity-50"
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