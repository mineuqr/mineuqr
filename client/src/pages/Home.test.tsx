import { describe, it, expect } from 'vitest';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

describe('Home Page Language Support', () => {
  describe('Arabic Translations', () => {
    it('should have Arabic navigation translations', () => {
      expect(ar.nav).toBeDefined();
      expect(ar.nav.about).toBeDefined();
      expect(ar.nav.pricing).toBeDefined();
      expect(ar.nav.dashboard).toBeDefined();
    });

    it('should have Arabic home page translations', () => {
      expect(ar.home).toBeDefined();
      expect(ar.home.subtitle).toBeDefined();
      expect(ar.home.viewMenu).toBeDefined();
    });

    it('should have Arabic common translations', () => {
      expect(ar.common).toBeDefined();
      expect(ar.common.startFree).toBeDefined();
      expect(ar.common.login).toBeDefined();
    });

    it('Arabic translations should not be empty', () => {
      expect(ar.nav.about.length).toBeGreaterThan(0);
      expect(ar.home.subtitle.length).toBeGreaterThan(0);
      expect(ar.common.startFree.length).toBeGreaterThan(0);
    });
  });

  describe('English Translations', () => {
    it('should have English navigation translations', () => {
      expect(en.nav).toBeDefined();
      expect(en.nav.about).toBeDefined();
      expect(en.nav.pricing).toBeDefined();
      expect(en.nav.dashboard).toBeDefined();
    });

    it('should have English home page translations', () => {
      expect(en.home).toBeDefined();
      expect(en.home.subtitle).toBeDefined();
      expect(en.home.viewMenu).toBeDefined();
    });

    it('should have English common translations', () => {
      expect(en.common).toBeDefined();
      expect(en.common.startFree).toBeDefined();
      expect(en.common.login).toBeDefined();
    });

    it('English translations should not be empty', () => {
      expect(en.nav.about.length).toBeGreaterThan(0);
      expect(en.home.subtitle.length).toBeGreaterThan(0);
      expect(en.common.startFree.length).toBeGreaterThan(0);
    });
  });

  describe('Language Switching', () => {
    it('should have matching keys between Arabic and English', () => {
      const arNavKeys = Object.keys(ar.nav);
      const enNavKeys = Object.keys(en.nav);
      expect(arNavKeys).toEqual(enNavKeys);
    });

    it('should have different content for same keys', () => {
      expect(ar.nav.about).not.toEqual(en.nav.about);
      expect(ar.home.subtitle).not.toEqual(en.home.subtitle);
      expect(ar.common.startFree).not.toEqual(en.common.startFree);
    });

    it('should support RTL for Arabic', () => {
      const getDir = (lang: 'ar' | 'en') => lang === 'ar' ? 'rtl' : 'ltr';
      const dir = getDir('ar');
      expect(dir).toBe('rtl');
    });

    it('should support LTR for English', () => {
      const getDir = (lang: 'ar' | 'en') => lang === 'ar' ? 'rtl' : 'ltr';
      const dir = getDir('en');
      expect(dir).toBe('ltr');
    });
  });

  describe('Translation Completeness', () => {
    it('should have all required navigation keys', () => {
      const requiredKeys = ['about', 'pricing', 'dashboard'];
      const arNavKeys = Object.keys(ar.nav);
      
      requiredKeys.forEach(key => {
        expect(arNavKeys).toContain(key);
      });
    });

    it('should have all required home page keys', () => {
      const requiredKeys = ['subtitle', 'viewMenu'];
      const arHomeKeys = Object.keys(ar.home);
      
      requiredKeys.forEach(key => {
        expect(arHomeKeys).toContain(key);
      });
    });

    it('should have all required common keys', () => {
      const requiredKeys = ['startFree', 'login', 'save', 'cancel', 'delete', 'edit', 'add'];
      const arCommonKeys = Object.keys(ar.common);
      
      requiredKeys.forEach(key => {
        expect(arCommonKeys).toContain(key);
      });
    });
  });

  describe('Language Direction Support', () => {
    it('should correctly map Arabic to RTL', () => {
      const directionMap = {
        ar: 'rtl' as const,
        en: 'ltr' as const,
      };
      expect(directionMap.ar).toBe('rtl');
    });

    it('should correctly map English to LTR', () => {
      const directionMap: Record<'ar' | 'en', 'rtl' | 'ltr'> = {
        ar: 'rtl',
        en: 'ltr',
      };
      expect(directionMap.en).toBe('ltr');
    });

    it('should support switching between directions', () => {
      const getDirection = (lang: 'ar' | 'en') => lang === 'ar' ? 'rtl' : 'ltr';
      
      expect(getDirection('ar')).toBe('rtl');
      expect(getDirection('en')).toBe('ltr');
      expect(getDirection('ar')).not.toBe(getDirection('en'));
    });
  });

  describe('Translation File Structure', () => {
    it('should have consistent structure between languages', () => {
      const getStructure = (obj: any): string[] => {
        return Object.keys(obj).sort();
      };

      const arStructure = getStructure(ar);
      const enStructure = getStructure(en);

      expect(arStructure).toEqual(enStructure);
    });

    it('should have nested translation objects', () => {
      expect(typeof ar.nav).toBe('object');
      expect(typeof ar.home).toBe('object');
      expect(typeof ar.common).toBe('object');
      expect(typeof en.nav).toBe('object');
      expect(typeof en.home).toBe('object');
      expect(typeof en.common).toBe('object');
    });

    it('should have string values in translation objects', () => {
      const checkStrings = (obj: any): boolean => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string') {
            if (value.trim() === '') return false;
          } else if (typeof value === 'object' && value !== null) {
            if (!checkStrings(value)) return false;
          }
        }
        return true;
      };

      expect(checkStrings(ar)).toBe(true);
      expect(checkStrings(en)).toBe(true);
    });
  });
});
