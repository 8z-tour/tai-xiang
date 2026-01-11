import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';
import { 
  queryLeaveRecords, 
  updateLeaveRecord,
  getAllLeaveRecords,
  getLeaveRecordById
} from '../services/leaveRecordService';
import { LeaveRecord, LeaveType, ApprovalStatus, LeaveQueryParams } from '../types';
import { writeCsvFile } from '../utils/csvUtils';
import { getTaiwanDateTime, calculateLeaveHours } from '../utils/dateUtils';

/**
 * 解析時間值以判斷是否為隔日
 * @param timeValue 時間值 (可能包含 (+1) 標記)
 * @returns { time: string, isNextDay: boolean }
 */
function parseTimeValue(timeValue: string): { time: string, isNextDay: boolean } {
  if (timeValue.includes('(+1)')) {
    return {
      time: timeValue.replace('(+1)', ''),
      isNextDay: true
    };
  }
  return {
    time: timeValue,
    isNextDay: false
  };
}

const router = express.Router();

/**
 * GET /api/admin/leave/records
 * 管理者查詢所有請假記錄
 */
router.get('/leave/records', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      selectedMonth,
      startMonth,
      endMonth,
      approvalStatus,
      leaveType
    } = req.query;

    // 建立查詢參數
    const queryParams: LeaveQueryParams = {};
    
    if (employeeId) {
      queryParams.employeeId = employeeId as string;
    }
    
    if (selectedMonth) {
      queryParams.selectedMonth = selectedMonth as string;
    }
    
    if (startMonth) {
      queryParams.startMonth = startMonth as string;
    }
    
    if (endMonth) {
      queryParams.endMonth = endMonth as string;
    }
    
    if (approvalStatus) {
      queryParams.approvalStatus = approvalStatus as ApprovalStatus;
    }
    
    if (leaveType) {
      queryParams.leaveType = leaveType as LeaveType;
    }

    // 查詢請假記錄
    const records = await queryLeaveRecords(queryParams);

    res.json({
      success: true,
      data: {
        records,
        total: records.length
      },
      message: '查詢成功'
    });

  } catch (error) {
    console.error('Admin leave records query error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '系統錯誤，請稍後再試'
    });
  }
});

/**
 * GET /api/admin/leave/records/:id
 * 管理者查詢單筆請假記錄
 */
router.get('/leave/records/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '記錄ID為必填欄位'
      });
    }

    const record = await getLeaveRecordById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'RECORD_NOT_FOUND',
        message: '找不到指定的請假記錄'
      });
    }

    res.json({
      success: true,
      data: record,
      message: '查詢成功'
    });

  } catch (error) {
    console.error('Admin leave record query error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '系統錯誤，請稍後再試'
    });
  }
});

/**
 * PUT /api/admin/leave/records/:id
 * 管理者更新請假記錄
 */
