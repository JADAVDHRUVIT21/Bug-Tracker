import { useEffect, useState } from "react";
import {
  FolderKanban,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";

import projectService from "../services/projectService";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  name: "",
  key: "",
  description: "",
};

const Projects = () => {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);

  const isAdmin = user?.role === "admin";

  const canManageProject = (project) =>
    isAdmin || project.owner_id === user?.id;

  const fetchProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await projectService.getProjects();
      setProjects(data);
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "key"
          ? value.toUpperCase().replace(/\s/g, "")
          : value,
    }));
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData(initialForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || "",
      key: project.key || "",
      description: project.description || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProject(null);
    setFormData(initialForm);
    setFormError("");
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();
    setFormError("");

    const name = formData.name.trim();
    const key = formData.key.trim();
    const description = formData.description.trim();

    if (name.length < 2 || name.length > 150) {
      setFormError("Project name must contain 2 to 150 characters.");
      return;
    }

    if (
      key.length < 2 ||
      key.length > 20 ||
      !/^[A-Z0-9_-]+$/.test(key)
    ) {
      setFormError(
        "Project key must contain 2 to 20 letters, numbers, hyphens, or underscores."
      );
      return;
    }

    if (description.length > 2000) {
      setFormError("Description cannot exceed 2000 characters.");
      return;
    }

    setSaving(true);

    try {
      const projectData = {
        name,
        key,
        description: description || null,
      };

      if (editingProject) {
        const updatedProject = await projectService.updateProject(
          editingProject.id,
          projectData
        );

        setProjects((previous) =>
          previous.map((project) =>
            project.id === editingProject.id
              ? updatedProject
              : project
          )
        );
      } else {
        const newProject =
          await projectService.createProject(projectData);

        setProjects((previous) => [newProject, ...previous]);
      }

      setShowModal(false);
      setEditingProject(null);
      setFormData(initialForm);
      setFormError("");
    } catch (err) {
      console.error("Project save error:", err);

      const detail = err.response?.data?.detail;

      setFormError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "Unable to save project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = (project) => {
    setConfirmDeleteProject(project);
  };

  const confirmProjectDeletion = async () => {
    if (!confirmDeleteProject) return;

    const project = confirmDeleteProject;
    setDeletingId(project.id);
    setError("");

    try {
      await projectService.deleteProject(project.id);

      setProjects((previous) =>
        previous.filter((item) => item.id !== project.id)
      );
      setConfirmDeleteProject(null);
    } catch (err) {
      console.error("Project deletion error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to delete project. Please try again."
      );
      setConfirmDeleteProject(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-6 text-[var(--text-primary)] md:p-10 transition-colors duration-250">
      <div className="mx-auto max-w-7xl">

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Workspace</p>

            <h1 className="mt-2 text-3xl font-bold">
              Projects
            </h1>

            <p className="mt-2 text-[var(--text-secondary)]">
              Manage and organize your development projects.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={18} />
            Create Project
          </button>
        </div>

        {/* Project Count and Refresh */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
          </p>

          <button
            type="button"
            onClick={fetchProjects}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)]">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-xl border border-[var(--border-color)] bg-[var(--card-background)]"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (

          /* Empty State */
          <div className="mt-8 flex flex-col items-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] px-6 py-16 text-center">
            <div className="rounded-2xl bg-[var(--accent-bg)] p-4">
              <FolderKanban
                size={34}
                className="text-[var(--accent)]"
              />
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              No projects yet
            </h2>

            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              Create your first project to start organizing bugs,
              tasks, and feature requests.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={18} />
              Create Your First Project
            </button>
          </div>

        ) : (

          /* Projects Grid */
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 transition hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-[var(--accent-bg)] p-3">
                    <FolderKanban
                      size={22}
                      className="text-[var(--accent)]"
                    />
                  </div>

                  <span className="rounded-md bg-[var(--surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {project.key}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold">
                  {project.name}
                </h2>

                <p className="mt-2 min-h-10 text-sm text-[var(--text-secondary)]">
                  {project.description ||
                    "No description provided."}
                </p>

                <div className="mt-5 flex items-center gap-2 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-muted)]">
                  <CalendarDays size={14} />

                  Created{" "}
                  {project.created_at
                    ? new Date(
                        project.created_at
                      ).toLocaleDateString()
                    : "—"}
                </div>

                {/* Project Actions */}
                {canManageProject(project) && (
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(project)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent-bg)] px-3 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project)}
                      disabled={deletingId === project.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] px-3 py-2.5 text-sm font-medium text-[var(--danger-color)] transition hover:opacity-80 disabled:opacity-50"
                    >
                      {deletingId === project.id ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={15} />
                      )}

                      {deletingId === project.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                )}

                {!canManageProject(project) && (
                  <p className="mt-5 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-muted)]">
                    You have access to this project as a member.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* macOS-style Delete Confirmation */}
      {confirmDeleteProject && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              deletingId !== confirmDeleteProject.id
            ) {
              setConfirmDeleteProject(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            aria-describedby="delete-project-description"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 text-center shadow-2xl backdrop-blur-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] text-[var(--danger-color)] shadow-inner">
              <Trash2 size={27} />
            </div>

            <h2
              id="delete-project-title"
              className="mt-4 text-lg font-semibold tracking-tight text-[var(--text-primary)]"
            >
              Delete Project?
            </h2>

            <p
              id="delete-project-description"
              className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
            >
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {confirmDeleteProject.name}
              </span>
              ? This action cannot be undone.
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--danger-color)] opacity-90">
              Related project data may also be permanently deleted.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteProject(null)}
                disabled={deletingId === confirmDeleteProject.id}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmProjectDeletion}
                disabled={deletingId === confirmDeleteProject.id}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--danger-color)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === confirmDeleteProject.id ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {editingProject
                    ? "Edit Project"
                    : "Create New Project"}
                </h2>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {editingProject
                    ? "Update your project information."
                    : "Enter your project information below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Project Form */}
            <form
              onSubmit={handleSaveProject}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Project Name *
                </label>

                <input
                  id="project-name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={150}
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Bug Tracker"
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="project-key"
                  className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Project Key *
                </label>

                <input
                  id="project-key"
                  name="key"
                  type="text"
                  required
                  minLength={2}
                  maxLength={20}
                  value={formData.key}
                  onChange={handleInputChange}
                  placeholder="e.g. BUG"
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-sm uppercase text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  2–20 characters. Letters, numbers, hyphens,
                  and underscores are allowed.
                </p>
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Description
                </label>

                <textarea
                  id="project-description"
                  name="description"
                  rows={4}
                  maxLength={2000}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this project is about..."
                  className="w-full resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />

                <p className="mt-1 text-right text-xs text-[var(--text-muted)]">
                  {formData.description.length}/2000
                </p>
              </div>

              {/* Form Error */}
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)]">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[var(--border-color)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : editingProject ? (
                    <Pencil size={17} />
                  ) : (
                    <Plus size={17} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingProject
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;