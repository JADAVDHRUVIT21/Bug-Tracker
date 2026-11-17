
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Send,
  AlertTriangle,
} from "lucide-react";

import ticketService from "../services/ticketService";
import commentService from "../services/commentService";
import TicketAttachments from "../components/TicketAttachments";

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statusColors = {
  todo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  in_review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};

function formatDate(date) {
  if (!date) return "Unknown date";
  return new Date(date).toLocaleString();
}

function CommentItem({ comment, replies, onReply, onDelete, onEdit }) {
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const submitReply = async (event) => {
    event.preventDefault();
    if (!replyContent.trim()) return;

    await onReply(comment.id, replyContent.trim());
    setReplyContent("");
    setReplying(false);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editContent.trim()) return;

    await onEdit(comment.id, editContent.trim());
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200">
          User #{comment.author_id}
        </span>

        <span className="text-xs text-slate-500">
          {formatDate(comment.created_at)}
        </span>
      </div>

      {editing ? (
        <form onSubmit={submitEdit} className="space-y-3">
          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            required
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
          {comment.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setReplying((value) => !value)}
          className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
        >
          {replying ? "Cancel Reply" : "Reply"}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditContent(comment.content);
            setEditing(true);
          }}
          className="text-xs font-medium text-slate-400 transition hover:text-white"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(comment.id)}
          className="text-xs font-medium text-red-400 transition hover:text-red-300"
        >
          Delete
        </button>
      </div>

      {replying && (
        <form onSubmit={submitReply} className="mt-4 space-y-3">
          <textarea
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            placeholder="Write a reply..."
            rows={2}
            maxLength={5000}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            required
          />

          <button
            type="submit"
            disabled={!replyContent.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Reply
          </button>
        </form>
      )}

      {replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-slate-700 pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketDetails() {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [ticketData, commentData] = await Promise.all([
        ticketService.getTicket(ticketId),
        commentService.getComments(ticketId),
      ]);

      setTicket(ticketData);
      setComments(
        Array.isArray(commentData)
          ? commentData
          : commentData?.items || []
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load ticket details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      setError("");

      await commentService.createComment(ticketId, {
        content: content.trim(),
        parent_id: null,
      });

      setContent("");
      await loadDetails();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Unable to add comment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId, replyContent) => {
    try {
      await commentService.createComment(ticketId, {
        content: replyContent,
        parent_id: parentId,
      });

      await loadDetails();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Unable to add reply."
      );
    }
  };

  const handleEdit = async (commentId, newContent) => {
    try {
      await commentService.updateComment(commentId, {
        content: newContent,
      });

      await loadDetails();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Unable to update comment."
      );
    }
  };

  // Open delete confirmation dialog
  const handleDelete = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  // Cancel comment deletion
  const cancelDelete = () => {
    if (deletingComment) return;

    setShowDeleteConfirm(false);
    setCommentToDelete(null);
  };

  // Confirm and delete comment
  const confirmDelete = async () => {
    if (commentToDelete === null || commentToDelete === undefined) {
      return;
    }

    try {
      setDeletingComment(true);
      setError("");

      await commentService.deleteComment(commentToDelete);

      setShowDeleteConfirm(false);
      setCommentToDelete(null);

      await loadDetails();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Unable to delete comment."
      );
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl p-5 sm:p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
          {error || "Ticket not found."}

          <div className="mt-4">
            <Link
              to="/tickets"
              className="font-medium text-blue-400 underline hover:text-blue-300"
            >
              Back to Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const topLevelComments = comments.filter(
    (comment) => comment.parent_id === null
  );

  const getReplies = (commentId) =>
    comments.filter((comment) => comment.parent_id === commentId);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-5 text-slate-100 sm:p-8">
        {/* Back Navigation */}
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-blue-400"
        >
          <ArrowLeft size={17} />
          Back to Tickets
        </Link>

        {/* Error Notification */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Ticket Information */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/10 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-400">
              Ticket #{ticket.id}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                statusColors[ticket.status] ||
                "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              {statusLabels[ticket.status] || ticket.status}
            </span>
          </div>

          <h1 className="break-words text-2xl font-bold text-white">
            {ticket.title}
          </h1>

          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
            {ticket.description || "No description provided."}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-slate-700 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Type</p>
              <p className="mt-1 text-sm font-medium capitalize text-slate-200">
                {ticket.ticket_type}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Priority</p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-200">
                {ticket.priority}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Project ID</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {ticket.project_id}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Assignee</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {ticket.assignee_id || "Unassigned"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Reporter ID</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {ticket.reporter_id}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Created</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {formatDate(ticket.created_at)}
              </p>
            </div>
          </div>
        </section>

        {/* Ticket Attachments */}
        <TicketAttachments ticketId={ticketId} />

        {/* Ticket Comments */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-400" />

            <h2 className="text-lg font-bold text-white">
              Comments ({comments.length})
            </h2>
          </div>

          {/* Add Comment Form */}
          <form
            onSubmit={handleAddComment}
            className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"
          >
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write a comment..."
              rows={4}
              maxLength={5000}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              required
            />

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}

                {submitting ? "Adding..." : "Add Comment"}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {topLevelComments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
              <MessageSquare
                size={26}
                className="mx-auto mb-3 text-slate-600"
              />
              <p className="text-sm font-medium text-slate-400">
                No comments yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={getReplies(comment.id)}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* iOS / macOS Style Delete Confirmation Dialog */}
      {showDeleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={cancelDelete}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-comment-title"
              aria-describedby="delete-comment-description"
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#202124] shadow-2xl shadow-black/50"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-7 pb-7 pt-8 text-center">
                <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-red-500/15 text-red-400">
                  <AlertTriangle size={32} strokeWidth={1.8} />
                </div>

                <h2
                  id="delete-comment-title"
                  className="text-xl font-semibold tracking-tight text-white"
                >
                  Delete Comment?
                </h2>

                <p
                  id="delete-comment-description"
                  className="mt-3 text-sm leading-6 text-gray-400"
                >
                  Are you sure you want to delete this comment?
                  This action cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={deletingComment}
                  onClick={cancelDelete}
                  className="border-r border-white/10 px-4 py-[17px] text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deletingComment}
                  onClick={confirmDelete}
                  className="px-4 py-[17px] text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingComment ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}