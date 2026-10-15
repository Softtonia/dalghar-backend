import { UserRole } from '../../models/User.js';

export interface UserAuthDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId: string | null;
  branchId: string | null;
  permissions: string[];
}

export interface LoginResponseData {
  accessToken: string;
  user: UserAuthDto;
}
