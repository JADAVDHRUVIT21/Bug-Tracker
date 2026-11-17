
import api from "./api";

const ticketService = {
  // Get tickets with optional filters and pagination
  getTickets: async (params = {}) => {
    const response = await api.get("/tickets/", { params });
    return response.data;
  },

  // Get one ticket
  getTicket: async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
  },

  // Create a ticket
  createTicket: async (ticketData) => {
    const response = await api.post("/tickets/", ticketData);
    return response.data;
  },

  // Update a ticket
  updateTicket: async (ticketId, ticketData) => {
    const response = await api.patch(
      `/tickets/${ticketId}`,
      ticketData
    );
    return response.data;
  },

  // Delete a ticket
  deleteTicket: async (ticketId) => {
    const response = await api.delete(`/tickets/${ticketId}`);
    return response.data;
  },
};

export default ticketService;