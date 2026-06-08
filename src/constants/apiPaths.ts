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
    // Staff join via invite — public; reuses LoginResponseDto (US-002).
    AcceptInvite: "/auth/accept-invite",
  },
  // Staff / role routes are mounted at /api/v1/vendors. vendorId comes from the
  // JWT on the server — it is included in the URL path only for routing, never
  // sent as user-controlled tenant data (multi-tenancy rule). Path builders so a
  // change is made in one place. (US-002)
  Vendors: {
    /** GET — caller's role for the active vendor. */
    Role: (vendorId: string) => `/vendors/${vendorId}/role`,
    /** GET — supply-list options for the assign multi-select (OQ-6 stub until US-005). */
    SupplyLists: (vendorId: string) => `/vendors/${vendorId}/supply-lists`,
  },
  Staff: {
    /** GET (list) + POST(invite via .Invite). */
    List: (vendorId: string) => `/vendors/${vendorId}/staff`,
    /** GET/PATCH/DELETE a single staff member. */
    Detail: (vendorId: string, staffId: string) => `/vendors/${vendorId}/staff/${staffId}`,
    /** POST — create an invite. */
    Invite: (vendorId: string) => `/vendors/${vendorId}/staff/invite`,
    /** POST — assign supply lists to a staff member (OQ-6 stub until US-005). */
    Lists: (vendorId: string, staffId: string) => `/vendors/${vendorId}/staff/${staffId}/lists`,
    /** DELETE — unassign a single supply list (OQ-6 stub until US-005). */
    ListDetail: (vendorId: string, staffId: string, listId: string) =>
      `/vendors/${vendorId}/staff/${staffId}/lists/${listId}`,
  },
} as const;

export default APIPath;
