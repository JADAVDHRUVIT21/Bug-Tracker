import api from "./api";

const attachmentService = {
  // Upload using Axios with the correct FormData header
  uploadAttachment: async (ticketId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      `/attachments/tickets/${ticketId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  getAttachments: async (ticketId) => {
    const response = await api.get(`/attachments/tickets/${ticketId}`);
    return response.data;
  },

  downloadAttachment: async (attachmentId) => {
    const response = await api.get(`/attachments/${attachmentId}/download`, {
      responseType: "blob",
    });
    return response;
  },

  deleteAttachment: async (attachmentId) => {
    const response = await api.delete(`/attachments/${attachmentId}`);
    return response.data;
  },
};

export default attachmentService;