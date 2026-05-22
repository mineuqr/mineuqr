import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Create table if not exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS countries_currencies (
      id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
      countryNameAr varchar(255) NOT NULL,
      countryNameEn varchar(255) NOT NULL,
      countryCode varchar(2) NOT NULL,
      currencyCode varchar(3) NOT NULL,
      currencySymbol varchar(10) NOT NULL,
      currencyNameAr varchar(255) NOT NULL,
      currencyNameEn varchar(255) NOT NULL,
      isActive boolean NOT NULL DEFAULT true,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create index
  try {
    await connection.execute(`CREATE INDEX countries_currencies_code_unique ON countries_currencies (countryCode)`);
  } catch (e) {
    // Index might already exist
  }

  // Seed data
  const countries = [
    ['السعودية', 'Saudi Arabia', 'SA', 'SAR', 'ر.س', 'ريال سعودي', 'Saudi Riyal'],
    ['الإمارات', 'United Arab Emirates', 'AE', 'AED', 'د.إ', 'درهم إماراتي', 'UAE Dirham'],
    ['الكويت', 'Kuwait', 'KW', 'KWD', 'د.ك', 'دينار كويتي', 'Kuwaiti Dinar'],
    ['قطر', 'Qatar', 'QA', 'QAR', 'ر.ق', 'ريال قطري', 'Qatari Riyal'],
    ['البحرين', 'Bahrain', 'BH', 'BHD', 'د.ب', 'دينار بحريني', 'Bahraini Dinar'],
    ['عمان', 'Oman', 'OM', 'OMR', 'ر.ع', 'ريال عماني', 'Omani Rial'],
    ['مصر', 'Egypt', 'EG', 'EGP', 'ج.م', 'جنيه مصري', 'Egyptian Pound'],
    ['الأردن', 'Jordan', 'JO', 'JOD', 'د.أ', 'دينار أردني', 'Jordanian Dinar'],
    ['لبنان', 'Lebanon', 'LB', 'LBP', 'ل.ل', 'ليرة لبنانية', 'Lebanese Pound'],
    ['العراق', 'Iraq', 'IQ', 'IQD', 'ع.د', 'دينار عراقي', 'Iraqi Dinar'],
    ['المغرب', 'Morocco', 'MA', 'MAD', 'د.م', 'درهم مغربي', 'Moroccan Dirham'],
    ['تونس', 'Tunisia', 'TN', 'TND', 'د.ت', 'دينار تونسي', 'Tunisian Dinar'],
    ['الجزائر', 'Algeria', 'DZ', 'DZD', 'د.ج', 'دينار جزائري', 'Algerian Dinar'],
    ['ليبيا', 'Libya', 'LY', 'LYD', 'د.ل', 'دينار ليبي', 'Libyan Dinar'],
    ['السودان', 'Sudan', 'SD', 'SDG', 'ج.س', 'جنيه سوداني', 'Sudanese Pound'],
    ['اليمن', 'Yemen', 'YE', 'YER', 'ر.ي', 'ريال يمني', 'Yemeni Rial'],
    ['سوريا', 'Syria', 'SY', 'SYP', 'ل.س', 'ليرة سورية', 'Syrian Pound'],
    ['فلسطين', 'Palestine', 'PS', 'ILS', '₪', 'شيكل', 'Israeli Shekel'],
    ['تركيا', 'Turkey', 'TR', 'TRY', '₺', 'ليرة تركية', 'Turkish Lira'],
    ['الولايات المتحدة', 'United States', 'US', 'USD', '$', 'دولار أمريكي', 'US Dollar'],
    ['بريطانيا', 'United Kingdom', 'GB', 'GBP', '£', 'جنيه إسترليني', 'British Pound'],
    ['الاتحاد الأوروبي', 'European Union', 'EU', 'EUR', '€', 'يورو', 'Euro'],
  ];

  for (const c of countries) {
    try {
      await connection.execute(
        `INSERT INTO countries_currencies (countryNameAr, countryNameEn, countryCode, currencyCode, currencySymbol, currencyNameAr, currencyNameEn) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE countryNameAr=VALUES(countryNameAr)`,
        c
      );
    } catch (e) {
      console.log(`Skipping ${c[2]}: ${e.message}`);
    }
  }

  console.log(`Seeded ${countries.length} countries successfully!`);
  await connection.end();
}

main().catch(console.error);
