import api from "./api";

const projectService = {
  getProjects: async () => {
    const response = await api.get("/projects/");
    return response.data;
  },

  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  createProject: async (projectData) => {
    const response = await api.post("/projects/", projectData);
    return response.data;
  },

  updateProject: async (projectId, projectData) => {
    const response = await api.patch(
      `/projects/${projectId}`,
      projectData
    );
    return response.data;
  },

  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

export default projectService;