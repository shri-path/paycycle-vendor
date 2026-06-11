/**
 * InviteShareSheet tests — renders the invite URL + expiry caption, exposes the
 * three share buttons (testIDs preserved from InviteStaffScreen), fires the share
 * intents, and renders nothing when the URL is null. (US-004)
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

import React from 'react'
import { Linking, Share } from 'react-native'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { InviteShareSheet } from '../InviteShareSheet'
import { t } from '@locales/index'

const mockShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never)
const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never)

describe('InviteShareSheet', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders nothing meaningful when inviteUrl is null', async () => {
    const screen = await render(
      <InviteShareSheet visible inviteUrl={null} onDismiss={jest.fn()} />,
    )
    expect(screen.queryByTestId('invite-url')).toBeNull()
    expect(screen.queryByTestId('share-whatsapp')).toBeNull()
  })

  it('renders the invite URL and the three share buttons', async () => {
    const screen = await render(
      <InviteShareSheet
        visible
        inviteUrl="paycyclevendor://join/tok123"
        onDismiss={jest.fn()}
      />,
    )
    expect(screen.getByTestId('invite-url')).toHaveTextContent('paycyclevendor://join/tok123')
    expect(screen.getByTestId('share-whatsapp')).toBeTruthy()
    expect(screen.getByTestId('share-sms')).toBeTruthy()
    expect(screen.getByTestId('share-generic')).toBeTruthy()
  })

  it('renders the expiry caption when expiresAt is provided', async () => {
    const screen = await render(
      <InviteShareSheet
        visible
        inviteUrl="paycyclevendor://join/tok123"
        expiresAt="2026-06-16T00:00:00.000Z"
        onDismiss={jest.fn()}
      />,
    )
    expect(screen.getByTestId('invite-expires')).toBeTruthy()
  })

  it('uses the custom title when provided', async () => {
    const screen = await render(
      <InviteShareSheet
        visible
        inviteUrl="paycyclevendor://join/tok"
        title={t('roles.resend_invite_sent')}
        onDismiss={jest.fn()}
      />,
    )
    expect(screen.getByText(t('roles.resend_invite_sent'))).toBeTruthy()
  })

  it('opens the WhatsApp deep link when WhatsApp share is pressed', async () => {
    const screen = await render(
      <InviteShareSheet
        visible
        inviteUrl="paycyclevendor://join/tok"
        onDismiss={jest.fn()}
      />,
    )
    fireEvent.press(screen.getByTestId('share-whatsapp'))
    await waitFor(() => expect(mockOpenURL).toHaveBeenCalled())
    expect(mockOpenURL.mock.calls[0]?.[0]).toContain('whatsapp://send?text=')
  })

  it('opens the generic share sheet when generic share is pressed', async () => {
    const screen = await render(
      <InviteShareSheet
        visible
        inviteUrl="paycyclevendor://join/tok"
        onDismiss={jest.fn()}
      />,
    )
    fireEvent.press(screen.getByTestId('share-generic'))
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith({ message: 'paycyclevendor://join/tok' }))
  })
})
