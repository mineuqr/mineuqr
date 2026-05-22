import json

# Update Arabic file
with open('client/src/locales/ar.json', 'r') as f:
    ar_data = json.load(f)
ar_data['nav']['contact'] = 'اتصل بنا'
with open('client/src/locales/ar.json', 'w') as f:
    json.dump(ar_data, f, ensure_ascii=False, indent=2)
print("Arabic nav.contact added")

# Update English file
with open('client/src/locales/en.json', 'r') as f:
    en_data = json.load(f)
en_data['nav']['contact'] = 'Contact'
with open('client/src/locales/en.json', 'w') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=2)
print("English nav.contact added")
