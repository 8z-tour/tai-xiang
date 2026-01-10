import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonalData } from '../../types';
import { api } from '../../services/api';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<PersonalData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PersonalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingUser, setEditingUser] = useState<PersonalData | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // 載入用戶資料
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(''); // 清除之前的錯誤
      
      console.log('=== 前端：開始載入用戶資料 ===');
      console.log('Token:', localStorage.getItem('auth_token'));
      console.log('User data:', localStorage.getItem('user_data'));
      
      const response = await api.get('/admin/users');
      
      console.log('API 回應:', response.data);
      
      if (response.data.success) {
        console.log('成功載入用戶資料，數量:', response.data.data.length);
        setUsers(response.data.data);
        setFilteredUsers(response.data.data); // 初始化過濾後的用戶列表
      } else {
        console.error('API 回應失敗:', response.data.message);
        setError(response.data.message || '載入用戶資料失敗');
      }
    } catch (err: any) {
      console.error('載入用戶資料錯誤:', err);
      console.error('錯誤詳情:', {
        message: err.message,
        status: err.status,
        code: err.code,
        details: err.details
      });
      
      if (err.status === 401) {
        setError('身份驗證失敗，請重新登入');
      } else if (err.status === 403) {
        setError('權限不足，需要管理者權限');
      } else {
        setError(err.message || '載入用戶資料失敗');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 處理員工篩選
  const handleEmployeeFilter = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId === '') {
      // 顯示全部用戶
      setFilteredUsers(users);
    } else {
      // 篩選特定員工
      const filtered = users.filter(user => user.employeeId === employeeId);
      setFilteredUsers(filtered);
    }
  };

  // 當用戶列表更新時，重新應用篩選
  useEffect(() => {
    handleEmployeeFilter(selectedEmployeeId);
  }, [users, selectedEmployeeId]);

  // 新增用戶
  const handleAddUser = () => {
    setEditingUser({
      employeeId: '',
      password: '',
      name: '',
      permission: 'employee',
      annualLeave: 14.0,
      sickLeave: 30.0,
      menstrualLeave: 3.0,
      personalLeave: 14.0
    });
    setIsAddingUser(true);
  };

  // 編輯用戶
  const handleEditUser = (user: PersonalData) => {
    console.log('=== 前端：開始編輯用戶 ===');
    console.log('原始用戶資料:', user);
    console.log('姓名:', user.name);
    console.log('姓名長度:', user.name.length);
    console.log('姓名字符碼:', user.name.split('').map(c => c.charCodeAt(0)));
    
    setEditingUser({ ...user });
    setIsAddingUser(false);
  };

  // 儲存用戶
  const handleSaveUser = async () => {
    if (!editingUser) return;

    console.log('=== 前端：準備儲存用戶 ===');
    console.log('editingUser:', editingUser);
    console.log('姓名:', editingUser.name);
    console.log('姓名長度:', editingUser.name.length);
    console.log('姓名字符碼:', editingUser.name.split('').map(c => c.charCodeAt(0)));

    try {
      const response = isAddingUser 
        ? await api.post('/admin/users', editingUser)
        : await api.put(`/admin/users/${editingUser.employeeId}`, editingUser);

      if (response.data.success) {
        await loadUsers();
        setEditingUser(null);
        setIsAddingUser(false);
      } else {
        setError(response.data.message || t('errors.serverError'));
      }
    } catch (err: any) {
      setError(err.message || t('errors.serverError'));
    }
  };

  // 刪除用戶
  const handleDeleteUser = async (employeeId: string) => {
    if (!confirm(t('userManagement.confirmDelete', '確定要刪除此用戶嗎？'))) {
      return;
    }

    try {
      const response = await api.delete(`/admin/users/${employeeId}`);
      if (response.data.success) {
        await loadUsers();
      } else {
        setError(response.data.message || t('errors.serverError'));
      }
    } catch (err: any) {
      setError(err.message || t('errors.serverError'));
    }
  };

  // 匯出CSV
  const handleExportCSV = async () => {
    try {
      console.log('=== 前端：開始匯出權限資料 CSV ===');
      
      const response = await api.post('/admin/users/export', {}, {
        responseType: 'blob'
      });

      // 從回應標頭取得檔案名稱，或使用預設名稱
      const contentDisposition = response.headers['content-disposition'];
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      let filename = `請假系統權限資料${year}${month}${day}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      // 建立下載連結
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('權限資料 CSV 匯出成功:', filename);
      
    } catch (err: any) {
      console.error('匯出 CSV 失敗:', err);
      setError('匯出失敗，請稍後再試');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* 篩選區域 */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <label htmlFor="employeeFilter" className="text-sm font-medium text-gray-700">
            工號篩選：
          </label>
          <div className="flex-1 max-w-xs">
            <select
              id="employeeFilter"
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              {users.map((user) => (
                <option key={user.employeeId} value={user.employeeId}>
                  {user.employeeId} - {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            顯示 {filteredUsers.length} / {users.length} 筆記錄
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <h2 className="text-lg font-medium text-gray-900">
          {t('userManagement.userList', '用戶列表')}
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleExportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            匯出CSV
          </button>
          <button
            onClick={handleAddUser}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {t('userManagement.addUser', '新增用戶')}
          </button>
        </div>
      </div>

      {/* 用戶列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* 桌面版表格 */}
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('userManagement.employeeId', '工號')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('userManagement.name', '姓名')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('userManagement.password', '密碼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('userManagement.permission', '權限')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('leave.records.annualLeaveQuota', '年度特休')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('leave.records.sickLeaveQuota', '年度病假')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('leave.records.menstrualLeaveQuota', '年度生理假')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  年度事假(HR)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('userManagement.actions', '操作')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.employeeId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {user.password}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.permission === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.permission === 'admin' ? t('userManagement.admin', '管理者') : t('userManagement.employee', '員工')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.annualLeave}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.sickLeave}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.menstrualLeave}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.personalLeave || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.employeeId)}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 手機版卡片列表 */}
        <div className="md:hidden">
          {filteredUsers.map((user) => (
            <div key={user.employeeId} className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">工號: {user.employeeId}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.permission === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.permission === 'admin' ? t('userManagement.admin', '管理者') : t('userManagement.employee', '員工')}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">密碼:</span>
                  <span className="ml-1 font-mono">{user.password}</span>
                </div>
                <div>
                  <span className="text-gray-500">年度特休:</span>
                  <span className="ml-1">{user.annualLeave}</span>
                </div>
                <div>
                  <span className="text-gray-500">年度病假:</span>
                  <span className="ml-1">{user.sickLeave}</span>
                </div>
                <div>
                  <span className="text-gray-500">年度生理假:</span>
                  <span className="ml-1">{user.menstrualLeave}</span>
                </div>
                <div>
                  <span className="text-gray-500">年度事假:</span>
                  <span className="ml-1">{user.personalLeave || 0}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleEditUser(user)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.employeeId)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 編輯/新增用戶對話框 */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isAddingUser ? t('userManagement.addUser', '新增用戶') : t('userManagement.editUser', '編輯用戶')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userManagement.employeeId', '工號')}
                  </label>
                  <input
                    type="text"
                    value={editingUser.employeeId}
                    onChange={(e) => setEditingUser({ ...editingUser, employeeId: e.target.value })}
                    disabled={!isAddingUser}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userManagement.name', '姓名')}
                  </label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userManagement.password', '密碼')}
                  </label>
                  <input
                    type="text"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userManagement.permission', '權限')}
                  </label>
                  <select
                    value={editingUser.permission}
                    onChange={(e) => setEditingUser({ ...editingUser, permission: e.target.value as 'employee' | 'admin' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">{t('userManagement.employee', '員工')}</option>
                    <option value="admin">{t('userManagement.admin', '管理者')}</option>
                  </select>
                </div>

                {/* 年度假期額度 */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">年度假期額度</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('leave.records.annualLeaveQuota', '年度特休')}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingUser.annualLeave}
                        onChange={(e) => setEditingUser({ ...editingUser, annualLeave: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('leave.records.sickLeaveQuota', '年度病假')}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingUser.sickLeave}
                        onChange={(e) => setEditingUser({ ...editingUser, sickLeave: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('leave.records.menstrualLeaveQuota', '年度生理假')}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingUser.menstrualLeave}
                        onChange={(e) => setEditingUser({ ...editingUser, menstrualLeave: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        年度事假(HR)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingUser.personalLeave || 0}
                        onChange={(e) => setEditingUser({ ...editingUser, personalLeave: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setIsAddingUser(false);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};