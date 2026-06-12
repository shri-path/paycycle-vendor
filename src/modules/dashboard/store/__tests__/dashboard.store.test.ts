/**
 * Dashboard store tests (US-010)
 * Covers: fetch happy-path, fetch error, setAutoMark optimistic/rollback, clearDashboard.
 */

import { act } from '@testing-library/react-native'
import { useDashboardStore } from '../dashboard.store'
import { mockOwnerDashboard, mockStaffDashboard, mockForecast, mockOutstandingAging } from '../../service/dashboard.mock'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ vendorContext: { vendorId: 'v1' } }),
  },
}))

jest.mock('@utils/logger', () => ({ logError: jest.fn() }))
jest.mock('@utils/errorMapper', () => ({
  mapApiError: jest.fn(() => 'dashboard.error_load_owner'),
}))

const mockGetOwnerDashboard = jest.fn()
const mockGetStaffDashboard = jest.fn()
const mockGetSupplyForecast = jest.fn()
const mockGetOutstandingAging = jest.fn()
const mockUpdateSettings = jest.fn()

jest.mock('../../service/dashboard.service', () => ({
  dashboardService: {
    getOwnerDashboard: (...args: unknown[]) => mockGetOwnerDashboard(...args),
    getStaffDashboard: (...args: unknown[]) => mockGetStaffDashboard(...args),
    getSupplyForecast: (...args: unknown[]) => mockGetSupplyForecast(...args),
    getOutstandingAging: (...args: unknown[]) => mockGetOutstandingAging(...args),
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useDashboardStore.setState({
    ownerDashboard: null,
    isOwnerLoading: false,
    ownerError: null,
    staffDashboard: null,
    isStaffLoading: false,
    staffError: null,
    forecast: null,
    isForecastLoading: false,
    forecastError: null,
    collections: null,
    isCollectionsLoading: false,
    collectionsError: null,
    isUpdatingAutoMark: false,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDashboardStore', () => {
  beforeEach(() => {
    resetStore()
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // fetchOwnerDashboard
  // -------------------------------------------------------------------------

  describe('fetchOwnerDashboard', () => {
    it('sets ownerDashboard on success', async () => {
      mockGetOwnerDashboard.mockResolvedValueOnce(mockOwnerDashboard)
      await act(async () => {
        await useDashboardStore.getState().fetchOwnerDashboard()
      })
      const state = useDashboardStore.getState()
      expect(state.ownerDashboard).toEqual(mockOwnerDashboard)
      expect(state.isOwnerLoading).toBe(false)
      expect(state.ownerError).toBeNull()
    })

    it('sets ownerError on failure', async () => {
      mockGetOwnerDashboard.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useDashboardStore.getState().fetchOwnerDashboard()
      })
      const state = useDashboardStore.getState()
      expect(state.ownerDashboard).toBeNull()
      expect(state.isOwnerLoading).toBe(false)
      expect(state.ownerError).toBe('dashboard.error_load_owner')
    })
  })

  // -------------------------------------------------------------------------
  // fetchStaffDashboard
  // -------------------------------------------------------------------------

  describe('fetchStaffDashboard', () => {
    it('sets staffDashboard on success', async () => {
      mockGetStaffDashboard.mockResolvedValueOnce(mockStaffDashboard)
      await act(async () => {
        await useDashboardStore.getState().fetchStaffDashboard()
      })
      const state = useDashboardStore.getState()
      expect(state.staffDashboard).toEqual(mockStaffDashboard)
      expect(state.isStaffLoading).toBe(false)
    })

    it('sets staffError on failure', async () => {
      mockGetStaffDashboard.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useDashboardStore.getState().fetchStaffDashboard()
      })
      expect(useDashboardStore.getState().staffError).toBe('dashboard.error_load_owner')
    })
  })

  // -------------------------------------------------------------------------
  // fetchForecast
  // -------------------------------------------------------------------------

  describe('fetchForecast', () => {
    it('sets forecast on success', async () => {
      mockGetSupplyForecast.mockResolvedValueOnce(mockForecast)
      await act(async () => {
        await useDashboardStore.getState().fetchForecast({ days: 7 })
      })
      expect(useDashboardStore.getState().forecast).toEqual(mockForecast)
    })
  })

  // -------------------------------------------------------------------------
  // fetchCollections
  // -------------------------------------------------------------------------

  describe('fetchCollections', () => {
    it('sets collections on success', async () => {
      mockGetOutstandingAging.mockResolvedValueOnce(mockOutstandingAging)
      await act(async () => {
        await useDashboardStore.getState().fetchCollections()
      })
      expect(useDashboardStore.getState().collections).toEqual(mockOutstandingAging)
    })
  })

  // -------------------------------------------------------------------------
  // setAutoMark — optimistic update + rollback
  // -------------------------------------------------------------------------

  describe('setAutoMark', () => {
    it('optimistically updates then confirms on success', async () => {
      // Seed initial data
      useDashboardStore.setState({ ownerDashboard: { ...mockOwnerDashboard, autoMarkStatus: 'on' } })
      mockUpdateSettings.mockResolvedValueOnce({ autoMarkEnabled: false, autoSendBillsEnabled: false, autoSendBillsTime: '20:00' })

      await act(async () => {
        await useDashboardStore.getState().setAutoMark(false)
      })

      expect(useDashboardStore.getState().ownerDashboard?.autoMarkStatus).toBe('off')
      expect(useDashboardStore.getState().isUpdatingAutoMark).toBe(false)
    })

    it('rolls back to previous value on failure and rethrows', async () => {
      useDashboardStore.setState({ ownerDashboard: { ...mockOwnerDashboard, autoMarkStatus: 'on' } })
      mockUpdateSettings.mockRejectedValueOnce(new Error('network'))

      await expect(
        act(async () => {
          await useDashboardStore.getState().setAutoMark(false)
        }),
      ).rejects.toThrow()

      // Value rolled back
      expect(useDashboardStore.getState().ownerDashboard?.autoMarkStatus).toBe('on')
      expect(useDashboardStore.getState().ownerError).toBe('dashboard.error_load_owner')
      expect(useDashboardStore.getState().isUpdatingAutoMark).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // clearDashboard
  // -------------------------------------------------------------------------

  describe('clearDashboard', () => {
    it('resets all slices to null', async () => {
      useDashboardStore.setState({
        ownerDashboard: mockOwnerDashboard,
        staffDashboard: mockStaffDashboard,
        forecast: mockForecast,
        collections: mockOutstandingAging,
      })

      act(() => {
        useDashboardStore.getState().clearDashboard()
      })

      const state = useDashboardStore.getState()
      expect(state.ownerDashboard).toBeNull()
      expect(state.staffDashboard).toBeNull()
      expect(state.forecast).toBeNull()
      expect(state.collections).toBeNull()
      expect(state.ownerError).toBeNull()
    })
  })
})
