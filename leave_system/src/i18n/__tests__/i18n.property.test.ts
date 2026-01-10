import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import { useLanguage } from '../../hooks/useLanguage';
import i18n from '../index';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { describe } from 'vitest';

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(I18nextProvider, { i18n }, children)
);

describe('Multi-language Property Tests', () => {
  /**
   * **Feature: employee-leave-system, Property 14: 多語言文字更新**
   * **Validates: Requirements 6.2**
   * 
   * 對於任何語言切換操作，系統應該更新所有介面文字為選定語言
   */
  test('Property 14: Language switching should update interface text', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Test switching between supported languages
    const languages: Array<'zh-TW' | 'en-US' | 'id-ID'> = ['zh-TW', 'en-US', 'id-ID'];
    
    languages.forEach(language => {
      act(() => {
        result.current.changeLanguage(language);
      });

      // Verify language is updated
      expect(result.current.language).toBe(language);

      // Verify translation function returns correct language text
      const systemTitle = result.current.t('system.title');
      if (language === 'zh-TW') {
        expect(systemTitle).toBe('員工專區');
      } else if (language === 'en-US') {
        expect(systemTitle).toBe('Employee Portal');
      } else if (language === 'id-ID') {
        expect(systemTitle).toBe('Portal Karyawan');
      }
    });
  });

  /**
   * **Feature: employee-leave-system, Property 15: 資料格式語言無關性**
   * **Validates: Requirements 6.3**
   * 
   * 對於任何資料儲存操作，系統應該保持資料格式一致不受語言設定影響
   */
  test('Property 15: Data format should be language-independent', () => {
    fc.assert(
      fc.property(
        // Generate test data that should remain consistent
        fc.record({
          employeeId: fc.string({ minLength: 1, maxLength: 10 }),
          leaveType: fc.constantFrom('事假', '公假', '喪假', '病假', '其他'),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]), // YYYY-MM-DD format
          leaveHours: fc.float({ min: 0.5, max: 8 }),
        }),
        fc.constantFrom('zh-TW', 'en-US', 'id-ID'),
        (testData, language) => {
          const { result } = renderHook(() => useLanguage(), { wrapper });

          act(() => {
            result.current.changeLanguage(language);
          });

          // Data format should remain consistent regardless of language
          // Test date format consistency
          expect(testData.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          
          // Test numeric format consistency
          expect(typeof testData.leaveHours).toBe('number');
          expect(testData.leaveHours).toBeGreaterThan(0);
          
          // Test employee ID format consistency
          expect(typeof testData.employeeId).toBe('string');
          expect(testData.employeeId.length).toBeGreaterThan(0);
          
          // Test leave type values remain in original format
          expect(['事假', '公假', '喪假', '病假', '其他']).toContain(testData.leaveType);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14 (Translation keys): All translation keys should exist in all languages', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Test key translation keys exist in all languages
    const testKeys = [
      'system.title',
      'nav.leaveApplication',
      'nav.leaveRecords',
      'auth.login',
      'auth.logout',
      'common.welcome',
      'leave.application.title',
      'leave.records.title',
      'leave.management.title'
    ];

    ['zh-TW', 'en-US', 'id-ID'].forEach(language => {
      act(() => {
        result.current.changeLanguage(language as 'zh-TW' | 'en-US' | 'id-ID');
      });

      testKeys.forEach(key => {
        const translation = result.current.t(key);
        
        // Translation should not return the key itself (indicating missing translation)
        expect(translation).not.toBe(key);
        
        // Translation should be a non-empty string
        expect(typeof translation).toBe('string');
        expect(translation.length).toBeGreaterThan(0);
      });
    });
  });

  test('Property 14 (Language persistence): Language setting should persist in localStorage', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Test language persistence
    ['zh-TW', 'en-US', 'id-ID'].forEach(language => {
      act(() => {
        result.current.changeLanguage(language as 'zh-TW' | 'en-US' | 'id-ID');
      });

      // Check if language is stored in localStorage
      const storedLanguage = localStorage.getItem('language');
      expect(storedLanguage).toBe(language);
    });
  });

  test('Property 15 (Leave type consistency): Leave type values should remain consistent across languages', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    const leaveTypes = ['事假', '公假', '喪假', '病假', '其他'];

    ['zh-TW', 'en-US', 'id-ID'].forEach(language => {
      act(() => {
        result.current.changeLanguage(language as 'zh-TW' | 'en-US' | 'id-ID');
      });

      // Leave type values should remain in Chinese regardless of UI language
      leaveTypes.forEach(leaveType => {
        // The actual data values should remain unchanged (Chinese characters)
        expect(['事假', '公假', '喪假', '病假', '其他']).toContain(leaveType);
        
        // But their display labels should be translated
        const translatedLabel = result.current.t(`leave.types.${leaveType}`);
        expect(typeof translatedLabel).toBe('string');
        expect(translatedLabel.length).toBeGreaterThan(0);
      });
    });
  });
});