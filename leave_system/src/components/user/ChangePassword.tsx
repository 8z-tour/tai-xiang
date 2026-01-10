import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export const ChangePassword: React.FC = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 處理表單輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // 清除該欄位的錯誤訊息
    if (errors[name as keyof ChangePasswordFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
    
    // 清除全域訊息
    if (error) setError('');
    if (success) setSuccess('');
  };

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: ChangePasswordFormErrors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = '請輸入目前密碼';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = '請輸入新密碼';
    } else if (formData.newPassword.length < 4) {
      newErrors.newPassword = '新密碼至少需要4個字符';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = '請確認新密碼';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '新密碼與確認密碼不一致';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = '新密碼不能與目前密碼相同';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/user/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.data.success) {
        setSuccess('密碼變更成功！');
        // 清空表單
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(response.data.message || '密碼變更失敗');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('密碼變更失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 重設表單
  const handleReset = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      {/* 使用者資訊顯示 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm font-medium text-gray-700">工號：</span>
            <span className="text-sm text-gray-900">{user?.employeeId}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">姓名：</span>
            <span className="text-sm text-gray-900">{user?.name}</span>
          </div>
        </div>
      </div>

      {/* 變更密碼表單 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">變更密碼</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 目前密碼 */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              目前密碼 *
            </label>
            <input
              type="text"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.currentPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="請輸入目前密碼"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          {/* 新密碼 */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              新密碼 *
            </label>
            <input
              type="text"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.newPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="請輸入新密碼"
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          {/* 確認新密碼 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              確認新密碼 *
            </label>
            <input
              type="text"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="請再次輸入新密碼"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* 成功訊息 */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? '變更中...' : '變更密碼'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-400"
            >
              重設
            </button>
          </div>
        </form>

        {/* 密碼規則說明 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">密碼規則：</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 密碼長度至少4個字符</li>
            <li>• 新密碼不能與目前密碼相同</li>
            <li>• 密碼將以明文顯示，請確保周圍環境安全</li>
          </ul>
        </div>
      </div>
    </div>
  );
};