  import { useEffect, useRef, useState } from "react";
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
    ChevronDown,
    Check,
  } from "lucide-react";
  import { Link } from "react-router-dom";

  import ticketService from "../services/ticketService";
  import projectService from "../services/projectService";

  // macOS / iOS-inspired custom dropdown used throughout this page.
  const CustomSelect = ({
    name,
    value,
    onChange,
    options,
    placeholder = "Select an option",
    disabled = false,
    className = "",
  }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const selectedOption = options.find(
      (option) => String(option.value) === String(value)
    );

    useEffect(() => {
      const handleOutsideClick = (event) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target)
        ) {
          setOpen(false);
        }
      };

      const handleKeyDown = (event) => {
        if (event.key === "Escape") setOpen(false);
      };

      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handleOutsideClick);
        document.removeEventListener("touchstart", handleOutsideClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, []);

    const chooseOption = (option) => {
      onChange({
        target: {
          name,
          value: option.value,
        },
      });
      setOpen(false);
    };

    return (
      <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm outline-none transition-all duration-200 ${
            open
              ? "border-[var(--accent)] bg-[var(--card-background)] shadow-[0_0_0_3px_var(--accent-bg)]"
              : "border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--text-muted)]"
          } ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
        >
          <span
            className={`truncate ${
              selectedOption ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            }`}
          >
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            size={17}
            className={`shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
              open ? "rotate-180 text-[var(--accent)]" : "group-hover:text-[var(--text-primary)]"
            }`}
          />
        </button>

        {open && !disabled && (
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+8px)] z-[80] max-h-64 w-full min-w-[190px] overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {options.map((option) => {
              const selected =
                String(option.value) === String(value);

              return (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => chooseOption(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    selected
                      ? "bg-[var(--accent-bg)] font-medium text-[var(--accent)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && (
                    <Check
                      size={16}
                      className="shrink-0 text-[var(--accent)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
  };

  const priorityColors = {
    low: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    critical: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const statusColors = {
    todo: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    in_review: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    done: "bg-green-500/10 text-green-600 dark:text-green-400",
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
      const project = projects.find(
        (item) => String(item.id) === String(projectId)
      );
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

    const projectFilterOptions = [
      { value: "", label: "All Projects" },
      ...projects.map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    ];

    const statusOptions = [
      { value: "", label: "All Statuses" },
      { value: "todo", label: "To Do" },
      { value: "in_progress", label: "In Progress" },
      { value: "in_review", label: "In Review" },
      { value: "done", label: "Done" },
    ];

    const typeOptions = [
      { value: "", label: "All Types" },
      { value: "bug", label: "Bug" },
      { value: "task", label: "Task" },
      { value: "feature", label: "Feature" },
    ];

    const priorityOptions = [
      { value: "", label: "All Priorities" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ];

    const projectFormOptions = [
      { value: "", label: "Select a project" },
      ...projects.map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    ];

    const typeFormOptions = typeOptions.filter((option) => option.value);
    const priorityFormOptions = priorityOptions.filter(
      (option) => option.value
    );
    const statusFormOptions = statusOptions.filter(
      (option) => option.value
    );

    return (
      <div className="min-h-screen bg-[var(--bg-color)] p-6 text-[var(--text-primary)] md:p-10 transition-colors duration-250">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Workspace</p>
              <h1 className="mt-2 text-3xl font-bold">Tickets</h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                Manage bugs, tasks, and feature requests.
              </p>
            </div>

            <button
              type="button"
              disabled={projects.length === 0}
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              Create Ticket
            </button>
          </div>

          {/* Count and refresh */}
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              {total} {total === 1 ? "ticket" : "tickets"} found
            </p>

            <button
              type="button"
              onClick={() => fetchTickets()}
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

          {/* Filters */}
          <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tickets..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <CustomSelect
                value={projectFilter}
                onChange={(event) => {
                  setProjectFilter(event.target.value);
                  setPage(1);
                }}
                options={projectFilterOptions}
              />

              <CustomSelect
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                options={statusOptions}
              />

              <CustomSelect
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                options={typeOptions}
              />

              <CustomSelect
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value);
                  setPage(1);
                }}
                options={priorityOptions}
              />

              <div className="flex gap-3 md:col-span-2 xl:col-span-5">
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                >
                  Clear Filters
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)]">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Tickets table */}
          {loading ? (
            <div className="mt-8 flex justify-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-16">
              <Loader2 size={30} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] px-6 py-16 text-center">
              <div className="rounded-2xl bg-[var(--accent-bg)] p-4">
                <Bug size={34} className="text-[var(--accent)]" />
              </div>

              <h2 className="mt-5 text-xl font-semibold">No tickets found</h2>

              <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                There are no tickets matching your filters. Create a ticket or
                try changing your filters.
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--card-background)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] text-left">
                  <thead className="border-b border-[var(--border-color)] bg-[var(--surface-hover)]">
                    <tr className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                      <th className="px-6 py-4">Ticket</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="transition hover:bg-[var(--surface-hover)]"
                      >
                        <td className="px-6 py-5">
                          <div className="font-medium text-[var(--text-primary)]">
                            {ticket.title}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            #{ticket.id}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-[var(--text-secondary)]">
                          {getProjectName(ticket.project_id)}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-md bg-[var(--surface-hover)] px-2.5 py-1 text-xs capitalize text-[var(--text-secondary)]">
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

                        <td className="px-6 py-5 text-sm text-[var(--text-secondary)]">
                          <span className="flex items-center gap-2">
                            <CalendarDays size={14} />
                            {ticket.created_at
                              ? new Date(
                                  ticket.created_at
                                ).toLocaleDateString()
                              : "—"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/tickets/${ticket.id}`}
                              title="View ticket details and comments"
                              className="flex items-center gap-2 rounded-lg border border-[var(--success-color)] px-3 py-2 text-xs font-semibold text-[var(--success-color)] transition hover:bg-[var(--success-light-bg)]"
                            >
                              <Eye size={16} />
                              Details
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditModal(ticket)}
                              title="Edit ticket"
                              className="rounded-lg border border-[var(--accent)] p-2 text-[var(--accent)] transition hover:bg-[var(--accent-bg)]"
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
                              className="rounded-lg border border-[var(--danger-color)] p-2 text-[var(--danger-color)] transition hover:bg-[var(--danger-light-bg)]"
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
              <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border-color)] px-6 py-4 sm:flex-row">
                <p className="text-sm text-[var(--text-secondary)]">
                  Page {page} of {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {editingTicket ? "Edit Ticket" : "Create New Ticket"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {editingTicket
                      ? `Update ticket #${editingTicket.id}`
                      : "Add a bug, task, or feature request."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTicket} className="p-6">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                      Ticket Title <span className="text-[var(--danger-color)]">*</span>
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={updateForm}
                      required
                      minLength={2}
                      maxLength={200}
                      placeholder="Enter ticket title"
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={updateForm}
                      rows={4}
                      maxLength={10000}
                      placeholder="Describe the ticket..."
                      className="w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                      Project <span className="text-[var(--danger-color)]">*</span>
                    </label>
                    <CustomSelect
                      name="project_id"
                      value={form.project_id}
                      onChange={updateForm}
                      options={projectFormOptions}
                      placeholder="Select a project"
                      disabled={Boolean(editingTicket)}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                        Ticket Type
                      </label>
                      <CustomSelect
                        name="ticket_type"
                        value={form.ticket_type}
                        onChange={updateForm}
                        options={typeFormOptions}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                        Priority
                      </label>
                      <CustomSelect
                        name="priority"
                        value={form.priority}
                        onChange={updateForm}
                        options={priorityFormOptions}
                      />
                    </div>
                  </div>

                  {editingTicket && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                        Status
                      </label>
                      <CustomSelect
                        name="status"
                        value={form.status}
                        onChange={updateForm}
                        options={statusFormOptions}
                      />
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)]">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[var(--border-color)] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    disabled={saving}
                    className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || projects.length === 0}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--danger-light-bg)] text-[var(--danger-color)]">
                <Trash2 size={23} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
                Delete Ticket?
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  "{deletingTicket.title}"
                </span>
                ? This action cannot be undone.
              </p>

              {deleteError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)]">
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
                  className="rounded-xl border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteTicket}
                  className="flex items-center gap-2 rounded-xl bg-[var(--danger-color)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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