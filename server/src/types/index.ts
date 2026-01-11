// 基本資料型別定義

export interface PersonalData {
  employeeId: string;    // 工號
  password: string;      // 密碼
  name: string;          // 姓名
  permission: 'employee' | 'admin'; // 權限
  annualLeave: number;   // 年度特休
  sickLeave: number;     // 年度病假
  menstrualLeave: number; // 年度生理假
  personalLeave: number; // 年度事假
}

export interface LeaveRecord {
  id: string;                    // 記錄ID
  employeeId: string;            // 工號
  name: string;                  // 姓名
  leaveType: LeaveType;          // 假別
  leaveDate: string;             // 請假日期 (YYYY-MM-DD) - 開始日期
  startTime: string;             // 開始時間 (HH:mm)
  endDate: string;               // 結束日期 (YYYY-MM-DD)
  endTime: string;               // 結束時間 (HH:mm)
  isStartNextDay?: boolean;      // 開始時間是否為隔日
  leaveHours: number;            // 請假時數
  reason?: string;               // 事由
  approvalStatus: ApprovalStatus; // 簽核狀態
  applicationDateTime: string;    // 申請日期時間
  approvalDate?: string;         // 簽核日期
  approver?: string;             // 簽核者
}

export type LeaveType = '事假' | '公假' | '喪假' | '病假' | '特休' | '生理假';
export type ApprovalStatus = '簽核中' | '已審核' | '已退回';

// API 回應格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    employeeId: string;
    name: string;
    permission: string;
  };
}

export interface LeaveStatistics {
  [leaveType: string]: number; // 各假別的總時數
}

// 請求參數型別
export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface LeaveApplicationRequest {
  leaveType: LeaveType;
  leaveDate: string;
  startTime: string;
  endTime: string;
  isStartNextDay?: boolean;
  isNextDay?: boolean;
  reason?: string;
}

export interface LeaveQueryParams {
  employeeId?: string;
  selectedMonth?: string;  // YYYY-MM
  startMonth?: string;  // YYYY-MM (保留向後兼容)
  endMonth?: string;    // YYYY-MM (保留向後兼容)
  approvalStatus?: ApprovalStatus;
  leaveType?: LeaveType;
}

// JWT Payload
export interface JwtPayload {
  employeeId: string;
  name: string;
  permission: string;
  iat?: number;
  exp?: number;
}

// 錯誤碼定義
export enum ErrorCode {
  // 驗證相關
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  INSUFFICIENT_PERMISSION = 'AUTH_003',
  
  // 資料相關
  VALIDATION_ERROR = 'DATA_001',
  RECORD_NOT_FOUND = 'DATA_002',
  DUPLICATE_RECORD = 'DATA_003',
  
  // 檔案相關
  FILE_NOT_FOUND = 'FILE_001',
  FILE_READ_ERROR = 'FILE_002',
  FILE_WRITE_ERROR = 'FILE_003',
  
  // 系統相關
  INTERNAL_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002'
}

// Express Request 擴展
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}