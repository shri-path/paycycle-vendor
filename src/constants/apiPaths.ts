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
    /** POST — resend a pending invitation, returns a fresh invite URL (US-004). */
    ResendInvitation: (vendorId: string, staffId: string) =>
      `/vendors/${vendorId}/staff/${staffId}/resend-invitation`,
    /** PATCH — set a staff member's permission grants (MERGE semantics, US-004). */
    Permissions: (vendorId: string, staffId: string) =>
      `/vendors/${vendorId}/staff/${staffId}/permissions`,
    /** POST — assign supply lists to a staff member (OQ-6 stub until US-005). */
    Lists: (vendorId: string, staffId: string) => `/vendors/${vendorId}/staff/${staffId}/lists`,
    /** DELETE — unassign a single supply list (OQ-6 stub until US-005). */
    ListDetail: (vendorId: string, staffId: string, listId: string) =>
      `/vendors/${vendorId}/staff/${staffId}/lists/${listId}`,
  },
  // Supply Lists (US-005). Mounted at /api/v1/vendors. vendorId is JWT-derived on
  // the server — present in the path only for routing, never as user-controlled
  // tenant data. OQ-4 RESOLVED: no `/v1` in the path strings (identical convention
  // to the existing auth/staff routes); the base URL must end `/api/v1`.
  SupplyLists: {
    /** GET (list) + POST(create). */
    List: (vendorId: string) => `/vendors/${vendorId}/supply-lists`,
    /** GET/PATCH/DELETE a single supply list. */
    Detail: (vendorId: string, listId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}`,
    /** POST — assign a staff member to the list. */
    Staff: (vendorId: string, listId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/staff`,
    /** DELETE — unassign a staff member (membership-id `staffId`). */
    StaffDetail: (vendorId: string, listId: string, staffId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/staff/${staffId}`,
    /** GET (subscriptions) + POST (add customers). */
    Customers: (vendorId: string, listId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/customers`,
    /** GET — vendor customers eligible to add to this list (paginated). */
    Available: (vendorId: string, listId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/available-customers`,
    /** PATCH/DELETE a single subscription. */
    Subscription: (vendorId: string, listId: string, subscriptionId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/customers/${subscriptionId}`,
  },
  // Daily Delivery Tracking (US-006). Mounted at /api/v1/vendors. vendorId is
  // JWT-derived on the server — present in the path only for routing, never as
  // user-controlled tenant data. No `/v1` in the path strings (the base URL ends
  // `/api/v1`), identical to the supply-list convention.
  Delivery: {
    /** GET — today's all-lists overview (owner) / assigned (staff). */
    Today: (vendorId: string) => `/vendors/${vendorId}/deliveries/today`,
    /** GET — per-list deliveries (paginated). */
    ListDeliveries: (vendorId: string, listId: string) =>
      `/vendors/${vendorId}/supply-lists/${listId}/deliveries`,
    /** PATCH — mark a single delivery DELIVERED/LEAVE. */
    Mark: (vendorId: string, deliveryId: string) =>
      `/vendors/${vendorId}/deliveries/${deliveryId}/mark`,
    /** POST — bulk-mark a list's pending deliveries DELIVERED. */
    MarkBulk: (vendorId: string) => `/vendors/${vendorId}/deliveries/mark-bulk`,
    /** POST — add an extra charge to a delivery. */
    ExtraCharges: (vendorId: string) => `/vendors/${vendorId}/extra-charges`,
    /** GET (list) + POST (create) leaves. */
    Leaves: (vendorId: string) => `/vendors/${vendorId}/leaves`,
    /** DELETE — cancel a planned leave. */
    LeaveDetail: (vendorId: string, leaveId: string) =>
      `/vendors/${vendorId}/leaves/${leaveId}`,
    /** GET — month calendar (owner). */
    Calendar: (vendorId: string) => `/vendors/${vendorId}/deliveries/calendar`,
    /** GET — single-day detail (owner). */
    DateDetail: (vendorId: string, date: string) =>
      `/vendors/${vendorId}/deliveries/date/${date}`,
  },
} as const;

export default APIPath;
