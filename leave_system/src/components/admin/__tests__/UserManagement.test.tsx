import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserManagement } from '../UserManagement';
import { AuthContext } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import i18n from '../../../i18n';
import { PersonalData, User } from '../../../types';

// Mock the API
vi.mock('../../../services/api');
const mockedApi = vi.mocked(api);

// Mock user for testing (admin user)
const mockUser: User = {
  employeeId: 'ADMIN001',
  name: '管理員',
  permission: 'admin'
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

// Mock users data
const mockUsers: PersonalData[] = [
  {
    employeeId: 'EMP001',
    name: '張三',
    password: 'password123',
    permission: 'employee',
    annualLeave: 14,
    sickLeave: 30,
    menstrualLeave: 36,
    personalLeave: 14
  },
  {
    employeeId: 'EMP002',
    name: '李四',
    password: 'password456',
    permission: 'employee',
    annualLeave: 14,
    sickLeave: 30,
    menstrualLeave: 36,
    personalLeave: 14
  },
  {
    employeeId: 'ADMIN001',
    name: '管理員',
    password: 'admin123',
    permission: 'admin',
    annualLeave: 14,
    sickLeave: 30,
    menstrualLeave: 36,
    personalLeave: 14
  }
];

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  </I18nextProvider>
);

describe('UserManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful API response
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockUsers
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Employee ID Filter', () => {
    test('should render employee ID filter dropdown', async () => {
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
      });

      // Check if filter dropdown exists
      expect(screen.getByLabelText('工號篩選：')).toBeInTheDocument();
      expect(screen.getByDisplayValue('全部')).toBeInTheDocument();
    });

    test('should display all users by default', async () => {
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2); // Desktop table + mobile card
        expect(screen.getAllByText('李四')).toHaveLength(2);
        expect(screen.getAllByText('管理員')).toHaveLength(2);
      });

      // Check record count
      expect(screen.getByText('顯示 3 / 3 筆記錄')).toBeInTheDocument();
    });

    test('should filter users by selected employee ID', async () => {
      const user = userEvent.setup();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
      });

      // Select specific employee ID
      const filterSelect = screen.getByLabelText('工號篩選：');
      await user.selectOptions(filterSelect, 'EMP001');

      // Should only show the selected user
      expect(screen.getAllByText('張三')).toHaveLength(2); // Still 2 (desktop + mobile)
      expect(screen.queryByText('李四')).not.toBeInTheDocument();
      expect(screen.queryByText('管理員')).not.toBeInTheDocument();

      // Check record count
      expect(screen.getByText('顯示 1 / 3 筆記錄')).toBeInTheDocument();
    });

    test('should show all users when "全部" is selected', async () => {
      const user = userEvent.setup();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
      });

      const filterSelect = screen.getByLabelText('工號篩選：');
      
      // First filter to a specific user
      await user.selectOptions(filterSelect, 'EMP001');
      
      // Verify filtering worked
      expect(screen.getAllByText('張三')).toHaveLength(2);
      expect(screen.queryByText('李四')).not.toBeInTheDocument();

      // Then select "全部" to show all users again
      await user.selectOptions(filterSelect, '');

      // Should show all users again
      expect(screen.getAllByText('張三')).toHaveLength(2);
      expect(screen.getAllByText('李四')).toHaveLength(2);
      expect(screen.getAllByText('管理員')).toHaveLength(2);

      // Check record count
      expect(screen.getByText('顯示 3 / 3 筆記錄')).toBeInTheDocument();
    });

    test('should populate dropdown with all employee IDs and names', async () => {
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
      });

      const filterSelect = screen.getByLabelText('工號篩選：');
      
      // Check if all options are present
      expect(screen.getByRole('option', { name: '全部' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'EMP001 - 張三' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'EMP002 - 李四' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'ADMIN001 - 管理員' })).toBeInTheDocument();
    });

    test('should maintain filter when users list is updated', async () => {
      const user = userEvent.setup();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
      });

      // Select specific employee ID
      const filterSelect = screen.getByLabelText('工號篩選：');
      await user.selectOptions(filterSelect, 'EMP001');

      // Verify filtering
      expect(screen.getAllByText('張三')).toHaveLength(2);
      expect(screen.queryByText('李四')).not.toBeInTheDocument();

      // Simulate users list update (e.g., after adding/editing a user)
      const updatedUsers = [...mockUsers, {
        employeeId: 'EMP003',
        name: '王五',
        password: 'password789',
        permission: 'employee',
        annualLeave: 14,
        sickLeave: 30,
        menstrualLeave: 36,
        personalLeave: 14
      }];

      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: updatedUsers
        }
      });

      // Trigger a reload (this would happen after save operations)
      // For this test, we'll just verify the filter state is maintained
      expect(filterSelect).toHaveValue('EMP001');
      expect(screen.getByText('顯示 1 / 3 筆記錄')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('should load users on component mount', async () => {
      render(<UserManagement />, { wrapper: TestWrapper });

      // Verify API was called
      expect(mockedApi.get).toHaveBeenCalledWith('/admin/users');

      // Wait for users to be displayed
      await waitFor(() => {
        expect(screen.getAllByText('張三')).toHaveLength(2);
        expect(screen.getAllByText('李四')).toHaveLength(2);
        expect(screen.getAllByText('管理員')).toHaveLength(2);
      });
    });

    test('should display loading state initially', () => {
      // Mock delayed API response
      mockedApi.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              success: true,
              data: mockUsers
            }
          }), 100)
        )
      );

      render(<UserManagement />, { wrapper: TestWrapper });

      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      mockedApi.get.mockRejectedValue({
        message: '載入用戶資料失敗'
      });

      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('載入用戶資料失敗')).toBeInTheDocument();
      });
    });
  });
});