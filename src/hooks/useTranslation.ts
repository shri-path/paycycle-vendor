/**
 * useTranslation Hook (US-013 reactivity fix)
 * Purpose: Provide translation function for components.
 *
 * Reactivity: subscribes to `useLanguageStore((s) => s.version)` so that every
 * component calling useTranslation() re-renders when the app language changes
 * (OQ-1). The `t` function itself is stable — it reads currentLanguage from the
 * locales module which `setLanguage` already updated; only the subscription is
 * needed to trigger the re-render.
 *
 * Usage:
 *   const { t } = useTranslation()
 *   <Text>{t('delivery.title_list')}</Text>
 */

import { t as translateKey } from '@locales/index'
import { useLanguageStore } from '@modules/voice/store/language.store'

/**
 * Hook to use translations in components.
 * Re-renders whenever the app language changes.
 */
export const useTranslation = () => {
  // Subscribing to `version` causes React to re-render this component when the
  // language changes (OQ-1). Direct import — unconditional hook call satisfies
  // React Rules of Hooks. The language store module is always available when
  // this hook is called in the app (it is initialised before any screen mounts).
  useLanguageStore((s) => s.version)

  return {
    t: translateKey,
  }
}

export default useTranslation
