import type { AuthContext } from "./middleware/auth.js";

export type AppEnv = {
  Variables: {
    auth: AuthContext;
    // Set by requireHumanWorkspaceMember; routes can read it to apply
    // role-aware checks (e.g. only owners can grant `owner` on invite).
    memberRole?: string;
  };
};
