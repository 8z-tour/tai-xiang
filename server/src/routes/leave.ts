
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  addLeaveRecord, 
  queryLeaveRecords, 
  getLeaveStatisticsByEmployee
} from '../services/leaveRecordService';
import { getPersonalDataByEmployeeId } from '../services/personalDataService';
import { LeaveRecord, LeaveType, ApprovalStatus } from '../types';
import { getTaiwanDateTime, calculateLeaveHours } from '../utils/dateUtils';

const router = express.Router();

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

/**
 * POST /api/leave/apply
 * 提交請假申請
 */
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const {
      leaveType,
      leaveDate,
      startTime,
      endTime,
      reason
    } = req.body;

    // 驗證必填欄位
    if (!leaveType || !leaveDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '假別、請假日期、開始時間、結束時間為必填欄位'
      });
    }

    // 驗證假別
    const validLeaveTypes: LeaveType[] = ['事假', '公假', '喪假', '病假', '特休', '生理假'];
    if (!validLeaveTypes.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '無效的假別'
      });
    }

    // 解析開始時間和結束時間的隔日標記
    const startTimeParsed = parseTimeValue(startTime);
    const endTimeParsed = parseTimeValue(endTime);

    // 驗證時間格式
    const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeFormat.test(startTimeParsed.time) || !timeFormat.test(endTimeParsed.time)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '時間格式不正確，請使用HH:MM格式'
      });
    }

    // 計算請假時數
    let leaveHours: number;
    try {
      leaveHours = calculateLeaveHours(
        leaveDate, 
        startTimeParsed.time, 
        endTimeParsed.time, 
        endTimeParsed.isNextDay, 
        startTimeParsed.isNextDay
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : '日期時間計算錯誤'
      });
    }

    // 計算實際的開始日期和結束日期
    let actualStartDate = leaveDate; // 預設為基準日期
    let endDate = leaveDate; // 預設為基準日期
    
    // 如果開始時間是隔日，開始日期為基準日期的隔日
    if (startTimeParsed.isNextDay) {
      const nextDay = new Date(leaveDate);
      nextDay.setDate(nextDay.getDate() + 1);
      actualStartDate = nextDay.toISOString().split('T')[0];
    }
    
    // 如果結束時間是隔日，結束日期需要相對於實際開始日期計算
    if (endTimeParsed.isNextDay) {
      if (startTimeParsed.isNextDay) {
        // 如果開始時間也是隔日，結束時間相對於開始時間的隔日
        const startNextDay = new Date(leaveDate);
        startNextDay.setDate(startNextDay.getDate() + 1);
        const endNextDay = new Date(startNextDay);
        endNextDay.setDate(endNextDay.getDate() + 1);
        endDate = endNextDay.toISOString().split('T')[0];
      } else {
        // 結束時間相對於基準日期的隔日
        const nextDay = new Date(leaveDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endDate = nextDay.toISOString().split('T')[0];
      }
    } else {
      // 結束時間不是隔日，使用與開始時間相同的日期
      endDate = actualStartDate;
    }

    // 建立請假記錄
    const leaveRecord: Omit<LeaveRecord, 'id'> = {
      employeeId: user.employeeId,
      name: user.name,
      leaveType,
      leaveDate: actualStartDate, // 使用實際的開始日期
      startTime: startTimeParsed.time,
      endDate,
      endTime: endTimeParsed.time,
      isStartNextDay: startTimeParsed.isNextDay,
      leaveHours,
      reason: reason || undefined,
      approvalStatus: '簽核中' as ApprovalStatus,
      applicationDateTime: getTaiwanDateTime() // 台灣時間 YYYY-MM-DD HH:mm:ss
    };

    const recordId = await addLeaveRecord(leaveRecord);

    res.json({
      success: true,
      data: {
        recordId,
        leaveHours
      },
      message: '請假申請提交成功'
    });

  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '系統錯誤，請稍後再試'
    });
  }
});

/**
 * GET /api/leave/records
 * 查詢個人請假記錄
 */
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const {
      selectedMonth,
      startMonth,
      endMonth,
      approvalStatus,
      leaveType
    } = req.query;

    // 查詢該員工的請假記錄
    const records = await queryLeaveRecords({
      employeeId: user.employeeId,
      selectedMonth: selectedMonth as string,
      startMonth: startMonth as string,
      endMonth: endMonth as string,
      approvalStatus: approvalStatus as ApprovalStatus,
      leaveType: leaveType as LeaveType
    });

    // 計算統計資料 - 固定為當年度資料
    const currentYear = new Date().getFullYear();
    const yearStartMonth = `${currentYear}-01`;
    const yearEndMonth = `${currentYear}-12`;
    
    const statistics = await getLeaveStatisticsByEmployee(
      user.employeeId,
      yearStartMonth,
      yearEndMonth
    );

    // 獲取年度假期額度
    const personalData = await getPersonalDataByEmployeeId(user.employeeId);
    const annualQuotas = personalData ? {
      annualLeave: personalData.annualLeave,
      sickLeave: personalData.sickLeave,
      menstrualLeave: personalData.menstrualLeave,
      personalLeave: personalData.personalLeave
    } : {
      annualLeave: 0,
      sickLeave: 0,
      menstrualLeave: 0,
      personalLeave: 0
    };

    res.json({
      success: true,
      data: {
        records,
        statistics,
        annualQuotas,
        total: records.length
      },
      message: '查詢成功'
    });

  } catch (error) {
    console.error('Leave records query error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '系統錯誤，請稍後再試'
    });
  }
});

/**
 * POST /api/leave/calculate-hours
 * 計算請假時數（用於前端即時計算）
 */
router.post('/calculate-hours', authenticateToken, async (req, res) => {
  try {
    const {
      leaveDate,
      startTime,
      endTime
    } = req.body;

    // 驗證必填欄位
    if (!leaveDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '請假日期、開始時間、結束時間為必填欄位'
      });
    }

    // 解析開始時間和結束時間的隔日標記
    const startTimeParsed = parseTimeValue(startTime);
    const endTimeParsed = parseTimeValue(endTime);

    // 驗證時間格式
    const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeFormat.test(startTimeParsed.time) || !timeFormat.test(endTimeParsed.time)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '時間格式不正確，請使用HH:MM格式'
      });
    }

    const leaveHours = calculateLeaveHours(
      leaveDate, 
      startTimeParsed.time, 
      endTimeParsed.time, 
      endTimeParsed.isNextDay, 
      startTimeParsed.isNextDay
    );

    res.json({
      success: true,
      data: {
        leaveHours
      },
      message: '計算成功'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : '計算錯誤'
    });
  }
});

export default router;

