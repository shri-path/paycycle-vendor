/**
 * useTranslation Hook
 * Purpose: Provide translation function for components
 * Usage: const { t } = useTranslation()
 */

import { t as translateKey } from '@locales/index'

/**
 * Hook to use translations in components
 */
export const useTranslation = () => {
  return {
    t: translateKey,
  }
}

export default useTranslation
