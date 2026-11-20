export interface Page<T> {
  url: string;
  items: T[];
  limit: number;
  offset: number;
  next: string | null;
  prev: string | null;
}

export interface UserRef { url: string; username: string }
export interface TitleRef { url: string; title: string }
export interface PersonRef { url: string; name: string }

export const userUrl = (base: string, userId: number) => `${base}/users/${userId}`;
export const titleUrl = (base: string, tconst: string) => `${base}/titles/${tconst}`;
export const personUrl = (base: string, nconst: string) => `${base}/persons/${nconst}`;
export const titleSearchUrl = (base: string, params: Record<string, string>) => `${base}/titles?${new URLSearchParams(params)}`;