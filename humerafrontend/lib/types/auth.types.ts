export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  username: string
}

export interface AuthResponse {
  user: User;
  token: string;
  username:  User
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
}