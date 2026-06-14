/**
 * Template Store (US-013)
 * Purpose: Message template state for the active vendor (owner-only).
 *
 * - NO persistence: templates are server-owned, refetched on screen focus.
 * - Cache key: `${templateType}:${languageCode}` (composite key map).
 * - Default fallback: if a (type, lang) entry is absent from the server, the
 *   store exposes the built-in default from templateDefaults.ts so the editor
 *   always has a starting point.
 * - Command actions RETHROW so screens can fire haptics + show contextual UI.
 * - Security: vendorId always from auth.store.vendorContext — never from UI.
 */

import { create } from 'zustand'
import { templateService } from '../service/template.service'
import { getDefaultTemplate } from '../service/templateDefaults'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  MessageTemplateDto,
  SaveMessageTemplateDto,
  PreviewTemplateDto,
  PreviewTemplateResultDto,
  LanguageCode,
  TemplateType,
} from '../../../types/voice'
import type { TemplateListFilter } from '../service/template.service'

function getActiveVendorId(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require('@modules/auth/store/auth.store') as {
    useAuthStore: { getState: () => { vendorContext: { vendorId: string } | null } }
  }
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

function cacheKey(type: TemplateType, lang: LanguageCode): string {
  return `${type}:${lang}`
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface TemplateState {
  /** Cache keyed by `${type}:${lang}`. */
  templates: Record<string, MessageTemplateDto>
  isLoading: boolean
  loadError: string | null
  isMutating: boolean
  mutationError: string | null
  preview: PreviewTemplateResultDto | null
  isPreviewing: boolean
  previewError: string | null

  // Query
  fetchTemplates(filter?: TemplateListFilter): Promise<void>

  // Commands (rethrow on failure)
  saveTemplate(dto: SaveMessageTemplateDto): Promise<MessageTemplateDto>
  previewTemplate(dto: PreviewTemplateDto): Promise<void>

  /** Resolve a template for editing: returns saved or built-in default. */
  getTemplateOrDefault(type: TemplateType, lang: LanguageCode): MessageTemplateDto | null

  // Lifecycle
  clearTemplates(): void
  clearErrors(): void
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  templates: {} as Record<string, MessageTemplateDto>,
  isLoading: false,
  loadError: null as string | null,
  isMutating: false,
  mutationError: null as string | null,
  preview: null as PreviewTemplateResultDto | null,
  isPreviewing: false,
  previewError: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  ...initialState,

  fetchTemplates: async (filter) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isLoading: true, loadError: null })
    try {
      const list = await templateService.list(vendorId, filter)
      set((s) => {
        const updated = { ...s.templates }
        list.forEach((t) => {
          updated[cacheKey(t.templateType, t.languageCode)] = t
        })
        return { templates: updated, isLoading: false }
      })
    } catch (err) {
      void logError(err, {
        screen: 'MessageTemplatesScreen',
        action: 'fetchTemplates',
        endpoint: 'GET /vendors/:v/message-templates',
      })
      set({ isLoading: false, loadError: mapApiError(err, 'voice') })
    }
  },

  saveTemplate: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const saved = await templateService.save(vendorId, dto)
      set((s) => ({
        isMutating: false,
        templates: {
          ...s.templates,
          [cacheKey(saved.templateType, saved.languageCode)]: saved,
        },
      }))
      return saved
    } catch (err) {
      void logError(err, {
        screen: 'MessageTemplatesScreen',
        action: 'saveTemplate',
        endpoint: 'PUT /vendors/:v/message-templates',
      })
      const i18nKey = mapApiError(err, 'voice')
      set({ isMutating: false, mutationError: i18nKey })
      throw err
    }
  },

  previewTemplate: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isPreviewing: true, previewError: null, preview: null })
    try {
      const result = await templateService.preview(vendorId, dto)
      set({ isPreviewing: false, preview: result })
    } catch (err) {
      void logError(err, {
        screen: 'MessageTemplatesScreen',
        action: 'previewTemplate',
        endpoint: 'POST /vendors/:v/message-templates/preview',
      })
      set({
        isPreviewing: false,
        previewError: mapApiError(err, 'voice'),
      })
    }
  },

  getTemplateOrDefault: (type, lang) => {
    const cached = get().templates[cacheKey(type, lang)]
    if (cached) return cached
    // Built-in default — not yet saved on server
    const defaultContent = getDefaultTemplate(type, lang)
    const now = new Date().toISOString()
    return {
      id: '',
      templateType: type,
      languageCode: lang,
      content: defaultContent,
      placeholders: [],
      isActive: false,
      createdAt: now,
      updatedAt: now,
    }
  },

  clearTemplates: () => set({ ...initialState }),

  clearErrors: () =>
    set({ loadError: null, mutationError: null, previewError: null }),
}))

export default useTemplateStore
