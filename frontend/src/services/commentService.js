
import api from "./api";

const commentService = {
  // Get all comments for a ticket
  getComments: async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  // Add a new comment or threaded reply
  createComment: async (ticketId, commentData) => {
    const response = await api.post(
      `/tickets/${ticketId}/comments`,
      commentData
    );
    return response.data;
  },

  // Edit a comment
  updateComment: async (commentId, commentData) => {
    const response = await api.patch(
      `/comments/${commentId}`,
      commentData
    );
    return response.data;
  },

  // Delete a comment
  deleteComment: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
};

export default commentService;