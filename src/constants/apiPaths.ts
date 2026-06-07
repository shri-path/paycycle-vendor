/**
 * API Paths
 *
 * Single source of truth for backend endpoint paths. Import `APIPath` instead
 * of hardcoding route strings in service files, so a path change is made in one
 * place and the same constant is reused across the project.
 *
 * Grouped by feature/domain for scalability:
 *   api.post(APIPath.Auth.Signup, { ... })
 *
 * Paths mirror the `paycycle_api` backend contract (versioned under /v1).
 * Add new groups (Customers, Ledger, Vendor, ...) here as those services move
 * from mock to real API calls.
 */

export const APIPath = {
  Auth: {
    Signup: "/auth/signup",
    Login: "/auth/login",
    Logout: "/auth/logout",
    Refresh: "/auth/refresh",
    ForgotPassword: "/auth/forgot-password",
    ResetPassword: "/auth/reset-password",
  },
} as const;

export default APIPath;
