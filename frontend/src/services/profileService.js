
import api from "./api";

const profileService = {
  getMyProfile: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  updateMyProfile: async (profileData) => {
    const response = await api.patch("/users/me", profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post(
      "/auth/change-password",
      passwordData
    );
    return response.data;
  },
};

export default profileService;