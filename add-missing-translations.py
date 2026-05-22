#!/usr/bin/env python3
import json

with open('client/src/locales/en.json', 'r') as f:
    en = json.load(f)
with open('client/src/locales/ar.json', 'r') as f:
    ar = json.load(f)

# Add template section
if 'template' not in en:
    en['template'] = {}
if 'template' not in ar:
    ar['template'] = {}

template_en = {
    'selectTemplate': 'Select Menu Template',
    'loginRequired': 'Please log in',
    'login': 'Log In',
    'restaurantNotFound': 'Restaurant not found',
    'restaurantNotFoundDesc': 'Please select a restaurant from the dashboard',
    'backToDashboard': 'Back to Dashboard',
    'chooseTemplate': 'Choose Menu Template',
    'previewMenu': 'Preview Menu',
    'applyTemplate': 'Apply Template',
    'livePreview': 'Live preview of selected template',
    'livePreviewDesc': 'Press "Apply Template" above to save changes',
    'premiumNotice': 'Premium templates are available with the paid plan',
    'premiumNoticeDesc': 'Subscribe now to access all professional templates.',
    'viewPlans': 'View Plans',
    'currentTemplate': 'Current template',
    'templateUpdated': 'Menu template updated successfully!',
    'templatePremiumOnly': 'This template is available only for paid plan subscribers',
    'bgColor1': 'Background color 1',
    'bgColor2': 'Background color 2',
    'accentColor': 'Accent color',
    'cardColor': 'Card color',
}

template_ar = {
    'selectTemplate': 'اختيار قالب المنيو',
    'loginRequired': 'يرجى تسجيل الدخول',
    'login': 'تسجيل الدخول',
    'restaurantNotFound': 'المطعم غير موجود',
    'restaurantNotFoundDesc': 'يرجى اختيار مطعم من لوحة التحكم',
    'backToDashboard': 'العودة إلى لوحة التحكم',
    'chooseTemplate': 'اختيار قالب المنيو',
    'previewMenu': 'معاينة المنيو',
    'applyTemplate': 'تطبيق القالب',
    'livePreview': 'معاينة حية للقالب المختار',
    'livePreviewDesc': 'اضغط "تطبيق القالب" أعلاه لحفظ التغييرات',
    'premiumNotice': 'القوالب المميزة متاحة مع الخطة المدفوعة',
    'premiumNoticeDesc': 'اشترك الآن للوصول إلى جميع القوالب الاحترافية.',
    'viewPlans': 'عرض الخطط',
    'currentTemplate': 'القالب الحالي',
    'templateUpdated': 'تم تحديث قالب المنيو بنجاح!',
    'templatePremiumOnly': 'هذا القالب متاح فقط للمشتركين في الخطة المدفوعة',
    'bgColor1': 'لون الخلفية الأول',
    'bgColor2': 'لون الخلفية الثاني',
    'accentColor': 'اللون المميز',
    'cardColor': 'لون البطاقات',
}

en['template'].update(template_en)
ar['template'].update(template_ar)

# Add menu view keys
menu_en_new = {
    'menuNotFound': 'Menu not found',
    'menuNotFoundDesc': 'Make sure the link or QR code is correct',
    'menuUnavailable': 'Menu currently unavailable',
    'menuUnavailableDesc': 'Please try again later',
}

menu_ar_new = {
    'menuNotFound': 'المنيو غير موجود',
    'menuNotFoundDesc': 'تأكد من صحة الرابط أو رمز QR',
    'menuUnavailable': 'المنيو غير متاح حالياً',
    'menuUnavailableDesc': 'يرجى المحاولة لاحقاً',
}

en['menu'].update(menu_en_new)
ar['menu'].update(menu_ar_new)

with open('client/src/locales/en.json', 'w') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

with open('client/src/locales/ar.json', 'w') as f:
    json.dump(ar, f, ensure_ascii=False, indent=2)

print(f"Added {len(template_en)} template keys and {len(menu_en_new)} menu keys")
