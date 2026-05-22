#!/usr/bin/env python3
"""
Add missing translation keys to en.json and ar.json for Dashboard.tsx
"""
import json

# Load existing translations
with open('client/src/locales/en.json', 'r') as f:
    en = json.load(f)
with open('client/src/locales/ar.json', 'r') as f:
    ar = json.load(f)

# New keys to add
new_keys = {
    'en': {
        'qrMenuTitle': 'QR Menu',
        'backToRestaurants': 'Back to Restaurants',
        'user': 'User',
        'signOut': 'Sign Out',
        'downloadPNG': 'Download PNG',
        'downloadSVG': 'Download SVG',
        'menuLink': 'Menu Link',
        'qrCodeForMenu': 'QR Code for Menu',
        'scanQR': 'Scan this code or share it with your customers for direct menu access',
        'resetToDefault': 'Reset to Default',
        'fgColor': 'Code Color',
        'bgColor': 'Background Color',
        'restaurantImages': 'Restaurant Images',
        'logo': 'Logo',
        'coverImage': 'Cover Image',
        'restaurantData': 'Restaurant Data',
        'restaurantStatus': 'Restaurant Status',
        'dangerZone': 'Danger Zone',
        'dangerZoneDescription': 'Deleting the restaurant will permanently delete all categories and items associated with it.',
        'deleteForever': 'Delete Permanently',
        'deleteForeverConfirm': 'Are you sure? The restaurant and all its categories, items, and images will be deleted. This action cannot be undone.',
        'discount': 'Discount',
        'save2': 'Save',
        'expired': 'Expired',
        'upcoming': 'Upcoming',
        'sortOrder': 'Sort Order',
        'clickToUpload': 'Click to upload image',
        'itemImage': 'Item Image',
        'nameAr': 'Name (Arabic) *',
        'nameEn': 'Name (English)',
        'descriptionAr2': 'Description (Arabic)',
        'descriptionEn': 'Description (English)',
        'deleteCategoryConfirm': 'Are you sure you want to delete this category? All items in it will be deleted.',
        'deleteItemConfirm': 'Are you sure you want to delete this item?',
        'categoriesAndItems': 'Categories & Items',
        'offersSpecial': 'Special Offers',
        'offersDescription': 'Add daily, weekly, or monthly offers to attract customers',
        'noOffersYet': 'No offers yet',
        'addFirstOffer': 'Add First Offer',
        'addOfferAttract': 'Add special offers to attract more customers',
        'visit': 'visit',
        'calorie': 'cal',
        'sar': 'SAR',
        'templateDesign': 'Menu Design Templates',
        'chooseTemplate': 'Choose a professional design template for your menu',
        'chooseTemplateDesc': 'Choose Design Template',
        'selectTemplateBtn': 'Select Design Template',
        'qrDownloaded': 'QR code downloaded in {format} format',
        'deleteCategory': 'Delete Category',
        'deleteItem': 'Delete Item',
    },
    'ar': {
        'qrMenuTitle': 'منيو QR',
        'backToRestaurants': 'العودة للمطاعم',
        'user': 'مستخدم',
        'signOut': 'خروج',
        'downloadPNG': 'تحميل PNG',
        'downloadSVG': 'تحميل SVG',
        'menuLink': 'رابط المنيو',
        'qrCodeForMenu': 'رمز QR للمنيو',
        'scanQR': 'امسح هذا الرمز أو شاركه مع عملائك للوصول المباشر للمنيو',
        'resetToDefault': 'إعادة تعيين إلى الافتراضي',
        'fgColor': 'لون الرمز',
        'bgColor': 'لون الخلفية',
        'restaurantImages': 'صور المطعم',
        'logo': 'الشعار',
        'coverImage': 'صورة الغلاف',
        'restaurantData': 'بيانات المطعم',
        'restaurantStatus': 'حالة المطعم',
        'dangerZone': 'منطقة الخطر',
        'dangerZoneDescription': 'حذف المطعم سيؤدي إلى حذف جميع الفئات والأصناف المرتبطة به نهائياً.',
        'deleteForever': 'حذف نهائياً',
        'deleteForeverConfirm': 'هل أنت متأكد؟ سيتم حذف المطعم وجميع الفئات والأصناف والصور المرتبطة به. لا يمكن التراجع عن هذا الإجراء.',
        'discount': 'خصم',
        'save2': 'حفظ',
        'expired': 'منتهي',
        'upcoming': 'قادم',
        'sortOrder': 'ترتيب العرض',
        'clickToUpload': 'اضغط لرفع صورة',
        'itemImage': 'صورة الصنف',
        'nameAr': 'الاسم (عربي) *',
        'nameEn': 'الاسم (إنجليزي)',
        'descriptionAr2': 'الوصف (عربي)',
        'descriptionEn': 'الوصف (إنجليزي)',
        'deleteCategoryConfirm': 'هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الأصناف المرتبطة بها.',
        'deleteItemConfirm': 'هل أنت متأكد من حذف هذا الصنف؟',
        'categoriesAndItems': 'الفئات والأصناف',
        'offersSpecial': 'العروض الخاصة',
        'offersDescription': 'أضف عروض يومية أو أسبوعية أو شهرية لجذب العملاء',
        'noOffersYet': 'لا توجد عروض حالياً',
        'addFirstOffer': 'إضافة أول عرض',
        'addOfferAttract': 'أضف عروض مميزة لجذب المزيد من العملاء',
        'visit': 'زيارة',
        'calorie': 'سعرة',
        'sar': 'ر.س',
        'templateDesign': 'قوالب تصميم المنيو',
        'chooseTemplate': 'اختر قالب تصميم احترافي لمنيو مطعمك',
        'chooseTemplateDesc': 'اختيار قالب التصميم',
        'selectTemplateBtn': 'اختيار قالب التصميم',
        'qrDownloaded': 'تم تحميل رمز QR بصيغة {format}',
        'deleteCategory': 'حذف الفئة',
        'deleteItem': 'حذف الصنف',
    }
}

# Add new keys to dashboard section
for key, value in new_keys['en'].items():
    en['dashboard'][key] = value

for key, value in new_keys['ar'].items():
    ar['dashboard'][key] = value

# Write back
with open('client/src/locales/en.json', 'w') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

with open('client/src/locales/ar.json', 'w') as f:
    json.dump(ar, f, ensure_ascii=False, indent=2)

print(f"Added {len(new_keys['en'])} new keys to en.json and ar.json")
