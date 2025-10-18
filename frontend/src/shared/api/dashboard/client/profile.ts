/**
 * Client Profile API
 *
 * @module shared/api/dashboard/client/profile
 */

import { apiClient } from "../../client";

export const clientProfileApi = {
  getProfile: async (): Promise<any> => {
    const response = await apiClient.get("/client/profile");
    return response.data;
  },

  updateProfile: async (data: any): Promise<any> => {
    const response = await apiClient.put("/client/profile", data);
    return response.data;
  },

  changePassword: async (data: any): Promise<void> => {
    await apiClient.put("/client/profile/password", data);
  },

  uploadAvatar: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post("/client/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
};
