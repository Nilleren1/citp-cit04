import { User } from '../data/users.js';
import { UserRef, userUrl } from './shared.js';

export interface UserDto {
  url: string;
  username: string;
  createdAt: string;
}

export interface TokenDto {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: UserRef;
}

export function toUserDto(u: User, base: string): UserDto {
  return { url: userUrl(base, u.userId), username: u.username, createdAt: u.createdAt.toISOString() };
}