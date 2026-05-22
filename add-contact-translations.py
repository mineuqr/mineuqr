import json

# Arabic translations
ar_contact = {
    "title": "تواصل معنا",
    "subtitle": "نحن هنا لمساعدتك. أرسل لنا رسالة وسنرد عليك في أسرع وقت",
    "email": "البريد الإلكتروني",
    "phone": "الهاتف",
    "location": "الموقع",
    "locationValue": "سوريا - دمشق",
    "name": "الاسم",
    "namePlaceholder": "أدخل اسمك",
    "emailPlaceholder": "أدخل بريدك الإلكتروني",
    "subject": "الموضوع",
    "subjectPlaceholder": "أدخل موضوع الرسالة",
    "message": "الرسالة",
    "messagePlaceholder": "أدخل رسالتك هنا...",
    "send": "إرسال الرسالة",
    "sending": "جاري الإرسال...",
    "successMessage": "تم إرسال رسالتك بنجاح!",
    "errorMessage": "حدث خطأ في إرسال الرسالة",
    "fillAllFields": "يرجى ملء جميع الحقول",
    "thankYou": "شكراً لك!",
    "willReplyMessage": "تم استقبال رسالتك. سنرد عليك قريباً",
    "needHelp": "هل تحتاج إلى مساعدة فورية؟",
    "whatsapp": "تواصل عبر WhatsApp"
}

# English translations
en_contact = {
    "title": "Contact Us",
    "subtitle": "We're here to help. Send us a message and we'll get back to you as soon as possible",
    "email": "Email",
    "phone": "Phone",
    "location": "Location",
    "locationValue": "Syria - Damascus",
    "name": "Name",
    "namePlaceholder": "Enter your name",
    "emailPlaceholder": "Enter your email",
    "subject": "Subject",
    "subjectPlaceholder": "Enter the message subject",
    "message": "Message",
    "messagePlaceholder": "Enter your message here...",
    "send": "Send Message",
    "sending": "Sending...",
    "successMessage": "Your message has been sent successfully!",
    "errorMessage": "An error occurred while sending the message",
    "fillAllFields": "Please fill in all fields",
    "thankYou": "Thank You!",
    "willReplyMessage": "Your message has been received. We'll get back to you soon",
    "needHelp": "Need immediate help?",
    "whatsapp": "Chat on WhatsApp"
}

# Update Arabic file
with open('client/src/locales/ar.json', 'r') as f:
    ar_data = json.load(f)
ar_data['contact'] = ar_contact
with open('client/src/locales/ar.json', 'w') as f:
    json.dump(ar_data, f, ensure_ascii=False, indent=2)
print("Arabic translations added successfully")

# Update English file
with open('client/src/locales/en.json', 'r') as f:
    en_data = json.load(f)
en_data['contact'] = en_contact
with open('client/src/locales/en.json', 'w') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=2)
print("English translations added successfully")
