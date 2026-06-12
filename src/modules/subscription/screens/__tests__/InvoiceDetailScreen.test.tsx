/**
 * InvoiceDetailScreen tests (US-009)
 * Covers: not-found state when invoice not in cache,
 * data state (invoice details rendered), Download PDF → toast.
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: jest.fn().mockReturnValue({ invoiceId: '55' }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({
  useRequireOwner: jest.fn(),
}))

// Alert.alert is spied on in beforeEach (after imports).
const mockAlertAlert = jest.fn()

jest.mock('../../store/subscription.store', () => ({ useSubscriptionStore: jest.fn() }))

import React from 'react'
import { Alert } from 'react-native'
import { render, act, fireEvent } from '@testing-library/react-native'
import InvoiceDetailScreen from '../InvoiceDetailScreen'
import { t } from '@locales/index'
import type { InvoiceDto } from '../../../../types/subscription'

const { useSubscriptionStore } = jest.requireMock('../../store/subscription.store') as {
  useSubscriptionStore: jest.Mock
}

const mockInvoice: InvoiceDto = {
  id: '55',
  invoiceNumber: 'INV-2026-04-001',
  amount: 499,
  tax: 0,
  totalAmount: 499,
  invoiceDate: '2026-04-01',
  dueDate: '2026-04-06',
  paymentStatus: 'PAID',
  paymentDate: '2026-04-02',
  paymentMethod: 'UPI',
  paymentReference: 'UPI123456',
}

function mockStore(invoices: InvoiceDto[]) {
  useSubscriptionStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ invoices }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(mockAlertAlert)
  mockStore([])
})

describe('InvoiceDetailScreen', () => {
  it('shows not-found state when invoice is not in cache', async () => {
    mockStore([]) // empty — invoice 55 not loaded
    const screen = await act(async () => render(<InvoiceDetailScreen />))
    expect(screen.getByText(t('subscription.error_no_subscription'))).toBeTruthy()
    expect(screen.getByText(t('common.back'))).toBeTruthy()
  })

  it('renders invoice number and total when invoice is in cache', async () => {
    mockStore([mockInvoice])
    const screen = await act(async () => render(<InvoiceDetailScreen />))
    expect(screen.getByText('INV-2026-04-001')).toBeTruthy()
    // Total amount rendered via formatCurrency
    expect(screen.getByText(t('subscription.total'))).toBeTruthy()
  })

  it('shows Download PDF button and triggers alert on press', async () => {
    mockStore([mockInvoice])
    const screen = await act(async () => render(<InvoiceDetailScreen />))
    const btn = screen.getByTestId('download-pdf-btn')
    fireEvent.press(btn)
    expect(mockAlertAlert).toHaveBeenCalled()
  })

  it('back button in not-found state calls router.back()', async () => {
    mockStore([])
    const screen = await act(async () => render(<InvoiceDetailScreen />))
    fireEvent.press(screen.getByText(t('common.back')))
    expect(mockBack).toHaveBeenCalled()
  })
})
