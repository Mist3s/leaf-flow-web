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
  photoUrl?: string | null;
  telegramId?: number | null;
};

export type AuthResponse = {
  tokens: AuthTokens;
  user: UserProfile;
};

// Payload от Telegram Login Widget
// https://core.telegram.org/widgets/login
export type TelegramLoginWidgetPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};
