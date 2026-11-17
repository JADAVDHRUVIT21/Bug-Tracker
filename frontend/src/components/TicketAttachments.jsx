import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  File,
  Loader2,
  AlertCircle,
} from "lucide-react";
import attachmentService from "../services/attachmentService";

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleString();
}

export default function TicketAttachments({ ticketId }) {
  const fileInputRef = useRef(null);

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAttachments = async () => {
    try {
      setError("");
      const data = await attachmentService.getAttachments(ticketId);

      setAttachments(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to load attachments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      loadAttachments();
    }
  }, [ticketId]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");

      await attachmentService.uploadAttachment(ticketId, file);
      await loadAttachments();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to upload attachment."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDownload = async (attachment) => {
    try {
      setDownloadingId(attachment.id);
      setError("");

      const blob = await attachmentService.downloadAttachment(
        attachment.id
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = attachment.original_filename || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to download attachment."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      setDeletingId(attachmentId);
      setError("");

      await attachmentService.deleteAttachment(attachmentId);
      setAttachments((previous) =>
        previous.filter((item) => item.id !== attachmentId)
      );
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to delete attachment."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Paperclip size={19} className="text-emerald-400" />
            Attachments
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {attachments.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload and manage files attached to this ticket.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Maximum file size: 5 MB.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 py-10 text-center">
          <File size={30} className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">
            No attachments yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a file to attach it to this ticket.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2 text-emerald-400">
                  <File size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {attachment.original_filename}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatFileSize(attachment.file_size)}
                    {attachment.created_at &&
                      ` • ${formatDate(attachment.created_at)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  disabled={downloadingId === attachment.id}
                  title="Download attachment"
                  className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                >
                  {downloadingId === attachment.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  title="Delete attachment"
                  className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                >
                  {deletingId === attachment.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}