router.put('/leave/records/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const updates = req.body;

    console.log('=== 管理者更新請假記錄 ===');
    console.log('記錄ID:', id);
    console.log('更新資料:', JSON.stringify(updates, null, 2));

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '記錄ID為必填欄位'
      });
    }

    // 檢查記錄是否存在
    const existingRecord = await getLeaveRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'RECORD_NOT_FOUND',
        message: '找不到指定的請假記錄'
      });
    }

    console.log('現有記錄:', JSON.stringify(existingRecord, null, 2));

    // 準備更新資料
    const updateData: Partial<Omit<LeaveRecord, 'id'>> = {};

    // 處理基本欄位
    if (updates.employeeId !== undefined) updateData.employeeId = updates.employeeId;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.leaveType !== undefined) updateData.leaveType = updates.leaveType;
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.approvalStatus !== undefined) updateData.approvalStatus = updates.approvalStatus;

    // 處理時間欄位 - 解析 (+1) 標記
    if (updates.startTime !== undefined) {
      const startTimeParsed = parseTimeValue(updates.startTime);
      updateData.startTime = startTimeParsed.time;
      updateData.isStartNextDay = startTimeParsed.isNextDay;
    }

    if (updates.endTime !== undefined) {
      const endTimeParsed = parseTimeValue(updates.endTime);
      updateData.endTime = endTimeParsed.time;
      
      // 計算結束日期
      if (updates.startDate || existingRecord.leaveDate) {
        const baseDate = updates.startDate || existingRecord.leaveDate;
        const startTimeParsed = updates.startTime ? 
          parseTimeValue(updates.startTime) : 
          { time: existingRecord.startTime, isNextDay: existingRecord.isStartNextDay || false };
        
        let endDate = baseDate;
        
        if (endTimeParsed.isNextDay) {
          if (startTimeParsed.isNextDay) {
            // 如果開始時間也是隔日，結束時間相對於開始時間的隔日
            const startNextDay = new Date(baseDate);
            startNextDay.setDate(startNextDay.getDate() + 1);
            const endNextDay = new Date(startNextDay);
            endNextDay.setDate(endNextDay.getDate() + 1);
            endDate = endNextDay.toISOString().split('T')[0];
          } else {
            // 結束時間相對於基準日期的隔日
            const nextDay = new Date(baseDate);
            nextDay.setDate(nextDay.getDate() + 1);
            endDate = nextDay.toISOString().split('T')[0];
          }
        } else {
          // 結束時間不是隔日，使用與開始時間相同的日期邏輯
          if (startTimeParsed.isNextDay) {
            const nextDay = new Date(baseDate);
            nextDay.setDate(nextDay.getDate() + 1);
            endDate = nextDay.toISOString().split('T')[0];
          } else {
            endDate = baseDate;
          }
        }
        
        updateData.endDate = endDate;
      }
    }

    // 處理日期欄位 - 前端發送startDate，後端存儲為leaveDate
    if (updates.startDate !== undefined) {
      updateData.leaveDate = updates.startDate;
      
      // 如果開始日期改變，需要重新計算結束日期
      const startTimeParsed = updates.startTime ? 
        parseTimeValue(updates.startTime) : 
        { time: existingRecord.startTime, isNextDay: existingRecord.isStartNextDay || false };
      const endTimeParsed = updates.endTime ? 
        parseTimeValue(updates.endTime) : 
        { time: existingRecord.endTime, isNextDay: existingRecord.endDate !== existingRecord.leaveDate };
      
      let actualStartDate = updates.startDate;
      let endDate = updates.startDate;
      
      // 如果開始時間是隔日，開始日期為基準日期的隔日
      if (startTimeParsed.isNextDay) {
        const nextDay = new Date(updates.startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        actualStartDate = nextDay.toISOString().split('T')[0];
      }
      
      // 計算結束日期
      if (endTimeParsed.isNextDay) {
        if (startTimeParsed.isNextDay) {
          const startNextDay = new Date(updates.startDate);
          startNextDay.setDate(startNextDay.getDate() + 1);
          const endNextDay = new Date(startNextDay);
          endNextDay.setDate(endNextDay.getDate() + 1);
          endDate = endNextDay.toISOString().split('T')[0];
        } else {
          const nextDay = new Date(updates.startDate);
          nextDay.setDate(nextDay.getDate() + 1);
          endDate = nextDay.toISOString().split('T')[0];
        }
      } else {
        endDate = actualStartDate;
      }
      
      updateData.leaveDate = actualStartDate;
      updateData.endDate = endDate;
    }

    // 管理者可以任意輸入請假時數，不需要自動計算
    if (updates.leaveHours !== undefined) {
      updateData.leaveHours = updates.leaveHours;
    }

    // 任何編輯操作都會更新申請時間、簽核日期和簽核者
    updateData.applicationDateTime = getTaiwanDateTime();
    updateData.approvalDate = getTaiwanDateTime();
    updateData.approver = user.name;

    console.log('準備更新的資料:', JSON.stringify(updateData, null, 2));

    // 執行更新
    await updateLeaveRecord(id, updateData);

    // 回傳更新後的記錄
    const updatedRecord = await getLeaveRecordById(id);
    
    console.log('更新後的記錄:', JSON.stringify(updatedRecord, null, 2));

    res.json({
      success: true,
      data: updatedRecord,
      message: '更新成功'
    });

  } catch (error) {
    console.error('Admin leave record update error:', error);
    
    if (error instanceof Error && error.message.includes('找不到')) {
      return res.status(404).json({
        success: false,
        error: 'RECORD_NOT_FOUND',
        message: error.message
      });
    }

    if (error instanceof Error && (
      error.message.includes('不能為空') ||
      error.message.includes('必須大於0') ||
      error.message.includes('格式錯誤')
    )) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '系統錯誤，請稍後再試'
    });
  }
});

