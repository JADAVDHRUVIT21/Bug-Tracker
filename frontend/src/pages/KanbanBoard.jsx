import { useCallback, useEffect, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  RefreshCw,
  GripVertical,
} from "lucide-react";

import ticketService from "../services/ticketService";

const columns = [
  { id: "todo", title: "To Do", icon: Circle },
  { id: "in_progress", title: "In Progress", icon: Clock },
  { id: "in_review", title: "In Review", icon: AlertCircle },
  { id: "done", title: "Done", icon: CheckCircle2 },
];

const priorityStyles = {
  low: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  medium: "bg-blue-500/15 text-blue-500 dark:text-blue-400",
  high: "bg-orange-500/15 text-orange-500 dark:text-orange-400",
  critical: "bg-red-500/15 text-red-500 dark:text-red-400",
};

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return error?.message || "Something went wrong. Please try again.";
}

// Collision detection:
// Prefer the ticket card directly under the pointer.
// If no ticket is under the pointer, detect the column.
function kanbanCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);

  const ticketCollisions = pointerCollisions.filter(({ id }) => {
    const container = args.droppableContainers.find(
      (item) => String(item.id) === String(id)
    );

    return container?.data.current?.type === "ticket";
  });

  if (ticketCollisions.length > 0) {
    return ticketCollisions;
  }

  const columnCollisions = pointerCollisions.filter(({ id }) => {
    const container = args.droppableContainers.find(
      (item) => String(item.id) === String(id)
    );

    return container?.data.current?.type === "column";
  });

  if (columnCollisions.length > 0) {
    return columnCollisions;
  }

  const rectangleCollisions = rectIntersection(args);

  if (rectangleCollisions.length > 0) {
    return rectangleCollisions;
  }

  return closestCorners(args);
}

// Ticket Card
function TicketCard({ ticket, dragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(ticket.id),
    data: {
      type: "ticket",
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`shrink-0 rounded-xl border p-4 shadow-sm transition-colors ${
        dragging
          ? "rotate-2 border-[var(--accent)] bg-[var(--card-background)] shadow-xl"
          : "border-[var(--border-color)] bg-[var(--card-background)] hover:border-[var(--text-muted)]"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          #{ticket.id}
        </span>

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:cursor-grabbing"
          aria-label="Drag ticket"
          title="Drag to change position or status"
        >
          <GripVertical size={18} />
        </button>
      </div>

      <h3 className="mb-2 break-words text-sm font-semibold text-[var(--text-primary)]">
        {ticket.title}
      </h3>

      {ticket.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
          {ticket.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
            priorityStyles[ticket.priority] || priorityStyles.medium
          }`}
        >
          {ticket.priority || "medium"}
        </span>

        <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {ticket.ticket_type || "bug"}
        </span>
      </div>

      <div className="border-t border-[var(--border-color)] pt-3 text-xs text-[var(--text-secondary)]">
        <p>Project ID: {ticket.project_id}</p>

        <p className="mt-1">
          {ticket.assignee_id
            ? `Assignee ID: ${ticket.assignee_id}`
            : "Unassigned"}
        </p>
      </div>
    </div>
  );
}

