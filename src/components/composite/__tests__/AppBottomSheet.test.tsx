/**
 * AppBottomSheet tests
 *
 * Regression guard: a titled bottom sheet must render its close button without
 * throwing "Text strings must be rendered within a <Text> component". The close
 * icon is passed to AppIconButton, which renders its `icon` as a raw child of a
 * <View>, so the icon must be an element (AppText), never a bare string.
 */

import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { AppBottomSheet } from '../AppBottomSheet'

describe('AppBottomSheet', () => {
  it('renders a titled sheet (with close button) without crashing', () => {
    // Regression: the close icon must be an element, not a bare "✕" string,
    // or AppIconButton renders a string inside a <View> and throws.
    expect(() =>
      render(
        <AppBottomSheet visible title="Assign lists" onDismiss={() => {}}>
          <Text>Body</Text>
        </AppBottomSheet>,
      ),
    ).not.toThrow()
  })

  it('renders without a title (no close button) without crashing', () => {
    expect(() =>
      render(
        <AppBottomSheet visible onDismiss={() => {}}>
          <Text>Body</Text>
        </AppBottomSheet>,
      ),
    ).not.toThrow()
  })
})
