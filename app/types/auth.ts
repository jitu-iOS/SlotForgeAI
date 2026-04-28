export type Role = "SUPER_ADMIN" | "ADMIN" | "USER";
export type Status = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: Status;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export type AuthUser = Omit<User, "password_hash">;

export interface JWTPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
