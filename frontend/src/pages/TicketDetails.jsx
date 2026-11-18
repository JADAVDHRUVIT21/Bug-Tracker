import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Send,
  AlertTriangle,
  UploadCloud,
  File,
  Trash2,
  Download,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

import ticketService from "../services/ticketService";
import commentService from "../services/commentService";
import attachmentService from "../services/attachmentService";

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statusColors = {
  todo: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 border-yellow-500/20",
  in_review: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20",
  done: "bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20",
};

function formatDate(date) {
  if (!date) return "Unknown date";
  return new Date(date).toLocaleString();
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/* -------------------------------------------------------------------------- */
/*                            Attachment Components                           */
/* -------------------------------------------------------------------------- */

function TicketAttachments({ ticketId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const fileInputRef = useRef(null);

  // Delete Modal State
  const [deleteAttachmentId, setDeleteAttachmentId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Download Modal State
  const [downloadState, setDownloadState] = useState({
    isOpen: false,
    progress: 0,
    status: "idle", // idle, downloading, success, error
    filename: "",
  });

  const allowedExtensions = ".png, .jpg, .jpeg, .gif, .webp, .pdf, .txt";
  const allowedList = ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt"];

  const loadAttachments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await attachmentService.getAttachments(ticketId);
      setAttachments(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError("Unable to load attachments.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  /* -------------------------------- Upload -------------------------------- */

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedList.includes(extension)) {
      setError("File type not allowed. Please upload an image, PDF, or text file.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      e.target.value = "";
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setError("");
    setIsUploading(true);
    setUploadingFileName(file.name);

    try {
      await attachmentService.uploadAttachment(ticketId, file);
      await loadAttachments();
    } catch (err) {
      const detail = err.response?.data?.detail;
      let errorMessage = "Failed to upload file.";
      if (typeof detail === "string") errorMessage = detail;
      else if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadingFileName("");
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!allowedList.includes(extension)) {
        setError("File type not allowed. Please upload an image, PDF, or text file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Maximum size is 10MB.");
        return;
      }
      handleUpload(file);
    }
  };

  /* -------------------------------- Delete -------------------------------- */

  const confirmDelete = async () => {
    if (!deleteAttachmentId) return;
    setIsDeleting(true);
    try {
      await attachmentService.deleteAttachment(deleteAttachmentId);
      await loadAttachments();
      setDeleteAttachmentId(null);
    } catch (err) {
      setError("Unable to delete attachment.");
      setDeleteAttachmentId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ------------------------------- Download ------------------------------- */

  const handleDownload = async (fileId, filename) => {
    setDownloadState({
      isOpen: true,
      progress: 0,
      status: "downloading",
      filename,
    });

    try {
      const response = await attachmentService.downloadAttachment(fileId);
      
      // Simulate progress for smooth UI effect
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress >= 90) {
          clearInterval(interval);
          setDownloadState(prev => ({ ...prev, progress: 100, status: "success" }));
          
          // Trigger actual file save
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          // Auto-close modal after success
          setTimeout(() => {
            setDownloadState(prev => ({ ...prev, isOpen: false }));
          }, 1500);
        } else {
          setDownloadState(prev => ({ ...prev, progress: currentProgress }));
        }
      }, 150);

    } catch (err) {
      setDownloadState(prev => ({ ...prev, status: "error" }));
      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, isOpen: false }));
      }, 2000);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FileText size={20} className="text-[var(--accent)]" />
          Attachments
        </h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-3 text-sm text-[var(--danger-color)]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Upload Zone */}
        {!isUploading ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                : "border-[var(--border-color)] bg-[var(--surface-hover)] hover:border-[var(--text-muted)]"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={allowedExtensions}
              className="hidden"
            />
            <div className="mb-3 rounded-full bg-[var(--card-background)] p-3 text-[var(--text-secondary)] shadow-sm">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              PNG, JPG, JPEG, GIF, WEBP, PDF, or TXT
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Maximum file size: 10MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-hover)] p-6 text-center shadow-inner">
            <div className="relative flex items-center justify-center h-16 w-16">
              <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
            </div>
            <div className="mt-4 w-full max-w-xs">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {uploadingFileName}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Uploading securely...</p>
            </div>
          </div>
        )}

        {/* Attachments List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-muted)]">No attachments yet.</p>
          ) : (
            attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-hover)] p-3 transition hover:border-[var(--text-muted)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--card-background)] shadow-sm">
                    {file.original_filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <ImageIcon size={20} className="text-purple-500 dark:text-purple-400" />
                    ) : (
                      <File size={20} className="text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatBytes(file.file_size)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleDownload(file.id, file.original_filename)}
                    className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--card-background)] hover:text-[var(--text-primary)]"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteAttachmentId(file.id)}
                    className="rounded-lg p-2 text-[var(--danger-color)] transition hover:bg-[var(--danger-light-bg)]"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* DELETE CONFIRMATION MODAL (iOS/macOS Style) */}
      {deleteAttachmentId && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
          onClick={() => !isDeleting && setDeleteAttachmentId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--card-background)] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 pb-7 pt-8 text-center">
              <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--danger-light-bg)] text-[var(--danger-color)]">
                <Trash2 size={32} strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Delete Attachment?
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Are you sure you want to delete this file? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteAttachmentId(null)}
                className="border-r border-[var(--border-color)] px-4 py-[17px] text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-[17px] text-sm font-semibold text-[var(--danger-color)] transition hover:bg-[var(--danger-light-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DOWNLOAD PROGRESS MODAL (iOS/macOS Style) */}
      {downloadState.isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-xs overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 text-center shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {downloadState.status === "downloading" && (
              <>
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--surface-hover)] mb-4">
                  {/* Custom circular progress */}
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="24" stroke="var(--border-color)" strokeWidth="4" fill="none" />
                    <circle 
                      cx="28" cy="28" r="24" 
                      stroke="var(--accent)" strokeWidth="4" fill="none" 
                      strokeDasharray="150" 
                      strokeDashoffset={150 - (150 * downloadState.progress) / 100}
                      className="transition-all duration-200 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold text-[var(--text-primary)]">
                    {Math.round(downloadState.progress)}%
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Downloading</h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)] truncate">{downloadState.filename}</p>
              </>
            )}

            {downloadState.status === "success" && (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--success-light-bg)] text-[var(--success-color)] mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Download Complete</h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">File saved successfully</p>
              </>
            )}

            {downloadState.status === "error" && (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--danger-light-bg)] text-[var(--danger-color)] mb-4">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Download Failed</h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Please try again</p>
              </>
            )}

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Comment Component                            */
/* -------------------------------------------------------------------------- */

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
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-background)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          User #{comment.author_id}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
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
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-hover)] px-4 py-2 text-xs text-[var(--text-primary)] transition hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
          {comment.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--border-color)] pt-3">
        <button
          type="button"
          onClick={() => setReplying((value) => !value)}
          className="text-xs font-medium text-[var(--accent)] transition hover:opacity-80"
        >
          {replying ? "Cancel Reply" : "Reply"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditContent(comment.content);
            setEditing(true);
          }}
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(comment.id)}
          className="text-xs font-medium text-[var(--danger-color)] transition hover:opacity-80"
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
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            required
          />
          <button
            type="submit"
            disabled={!replyContent.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Reply
          </button>
        </form>
      )}

      {replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-[var(--border-color)] pl-4">
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

/* -------------------------------------------------------------------------- */
/*                              Main Ticket Details                           */
/* -------------------------------------------------------------------------- */

export default function TicketDetails() {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setComments(Array.isArray(commentData) ? commentData : commentData?.items || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load ticket details. Please try again.");
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
      setError(err?.response?.data?.detail || "Unable to add comment.");
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
      setError(err?.response?.data?.detail || "Unable to add reply.");
    }
  };

  const handleEdit = async (commentId, newContent) => {
    try {
      await commentService.updateComment(commentId, {
        content: newContent,
      });
      await loadDetails();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to update comment.");
    }
  };

  const handleDelete = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    if (deletingComment) return;
    setShowDeleteConfirm(false);
    setCommentToDelete(null);
  };

  const confirmDelete = async () => {
    if (commentToDelete === null || commentToDelete === undefined) return;

    try {
      setDeletingComment(true);
      setError("");
      await commentService.deleteComment(commentToDelete);
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
      await loadDetails();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to delete comment.");
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)]">
        <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] p-5 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-6 text-sm text-[var(--danger-color)]">
            {error || "Ticket not found."}
            <div className="mt-4">
              <Link
                to="/tickets"
                className="font-medium text-[var(--accent)] underline hover:opacity-80"
              >
                Back to Tickets
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topLevelComments = comments.filter((comment) => comment.parent_id === null);
  const getReplies = (commentId) => comments.filter((comment) => comment.parent_id === commentId);

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-color)] p-5 text-[var(--text-primary)] sm:p-8 transition-colors duration-250">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
          >
            <ArrowLeft size={17} />
            Back to Tickets
          </Link>

          {error && (
            <div className="rounded-xl border border-[var(--danger-color)] bg-[var(--danger-light-bg)] p-4 text-sm text-[var(--danger-color)]">
              {error}
            </div>
          )}

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                Ticket #{ticket.id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusColors[ticket.status] ||
                  "border-[var(--border-color)] bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                }`}
              >
                {statusLabels[ticket.status] || ticket.status}
              </span>
            </div>

            <h1 className="break-words text-2xl font-bold text-[var(--text-primary)]">
              {ticket.title}
            </h1>

            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-secondary)]">
              {ticket.description || "No description provided."}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-[var(--border-color)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Type</p>
                <p className="mt-1 text-sm font-medium capitalize text-[var(--text-primary)]">
                  {ticket.ticket_type}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Priority</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[var(--text-primary)]">
                  {ticket.priority}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Project ID</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ticket.project_id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Assignee</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ticket.assignee_id || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Reporter ID</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ticket.reporter_id}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">Created</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {formatDate(ticket.created_at)}
                </p>
              </div>
            </div>
          </section>

          <TicketAttachments ticketId={ticketId} />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Comments ({comments.length})
              </h2>
            </div>

            <form
              onSubmit={handleAddComment}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-4 sm:p-5"
            >
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write a comment..."
                rows={4}
                maxLength={5000}
                className="w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                required
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

            {topLevelComments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center">
                <MessageSquare size={26} className="mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  No comments yet.
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
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
      </div>

      {/* Comment Delete Confirmation */}
      {showDeleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={cancelDelete}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--card-background)] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-7 pb-7 pt-8 text-center">
                <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--danger-light-bg)] text-[var(--danger-color)]">
                  <AlertTriangle size={32} strokeWidth={1.8} />
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Delete Comment?
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Are you sure you want to delete this comment? This action cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  disabled={deletingComment}
                  onClick={cancelDelete}
                  className="border-r border-[var(--border-color)] px-4 py-[17px] text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingComment}
                  onClick={confirmDelete}
                  className="px-4 py-[17px] text-sm font-semibold text-[var(--danger-color)] transition hover:bg-[var(--danger-light-bg)] disabled:cursor-not-allowed disabled:opacity-50"
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