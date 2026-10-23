import { UserRole } from '../../models/User.js';

export interface UserRoleDto {
  id: string;
  name: string;
  slug: string;
}

export interface UserAuthDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRoleDto[];
  restaurantId: string | null;
  branchId: string | null;
  terminalId?: string | null;
  permissions: string[];
  directPermissions?: Array<{ permission: string; effect: 'allow' | 'deny' }>;
}

export interface LoginResponseData {
  accessToken: string;
  user: UserAuthDto;
}
