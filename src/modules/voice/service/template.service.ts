/**
 * Template Service (US-013)
 * Purpose: API calls for vendor message templates (owner-only).
 *
 * Multi-tenancy: vendorId from JWT / auth store — never from user input.
 * Envelope: standard paycycle_api data.data.
 * 201 = first-time create, 200 = update (both return MessageTemplateDto).
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  MessageTemplateDto,
  SaveMessageTemplateDto,
  PreviewTemplateDto,
  PreviewTemplateResultDto,
  LanguageCode,
  TemplateType,
} from '../../../types/voice'
import { mockTemplates, mockPreviewResult } from './template.mock'

export interface TemplateListFilter {
  templateType?: TemplateType
  languageCode?: LanguageCode
}

export const templateService = {
  /**
   * GET /vendors/:v/message-templates
   * Owner-only. Returns all saved templates; missing (type, lang) pairs are not returned.
   */
  async list(vendorId: string, filter?: TemplateListFilter): Promise<MessageTemplateDto[]> {
    if (isMockMode) {
      await simulateNetworkDelay()
      let results = [...mockTemplates]
      if (filter?.templateType) results = results.filter((t) => t.templateType === filter.templateType)
      if (filter?.languageCode) results = results.filter((t) => t.languageCode === filter.languageCode)
      return results.map((t) => ({ ...t, id: String(t.id) }))
    }
    const params: Record<string, string> = {}
    if (filter?.templateType) params['templateType'] = filter.templateType
    if (filter?.languageCode) params['languageCode'] = filter.languageCode
    const { data } = await httpClient.get(APIPath.MessageTemplates.List(vendorId), { params })
    const dto = data.data as { templates: MessageTemplateDto[] }
    return (dto.templates ?? []).map((t) => ({ ...t, id: String(t.id) }))
  },

  /**
   * PUT /vendors/:v/message-templates
   * Owner-only. Upsert: returns 201 on create, 200 on update.
   */
  async save(vendorId: string, dto: SaveMessageTemplateDto): Promise<MessageTemplateDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const existing = mockTemplates.find(
        (t) => t.templateType === dto.templateType && t.languageCode === dto.languageCode,
      )
      const now = new Date().toISOString()
      if (existing) {
        return { ...existing, content: dto.content, updatedAt: now }
      }
      return {
        id: String(Date.now()),
        templateType: dto.templateType,
        languageCode: dto.languageCode,
        content: dto.content,
        placeholders: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
    }
    const { data } = await httpClient.put(APIPath.MessageTemplates.List(vendorId), dto)
    const result = data.data as MessageTemplateDto
    return { ...result, id: String(result.id) }
  },

  /**
   * POST /vendors/:v/message-templates/preview
   * Owner-only. Render template without saving; returns preview + unresolved tokens.
   */
  async preview(vendorId: string, dto: PreviewTemplateDto): Promise<PreviewTemplateResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockPreviewResult }
    }
    const { data } = await httpClient.post(APIPath.MessageTemplates.Preview(vendorId), dto)
    return data.data as PreviewTemplateResultDto
  },
}

export default templateService
