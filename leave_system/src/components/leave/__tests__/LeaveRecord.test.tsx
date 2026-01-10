import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { LeaveRecord } from '../LeaveRecord';
import { AuthContext } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import i18n from '../../../i18n';
import { User, LeaveRecord as LeaveRecordType, LeaveStatistics } from '../../../types';

// Mock the API
vi.mock('../../../services/api');
const mockedApi = vi.mocked(api);

// Mock user for testing
const mockUser: User = {
  employeeId: 'EMP001',
  name: '測試員工',
  permission: 'employee'
};

// Mock auth context
const mockAuthContext = {
  user: mockUser,
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn()
};

// Mock leave records data
const mockLeaveRecords: LeaveRecordType[] = [
  {
    id: 'REC001',
    employeeId: 'EMP001',
    name: '測試員工',
    leaveType: '事假',
    leaveDate: '2024-06-15',
    startTime: '09:00',
    endDate: '2024-06-15',
    endTime: '17:00',
    leaveHours: 8,
    reason: '個人事務',
    approvalStatus: '已審核',
    applicationDateTime: '2024-06-14T10:30:00',
    approvalDate: '2024-06-14',
    approver: '主管'
  },
  {
    id: 'REC002',
    employeeId: 'EMP001',
    name: '測試員工',
    leaveType: '病假',
    leaveDate: '2024-06-20',
    startTime: '08:00',
    endDate: '2024-06-20',
    endTime: '12:00',
    leaveHours: 4,
    reason: '身體不適',
    approvalStatus: '簽核中',
    applicationDateTime: '2024-06-19T14:20:00'
  }
];

const mockStatistics: LeaveStatistics = {
  '事假': 8,
  '病假': 4,
  '公假': 0,
  '喪假': 0,
  '特休': 0,
  '生理假': 0
};

const mockAnnualQuotas = {
  annualLeave: 14,
  sickLeave: 30,
  menstrualLeave: 36,
  personalLeave: 14
};

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  </I18nextProvider>
);

