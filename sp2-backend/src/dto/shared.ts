// Types and url helpers shared by the DTOs (the JSON shapes the API returns).
// Resources link to each other with absolute urls instead of exposing raw ids.

/** A page of a list. next and prev are the urls of the neighbouring pages, or null at either end. */
export interface Page<T> {
  url: string;
  items: T[];
  limit: number;
  offset: number;
  next: string | null;
  prev: string | null;
}

// Short references to other resources, for embedding in a response.
export interface UserRef { url: string; username: string }
export interface TitleRef { url: string; title: string }
export interface PersonRef { url: string; name: string }

// The urls of single resources and of a title search. base is BASE_URL.
export const userUrl = (base: string, userId: number) => `${base}/users/${userId}`;
export const titleUrl = (base: string, tconst: string) => `${base}/titles/${tconst}`;
export const personUrl = (base: string, nconst: string) => `${base}/persons/${nconst}`;
export const titleSearchUrl = (base: string, params: Record<string, string>) => `${base}/titles?${new URLSearchParams(params)}`;