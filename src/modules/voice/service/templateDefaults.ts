/**
 * Built-in Template Defaults (US-013)
 * Purpose: Ship a default template body per (templateType × language) so the
 * MessageTemplatesScreen always shows a localized starting point even when no
 * saved template exists on the server. Saving creates it via PUT (201).
 *
 * All 9 languages × 4 template types = 36 entries.
 * Placeholders use {{token}} syntax matching the API allowlist.
 */

import type { TemplateType } from '../../../types/voice'
import type { SupportedLanguage } from '@locales/index'

export type DefaultTemplateMap = Record<TemplateType, Record<SupportedLanguage, string>>

export const TEMPLATE_DEFAULTS: DefaultTemplateMap = {
  payment_reminder: {
    en: 'Hello {{customer_name}}, your {{month}} bill of ₹{{amount}} is pending. Please pay by {{due_date}}. UPI: {{upi_id}} — {{vendor_name}}',
    hi: 'नमस्ते {{customer_name}}, आपका {{month}} का बिल ₹{{amount}} बाकी है। कृपया {{due_date}} तक भुगतान करें। UPI: {{upi_id}} — {{vendor_name}}',
    ta: 'வணக்கம் {{customer_name}}, உங்கள் {{month}} மாத கட்டணம் ₹{{amount}} நிலுவையில் உள்ளது. {{due_date}} க்கு முன் செலுத்தவும். UPI: {{upi_id}} — {{vendor_name}}',
    te: 'నమస్కారం {{customer_name}}, మీ {{month}} బిల్లు ₹{{amount}} పెండింగ్‌లో ఉంది. {{due_date}} లోపు చెల్లించండి. UPI: {{upi_id}} — {{vendor_name}}',
    mr: 'नमस्कार {{customer_name}}, तुमचे {{month}} चे बिल ₹{{amount}} थकीत आहे. कृपया {{due_date}} पर्यंत भरा. UPI: {{upi_id}} — {{vendor_name}}',
    bn: 'নমস্কার {{customer_name}}, আপনার {{month}} মাসের বিল ₹{{amount}} বাকি আছে। {{due_date}} এর মধ্যে পরিশোধ করুন। UPI: {{upi_id}} — {{vendor_name}}',
    kn: 'ನಮಸ್ಕಾರ {{customer_name}}, ನಿಮ್ಮ {{month}} ತಿಂಗಳ ಬಿಲ್ ₹{{amount}} ಬಾಕಿ ಇದೆ. {{due_date}} ಒಳಗೆ ಪಾವತಿಸಿ. UPI: {{upi_id}} — {{vendor_name}}',
    ml: 'നമസ്കാരം {{customer_name}}, നിങ്ങളുടെ {{month}} ബിൽ ₹{{amount}} ബാക്കിയാണ്. {{due_date}} നുള്ളിൽ അടക്കുക. UPI: {{upi_id}} — {{vendor_name}}',
    gu: 'નમસ્કાર {{customer_name}}, તમારું {{month}} નું બિલ ₹{{amount}} બાકી છે. {{due_date}} સુધીમાં ચૂકવો. UPI: {{upi_id}} — {{vendor_name}}',
  },
  monthly_bill: {
    en: 'Hello {{customer_name}}, your {{month}} bill: {{items}}. Total: ₹{{total_due}}. Pay via UPI {{upi_id}} or call {{phone}}. — {{vendor_name}}',
    hi: 'नमस्ते {{customer_name}}, आपका {{month}} का बिल: {{items}}. कुल: ₹{{total_due}}. UPI {{upi_id}} से भुगतान करें या {{phone}} पर कॉल करें। — {{vendor_name}}',
    ta: 'வணக்கம் {{customer_name}}, உங்கள் {{month}} மாத கணக்கு: {{items}}. மொத்தம்: ₹{{total_due}}. UPI {{upi_id}} மூலம் செலுத்துங்கள். — {{vendor_name}}',
    te: 'నమస్కారం {{customer_name}}, మీ {{month}} బిల్లు: {{items}}. మొత్తం: ₹{{total_due}}. UPI {{upi_id}} ద్వారా చెల్లించండి. — {{vendor_name}}',
    mr: 'नमस्कार {{customer_name}}, तुमचे {{month}} चे बिल: {{items}}. एकूण: ₹{{total_due}}. UPI {{upi_id}} वर भरा. — {{vendor_name}}',
    bn: 'নমস্কার {{customer_name}}, আপনার {{month}} মাসের বিল: {{items}}. মোট: ₹{{total_due}}. UPI {{upi_id}} তে পরিশোধ করুন। — {{vendor_name}}',
    kn: 'ನಮಸ್ಕಾರ {{customer_name}}, ನಿಮ್ಮ {{month}} ತಿಂಗಳ ಬಿಲ್: {{items}}. ಒಟ್ಟು: ₹{{total_due}}. UPI {{upi_id}} ಮೂಲಕ ಪಾವತಿಸಿ. — {{vendor_name}}',
    ml: 'നമസ്കാരം {{customer_name}}, നിങ്ങളുടെ {{month}} ബിൽ: {{items}}. ആകെ: ₹{{total_due}}. UPI {{upi_id}} വഴി അടക്കുക. — {{vendor_name}}',
    gu: 'નમસ્કાર {{customer_name}}, તમારું {{month}} નું બિલ: {{items}}. કુલ: ₹{{total_due}}. UPI {{upi_id}} દ્વારા ચૂકવો. — {{vendor_name}}',
  },
  delivery_confirmation: {
    en: 'Hello {{customer_name}}, your {{item}} (qty: {{quantity}}) was delivered on {{date}}. — {{vendor_name}}',
    hi: 'नमस्ते {{customer_name}}, आपका {{item}} (मात्रा: {{quantity}}) {{date}} को दे दिया गया। — {{vendor_name}}',
    ta: 'வணக்கம் {{customer_name}}, உங்கள் {{item}} (அளவு: {{quantity}}) {{date}} அன்று வழங்கப்பட்டது. — {{vendor_name}}',
    te: 'నమస్కారం {{customer_name}}, మీ {{item}} (పరిమాణం: {{quantity}}) {{date}} న పంపిణీ చేయబడింది. — {{vendor_name}}',
    mr: 'नमस्कार {{customer_name}}, तुमचा {{item}} (प्रमाण: {{quantity}}) {{date}} रोजी दिला गेला. — {{vendor_name}}',
    bn: 'নমস্কার {{customer_name}}, আপনার {{item}} (পরিমাণ: {{quantity}}) {{date}} তারিখে ডেলিভারি হয়েছে। — {{vendor_name}}',
    kn: 'ನಮಸ್ಕಾರ {{customer_name}}, ನಿಮ್ಮ {{item}} (ಪ್ರಮಾಣ: {{quantity}}) {{date}} ರಂದು ತಲುಪಿಸಲಾಗಿದೆ. — {{vendor_name}}',
    ml: 'നമസ്കാരം {{customer_name}}, നിങ്ങളുടെ {{item}} (അളവ്: {{quantity}}) {{date}} ന് ഡെലിവർ ചെയ്തു. — {{vendor_name}}',
    gu: 'નમસ્કાર {{customer_name}}, તમારું {{item}} (જથ્થો: {{quantity}}) {{date}} ના રોજ પહોંચાડ્યું. — {{vendor_name}}',
  },
  leave_confirmation: {
    en: 'Hello {{customer_name}}, leave noted from {{from_date}} to {{to_date}}. Your delivery will resume after. — {{vendor_name}}',
    hi: 'नमस्ते {{customer_name}}, {{from_date}} से {{to_date}} तक छुट्टी नोट कर ली गई है। इसके बाद डिलीवरी फिर से शुरू होगी। — {{vendor_name}}',
    ta: 'வணக்கம் {{customer_name}}, {{from_date}} முதல் {{to_date}} வரை விடுமுறை குறிக்கப்பட்டது. பிறகு வழங்கல் தொடரும். — {{vendor_name}}',
    te: 'నమస్కారం {{customer_name}}, {{from_date}} నుండి {{to_date}} వరకు సెలవు నమోదు చేయబడింది. తర్వాత డెలివరీ కొనసాగుతుంది. — {{vendor_name}}',
    mr: 'नमस्कार {{customer_name}}, {{from_date}} ते {{to_date}} पर्यंत रजा नोंदवली गेली आहे. त्यानंतर डिलीवरी सुरू होईल. — {{vendor_name}}',
    bn: 'নমস্কার {{customer_name}}, {{from_date}} থেকে {{to_date}} পর্যন্ত ছুটি নিবন্ধিত হয়েছে। এরপর ডেলিভারি আবার শুরু হবে। — {{vendor_name}}',
    kn: 'ನಮಸ್ಕಾರ {{customer_name}}, {{from_date}} ರಿಂದ {{to_date}} ವರೆಗೆ ರಜೆ ನಮೂದಿಸಲಾಗಿದೆ. ನಂತರ ಡೆಲಿವರಿ ಮುಂದುವರಿಯುತ್ತದೆ. — {{vendor_name}}',
    ml: 'നമസ്കാരം {{customer_name}}, {{from_date}} മുതൽ {{to_date}} വരെ അവധി രേഖപ്പെടുത്തി. പിന്നീട് ഡെലിവറി തുടരും. — {{vendor_name}}',
    gu: 'નમસ્કાર {{customer_name}}, {{from_date}} થી {{to_date}} સુધી રજા નોંધાઈ ગઈ. ત્યારબાદ ડિલિવરી ફરી શરૂ થશે. — {{vendor_name}}',
  },
}

/**
 * Get a built-in default template for a (type, language) pair.
 * Falls back to English if the language is not found.
 */
export function getDefaultTemplate(
  templateType: TemplateType,
  lang: SupportedLanguage,
): string {
  return TEMPLATE_DEFAULTS[templateType][lang] ?? TEMPLATE_DEFAULTS[templateType].en ?? ''
}