describe('LeaveRecord Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful API response
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          records: mockLeaveRecords,
          statistics: mockStatistics,
          annualQuotas: mockAnnualQuotas,
          total: mockLeaveRecords.length
        }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render employee information correctly', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      expect(screen.getByText('工號：')).toBeInTheDocument();
      expect(screen.getByText('EMP001')).toBeInTheDocument();
      expect(screen.getByText('姓名：')).toBeInTheDocument();
      expect(screen.getByText('測試員工')).toBeInTheDocument();
    });

    test('should render filter form with all filter options', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      expect(screen.getByLabelText(/起始年月/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/結束年月/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/簽核狀態/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/假別/i)).toBeInTheDocument();
      
      // Wait for initial load to complete before checking buttons
      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /搜尋/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重設/i })).toBeInTheDocument();
    });

    test('should render select elements with correct structure', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      const leaveTypeSelect = screen.getByLabelText(/假別/i);
      const statusSelect = screen.getByLabelText(/簽核狀態/i);
      
      expect(leaveTypeSelect).toBeInTheDocument();
      expect(statusSelect).toBeInTheDocument();
      expect(leaveTypeSelect.tagName).toBe('SELECT');
      expect(statusSelect.tagName).toBe('SELECT');
    });
  });

  describe('Data Loading and Display', () => {
    test('should load and display leave records on initial render', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      // Wait for API call
      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith('/leave/records?');
      });

      // Check if records are displayed
      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
        expect(screen.getByText('個人事務')).toBeInTheDocument();
        expect(screen.getByText('身體不適')).toBeInTheDocument();
      });
    });

    test('should display statistics correctly', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('統計資料')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument(); // 事假時數
        expect(screen.getByText('4')).toBeInTheDocument(); // 病假時數
      });
    });

    test('should display loading state during data fetch', async () => {
      // Mock delayed API response
      mockedApi.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              success: true,
              data: {
                records: [],
                statistics: {},
                annualQuotas: mockAnnualQuotas,
                total: 0
              }
            }
          }), 100)
        )
      );

      render(<LeaveRecord />, { wrapper: TestWrapper });

      // Check for loading in the table area (not button)
      const loadingTexts = screen.getAllByText('載入中...');
      expect(loadingTexts.length).toBeGreaterThan(0);

      await waitFor(() => {
        expect(screen.getByText('無符合條件的請假記錄')).toBeInTheDocument();
      });
    });

    test('should display empty state when no records found', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            records: [],
            statistics: {},
            annualQuotas: mockAnnualQuotas,
            total: 0
          }
        }
      });

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('無符合條件的請假記錄')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Functionality', () => {
    test('should update filter values when user changes inputs', async () => {
      const user = userEvent.setup();
      render(<LeaveRecord />, { wrapper: TestWrapper });

      const startMonthInput = screen.getByLabelText(/起始年月/i);
      const endMonthInput = screen.getByLabelText(/結束年月/i);
      const statusSelect = screen.getByLabelText(/簽核狀態/i);
      const leaveTypeSelect = screen.getByLabelText(/假別/i);

      await user.type(startMonthInput, '2024-06');
      await user.type(endMonthInput, '2024-06');
      await user.selectOptions(statusSelect, '已審核');
      await user.selectOptions(leaveTypeSelect, '事假');

      expect((startMonthInput as HTMLInputElement).value).toBe('2024-06');
      expect((endMonthInput as HTMLInputElement).value).toBe('2024-06');
      expect((statusSelect as HTMLSelectElement).value).toBe('已審核');
      expect((leaveTypeSelect as HTMLSelectElement).value).toBe('事假');
    });

    test('should call API with correct parameters when search button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeaveRecord />, { wrapper: TestWrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();

      const startMonthInput = screen.getByLabelText(/起始年月/i);
      const endMonthInput = screen.getByLabelText(/結束年月/i);
      const searchButton = screen.getByRole('button', { name: /搜尋/i });

      await user.type(startMonthInput, '2024-06');
      await user.type(endMonthInput, '2024-06');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          expect.stringContaining('/leave/records?')
        );
        expect(mockedApi.get).toHaveBeenCalledWith(
          expect.stringContaining('startMonth=2024-06')
        );
        expect(mockedApi.get).toHaveBeenCalledWith(
          expect.stringContaining('endMonth=2024-06')
        );
      });
    });

    test('should reset filter values when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeaveRecord />, { wrapper: TestWrapper });

      const startMonthInput = screen.getByLabelText(/起始年月/i) as HTMLInputElement;
      const endMonthInput = screen.getByLabelText(/結束年月/i) as HTMLInputElement;
      const statusSelect = screen.getByLabelText(/簽核狀態/i) as HTMLSelectElement;
      const leaveTypeSelect = screen.getByLabelText(/假別/i) as HTMLSelectElement;
      const resetButton = screen.getByRole('button', { name: /重設/i });

      // Set some filter values
      await user.type(startMonthInput, '2024-06');
      await user.type(endMonthInput, '2024-06');
      await user.selectOptions(statusSelect, '已審核');
      await user.selectOptions(leaveTypeSelect, '事假');

      // Click reset
      await user.click(resetButton);

      expect(startMonthInput.value).toBe('');
      expect(endMonthInput.value).toBe('');
      expect(statusSelect.value).toBe('');
      expect(leaveTypeSelect.value).toBe('');
    });

    test('should handle partial filter parameters correctly', async () => {
      const user = userEvent.setup();
      render(<LeaveRecord />, { wrapper: TestWrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith('/leave/records?');
      });

      // Clear previous calls
      vi.clearAllMocks();

      const startMonthInput = screen.getByLabelText(/起始年月/i);
      
      // Wait for search button to be available
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /搜尋/i })).toBeInTheDocument();
      });
      
      const searchButton = screen.getByRole('button', { name: /搜尋/i });

      // Only set start month
      await user.type(startMonthInput, '2024-06');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          expect.stringContaining('startMonth=2024-06')
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when API call fails', async () => {
      mockedApi.get.mockRejectedValue({
        response: {
          data: {
            message: '查詢失敗，請稍後再試'
          }
        }
      });

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('查詢失敗，請稍後再試')).toBeInTheDocument();
      });
    });

    test('should display generic error message for network errors', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network Error'));

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    test('should display fallback error message for unknown errors', async () => {
      mockedApi.get.mockRejectedValue({});

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('伺服器錯誤')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    test('should format date and time correctly in table', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('2024/06/15 09:00')).toBeInTheDocument();
        expect(screen.getByText('2024/06/15 17:00')).toBeInTheDocument();
        expect(screen.getByText('2024/06/20 08:00')).toBeInTheDocument();
        expect(screen.getByText('2024/06/20 12:00')).toBeInTheDocument();
      });
    });

    test('should format application date time correctly', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('2024/06/14 10:30:00')).toBeInTheDocument();
        expect(screen.getByText('2024/06/19 14:20:00')).toBeInTheDocument();
      });
    });

    test('should display leave hours with unit', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('8 小時')).toBeInTheDocument();
        expect(screen.getByText('4 小時')).toBeInTheDocument();
      });
    });

    test('should display approval status with correct styling', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      // Get status badges from table (not from select options)
      const statusBadges = screen.getAllByText('已審核');
      const approvedStatus = statusBadges.find(el => el.tagName === 'SPAN');
      
      const pendingBadges = screen.getAllByText('簽核中');
      const pendingStatus = pendingBadges.find(el => el.tagName === 'SPAN');
      
      expect(approvedStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(pendingStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    test('should display dash for empty reason field', async () => {
      const recordsWithoutReason = [
        {
          ...mockLeaveRecords[0],
          reason: undefined
        }
      ];

      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            records: recordsWithoutReason,
            statistics: mockStatistics,
            annualQuotas: mockAnnualQuotas,
            total: 1
          }
        }
      });

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    test('should disable buttons during loading', async () => {
      // Mock delayed API response for initial load
      let resolveInitialPromise: (value: any) => void;
      let resolveSearchPromise: (value: any) => void;
      
      let callCount = 0;
      mockedApi.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Initial load - resolve immediately
          return Promise.resolve({
            data: {
              success: true,
              data: {
                records: mockLeaveRecords,
                statistics: mockStatistics,
                annualQuotas: mockAnnualQuotas,
                total: 2
              }
            }
          });
        } else {
          // Search call - delay
          return new Promise(resolve => {
            resolveSearchPromise = resolve;
          });
        }
      });

      const user = userEvent.setup();
      render(<LeaveRecord />, { wrapper: TestWrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /搜尋/i });
      const resetButton = screen.getByRole('button', { name: /重設/i });

      // Click search to trigger loading state
      await user.click(searchButton);

      // Check loading state - button text changes to "載入中..."
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /載入中/i })).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /載入中/i })).toBeDisabled();
      expect(resetButton).toBeDisabled();

      // Resolve the search promise
      resolveSearchPromise!({
        data: {
          success: true,
          data: {
            records: mockLeaveRecords,
            statistics: mockStatistics,
            annualQuotas: mockAnnualQuotas,
            total: 2
          }
        }
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /搜尋/i })).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /搜尋/i })).not.toBeDisabled();
      expect(resetButton).not.toBeDisabled();
    });

    test('should handle table row hover effects', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      const tableRows = screen.getAllByRole('row');
      // Skip header row, check data rows
      const dataRows = tableRows.slice(1);
      dataRows.forEach(row => {
        expect(row).toHaveClass('hover:bg-gray-50');
      });
    });
  });

  describe('Statistics Display', () => {
    test('should always display statistics section with annual quotas even when no leave statistics available', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            records: [],
            statistics: {},
            annualQuotas: mockAnnualQuotas,
            total: 0
          }
        }
      });

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Statistics section should always be displayed
        expect(screen.getByText('統計資料')).toBeInTheDocument();
        // Annual quotas should be displayed
        expect(screen.getByText('年度假期額度')).toBeInTheDocument();
        expect(screen.getAllByText('14')).toHaveLength(2); // annualLeave and personalLeave both have 14
        expect(screen.getByText('30')).toBeInTheDocument(); // sickLeave
        expect(screen.getByText('36')).toBeInTheDocument(); // menstrualLeave
      });
    });

    test('should display both used leave statistics and annual quotas when statistics available', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Statistics section should be displayed
        expect(screen.getByText('統計資料')).toBeInTheDocument();
        // Used leave statistics should be displayed (only when statistics exist)
        expect(screen.getByText('已使用假期')).toBeInTheDocument();
        // Check for the statistics numbers (8 for 事假, 4 for 病假)
        const statisticsNumbers = screen.getAllByText('8');
        expect(statisticsNumbers.length).toBeGreaterThan(0);
        const sickLeaveNumbers = screen.getAllByText('4');
        expect(sickLeaveNumbers.length).toBeGreaterThan(0);
        // Annual quotas should also be displayed
        expect(screen.getByText('年度假期額度')).toBeInTheDocument();
      });
    });

    test('should display statistics with correct leave type translations', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('事假')).toBeInTheDocument();
        expect(screen.getByText('病假')).toBeInTheDocument();
      });
    });
  });

  describe('Table Column Order', () => {
    /**
     * Property 40: 請假紀錄欄位順序
     * Feature: employee-leave-system, Property 40: 對於任何請假紀錄表格顯示，欄位應該按照指定順序排列：簽核狀況、開始時間、結束時間、請假時數、假別、事由、申請時間
     * Validates: Requirements 21.1, 21.2, 21.3
     */
    test('should display table columns in correct order: approval status, start time, end time, leave hours, leave type, reason, application time', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      // Get all table header cells
      const headerCells = screen.getAllByRole('columnheader');
      
      // Verify the order of column headers
      expect(headerCells[0]).toHaveTextContent('簽核狀態'); // Approval Status
      expect(headerCells[1]).toHaveTextContent('開始時間'); // Start Time
      expect(headerCells[2]).toHaveTextContent('結束時間'); // End Time
      expect(headerCells[3]).toHaveTextContent('請假時數'); // Leave Hours
      expect(headerCells[4]).toHaveTextContent('假別'); // Leave Type
      expect(headerCells[5]).toHaveTextContent('事由'); // Reason
      expect(headerCells[6]).toHaveTextContent('申請時間'); // Application Time
    });

    test('should display table data in same order as headers for any record', async () => {
      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      // Get all table rows (excluding header)
      const tableRows = screen.getAllByRole('row');
      const dataRows = tableRows.slice(1); // Skip header row

      // For each data row, verify the cell order matches the expected column order
      dataRows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        
        // Verify we have the correct number of columns
        expect(cells).toHaveLength(7);
        
        // Verify the content type in each column position
        // Column 0: Approval Status (should contain status badge)
        expect(cells[0].querySelector('span')).toBeInTheDocument();
        expect(cells[0].querySelector('span')).toHaveClass('inline-flex');
        
        // Column 1: Start Time (should contain date-time format)
        expect(cells[1].textContent).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
        
        // Column 2: End Time (should contain date-time format)
        expect(cells[2].textContent).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
        
        // Column 3: Leave Hours (should contain number with "小時")
        expect(cells[3].textContent).toMatch(/\d+ 小時/);
        
        // Column 4: Leave Type (should contain leave type text)
        expect(cells[4].textContent).toMatch(/(事假|公假|喪假|病假|特休|生理假)/);
        
        // Column 5: Reason (should contain reason text or dash)
        expect(cells[5].textContent).toBeTruthy();
        
        // Column 6: Application Time (should contain date-time format)
        expect(cells[6].textContent).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
      });
    });

    test('should maintain column order consistency across different record types', async () => {
      // Test with records that have different leave types and statuses
      const diverseRecords: LeaveRecordType[] = [
        {
          id: 'REC001',
          employeeId: 'EMP001',
          name: '測試員工',
          leaveType: '特休',
          leaveDate: '2024-06-15',
          startTime: '09:00',
          endDate: '2024-06-15',
          endTime: '17:00',
          leaveHours: 8,
          reason: '休假',
          approvalStatus: '已審核',
          applicationDateTime: '2024-06-14T10:30:00',
          approvalDate: '2024-06-14',
          approver: '主管'
        },
        {
          id: 'REC002',
          employeeId: 'EMP001',
          name: '測試員工',
          leaveType: '病假',
          leaveDate: '2024-06-20',
          startTime: '08:00',
          endDate: '2024-06-20',
          endTime: '12:00',
          leaveHours: 4,
          reason: undefined, // Test empty reason
          approvalStatus: '已退回',
          applicationDateTime: '2024-06-19T14:20:00'
        }
      ];

      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            records: diverseRecords,
            statistics: mockStatistics,
            annualQuotas: mockAnnualQuotas,
            total: 2
          }
        }
      });

      render(<LeaveRecord />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('請假紀錄 (2 筆記錄)')).toBeInTheDocument();
      });

      // Verify that different record types still maintain the same column order
      const tableRows = screen.getAllByRole('row');
      const dataRows = tableRows.slice(1);

      // Check first row (特休, 已審核)
      const firstRowCells = dataRows[0].querySelectorAll('td');
      expect(firstRowCells[0].textContent).toContain('已審核'); // Status
      expect(firstRowCells[1].textContent).toBe('2024/06/15 09:00'); // Start time
      expect(firstRowCells[2].textContent).toBe('2024/06/15 17:00'); // End time
      expect(firstRowCells[3].textContent).toBe('8 小時'); // Hours
      expect(firstRowCells[4].textContent).toBe('特休'); // Leave type
      expect(firstRowCells[5].textContent).toBe('休假'); // Reason
      expect(firstRowCells[6].textContent).toBe('2024/06/14 10:30:00'); // Application time

      // Check second row (病假, 已退回, no reason)
      const secondRowCells = dataRows[1].querySelectorAll('td');
      expect(secondRowCells[0].textContent).toContain('已退回'); // Status
      expect(secondRowCells[1].textContent).toBe('2024/06/20 08:00'); // Start time
      expect(secondRowCells[2].textContent).toBe('2024/06/20 12:00'); // End time
      expect(secondRowCells[3].textContent).toBe('4 小時'); // Hours
      expect(secondRowCells[4].textContent).toBe('病假'); // Leave type
      expect(secondRowCells[5].textContent).toBe('-'); // Reason (empty)
      expect(secondRowCells[6].textContent).toBe('2024/06/19 14:20:00'); // Application time
    });
  });
});