// Kanban Column
function KanbanColumn({ column, tickets }) {
  const Icon = column.icon;

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-[420px] min-w-0 flex-col rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
          : "border-[var(--border-color)] bg-[var(--card-background)]"
      }`}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-[var(--text-secondary)]" />

          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {column.title}
          </h2>
        </div>

        <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {tickets.length}
        </span>
      </div>

      <SortableContext
        items={tickets.map((ticket) => String(ticket.id))}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--text-muted) var(--surface-hover)",
          }}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}

          {tickets.length === 0 && (
            <div
              className={`flex min-h-[150px] items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-xs transition-colors ${
                isOver
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border-color)] text-[var(--text-muted)]"
              }`}
            >
              Drop tickets here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main Kanban Board
export default function KanbanBoard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await ticketService.getTickets({
        page_size: 100,
      });

      const items = Array.isArray(response)
        ? response
        : response?.items || [];

      setTickets(items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const findTicket = (id, list = tickets) =>
    list.find((ticket) => String(ticket.id) === String(id));

  const findColumn = (id) => {
    const ticket = findTicket(id);

    if (ticket) return ticket.status;

    return columns.find((column) => column.id === id)?.id || null;
  };

  const handleDragStart = (event) => {
    setActiveTicket(findTicket(event.active.id) || null);
  };

  const handleDragCancel = () => {
    setActiveTicket(null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveTicket(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const draggedTicket = findTicket(activeId);

    if (!draggedTicket) return;

    const destinationStatus = findColumn(overId);

    if (!destinationStatus) return;

    const previousTickets = [...tickets];

    const sourceStatus = draggedTicket.status;

    // Remove the dragged ticket before calculating its new position.
    const remainingTickets = tickets.filter(
      (ticket) => String(ticket.id) !== activeId
    );

    const destinationTickets = remainingTickets.filter(
      (ticket) => ticket.status === destinationStatus
    );

    // Find the exact target ticket.
    const targetTicket = findTicket(overId, remainingTickets);

    let insertIndex;

    if (targetTicket) {
      // Determine whether to place the dragged ticket above or below
      // the target ticket using the dragged card's vertical center.
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;

      const activeCenterY = activeRect
        ? activeRect.top + activeRect.height / 2
        : null;

      const overCenterY = overRect.top + overRect.height / 2;

      const placeAfter =
        activeCenterY !== null && activeCenterY > overCenterY;

      const targetIndex = destinationTickets.findIndex(
        (ticket) => String(ticket.id) === overId
      );

      insertIndex = placeAfter ? targetIndex + 1 : targetIndex;
    } else {
      // Dropping directly onto a column places the ticket at the end.
      insertIndex = destinationTickets.length;
    }

    const updatedDestinationTickets = [...destinationTickets];

    updatedDestinationTickets.splice(
      Math.max(0, insertIndex),
      0,
      {
        ...draggedTicket,
        status: destinationStatus,
      }
    );

    // Rebuild the board while preserving the order of other columns.
    let destinationPosition = 0;

    const updatedTickets = remainingTickets.map((ticket) => {
      if (ticket.status !== destinationStatus) {
        return ticket;
      }

      const replacement = updatedDestinationTickets[destinationPosition];
      destinationPosition += 1;

      return replacement || ticket;
    });

    // If the destination column was empty, append the moved ticket.
    if (
      !updatedTickets.some(
        (ticket) => String(ticket.id) === activeId
      )
    ) {
      const destinationIds = new Set(
        updatedDestinationTickets.map((ticket) => String(ticket.id))
      );

      const otherTickets = updatedTickets.filter(
        (ticket) => !destinationIds.has(String(ticket.id))
      );

      updatedTickets.splice(
        0,
        updatedTickets.length,
        ...otherTickets,
        ...updatedDestinationTickets
      );
    }

    setTickets(updatedTickets);

    // Persist status changes when the ticket moves to another column.
    if (sourceStatus !== destinationStatus) {
      try {
        setUpdating(true);
        setError("");

        await ticketService.updateTicket(draggedTicket.id, {
          status: destinationStatus,
        });
      } catch (err) {
        setTickets(previousTickets);
        setError(getErrorMessage(err));
      } finally {
        setUpdating(false);
      }
    }
  };

  const ticketsByStatus = (status) =>
    tickets.filter((ticket) => ticket.status === status);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-5 text-[var(--text-primary)] sm:p-8 transition-colors duration-250">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Kanban Board
            </h1>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Organize and track your tickets by status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading || updating}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Updating Status */}
        {updating && (
          <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
            <Loader2 size={16} className="animate-spin" />
            Updating ticket status...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)]">
            {error}
          </div>
        )}

        {/* Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tickets={ticketsByStatus(column.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTicket ? (
              <TicketCard ticket={activeTicket} dragging />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-muted)]">
          <GripVertical size={15} />
          Drag tickets above or below other tickets to change their
          position. Drop into another column to update their status.
        </div>
      </div>
    </div>
  );
}