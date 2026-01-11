// 前端型別定義 (與後端共用的基本型別)

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

// 表單資料型別
export interface LoginFormData {
  employeeId: string;
  password: string;
}

export interface LeaveApplicationFormData {
  leaveType: LeaveType;
  leaveDate: string;
  startTime: string;
  endTime: string;
  isStartNextDay?: boolean;
  reason?: string;
}

export interface LeaveApplicationFormErrors {
  leaveType?: string;
  leaveDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface LeaveQueryFormData {
  selectedMonth?: string;  // YYYY-MM
  approvalStatus?: ApprovalStatus | '';
  leaveType?: LeaveType | '';
}

export interface AdminLeaveQueryFormData {
  employeeId?: string;
  selectedMonth?: string;  // YYYY-MM
  approvalStatus?: ApprovalStatus | '';
  leaveType?: LeaveType | '';
}

// 使用者狀態
export interface User {
  employeeId: string;
  name: string;
  permission: 'employee' | 'admin';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 語言設定
export type Language = 'zh-TW' | 'en-US' | 'id-ID';

export interface ActivityEvent {
  type: 'mouse' | 'keyboard' | 'click' | 'touch' | 'scroll' | 'focus';
  timestamp: number;
}

export interface ActivityStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastEventType: string | null;
  monitoringStartTime: number;
  lastActivityTime: number;
}

export interface TimerState {
  isActive: boolean;
  startTime: number;
  lastResetTime: number;
}

// 元件 Props 型別
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export interface InputProps {
  label: string;
  name: string;
  type?: 'text' | 'password' | 'email' | 'date' | 'time' | 'number';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export interface SelectProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (record: T) => void;
  className?: string;
}