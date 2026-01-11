import path from 'path';
import { LeaveRecord, LeaveType, ApprovalStatus, LeaveQueryParams, LeaveStatistics } from '../types';
import { readCsvFile, writeCsvFile, checkCsvFileExists, validateCsvData, appendToCsvFile } from '../utils/csvUtils';
import { calculateLeaveHours } from '../utils/dateUtils';

/**
 * 格式化時間為帶日期標記的格式
 * @param time 時間 (HH:mm)
 * @param isNextDay 是否為隔日
 * @returns 格式化的時間字串
 */
function formatTimeWithDayMarker(time: string, isNextDay: boolean): string {
  return isNextDay ? `${time}(+1)` : time;
}

/**
 * 解析帶日期標記的時間格式
 * @param timeStr 時間字串 (可能包含 (+1) 標記)
 * @returns { time: string, isNextDay: boolean }
 */
function parseTimeWithDayMarker(timeStr: string): { time: string, isNextDay: boolean } {
  if (timeStr.includes('(+1)')) {
    return {
      time: timeStr.replace('(+1)', ''),
      isNextDay: true
    };
  }
  return {
    time: timeStr,
    isNextDay: false
  };
}

/**
 * 請假記錄CSV處理服務
 * 處理請假記錄的CRUD操作和查詢功能
 */

const LEAVE_RECORD_FILE = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../../test-data/請假記錄.csv')
  : path.join(__dirname, '../../data/請假記錄.csv');

const LEAVE_RECORD_HEADERS = [
  { id: 'id', title: '記錄ID' },
  { id: 'employeeId', title: '工號' },
  { id: 'name', title: '姓名' },
  { id: 'leaveType', title: '假別' },
  { id: 'leaveDate', title: '請假日期' },
  { id: 'startTime', title: '開始時間' },
  { id: 'endTime', title: '結束時間' },
  { id: 'leaveHours', title: '請假時數' },
  { id: 'reason', title: '事由' },
  { id: 'approvalStatus', title: '簽核狀態' },
  { id: 'applicationDateTime', title: '申請日期時間' },
  { id: 'approvalDate', title: '簽核日期' },
  { id: 'approver', title: '簽核者' }
];

const REQUIRED_FIELDS = ['記錄ID', '工號', '姓名', '假別', '請假日期', '開始時間', '結束時間', '請假時數', '簽核狀態', '申請日期時間'];

/**
 * 讀取所有請假記錄
 * @returns Promise<LeaveRecord[]>
 */
