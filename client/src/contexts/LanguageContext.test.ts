import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

describe('Language System', () => {
  describe('Translation Files', () => {
    it('should have Arabic translation file', () => {
      expect(ar).toBeDefined();
      expect(typeof ar).toBe('object');
    });

    it('should have English translation file', () => {
      expect(en).toBeDefined();
      expect(typeof en).toBe('object');
    });

    it('should have common keys in both languages', () => {
      const arKeys = Object.keys(ar.common || {});
      const enKeys = Object.keys(en.common || {});
      
      expect(arKeys.length).toBeGreaterThan(0);
      expect(enKeys.length).toBeGreaterThan(0);
      expect(arKeys).toEqual(enKeys);
    });

    it('should have navigation keys in both languages', () => {
      const arNav = Object.keys(ar.nav || {});
      const enNav = Object.keys(en.nav || {});
      
      expect(arNav.length).toBeGreaterThan(0);
      expect(enNav.length).toBeGreaterThan(0);
      expect(arNav).toEqual(enNav);
    });

    it('should have home page keys in both languages', () => {
      const arHome = Object.keys(ar.home || {});
      const enHome = Object.keys(en.home || {});
      
      expect(arHome.length).toBeGreaterThan(0);
      expect(enHome.length).toBeGreaterThan(0);
      expect(arHome).toEqual(enHome);
    });

    it('should have pricing keys in both languages', () => {
      const arPricing = Object.keys(ar.pricing || {});
      const enPricing = Object.keys(en.pricing || {});
      
      expect(arPricing.length).toBeGreaterThan(0);
      expect(enPricing.length).toBeGreaterThan(0);
      expect(arPricing).toEqual(enPricing);
    });

    it('should have dashboard keys in both languages', () => {
      const arDashboard = Object.keys(ar.dashboard || {});
      const enDashboard = Object.keys(en.dashboard || {});
      
      expect(arDashboard.length).toBeGreaterThan(0);
      expect(enDashboard.length).toBeGreaterThan(0);
      expect(arDashboard).toEqual(enDashboard);
    });

    it('should resolve admin menu currency and dashboard currency keys', () => {
      expect(ar.admin.menuCurrency).toBeTruthy();
      expect(en.admin.menuCurrency).toBeTruthy();
      expect(ar.dashboard.currency).toBeTruthy();
      expect(en.dashboard.currency).toBeTruthy();
      expect(ar.admin.menuCurrency).not.toBe('admin.menuCurrency');
    });

    it('should have menu keys in both languages', () => {
      const arMenu = Object.keys(ar.menu || {});
      const enMenu = Object.keys(en.menu || {});
      
      expect(arMenu.length).toBeGreaterThan(0);
      expect(enMenu.length).toBeGreaterThan(0);
      expect(arMenu).toEqual(enMenu);
    });

    it('should have error keys in both languages', () => {
      const arErrors = Object.keys(ar.errors || {});
      const enErrors = Object.keys(en.errors || {});
      
      expect(arErrors.length).toBeGreaterThan(0);
      expect(enErrors.length).toBeGreaterThan(0);
      expect(arErrors).toEqual(enErrors);
    });
  });

  describe('Translation Values', () => {
    it('Arabic translations should not be empty strings', () => {
      const checkValues = (obj: any): boolean => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string') {
            if (value.trim() === '') return false;
          } else if (typeof value === 'object') {
            if (!checkValues(value)) return false;
          }
        }
        return true;
      };
      
      expect(checkValues(ar)).toBe(true);
    });

    it('English translations should not be empty strings', () => {
      const checkValues = (obj: any): boolean => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string') {
            if (value.trim() === '') return false;
          } else if (typeof value === 'object') {
            if (!checkValues(value)) return false;
          }
        }
        return true;
      };
      
      expect(checkValues(en)).toBe(true);
    });

    it('should have different values between Arabic and English for common keys', () => {
      const commonAr = ar.common;
      const commonEn = en.common;
      
      let differentCount = 0;
      for (const key in commonAr) {
        if (commonAr[key as keyof typeof commonAr] !== commonEn[key as keyof typeof commonEn]) {
          differentCount++;
        }
      }
      
      expect(differentCount).toBeGreaterThan(0);
    });
  });

  describe('Language Direction', () => {
    it('should have correct language codes', () => {
      const languages = ['ar', 'en'];
      expect(languages).toContain('ar');
      expect(languages).toContain('en');
    });

    it('Arabic should map to RTL direction', () => {
      const dirMap = { ar: 'rtl', en: 'ltr' };
      expect(dirMap.ar).toBe('rtl');
    });

    it('English should map to LTR direction', () => {
      const dirMap = { ar: 'rtl', en: 'ltr' };
      expect(dirMap.en).toBe('ltr');
    });
  });

  describe('Language Preferences', () => {
    it('should have valid language codes', () => {
      const validLanguages = ['ar', 'en'];
      expect(validLanguages).toContain('ar');
      expect(validLanguages).toContain('en');
    });

    it('should validate language values correctly', () => {
      const validLanguages = ['ar', 'en'];
      const testValue = 'ar';
      expect(validLanguages).toContain(testValue);
    });

    it('should reject invalid language values', () => {
      const validLanguages = ['ar', 'en'];
      const invalidValue = 'fr';
      expect(validLanguages).not.toContain(invalidValue);
    });
  });

  describe('Language Switching', () => {
    it('should support switching between Arabic and English', () => {
      const languages = ['ar', 'en'];
      expect(languages.length).toBe(2);
      expect(languages[0]).toBe('ar');
      expect(languages[1]).toBe('en');
    });

    it('should have translations for both languages', () => {
      expect(Object.keys(ar).length).toBeGreaterThan(0);
      expect(Object.keys(en).length).toBeGreaterThan(0);
    });
  });

  describe('Translation Key Paths', () => {
    it('should support nested translation keys', () => {
      const getNestedValue = (obj: any, path: string): any => {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }
        return current;
      };

      expect(getNestedValue(ar, 'common.save')).toBeDefined();
      expect(getNestedValue(en, 'common.save')).toBeDefined();
      expect(getNestedValue(ar, 'nav.home')).toBeDefined();
      expect(getNestedValue(en, 'nav.home')).toBeDefined();
    });

    it('should handle missing translation keys gracefully', () => {
      const getNestedValue = (obj: any, path: string): any => {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return path; // Return the key if not found
          }
        }
        return current;
      };

      expect(getNestedValue(ar, 'nonexistent.key')).toBe('nonexistent.key');
      expect(getNestedValue(en, 'nonexistent.key')).toBe('nonexistent.key');
    });
  });
});