/**
 * POST /api/admin/leave/export
 * 管理者匯出請假記錄CSV
 */
router.post('/leave/export', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      selectedMonth,
      startMonth,
      endMonth,
      approvalStatus,
      leaveType
    } = req.body;

    // 建立查詢參數
    const queryParams: LeaveQueryParams = {};
    
    if (employeeId) {
      queryParams.employeeId = employeeId;
    }
    
    if (selectedMonth) {
      queryParams.selectedMonth = selectedMonth;
    }
    
    if (startMonth) {
      queryParams.startMonth = startMonth;
    }
    
    if (endMonth) {
      queryParams.endMonth = endMonth;
    }
    
    if (approvalStatus) {
      queryParams.approvalStatus = approvalStatus;
    }
    
    if (leaveType) {
      queryParams.leaveType = leaveType;
    }

    // 查詢要匯出的記錄
    const records = await queryLeaveRecords(queryParams);

    // 生成檔案名稱：員工請假紀錄 + 日期 + 時間
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const filename = `員工請假紀錄_${year}${month}${day}_${hours}${minutes}${seconds}.csv`;

    // 準備CSV標題
    const headers = [
      { id: 'id', title: '記錄ID' },
      { id: 'employeeId', title: '工號' },
      { id: 'name', title: '姓名' },
      { id: 'leaveType', title: '假別' },
      { id: 'startDate', title: '開始日期' },
      { id: 'startTime', title: '開始時間' },
      { id: 'endDate', title: '結束日期' },
      { id: 'endTime', title: '結束時間' },
      { id: 'leaveHours', title: '請假時數' },
      { id: 'reason', title: '事由' },
      { id: 'approvalStatus', title: '簽核狀態' },
      { id: 'applicationDateTime', title: '申請日期時間' },
      { id: 'approvalDate', title: '簽核日期' },
      { id: 'approver', title: '簽核者' }
    ];

    // 格式化記錄以包含 (+1) 標記
    const formattedRecords = records.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      name: record.name,
      leaveType: record.leaveType,
      startDate: record.leaveDate,
      startTime: record.isStartNextDay ? `${record.startTime}(+1)` : record.startTime,
      endDate: record.endDate,
      endTime: record.endDate !== record.leaveDate ? `${record.endTime}(+1)` : record.endTime,
      leaveHours: record.leaveHours,
      reason: record.reason || '',
      approvalStatus: record.approvalStatus,
      applicationDateTime: record.applicationDateTime,
      approvalDate: record.approvalDate || '',
      approver: record.approver || ''
    }));

    // 建立臨時檔案路徑
    const tempDir = path.join(process.cwd(), 'server/temp');
    const tempFilePath = path.join(tempDir, filename);

    // 確保臨時目錄存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 寫入CSV檔案
    await writeCsvFile(tempFilePath, formattedRecords, headers);

    // 設定回應標頭
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 讀取檔案並回傳
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);

    // 檔案傳送完成後刪除臨時檔案
    fileStream.on('end', () => {
      fs.unlink(tempFilePath, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          console.error('刪除臨時檔案失敗:', err);
        }
      });
    });

  } catch (error) {
    console.error('Admin leave export error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '匯出失敗，請稍後再試'
    });
  }
});

export default router;