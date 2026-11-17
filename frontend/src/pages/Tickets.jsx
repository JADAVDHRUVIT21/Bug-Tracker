
import { useEffect, useState } from "react";
import {
  Bug,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  Loader2,
  CalendarDays,
  Filter,
  X,
  Save,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";

import ticketService from "../services/ticketService";
import projectService from "../services/projectService";

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityColors = {
  low: "bg-slate-500/10 text-slate-300",
  medium: "bg-blue-500/10 text-blue-400",
  high: "bg-orange-500/10 text-orange-400",
  critical: "bg-red-500/10 text-red-400",
};

const statusColors = {
  todo: "bg-slate-500/10 text-slate-300",
  in_progress: "bg-blue-500/10 text-blue-400",
  in_review: "bg-purple-500/10 text-purple-400",
  done: "bg-green-500/10 text-green-400",
};

const initialForm = {
  title: "",
  description: "",
  project_id: "",
  ticket_type: "bug",
  status: "todo",
  priority: "medium",
};

const getErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return fallback;
};

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingTicket, setDeletingTicket] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchTickets = async (overrides = {}) => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: 10,
        search: search.trim() || undefined,
        project_id: projectFilter ? Number(projectFilter) : undefined,
        ticket_status: statusFilter || undefined,
        ticket_type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        ...overrides,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      const data = await ticketService.getTickets(params);

      setTickets(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error("Tickets loading error:", err);
      setError(
        getErrorMessage(err, "Unable to load tickets. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Projects loading error:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [page, projectFilter, statusFilter, typeFilter, priorityFilter]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchTickets({ page: 1 });
  };

  const clearFilters = () => {
    setSearch("");
    setProjectFilter("");
    setStatusFilter("");
    setTypeFilter("");
    setPriorityFilter("");
    setPage(1);

    fetchTickets({
      page: 1,
      search: undefined,
      project_id: undefined,
      ticket_status: undefined,
      ticket_type: undefined,
      priority: undefined,
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    return project?.name || `Project #${projectId}`;
  };

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingTicket(null);
    setForm(initialForm);
    setFormError("");
    setShowFormModal(true);
  };

  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    setForm({
      title: ticket.title || "",
      description: ticket.description || "",
      project_id: String(ticket.project_id || ""),
      ticket_type: ticket.ticket_type || "bug",
      status: ticket.status || "todo",
      priority: ticket.priority || "medium",
    });
    setFormError("");
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;

    setShowFormModal(false);
    setEditingTicket(null);
    setFormError("");
  };

  const handleSaveTicket = async (event) => {
    event.preventDefault();
    setFormError("");

    if (form.title.trim().length < 2) {
      setFormError("Ticket title must contain at least 2 characters.");
      return;
    }

    if (!form.project_id) {
      setFormError("Please select a project.");
      return;
    }

    const ticketData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      project_id: Number(form.project_id),
      ticket_type: form.ticket_type,
      priority: form.priority,
    };

    if (editingTicket) {
      ticketData.status = form.status;
    }

    setSaving(true);

    try {
      if (editingTicket) {
        await ticketService.updateTicket(editingTicket.id, ticketData);
      } else {
        await ticketService.createTicket(ticketData);
      }

      setShowFormModal(false);
      setEditingTicket(null);
      setForm(initialForm);

      const nextPage = editingTicket ? page : 1;

      if (!editingTicket) {
        setPage(1);
      }

      await fetchTickets({ page: nextPage });
    } catch (err) {
      console.error("Ticket save error:", err);
      setFormError(
        getErrorMessage(
          err,
          editingTicket
            ? "Unable to update ticket. Please try again."
            : "Unable to create ticket. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicket) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await ticketService.deleteTicket(deletingTicket.id);

      setDeletingTicket(null);

      const nextPage =
        tickets.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      }

      await fetchTickets({ page: nextPage });
    } catch (err) {
      console.error("Ticket deletion error:", err);
      setDeleteError(
        getErrorMessage(err, "Unable to delete ticket. Please try again.")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-400">Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">Tickets</h1>
            <p className="mt-2 text-slate-400">
              Manage bugs, tasks, and feature requests.
            </p>
          </div>

          <button
            type="button"
            disabled={projects.length === 0}
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>

        {/* Count and refresh */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {total} {total === 1 ? "ticket" : "tickets"} found
          </p>

          <button
            type="button"
            onClick={() => fetchTickets()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Filter size={17} />
            Filters
          </div>

          <form
            onSubmit={handleSearch}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <div className="relative xl:col-span-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tickets..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(event) => {
                setProjectFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
              <option value="feature">Feature</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <div className="flex gap-3 md:col-span-2 xl:col-span-5">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Search
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Tickets table */}
        {loading ? (
          <div className="mt-8 flex justify-center rounded-xl border border-slate-800 bg-slate-900 p-16">
            <Loader2 size={30} className="animate-spin text-blue-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
            <div className="rounded-2xl bg-blue-500/10 p-4">
              <Bug size={34} className="text-blue-400" />
            </div>

            <h2 className="mt-5 text-xl font-semibold">No tickets found</h2>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              There are no tickets matching your filters.
              Create a ticket or try changing your filters.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="border-b border-slate-800 bg-slate-950/70">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Ticket</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="font-medium text-white">
                          {ticket.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          #{ticket.id}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-300">
                        {getProjectName(ticket.project_id)}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">
                          {ticket.ticket_type}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            statusColors[ticket.status] || ""
                          }`}
                        >
                          {statusLabels[ticket.status] || ticket.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                            priorityColors[ticket.priority] || ""
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-400">
                        <span className="flex items-center gap-2">
                          <CalendarDays size={14} />
                          {ticket.created_at
                            ? new Date(ticket.created_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/tickets/${ticket.id}`}
                            title="View ticket details and comments"
                            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
                          >
                            <Eye size={16} />
                            Details
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEditModal(ticket)}
                            title="Edit ticket"
                            className="rounded-lg border border-blue-500/30 p-2 text-blue-400 transition hover:bg-blue-500/10"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingTicket(ticket);
                              setDeleteError("");
                            }}
                            title="Delete ticket"
                            className="rounded-lg border border-red-500/30 p-2 text-red-400 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 px-6 py-4 sm:flex-row">
              <p className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Ticket Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFormModal();
            }
          }}
        >
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingTicket ? "Edit Ticket" : "Create New Ticket"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {editingTicket
                    ? `Update ticket #${editingTicket.id}`
                    : "Add a bug, task, or feature request."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTicket} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Ticket Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    required
                    minLength={2}
                    maxLength={200}
                    placeholder="Enter ticket title"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    rows={4}
                    maxLength={10000}
                    placeholder="Describe the ticket..."
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Project <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="project_id"
                    value={form.project_id}
                    onChange={updateForm}
                    required
                    disabled={Boolean(editingTicket)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-60"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Ticket Type
                    </label>
                    <select
                      name="ticket_type"
                      value={form.ticket_type}
                      onChange={updateForm}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="bug">Bug</option>
                      <option value="task">Task</option>
                      <option value="feature">Feature</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={updateForm}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {editingTicket && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Status
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={updateForm}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                )}
              </div>

              {formError && (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || projects.length === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      {editingTicket ? "Save Changes" : "Create Ticket"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTicket && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <Trash2 size={23} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-white">
              Delete Ticket?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                "{deletingTicket.title}"
              </span>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeletingTicket(null);
                  setDeleteError("");
                }}
                className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteTicket}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
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

export default Tickets;