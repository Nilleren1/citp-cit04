// Adds the logged-in user to Express's Request type.
// req.user is undefined when the request is not authenticated.

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
      };
    }
  }
}

export {};