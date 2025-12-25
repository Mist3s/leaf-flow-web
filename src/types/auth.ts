export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
};

export type AuthResponse = {
  tokens: AuthTokens;
  user: UserProfile;
};
