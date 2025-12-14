import { apiClient } from "./api";

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export const usersApi = {
  async getById(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  },
  async getMultiple(userIds: string[]): Promise<User[]> {
    // If there's a bulk endpoint, use it; otherwise fetch individually
    const promises = userIds.map((id) => this.getById(id));
    return Promise.all(promises);
  },
};

