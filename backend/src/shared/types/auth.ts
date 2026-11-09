export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roleIds: number[];
  roleCodes: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface JwtPayload {
  sub: number;
  username: string;
}
