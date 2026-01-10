import { describe, test, expect } from 'vitest';
import i18n from '../index';

describe('Indonesian Language Support', () => {
  test('should load Indonesian translations correctly', async () => {
    // Change to Indonesian
    await i18n.changeLanguage('id-ID');
    
    // Test key translations
    expect(i18n.t('system.title')).toBe('Portal Karyawan');
    expect(i18n.t('nav.leaveApplication')).toBe('Pengajuan Cuti');
    expect(i18n.t('nav.leaveRecords')).toBe('Catatan Cuti');
    expect(i18n.t('nav.leaveManagement')).toBe('Manajemen Cuti');
    expect(i18n.t('auth.login')).toBe('Masuk');
    expect(i18n.t('auth.logout')).toBe('Keluar');
    expect(i18n.t('auth.employeeId')).toBe('ID Karyawan');
    expect(i18n.t('auth.password')).toBe('Kata Sandi');
    expect(i18n.t('common.welcome')).toBe('Selamat Datang');
    expect(i18n.t('common.loading')).toBe('Memuat...');
    expect(i18n.t('common.submit')).toBe('Kirim');
    expect(i18n.t('common.cancel')).toBe('Batal');
  });

  test('should translate leave types correctly in Indonesian', async () => {
    await i18n.changeLanguage('id-ID');
    
    expect(i18n.t('leave.types.事假')).toBe('Cuti Pribadi');
    expect(i18n.t('leave.types.公假')).toBe('Cuti Resmi');
    expect(i18n.t('leave.types.喪假')).toBe('Cuti Duka');
    expect(i18n.t('leave.types.病假')).toBe('Cuti Sakit');
    expect(i18n.t('leave.types.特休')).toBe('Cuti Tahunan');
    expect(i18n.t('leave.types.生理假')).toBe('Cuti Menstruasi');
  });

  test('should translate approval status correctly in Indonesian', async () => {
    await i18n.changeLanguage('id-ID');
    
    expect(i18n.t('leave.status.簽核中')).toBe('Menunggu');
    expect(i18n.t('leave.status.已審核')).toBe('Disetujui');
    expect(i18n.t('leave.status.已退回')).toBe('Ditolak');
  });

  test('should translate error messages correctly in Indonesian', async () => {
    await i18n.changeLanguage('id-ID');
    
    expect(i18n.t('errors.networkError')).toBe('Kesalahan koneksi jaringan');
    expect(i18n.t('errors.serverError')).toBe('Kesalahan server');
    expect(i18n.t('errors.unauthorized')).toBe('Akses tidak diizinkan');
    expect(i18n.t('errors.forbidden')).toBe('Izin tidak mencukupi');
    expect(i18n.t('validation.required')).toBe('Bidang ini wajib diisi');
  });
});