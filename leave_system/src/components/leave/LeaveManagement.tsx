import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { TimeSelector } from '../common/TimeSelector';
import { LeaveRecord, AdminLeaveQueryFormData, LeaveType, ApprovalStatus } from '../../types';
import { api } from '../../services/api';
import { formatDateTime, formatApplicationDateTime } from '../../utils/dateFormat';


interface AdminLeaveRecordsResponse {
  records: LeaveRecord[];
  total: number;
}

interface EditFormData {
  employeeId: string;
  name: string;
  leaveType: LeaveType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  leaveHours: number;
  reason: string;
  approvalStatus: ApprovalStatus;
}

interface EditFormErrors {
  employeeId?: string;
  name?: string;
  leaveType?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  leaveHours?: string;
  reason?: string;
  approvalStatus?: string;
}

export const LeaveManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [filterData, setFilterData] = useState<AdminLeaveQueryFormData>({
    employeeId: '',
    selectedMonth: '',
    approvalStatus: '',
    leaveType: '',
  });
  
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    employeeId: '',
    name: '',
    leaveType: '事假',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    leaveHours: 0,
    reason: '',
    approvalStatus: '簽核中',
  });
  const [editFormErrors, setEditFormErrors] = useState<EditFormErrors>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 假別選項
  const leaveTypeOptions: { value: LeaveType | ''; label: string }[] = [
    { value: '', label: t('common.all') || '全部' },
    { value: '事假', label: t('leave.types.事假') },
    { value: '公假', label: t('leave.types.公假') },
    { value: '喪假', label: t('leave.types.喪假') },
    { value: '病假', label: t('leave.types.病假') },
    { value: '特休', label: t('leave.types.特休') },
    { value: '生理假', label: t('leave.types.生理假') },
  ];

  // 簽核狀態選項
  const approvalStatusOptions: { value: ApprovalStatus | ''; label: string }[] = [
    { value: '', label: t('common.all') || '全部' },
    { value: '簽核中', label: t('leave.status.簽核中') },
    { value: '已審核', label: t('leave.status.已審核') },
    { value: '已退回', label: t('leave.status.已退回') },
  ];

  // 查詢請假記錄
  const fetchLeaveRecords = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      
      if (filterData.employeeId) {
        params.append('employeeId', filterData.employeeId);
      }
      if (filterData.selectedMonth) {
        params.append('selectedMonth', filterData.selectedMonth);
      }
      if (filterData.approvalStatus) {
        params.append('approvalStatus', filterData.approvalStatus);
      }
      if (filterData.leaveType) {
        params.append('leaveType', filterData.leaveType);
      }
      
      const response = await api.get(`/admin/leave/records?${params.toString()}`);
      
      if (response.data.success) {
        const data: AdminLeaveRecordsResponse = response.data.data;
        setRecords(data.records);
      } else {
        setError(response.data.message || t('errors.serverError'));
      }
    } catch (error: any) {
      console.error('Admin leave records query error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError(t('errors.networkError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchLeaveRecords();
  }, [user]);

  // 處理篩選條件變更
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilterData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 處理搜尋
  const handleSearch = () => {
    fetchLeaveRecords();
  };

  // 重設篩選條件
  const handleReset = () => {
    setFilterData({
      employeeId: '',
      selectedMonth: '',
      approvalStatus: '',
      leaveType: '',
    });
  };

  // 處理記錄點選
  const handleRecordClick = (record: LeaveRecord) => {
    setSelectedRecord(record);
    
    // Convert legacy time format to new format if needed
    // 處理開始時間
    const startTime = record.isStartNextDay && record.startTime && !record.startTime.includes('(+1)') 
      ? `${record.startTime}(+1)` 
      : record.startTime;
    
    // 處理結束時間 - 檢查結束日期是否與開始日期不同來判斷是否為隔日
    const isEndNextDay = record.endDate !== record.leaveDate;
    const endTime = isEndNextDay && record.endTime && !record.endTime.includes('(+1)')
      ? `${record.endTime}(+1)`
      : record.endTime;
    
    setEditFormData({
      employeeId: record.employeeId,
      name: record.name,
      leaveType: record.leaveType,
      startDate: record.leaveDate,
      startTime: startTime || '',
      endDate: record.endDate,
      endTime: endTime || '',
      leaveHours: record.leaveHours,
      reason: record.reason || '',
      approvalStatus: record.approvalStatus,
    });
    setEditFormErrors({});
    setIsEditDialogOpen(true);
  };

  // 關閉編輯對話框
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedRecord(null);
    setEditFormErrors({});
  };

  // 處理編輯表單變更
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: name === 'leaveHours' ? parseFloat(value) || 0 : value,
    }));
    
    // 清除該欄位的錯誤訊息
    if (editFormErrors[name as keyof EditFormErrors]) {
      setEditFormErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // 驗證編輯表單
  const validateEditForm = (): boolean => {
    const errors: EditFormErrors = {};

    if (!editFormData.employeeId.trim()) {
      errors.employeeId = t('validation.required');
    }

    if (!editFormData.name.trim()) {
      errors.name = t('validation.required');
    }

    if (!editFormData.leaveType) {
      errors.leaveType = t('validation.required');
    }

    if (!editFormData.startDate) {
      errors.startDate = t('validation.required');
    }

    if (!editFormData.startTime) {
      errors.startTime = t('validation.required');
    }

    if (!editFormData.endDate) {
      errors.endDate = t('validation.required');
    }

    if (!editFormData.endTime) {
      errors.endTime = t('validation.required');
    }

    if (editFormData.leaveHours <= 0) {
      errors.leaveHours = t('validation.required');
    }

    // 簡化的時間驗證 - 支援現有資料格式
    if (editFormData.startTime && editFormData.endTime) {
      // 基本格式檢查 - 接受 HH:MM 和 HH:MM(+1) 格式
      const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9](\(\+1\))?$/;
      
      if (!timeFormat.test(editFormData.startTime)) {
        errors.startTime = t('validation.invalidTime');
      }
      
      if (!timeFormat.test(editFormData.endTime)) {
        errors.endTime = t('validation.invalidTime');
      }
      
      // 時間範圍檢查 - 正確處理 (+1) 格式
      if (!errors.startTime && !errors.endTime) {
        // 解析開始時間
        const startIsNextDay = editFormData.startTime.includes('(+1)');
        const startTimeClean = editFormData.startTime.replace('(+1)', '');
        const [startHour, startMinute] = startTimeClean.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute + (startIsNextDay ? 24 * 60 : 0);
        
        // 解析結束時間
        const endIsNextDay = editFormData.endTime.includes('(+1)');
        const endTimeClean = editFormData.endTime.replace('(+1)', '');
        const [endHour, endMinute] = endTimeClean.split(':').map(Number);
        const endTotalMinutes = endHour * 60 + endMinute + (endIsNextDay ? 24 * 60 : 0);
        
        if (endTotalMinutes <= startTotalMinutes) {
          errors.endTime = '結束時間必須晚於開始時間。如果是跨日請假，請選擇帶有(+1)標記的隔日時間選項。';
        }
      }
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 處理記錄更新
  const handleUpdateRecord = async () => {
    if (!selectedRecord || !validateEditForm()) {
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      const response = await api.put(`/admin/leave/records/${selectedRecord.id}`, editFormData);

      if (response.data.success) {
        // 更新本地記錄列表
        setRecords(prev => prev.map(record => 
          record.id === selectedRecord.id ? response.data.data : record
        ));
        
        handleCloseEditDialog();
        
        // 顯示成功訊息（可以考慮使用 toast 通知）
        alert(t('leave.application.success'));
      } else {
        setError(response.data.message || t('errors.serverError'));
      }
    } catch (error: any) {
      console.error('Update record error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError(t('errors.networkError'));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理CSV匯出
  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    
    try {
      const exportData = {
        employeeId: filterData.employeeId || undefined,
        selectedMonth: filterData.selectedMonth || undefined,
        approvalStatus: filterData.approvalStatus || undefined,
        leaveType: filterData.leaveType || undefined,
      };

      const response = await api.post('/admin/leave/export', exportData, {
        responseType: 'blob',
      });

      // 建立下載連結
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 從回應標頭取得檔案名稱，或使用預設名稱
      const contentDisposition = response.headers['content-disposition'];
      let filename = '請假記錄匯出.csv';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Export error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError(t('errors.networkError'));
      }
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* 篩選表單 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('leave.records.filter')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* 工號 */}
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.employeeId')}
            </label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={filterData.employeeId}
              onChange={handleFilterChange}
              placeholder={t('auth.employeeId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 年月 */}
          <div>
            <label htmlFor="selectedMonth" className="block text-sm font-medium text-gray-700 mb-1">
              {t('leave.records.selectedMonth')}
            </label>
            <input
              type="month"
              id="selectedMonth"
              name="selectedMonth"
              value={filterData.selectedMonth}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 簽核狀態 */}
          <div>
            <label htmlFor="approvalStatus" className="block text-sm font-medium text-gray-700 mb-1">
              {t('leave.records.approvalStatus')}
            </label>
            <select
              id="approvalStatus"
              name="approvalStatus"
              value={filterData.approvalStatus}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {approvalStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 假別 */}
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1">
              {t('leave.application.leaveType')}
            </label>
            <select
              id="leaveType"
              name="leaveType"
              value={filterData.leaveType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {leaveTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? t('common.loading') : t('common.search')}
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-400"
          >
            {t('common.reset')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || records.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
          >
            {isExporting ? t('common.loading') : t('leave.management.export')}
          </button>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 請假記錄表格 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {t('leave.management.allRecords')} ({records.length} {t('leave.records.recordsCount')})
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">{t('leave.records.noRecords')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('auth.employeeId')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.leaveType')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.startTime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.endTime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.leaveHours')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.records.approvalStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('leave.application.submit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr 
                    key={record.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRecordClick(record)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t(`leave.types.${record.leaveType}`)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.leaveDate, record.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.endDate, record.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.leaveHours} {t('leave.application.hours')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.approvalStatus === '已審核' 
                          ? 'bg-green-100 text-green-800'
                          : record.approvalStatus === '已退回'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {t(`leave.status.${record.approvalStatus}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatApplicationDateTime(record.applicationDateTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordClick(record);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t('leave.management.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 編輯記錄對話框 */}
      {isEditDialogOpen && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* 對話框標題 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('leave.management.edit')} - {selectedRecord.employeeId}
                </h3>
                <button
                  onClick={handleCloseEditDialog}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 編輯表單 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 工號 */}
                  <div>
                    <label htmlFor="edit-employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.employeeId')} *
                    </label>
                    <input
                      type="text"
                      id="edit-employeeId"
                      name="employeeId"
                      value={editFormData.employeeId}
                      onChange={handleEditFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editFormErrors.employeeId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editFormErrors.employeeId && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.employeeId}</p>
                    )}
                  </div>

                  {/* 姓名 */}
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.application.name')} *
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editFormErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editFormErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.name}</p>
                    )}
                  </div>
                </div>

                {/* 假別 - 移到前面 */}
                <div>
                  <label htmlFor="edit-leaveType" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.application.leaveType')} *
                  </label>
                  <select
                    id="edit-leaveType"
                    name="leaveType"
                    value={editFormData.leaveType}
                    onChange={handleEditFormChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editFormErrors.leaveType ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {leaveTypeOptions.filter(option => option.value !== '').map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {editFormErrors.leaveType && (
                    <p className="mt-1 text-sm text-red-600">{editFormErrors.leaveType}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 開始日期 */}
                  <div>
                    <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.application.startDate')} *
                    </label>
                    <input
                      type="date"
                      id="edit-startDate"
                      name="startDate"
                      value={editFormData.startDate}
                      onChange={handleEditFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editFormErrors.startDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editFormErrors.startDate && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.startDate}</p>
                    )}
                  </div>

                  {/* 結束日期 */}
                  <div>
                    <label htmlFor="edit-endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.application.endDate')} *
                    </label>
                    <input
                      type="date"
                      id="edit-endDate"
                      name="endDate"
                      value={editFormData.endDate}
                      onChange={handleEditFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editFormErrors.endDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editFormErrors.endDate && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.endDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 開始時間 - 使用TimeSelector */}
                  <div>
                    <label htmlFor="edit-startTime" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.application.startTime')} *
                    </label>
                    <TimeSelector
                      id="edit-startTime"
                      name="startTime"
                      value={editFormData.startTime}
                      onChange={handleEditFormChange}
                      placeholder={t('leave.application.selectStartTime')}
                      className="w-full"
                      disabled={isUpdating}
                      loading={isUpdating}
                      error={!!editFormErrors.startTime}
                      errorMessage={editFormErrors.startTime}
                      aria-label={t('leave.application.selectStartTime')}
                    />
                  </div>

                  {/* 結束時間 - 使用TimeSelector */}
                  <div>
                    <label htmlFor="edit-endTime" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.application.endTime')} *
                    </label>
                    <TimeSelector
                      id="edit-endTime"
                      name="endTime"
                      value={editFormData.endTime}
                      onChange={handleEditFormChange}
                      placeholder={t('leave.application.selectEndTime')}
                      className="w-full"
                      disabled={isUpdating}
                      loading={isUpdating}
                      error={!!editFormErrors.endTime}
                      errorMessage={editFormErrors.endTime}
                      aria-label={t('leave.application.selectEndTime')}
                    />
                  </div>
                </div>

                {/* 請假時數 */}
                <div>
                  <label htmlFor="edit-leaveHours" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.application.leaveHours')} *
                  </label>
                  <input
                    type="number"
                    id="edit-leaveHours"
                    name="leaveHours"
                    value={editFormData.leaveHours}
                    onChange={handleEditFormChange}
                    min="0"
                    step="0.5"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editFormErrors.leaveHours ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {editFormErrors.leaveHours && (
                    <p className="mt-1 text-sm text-red-600">{editFormErrors.leaveHours}</p>
                  )}
                </div>

                {/* 事由 - 移到最後 */}
                <div>
                  <label htmlFor="edit-reason" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.application.reason')}
                  </label>
                  <textarea
                    id="edit-reason"
                    name="reason"
                    value={editFormData.reason}
                    onChange={handleEditFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('leave.application.reasonPlaceholder')}
                  />
                </div>

                {/* 簽核狀態 - 移到最後 */}
                <div>
                  <label htmlFor="edit-approvalStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.records.approvalStatus')} *
                  </label>
                  <select
                    id="edit-approvalStatus"
                    name="approvalStatus"
                    value={editFormData.approvalStatus}
                    onChange={handleEditFormChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editFormErrors.approvalStatus ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {approvalStatusOptions.filter(option => option.value !== '').map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {editFormErrors.approvalStatus && (
                    <p className="mt-1 text-sm text-red-600">{editFormErrors.approvalStatus}</p>
                  )}
                </div>

                {/* 錯誤訊息 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={handleCloseEditDialog}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-200"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleUpdateRecord}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {isUpdating ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};