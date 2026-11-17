
import api from "./api";

const attachmentService = {
  // Upload an attachment to a ticket
  uploadAttachment: async (ticketId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      `/attachments/tickets/${ticketId}`,
      formData
    );

    return response.data;
  },

  // Get all attachments for a ticket
  getAttachments: async (ticketId) => {
    const response = await api.get(
      `/attachments/tickets/${ticketId}`
    );

    return response.data;
  },

  // Download an attachment
  downloadAttachment: async (attachmentId) => {
    const response = await api.get(
      `/attachments/${attachmentId}/download`,
      {
        responseType: "blob",
      }
    );

    return response;
  },

  // Delete an attachment
  deleteAttachment: async (attachmentId) => {
    const response = await api.delete(
      `/attachments/${attachmentId}`
    );

    return response.data;
  },
};

export default attachmentService;