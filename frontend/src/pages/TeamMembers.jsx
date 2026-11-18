import { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import projectService from "../services/projectService";
import projectMemberService from "../services/projectMemberService";
import { useAuth } from "../context/AuthContext";

const TeamMembers = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [members, setMembers] = useState([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Custom dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Filtered Members List (Now searches by Name, Email, AND ID)
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    
    const query = searchQuery.toLowerCase().trim();
    return members.filter((member) => {
      const name = member.full_name || member.name || member.user?.full_name || "";
      const memberEmail = member.email || member.user?.email || "";
      const id = String(member.user_id || "");
      
      return (
        name.toLowerCase().includes(query) || 
        memberEmail.toLowerCase().includes(query) || 
        id.includes(query)
      );
    });
  }, [members, searchQuery]);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

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
    setSearchQuery("");
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

  // Helper to safely extract Name and Email
  const getMemberDetails = (member) => {
    const name = member.full_name || member.name || member.user?.full_name || `User #${member.user_id}`;
    const userEmail = member.email || member.user?.email || "No email provided";
    const initial = name.charAt(0).toUpperCase();
    return { name, userEmail, initial };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-4 text-[var(--text-primary)] sm:p-6 md:p-10 transition-colors duration-250">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
              Team Members
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)] sm:mt-2">
              Manage the people who have access to your projects.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshPage}
            disabled={loading || membersLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50 sm:py-3"
          >
            <RefreshCw
              size={16}
              className={loading || membersLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Project Selector */}
        <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:mt-8 sm:p-5">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="shrink-0 rounded-lg bg-[var(--accent-bg)] p-2.5 sm:p-3">
              <FolderKanban className="text-[var(--accent)]" size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Select Project
              </label>

              <div ref={dropdownRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  disabled={loading || projects.length === 0}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-2.5 text-left text-sm text-[var(--text-primary)] backdrop-blur-xl transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 ${
                    dropdownOpen ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {selectedProject
                      ? `${selectedProject.name} (${selectedProject.key})`
                      : projects.length === 0
                        ? "No projects available"
                        : "Select a project"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`absolute left-0 right-0 z-40 mt-2 origin-top overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-1.5 shadow-2xl transition-all duration-200 ease-out ${
                    dropdownOpen
                      ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                      : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
                  }`}
                  role="listbox"
                >
                  <div
                    className="max-h-60 overflow-y-auto scrollbar-thin sm:max-h-64"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "var(--text-muted) transparent" }}
                  >
                    {projects.length === 0 ? (
                      <div className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                        No projects available
                      </div>
                    ) : (
                      projects.map((project) => {
                        const isSelected = String(project.id) === String(selectedProjectId);
                        return (
                          <button
                            key={project.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedProjectId(String(project.id));
                              setFormError("");
                              setError("");
                              setDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                                : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                            }`}
                          >
                            <span className="min-w-0 truncate">
                              {project.name}{" "}
                              <span className="text-[var(--text-muted)]">
                                ({project.key})
                              </span>
                            </span>

                            {isSelected && (
                              <Check size={16} className="shrink-0 text-[var(--accent)]" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)] sm:mt-6">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] py-14 sm:mt-8 sm:py-16">
            <Loader2 className="animate-spin text-[var(--accent)]" size={28} />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Loading projects...
            </span>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-12 text-center sm:mt-8 sm:px-6 sm:py-16">
            <FolderKanban size={36} className="text-[var(--accent)]" />
            <h2 className="mt-4 text-lg font-semibold sm:mt-5 sm:text-xl">
              No projects available
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create a project before managing team members.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Total Members
                    </p>
                    <p className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-3xl">
                      {members.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--accent-bg)] p-2.5 sm:p-3">
                    <Users size={22} className="text-[var(--accent)]" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Your Permission
                    </p>
                    <p className="mt-1.5 text-base font-semibold sm:mt-2 sm:text-lg">
                      {canManageMembers ? "Manager" : "Member"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--success-light-bg)] p-2.5 sm:p-3">
                    <ShieldCheck size={22} className="text-[var(--success-color)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Add Member Form */}
            {canManageMembers && (
              <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:mt-8 sm:p-6">
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="shrink-0 rounded-lg bg-[var(--success-light-bg)] p-2.5 sm:p-3">
                    <UserPlus size={20} className="text-[var(--success-color)]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold sm:text-lg">
                      Add Team Member
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Enter the email address of an existing active user.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleAddMember}
                  className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] sm:left-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setFormError("");
                      }}
                      placeholder="Enter member's email address"
                      autoComplete="email"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] sm:py-3 sm:pl-11 sm:pr-4"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adding || !email.trim()}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
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
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)] sm:mt-4">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  The email must belong to an existing active account.
                </p>
              </div>
            )}

            {!canManageMembers && (
              <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 text-sm text-[var(--text-secondary)] sm:mt-8">
                You can view this project's team members. Only the project owner or an admin can add or remove members.
              </div>
            )}

            {/* Members List */}
            <div className="mt-6 sm:mt-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">
                    Project Members
                  </h2>
                  <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                    {selectedProject?.name || "Selected project"}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[var(--accent-bg)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative mt-5 w-full sm:max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Search size={18} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or ID..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] py-3 pl-11 pr-10 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {membersLoading ? (
                <div className="mt-4 flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] py-12 sm:mt-5 sm:py-14">
                  <Loader2 size={25} className="animate-spin text-[var(--accent)]" />
                  <span className="ml-3 text-sm text-[var(--text-secondary)]">
                    Loading members...
                  </span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="mt-4 flex flex-col items-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-12 text-center sm:mt-5 sm:px-6 sm:py-14">
                  <Search size={34} className="text-[var(--text-muted)]" />
                  <h3 className="mt-4 text-base font-semibold sm:text-lg">
                    No members found
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {searchQuery 
                      ? `No members matched "${searchQuery}"`
                      : "Add members to collaborate on this project."}
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] sm:mt-5">
                  {/* Table Header */}
                  <div className="hidden grid-cols-[2fr_1.5fr_150px_100px] gap-4 border-b border-[var(--border-color)] bg-[var(--surface-hover)] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] md:grid">
                    <span>Member</span>
                    <span>Email</span>
                    <span>Joined</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="divide-y divide-[var(--border-color)]">
                    <AnimatePresence>
                      {filteredMembers.map((member) => {
                        const { name, userEmail, initial } = getMemberDetails(member);
                        
                        return (
                          <motion.div
                            key={member.id || member.user_id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[2fr_1.5fr_150px_100px] md:items-center md:gap-4 md:px-6"
                          >
                            {/* Name & Avatar */}
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-sm font-bold text-[var(--accent)] sm:h-11 sm:w-11">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                  {name}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)] sm:mt-1">
                                  ID: {member.user_id}
                                </p>
                              </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center text-sm text-[var(--text-secondary)] md:block">
                              <span className="mr-2 text-xs text-[var(--text-muted)] md:hidden">
                                Email:{" "}
                              </span>
                              <span className="truncate">{userEmail}</span>
                            </div>

                            {/* Joined Date */}
                            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] md:block">
                              <span className="text-xs text-[var(--text-muted)] md:hidden">
                                Joined:{" "}
                              </span>
                              <span>{formatDate(member.joined_at)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-start md:justify-end">
                              {canManageMembers && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemove(member)}
                                  disabled={removingId === member.user_id}
                                  className="flex items-center gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] px-3 py-2 text-xs font-medium text-[var(--danger-color)] transition hover:opacity-80 disabled:opacity-50"
                                >
                                  {removingId === member.user_id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                  Remove
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Remove Confirmation Modal */}
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
            className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-5 text-center shadow-2xl backdrop-blur-2xl sm:p-6"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] text-[var(--danger-color)] sm:h-14 sm:w-14">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)] sm:text-lg">
              Remove Team Member?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {getMemberDetails(confirmRemove).name}
              </span>{" "}
              from this project?
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                disabled={removingId === confirmRemove.user_id}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:opacity-80 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removingId === confirmRemove.user_id}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--danger-color)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
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