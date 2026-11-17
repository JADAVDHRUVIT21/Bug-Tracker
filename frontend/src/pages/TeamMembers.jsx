
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Trash2,
  Loader2,
  FolderKanban,
  ShieldCheck,
  Mail,
  X,
} from "lucide-react";

import projectService from "../services/projectService";
import projectMemberService from "../services/projectMemberService";
import { useAuth } from "../context/AuthContext";

const TeamMembers = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) => String(project.id) === String(selectedProjectId)
      ),
    [projects, selectedProjectId]
  );

  const canManageMembers = Boolean(
    selectedProject &&
      (isAdmin || selectedProject.owner_id === user?.id)
  );

  const fetchProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await projectService.getProjects();
      setProjects(data);

      if (data.length > 0) {
        setSelectedProjectId((current) => {
          if (data.some((project) => String(project.id) === current)) {
            return current;
          }

          return String(data[0].id);
        });
      } else {
        setSelectedProjectId("");
        setMembers([]);
      }
    } catch (err) {
      console.error("Projects loading error:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to load projects. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (projectId = selectedProjectId) => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    setError("");

    try {
      const data = await projectMemberService.getMembers(projectId);
      setMembers(data);
    } catch (err) {
      console.error("Members loading error:", err);
      setMembers([]);
      setError(
        err.response?.data?.detail ||
          "Unable to load team members. Please try again."
      );
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMembers(selectedProjectId);
    } else {
      setMembers([]);
    }
  }, [selectedProjectId]);

  const handleAddMember = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!selectedProjectId) {
      setFormError("Please select a project.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFormError("Please enter the user's email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setAdding(true);

    try {
      await projectMemberService.addMember(
        selectedProjectId,
        normalizedEmail
      );

      setEmail("");
      await fetchMembers(selectedProjectId);
    } catch (err) {
      console.error("Add member error:", err);

      const detail = err.response?.data?.detail;

      setFormError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "Unable to add this member. Please try again."
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove || !selectedProjectId) return;

    const member = confirmRemove;
    setRemovingId(member.user_id);
    setError("");

    try {
      await projectMemberService.removeMember(
        selectedProjectId,
        member.user_id
      );

      setMembers((previous) =>
        previous.filter(
          (item) => item.user_id !== member.user_id
        )
      );

      setConfirmRemove(null);
    } catch (err) {
      console.error("Remove member error:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to remove this member. Please try again."
      );
      setConfirmRemove(null);
    } finally {
      setRemovingId(null);
    }
  };

  const refreshPage = async () => {
    await fetchProjects();

    if (selectedProjectId) {
      await fetchMembers(selectedProjectId);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-400">Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">Team Members</h1>
            <p className="mt-2 text-slate-400">
              Manage the people who have access to your projects.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshPage}
            disabled={loading || membersLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading || membersLoading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* Project Selector */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <FolderKanban className="text-blue-400" size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="team-project"
                className="block text-sm font-medium text-slate-300"
              >
                Select Project
              </label>

              <select
                id="team-project"
                value={selectedProjectId}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  setFormError("");
                  setError("");
                }}
                disabled={loading || projects.length === 0}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
              >
                {projects.length === 0 && (
                  <option value="">No projects available</option>
                )}

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 py-16">
            <Loader2 className="animate-spin text-blue-400" size={28} />
            <span className="ml-3 text-sm text-slate-400">
              Loading projects...
            </span>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
            <FolderKanban size={36} className="text-blue-400" />
            <h2 className="mt-5 text-xl font-semibold">
              No projects available
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Create a project before managing team members.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Total Members
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {members.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-500/10 p-3">
                    <Users size={24} className="text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Your Permission
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {canManageMembers ? "Manager" : "Member"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <ShieldCheck
                      size={24}
                      className="text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Add Member */}
            {canManageMembers && (
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <UserPlus
                      size={21}
                      className="text-emerald-400"
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">
                      Add Team Member
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Enter the email address of an existing active user.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleAddMember}
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setFormError("");
                      }}
                      placeholder="Enter member's email address"
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adding || !email.trim()}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <UserPlus size={17} />
                    )}
                    {adding ? "Adding..." : "Add Member"}
                  </button>
                </form>

                {formError && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  The email must belong to an existing active account.
                </p>
              </div>
            )}

            {!canManageMembers && (
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
                You can view this project's team members. Only the project
                owner or an admin can add or remove members.
              </div>
            )}

            {/* Members List */}
            <div className="mt-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold">Project Members</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedProject?.name || "Selected project"}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                  {members.length}{" "}
                  {members.length === 1 ? "member" : "members"}
                </span>
              </div>

              {membersLoading ? (
                <div className="mt-5 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 py-14">
                  <Loader2
                    size={25}
                    className="animate-spin text-blue-400"
                  />
                  <span className="ml-3 text-sm text-slate-400">
                    Loading members...
                  </span>
                </div>
              ) : members.length === 0 ? (
                <div className="mt-5 flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 px-6 py-14 text-center">
                  <Users size={34} className="text-slate-500" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No team members yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Add members to collaborate on this project.
                  </p>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                  <div className="hidden grid-cols-[1fr_150px_100px] gap-4 border-b border-slate-800 bg-slate-950/60 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
                    <span>Member ID</span>
                    <span>Joined</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_150px_100px] md:items-center md:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-400">
                            #{member.user_id}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              User #{member.user_id}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              User ID: {member.user_id}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-slate-400">
                          <span className="text-xs text-slate-500 md:hidden">
                            Joined:{" "}
                          </span>
                          {formatDate(member.joined_at)}
                        </div>

                        <div className="flex justify-start md:justify-end">
                          {canManageMembers && (
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(member)}
                              disabled={removingId === member.user_id}
                              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {removingId === member.user_id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Remove Confirmation */}
      {confirmRemove && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              removingId !== confirmRemove.user_id
            ) {
              setConfirmRemove(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#242424]/95 p-6 text-center shadow-2xl backdrop-blur-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/15 text-red-400">
              <Trash2 size={26} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-white">
              Remove Team Member?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-white">
                User #{confirmRemove.user_id}
              </span>{" "}
              from this project?
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                disabled={removingId === confirmRemove.user_id}
                className="rounded-lg border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removingId === confirmRemove.user_id}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {removingId === confirmRemove.user_id ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <X size={15} />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembers;