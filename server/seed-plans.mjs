import dotenv from 'dotenv';
import { createAuditReadonlyConnection } from '../scripts/lib/tidb-audit-connection.mjs';

dotenv.config();

const connection = await createAuditReadonlyConnection(process.env.DATABASE_URL);

// Clear existing plans
await connection.execute('DELETE FROM subscription_plans');

// Insert subscription plans
const plans = [
  {
    nameAr: 'الخطة الأساسية',
    nameEn: 'Basic Plan',
    descriptionAr: 'مثالية للمطاعم الصغيرة والناشئة',
    descriptionEn: 'Perfect for small and startup restaurants',
    priceMonthly: 19,
    priceYearly: 175,
    maxRestaurants: 1,
    maxItemsPerRestaurant: 100,
    maxCategories: 10,
    features: JSON.stringify([
      'One Digital Menu',
      'Custom QR Code',
      'Arabic & English Support',
      'Basic Analytics',
      'Email Customer Support',
    ]),
    isActive: true,
    sortOrder: 1,
  },
  {
    nameAr: 'الخطة الاحترافية',
    nameEn: 'Professional Plan',
    descriptionAr: 'للمطاعم المتوسطة والمتنامية',
    descriptionEn: 'For medium and growing restaurants',
    priceMonthly: 35,
    priceYearly: 299,
    maxRestaurants: 5,
    maxItemsPerRestaurant: 500,
    maxCategories: 25,
    features: JSON.stringify([
      'Up to 5 Restaurants',
      'Multiple QR Codes',
      'Advanced Analytics',
      'Color & Theme Customization',
      'Priority Support',
      'Monthly Reports',
    ]),
    isActive: true,
    sortOrder: 2,
  },
  {
    nameAr: 'الخطة المؤسسية',
    nameEn: 'Enterprise Plan',
    descriptionAr: 'للسلاسل الكبيرة والمؤسسات',
    descriptionEn: 'For large chains and enterprises',
    priceMonthly: 59,
    priceYearly: 499,
    maxRestaurants: 999,
    maxItemsPerRestaurant: 9999,
    maxCategories: 100,
    features: JSON.stringify([
      'Unlimited Restaurants',
      'Unlimited Items',
      'Comprehensive Analytics',
      'API Access',
      '24/7 Dedicated Support',
      'Custom Reports',
      'Advanced Integration',
    ]),
    isActive: true,
    sortOrder: 3,
  },
];

for (const plan of plans) {
  // Get current language from environment or default to English
  const lang = process.env.LANGUAGE || 'en';
  
  // Use English features for all languages (will be translated by frontend)
  const features = lang === 'ar' ? 
    JSON.stringify([
      'منيو رقمي واحد',
      'رمز QR مخصص',
      'دعم اللغة العربية والإنجليزية',
      'تحليلات أساسية',
      'دعم العملاء عبر البريد الإلكتروني',
    ]) : plan.features;
  
  await connection.execute(
    `INSERT INTO subscription_plans 
    (nameAr, nameEn, descriptionAr, descriptionEn, priceMonthly, priceYearly, 
     maxRestaurants, maxItemsPerRestaurant, maxCategories, features, isActive, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.nameAr,
      plan.nameEn,
      plan.descriptionAr,
      plan.descriptionEn,
      plan.priceMonthly,
      plan.priceYearly,
      plan.maxRestaurants,
      plan.maxItemsPerRestaurant,
      plan.maxCategories,
      plan.features,
      plan.isActive,
      plan.sortOrder,
    ]
  );
}

console.log('✅ Subscription plans seeded successfully!');
await connection.end();
