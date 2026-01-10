import React from 'react';
import { renderHook } from '@testing-library/react';
import { useLanguage } from '../useLanguage';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(I18nextProvider, { i18n }, children)
);

describe('useLanguage', () => {
  test('should return translation function and language controls', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t).toBeDefined();
    expect(result.current.language).toBeDefined();
    expect(result.current.changeLanguage).toBeDefined();
  });

  test('should translate system title correctly', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Test Chinese translation
    const chineseTitle = result.current.t('system.title');
    expect(chineseTitle).toBe('員工專區');
  });

  test('should change language', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Change to English
    result.current.changeLanguage('en-US');
    
    // Wait for language change to take effect
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test English translation
    const englishTitle = result.current.t('system.title');
    expect(englishTitle).toBe('Employee Portal');
  });

  test('should support Indonesian language', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    // Change to Indonesian
    result.current.changeLanguage('id-ID');
    
    // Wait for language change to take effect
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test Indonesian translation
    const indonesianTitle = result.current.t('system.title');
    expect(indonesianTitle).toBe('Portal Karyawan');
  });
});