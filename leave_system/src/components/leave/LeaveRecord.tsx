import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { LeaveRecord as LeaveRecordType, LeaveQueryFormData, LeaveType, ApprovalStatus, LeaveStatistics } from '../../types';
import { api } from '../../services/api';
import { formatDateTime, formatApplicationDateTime } from '../../utils/dateFormat';

interface LeaveRecordsResponse {
  records: LeaveRecordType[];
  statistics: LeaveStatistics;
  annualQuotas: {
    annualLeave: number;
    sickLeave: number;
    menstrualLeave: number;
    personalLeave: number;
  };
  total: number;
}

export const LeaveRecord: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [filterData, setFilterData] = useState<LeaveQueryFormData>({
    selectedMonth: '',
    approvalStatus: '',
    leaveType: '',
  });
  
  const [records, setRecords] = useState<LeaveRecordType[]>([]);
  const [statistics, setStatistics] = useState<LeaveStatistics>({});
  const [annualQuotas, setAnnualQuotas] = useState<{
    annualLeave: number;
    sickLeave: number;
    menstrualLeave: number;
    personalLeave: number;
  }>({
    annualLeave: 0,
    sickLeave: 0,
    menstrualLeave: 0,
    personalLeave: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 假別選項
  const leaveTypeOptions: { value: LeaveType | ''; label: string }[] = [
    { value: '', label: t('common.all') },
    { value: '事假', label: t('leave.types.事假') },
    { value: '公假', label: t('leave.types.公假') },
    { value: '喪假', label: t('leave.types.喪假') },
    { value: '病假', label: t('leave.types.病假') },
    { value: '特休', label: t('leave.types.特休') },
    { value: '生理假', label: t('leave.types.生理假') },
  ];

  // 簽核狀態選項
  const approvalStatusOptions: { value: ApprovalStatus | ''; label: string }[] = [
    { value: '', label: t('common.all') },
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
      
      if (filterData.selectedMonth) {
        params.append('selectedMonth', filterData.selectedMonth);
      }
      if (filterData.approvalStatus) {
        params.append('approvalStatus', filterData.approvalStatus);
      }
      if (filterData.leaveType) {
        params.append('leaveType', filterData.leaveType);
      }
      
      const response = await api.get(`/leave/records?${params.toString()}`);
      
      if (response.data.success) {
        const data: LeaveRecordsResponse = response.data.data;
        setRecords(data.records);
        setStatistics(data.statistics);
        setAnnualQuotas(data.annualQuotas);
      } else {
        setError(response.data.message || t('errors.serverError'));
      }
    } catch (error: any) {
      console.error('Leave records query error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError(t('errors.serverError'));
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
      selectedMonth: '',
      approvalStatus: '',
      leaveType: '',
    });
  };



  return (
    <div className="space-y-6">
      {/* 員工資訊顯示 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm font-medium text-gray-700">{t('leave.application.employeeId')}：</span>
            <span className="text-sm text-gray-900">{user?.employeeId}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">{t('leave.application.name')}：</span>
            <span className="text-sm text-gray-900">{user?.name}</span>
          </div>
        </div>
      </div>

      {/* 統計資料 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('leave.records.statistics')}({new Date().getFullYear()})</h3>
        <p className="text-sm text-gray-600 mb-4">{t('leave.records.statisticsNote')}</p>
        
        {/* 已使用假期統計 - 只有當有統計資料時才顯示 */}
        {Object.keys(statistics).length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">{t('leave.records.usedLeave')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(statistics).map(([leaveType, hours]) => (
                <div key={leaveType} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {t(`leave.types.${leaveType}`)}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {hours}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('leave.records.totalHours')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 年度假期額度 - 始終顯示 */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">{t('leave.records.annualQuotas')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {t('leave.records.annualLeaveQuota')}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {annualQuotas.annualLeave}
              </div>
              <div className="text-xs text-gray-500">
                {t('leave.records.availableQuota')}
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {t('leave.records.sickLeaveQuota')}
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {annualQuotas.sickLeave}
              </div>
              <div className="text-xs text-gray-500">
                {t('leave.records.availableQuota')}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {t('leave.records.menstrualLeaveQuota')}
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {annualQuotas.menstrualLeave}
              </div>
              <div className="text-xs text-gray-500">
                {t('leave.records.availableQuota')}
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {t('leave.records.personalLeaveQuota')}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {annualQuotas.personalLeave}
              </div>
              <div className="text-xs text-gray-500">
                {t('leave.records.availableQuota')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 篩選條件和請假記錄 - 統一背景 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        {/* 篩選表單 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('leave.records.filter')}</h3>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
          </div>
        </div>

        {/* 請假記錄表格 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {t('leave.records.title')} ({records.length} {t('leave.records.recordsCount')})
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
                      {t('leave.records.approvalStatus')}
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
                      {t('leave.application.leaveType')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('leave.application.reason')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('leave.records.applicationTime')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
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
                        {formatDateTime(record.leaveDate, record.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(record.endDate, record.endTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.leaveHours} {t('leave.application.hours')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {t(`leave.types.${record.leaveType}`)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatApplicationDateTime(record.applicationDateTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};