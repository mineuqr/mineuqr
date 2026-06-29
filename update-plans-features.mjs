import dotenv from 'dotenv';
import { createAuditReadonlyConnection } from './scripts/lib/tidb-audit-connection.mjs';

dotenv.config();

const connection = await createAuditReadonlyConnection(process.env.DATABASE_URL);

// Add featuresAr column
try {
  await connection.execute('ALTER TABLE `subscription_plans` ADD `featuresAr` text');
  console.log('✅ Column featuresAr added');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('⚠️ Column featuresAr already exists');
  } else {
    throw e;
  }
}

// Update features for each plan
const featuresData = [
  {
    nameEn: 'Basic Plan',
    featuresAr: JSON.stringify([
      'منيو رقمي واحد',
      'رمز QR مخصص',
      'دعم اللغة العربية والإنجليزية',
      'تحليلات أساسية',
      'دعم العملاء عبر البريد الإلكتروني',
    ]),
    features: JSON.stringify([
      'One Digital Menu',
      'Custom QR Code',
      'Arabic & English Support',
      'Basic Analytics',
      'Email Customer Support',
    ]),
  },
  {
    nameEn: 'Professional Plan',
    featuresAr: JSON.stringify([
      'حتى 5 مطاعم',
      'رموز QR متعددة',
      'تحليلات متقدمة',
      'تخصيص الألوان والقوالب',
      'دعم أولوية',
      'تقارير شهرية',
    ]),
    features: JSON.stringify([
      'Up to 5 Restaurants',
      'Multiple QR Codes',
      'Advanced Analytics',
      'Color & Theme Customization',
      'Priority Support',
      'Monthly Reports',
    ]),
  },
  {
    nameEn: 'Enterprise Plan',
    featuresAr: JSON.stringify([
      'مطاعم غير محدودة',
      'أصناف غير محدودة',
      'تحليلات شاملة',
      'وصول API',
      'دعم مخصص 24/7',
      'تقارير مخصصة',
      'تكامل متقدم',
    ]),
    features: JSON.stringify([
      'Unlimited Restaurants',
      'Unlimited Items',
      'Comprehensive Analytics',
      'API Access',
      '24/7 Dedicated Support',
      'Custom Reports',
      'Advanced Integration',
    ]),
  },
];

for (const plan of featuresData) {
  await connection.execute(
    'UPDATE subscription_plans SET featuresAr = ?, features = ? WHERE nameEn = ?',
    [plan.featuresAr, plan.features, plan.nameEn]
  );
  console.log(`✅ Updated features for: ${plan.nameEn}`);
}

console.log('✅ All plans updated successfully!');
await connection.end();