export async function getAllLeaveRecords(): Promise<LeaveRecord[]> {
  try {
    if (!checkCsvFileExists(LEAVE_RECORD_FILE)) {
      // 如果檔案不存在，建立空檔案
      await writeCsvFile(LEAVE_RECORD_FILE, [], LEAVE_RECORD_HEADERS);
      return [];
    }

    const rawData = await readCsvFile(LEAVE_RECORD_FILE);
    
    if (rawData.length === 0) {
      return [];
    }

    // 驗證資料格式
    const validation = validateCsvData(rawData, REQUIRED_FIELDS);
    if (!validation.isValid) {
      throw new Error(`請假記錄格式錯誤: ${validation.errors.join(', ')}`);
    }

    // 轉換為LeaveRecord格式
    return rawData.map(record => {
      // 解析開始時間和結束時間的日期標記
      const startTimeParsed = parseTimeWithDayMarker(record['開始時間']);
      const endTimeParsed = parseTimeWithDayMarker(record['結束時間']);
      
      // 計算實際的開始日期和結束日期
      const baseDate = new Date(record['請假日期']);
      
      let actualStartDate = record['請假日期'];
      if (startTimeParsed.isNextDay) {
        const nextDay = new Date(baseDate);
        nextDay.setDate(nextDay.getDate() + 1);
        actualStartDate = nextDay.toISOString().split('T')[0];
      }
      
      let actualEndDate = record['請假日期'];
      if (endTimeParsed.isNextDay) {
        if (startTimeParsed.isNextDay) {
          // 如果開始時間也是隔日，結束時間相對於開始時間的隔日
          const startNextDay = new Date(baseDate);
          startNextDay.setDate(startNextDay.getDate() + 1);
          const endNextDay = new Date(startNextDay);
          endNextDay.setDate(endNextDay.getDate() + 1);
          actualEndDate = endNextDay.toISOString().split('T')[0];
        } else {
          // 結束時間相對於基準日期的隔日
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + 1);
          actualEndDate = nextDay.toISOString().split('T')[0];
        }
      } else {
        // 結束時間不是隔日，使用與開始時間相同的日期
        actualEndDate = actualStartDate;
      }

      return {
        id: record['記錄ID'],
        employeeId: record['工號'],
        name: record['姓名'],
        leaveType: record['假別'] as LeaveType,
        leaveDate: actualStartDate,
        startTime: startTimeParsed.time,
        endDate: actualEndDate,
        endTime: endTimeParsed.time,
        isStartNextDay: startTimeParsed.isNextDay,
        leaveHours: parseFloat(record['請假時數']) || 0,
        reason: record['事由'] || undefined,
        approvalStatus: record['簽核狀態'] as ApprovalStatus,
        applicationDateTime: record['申請日期時間'],
        approvalDate: record['簽核日期'] || undefined,
        approver: record['簽核者'] || undefined
      };
    });
  } catch (error) {
    throw new Error(`讀取請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據ID查詢請假記錄
 * @param id 記錄ID
 * @returns Promise<LeaveRecord | null>
 */
export async function getLeaveRecordById(id: string): Promise<LeaveRecord | null> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('記錄ID不能為空');
    }

    const allRecords = await getAllLeaveRecords();
    const found = allRecords.find(record => record.id === id.trim());
    
    return found || null;
  } catch (error) {
    throw new Error(`查詢請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據條件查詢請假記錄
 * @param params 查詢參數
 * @returns Promise<LeaveRecord[]>
 */
export async function queryLeaveRecords(params: LeaveQueryParams): Promise<LeaveRecord[]> {
  try {
    let records = await getAllLeaveRecords();

    // 根據工號篩選
    if (params.employeeId) {
      records = records.filter(record => record.employeeId === params.employeeId);
    }

    // 根據簽核狀態篩選
    if (params.approvalStatus) {
      records = records.filter(record => record.approvalStatus === params.approvalStatus);
    }

    // 根據假別篩選
    if (params.leaveType) {
      records = records.filter(record => record.leaveType === params.leaveType);
    }

    // 根據日期範圍篩選
    if (params.selectedMonth || params.startMonth || params.endMonth) {
      records = records.filter(record => {
        const recordDate = new Date(record.leaveDate);
        const recordMonth = recordDate.toISOString().substring(0, 7); // YYYY-MM

        let inRange = true;

        // 如果有 selectedMonth，只篩選該月份
        if (params.selectedMonth) {
          inRange = recordMonth === params.selectedMonth;
        } else {
          // 向後兼容：使用 startMonth 和 endMonth
          if (params.startMonth) {
            inRange = inRange && recordMonth >= params.startMonth;
          }

          if (params.endMonth) {
            inRange = inRange && recordMonth <= params.endMonth;
          }
        }

        return inRange;
      });
    }

    return records;
  } catch (error) {
    throw new Error(`查詢請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 新增請假記錄
 * @param leaveRecord 請假記錄
 * @returns Promise<string> 返回新建記錄的ID
 */
export async function addLeaveRecord(leaveRecord: Omit<LeaveRecord, 'id'>): Promise<string> {
  try {
    // 驗證必填欄位
    if (!leaveRecord.employeeId || leaveRecord.employeeId.trim() === '') {
      throw new Error('工號不能為空');
    }
    
    if (!leaveRecord.name || leaveRecord.name.trim() === '') {
      throw new Error('姓名不能為空');
    }
    
    if (!leaveRecord.leaveType) {
      throw new Error('假別不能為空');
    }
    
    if (!leaveRecord.leaveDate) {
      throw new Error('請假日期不能為空');
    }
    
    if (!leaveRecord.startTime || !leaveRecord.endTime) {
      throw new Error('開始時間和結束時間不能為空');
    }
    

    
    if (!leaveRecord.leaveHours || leaveRecord.leaveHours <= 0) {
      throw new Error('請假時數必須大於0');
    }
    
    if (!leaveRecord.approvalStatus) {
      throw new Error('簽核狀態不能為空');
    }
    
    if (!leaveRecord.applicationDateTime) {
      throw new Error('申請日期時間不能為空');
    }

    // 生成新的記錄ID
    const allRecords = await getAllLeaveRecords();
    const maxId = allRecords.length > 0 
      ? Math.max(...allRecords.map(r => parseInt(r.id.replace('R', '')) || 0))
      : 0;
    const newId = `R${(maxId + 1).toString().padStart(3, '0')}`;

    // 建立新記錄
    const newRecord: LeaveRecord = {
      id: newId,
      ...leaveRecord
    };

    // 新增到現有記錄
    allRecords.push(newRecord);

    // 轉換記錄格式用於CSV寫入
    const csvRecords = allRecords.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      name: record.name,
      leaveType: record.leaveType,
      leaveDate: record.leaveDate,
      startTime: formatTimeWithDayMarker(record.startTime, record.isStartNextDay || false),
      endTime: formatTimeWithDayMarker(record.endTime, record.endDate !== record.leaveDate),
      leaveHours: record.leaveHours,
      reason: record.reason || '',
      approvalStatus: record.approvalStatus,
      applicationDateTime: record.applicationDateTime,
      approvalDate: record.approvalDate || '',
      approver: record.approver || ''
    }));

    // 寫入檔案
    await writeCsvFile(LEAVE_RECORD_FILE, csvRecords, LEAVE_RECORD_HEADERS);

    return newId;
  } catch (error) {
    throw new Error(`新增請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 更新請假記錄
 * @param id 記錄ID
 * @param updates 要更新的欄位
 * @returns Promise<void>
 */
export async function updateLeaveRecord(
  id: string, 
  updates: Partial<Omit<LeaveRecord, 'id'>>
): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('記錄ID不能為空');
    }

    // 讀取現有資料
    const allRecords = await getAllLeaveRecords();
    const index = allRecords.findIndex(record => record.id === id);
    
    if (index === -1) {
      throw new Error(`找不到ID ${id} 的請假記錄`);
    }

    // 更新資料
    const record = allRecords[index];
    
    if (updates.employeeId !== undefined) {
      if (!updates.employeeId || updates.employeeId.trim() === '') {
        throw new Error('工號不能為空');
      }
      record.employeeId = updates.employeeId.trim();
    }
    
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim() === '') {
        throw new Error('姓名不能為空');
      }
      record.name = updates.name.trim();
    }
    
    if (updates.leaveType !== undefined) {
      record.leaveType = updates.leaveType;
    }
    
    if (updates.leaveDate !== undefined) {
      record.leaveDate = updates.leaveDate;
    }
    
    if (updates.startTime !== undefined) {
      record.startTime = updates.startTime;
    }
    
    if (updates.endTime !== undefined) {
      record.endTime = updates.endTime;
    }
    
    if (updates.endDate !== undefined) {
      record.endDate = updates.endDate;
    }
    
    if (updates.isStartNextDay !== undefined) {
      record.isStartNextDay = updates.isStartNextDay;
    }
    
    if (updates.leaveHours !== undefined) {
      if (updates.leaveHours <= 0) {
        throw new Error('請假時數必須大於0');
      }
      record.leaveHours = updates.leaveHours;
    }
    
    if (updates.reason !== undefined) {
      record.reason = updates.reason;
    }
    
    if (updates.approvalStatus !== undefined) {
      record.approvalStatus = updates.approvalStatus;
    }
    
    if (updates.applicationDateTime !== undefined) {
      record.applicationDateTime = updates.applicationDateTime;
    }
    
    if (updates.approvalDate !== undefined) {
      record.approvalDate = updates.approvalDate;
    }
    
    if (updates.approver !== undefined) {
      record.approver = updates.approver;
    }

    // 轉換記錄格式用於CSV寫入
    const csvRecords = allRecords.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      name: record.name,
      leaveType: record.leaveType,
      leaveDate: record.leaveDate,
      startTime: formatTimeWithDayMarker(record.startTime, record.isStartNextDay || false),
      endTime: formatTimeWithDayMarker(record.endTime, record.endDate !== record.leaveDate),
      leaveHours: record.leaveHours,
      reason: record.reason || '',
      approvalStatus: record.approvalStatus,
      applicationDateTime: record.applicationDateTime,
      approvalDate: record.approvalDate || '',
      approver: record.approver || ''
    }));

    // 寫入檔案
    await writeCsvFile(LEAVE_RECORD_FILE, csvRecords, LEAVE_RECORD_HEADERS);
  } catch (error) {
    throw new Error(`更新請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 刪除請假記錄
 * @param id 記錄ID
 * @returns Promise<void>
 */
export async function deleteLeaveRecord(id: string): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('記錄ID不能為空');
    }

    // 讀取現有資料
    const allRecords = await getAllLeaveRecords();
    const filteredRecords = allRecords.filter(record => record.id !== id);
    
    if (filteredRecords.length === allRecords.length) {
      throw new Error(`找不到ID ${id} 的請假記錄`);
    }

    // 轉換記錄格式用於CSV寫入
    const csvRecords = filteredRecords.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      name: record.name,
      leaveType: record.leaveType,
      leaveDate: record.leaveDate,
      startTime: formatTimeWithDayMarker(record.startTime, record.isStartNextDay || false),
      endTime: formatTimeWithDayMarker(record.endTime, record.endDate !== record.leaveDate),
      leaveHours: record.leaveHours,
      reason: record.reason || '',
      approvalStatus: record.approvalStatus,
      applicationDateTime: record.applicationDateTime,
      approvalDate: record.approvalDate || '',
      approver: record.approver || ''
    }));

    // 寫入檔案
    await writeCsvFile(LEAVE_RECORD_FILE, csvRecords, LEAVE_RECORD_HEADERS);
  } catch (error) {
    throw new Error(`刪除請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 計算請假統計資料
 * @param records 請假記錄陣列
 * @returns LeaveStatistics
 */
export function calculateLeaveStatistics(records: LeaveRecord[]): LeaveStatistics {
  const statistics: LeaveStatistics = {};

  // 只計算已審核通過的記錄，排除已退回的記錄
  const approvedRecords = records.filter(record => record.approvalStatus !== '已退回');

  approvedRecords.forEach(record => {
    const leaveType = record.leaveType;
    if (!statistics[leaveType]) {
      statistics[leaveType] = 0;
    }
    statistics[leaveType] += record.leaveHours;
  });

  return statistics;
}

/**
 * 根據員工ID取得請假統計
 * @param employeeId 工號
 * @param startMonth 開始月份 (YYYY-MM)
 * @param endMonth 結束月份 (YYYY-MM)
 * @returns Promise<LeaveStatistics>
 */
export async function getLeaveStatisticsByEmployee(
  employeeId: string,
  startMonth?: string,
  endMonth?: string
): Promise<LeaveStatistics> {
  try {
    const records = await queryLeaveRecords({
      employeeId,
      startMonth,
      endMonth
    });

    return calculateLeaveStatistics(records);
  } catch (error) {
    throw new Error(`取得請假統計失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

// Note: calculateLeaveHours function is now imported from dateUtils.ts

/**
 * 批次匯入請假記錄
 * @param records 請假記錄陣列
 * @returns Promise<string[]> 返回新建記錄的ID陣列
 */
export async function batchImportLeaveRecords(records: Omit<LeaveRecord, 'id'>[]): Promise<string[]> {
  try {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('匯入資料不能為空');
    }

    const newIds: string[] = [];
    
    for (const record of records) {
      const newId = await addLeaveRecord(record);
      newIds.push(newId);
    }

    return newIds;
  } catch (error) {
    throw new Error(`批次匯入請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 驗證請假記錄檔案完整性
 * @returns Promise<{ isValid: boolean; errors: string[] }>
 */
export async function validateLeaveRecordFile(): Promise<{ isValid: boolean; errors: string[] }> {
  try {
    if (!checkCsvFileExists(LEAVE_RECORD_FILE)) {
      return {
        isValid: true, // 檔案不存在是正常的，會自動建立
        errors: []
      };
    }

    const rawData = await readCsvFile(LEAVE_RECORD_FILE);
    
    if (rawData.length === 0) {
      return {
        isValid: true,
        errors: []
      };
    }

    const validation = validateCsvData(rawData, REQUIRED_FIELDS);
    
    if (!validation.isValid) {
      return validation;
    }

    // 額外驗證邏輯
    const errors: string[] = [];
    const recordIds = new Set<string>();
    
    rawData.forEach((record, index) => {
      const recordId = record['記錄ID'];
      const leaveType = record['假別'];
      const approvalStatus = record['簽核狀態'];
      const leaveHours = record['請假時數'];
      
      // 檢查記錄ID重複
      if (recordIds.has(recordId)) {
        errors.push(`第 ${index + 1} 筆記錄ID重複: ${recordId}`);
      } else {
        recordIds.add(recordId);
      }
      
      // 檢查假別值
      if (!['事假', '公假', '喪假', '病假', '其他'].includes(leaveType)) {
        errors.push(`第 ${index + 1} 筆記錄假別值無效: ${leaveType}`);
      }
      
      // 檢查簽核狀態值
      if (!['簽核中', '已審核', '已退回'].includes(approvalStatus)) {
        errors.push(`第 ${index + 1} 筆記錄簽核狀態值無效: ${approvalStatus}`);
      }
      
      // 檢查請假時數
      const hours = parseFloat(leaveHours);
      if (isNaN(hours) || hours <= 0) {
        errors.push(`第 ${index + 1} 筆記錄請假時數無效: ${leaveHours}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`驗證請假記錄檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`]
    };
  }
}
/**
 * 取得已審核的請假記錄 (專為 LINE Bot 設計)
 * @returns Promise<any[]> 返回包含原始 CSV 欄位的記錄
 */
export async function getApprovedLeaveRecords(): Promise<any[]> {
  try {
    if (!checkCsvFileExists(LEAVE_RECORD_FILE)) {
      return [];
    }

    const rawData = await readCsvFile(LEAVE_RECORD_FILE);
    
    if (rawData.length === 0) {
      return [];
    }

    // 只返回已審核的記錄，保持原始 CSV 欄位名稱
    return rawData.filter(record => record['簽核狀態'] === '已審核');
  } catch (error) {
    throw new Error(`讀取已審核請假記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

export const leaveRecordService = {
  getAllLeaveRecords,
  getLeaveRecordById,
  queryLeaveRecords,
  addLeaveRecord,
  updateLeaveRecord,
  deleteLeaveRecord,
  calculateLeaveStatistics,
  getLeaveStatisticsByEmployee,
  batchImportLeaveRecords,
  validateLeaveRecordFile,
  getApprovedLeaveRecords
};