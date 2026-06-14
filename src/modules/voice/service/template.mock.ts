/**
 * Template Service Mock Fixtures (US-013)
 */

import type { MessageTemplateDto, PreviewTemplateResultDto } from '../../../types/voice'

export const mockTemplates: MessageTemplateDto[] = [
  {
    id: '10',
    templateType: 'payment_reminder',
    languageCode: 'hi',
    content: 'नमस्ते {{customer_name}}, आपका {{month}} का बिल ₹{{amount}} बाकी है। — {{vendor_name}}',
    placeholders: ['customer_name', 'month', 'amount', 'vendor_name'],
    isActive: true,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: '11',
    templateType: 'payment_reminder',
    languageCode: 'en',
    content: 'Hello {{customer_name}}, your {{month}} bill of ₹{{amount}} is pending. — {{vendor_name}}',
    placeholders: ['customer_name', 'month', 'amount', 'vendor_name'],
    isActive: true,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
]

export const mockPreviewResult: PreviewTemplateResultDto = {
  preview: 'नमस्ते शर्मा परिवार, जून का बिल ₹1200 बाकी है। — कृष्णा डेयरी',
  unresolved: [],
}
