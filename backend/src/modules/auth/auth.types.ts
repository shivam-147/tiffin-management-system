export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminPayload {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  address?: string;
  upiId?: string;
}

export interface UpdateProfileInput {
  name?: string;
  businessName?: string;
  phone?: string;
  address?: string;
  upiId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  token: string; // alias of accessToken for backward compatibility
}

export interface LoginResult {
  admin: AdminPayload;
  accessToken: string;
  refreshToken: string;
  token: string;
}

export interface AuthTokenPayload {
  adminId: string;
}
