import * as usersData from '../data/users.js';
import * as searchHistoryData from '../data/search_history.js';
import type {SearchEntry, TrendingSearch} from '../data/search_history.js'
import type {User, UserCredentials} from '../data/users.js';

export async function create(username: string, passwordHash: string): Promise<number> {
  return usersData.create(username, passwordHash);
}

export async function find(userId: number): Promise<User | undefined> {
  return usersData.find(userId);
}

export async function findCredentialsByUsername(username: string): Promise<UserCredentials | undefined> {
  return usersData.findCredentialsByUsername(username);
}

export async function findCredentials(userId: number): Promise<UserCredentials | undefined> {
  return usersData.findCredentials(userId);
}

export async function updateUsername(userId: number, username: string): Promise<User | undefined> {
  return usersData.updateUsername(userId, username);
}

export async function updatePassword(userId: number, passwordHash: string): Promise<boolean> {
  return usersData.updatePassword(userId, passwordHash);
}

export async function remove(userId: number): Promise<boolean> {
  return usersData.remove(userId);
}

export async function listSearchHistory(userId: number, limit: number, offset: number): Promise<SearchEntry[]> {
  return searchHistoryData.list(userId, limit, offset);
}

export async function removeSearchHistory(userId: number, historyId: number): Promise<boolean> {
  return searchHistoryData.remove(userId, historyId);
}

export async function clearSearchHistory(userId: number): Promise<number> {
  return searchHistoryData.clear(userId);
}

export async function trendingSearches(limit: number, offset: number): Promise<TrendingSearch[]> {
  return searchHistoryData.trending(limit, offset);
}