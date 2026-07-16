declare module "arabic-persian-reshaper" {
  const reshaper: {
    ArabicShaper: { convertArabic(text: string): string };
    PersianShaper: { convertArabic(text: string): string };
  };
  export default reshaper;
}
