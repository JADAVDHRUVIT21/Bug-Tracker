
import api from "./api";

const projectMemberService = {
  getMembers: async (projectId) => {
    const response = await api.get(
      `/projects/${projectId}/members`
    );
    return response.data;
  },

  addMember: async (projectId, email) => {
    const response = await api.post(
      `/projects/${projectId}/members`,
      {
        email: email.trim().toLowerCase(),
      }
    );
    return response.data;
  },

  removeMember: async (projectId, userId) => {
    const response = await api.delete(
      `/projects/${projectId}/members/${userId}`
    );
    return response.data;
  },
};

export default projectMemberService;