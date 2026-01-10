# 設計文件

## 概述

員工請假系統是一個全端網頁應用程式，採用React前端和Node.js後端架構。系統提供多語言支援的響應式介面，使用CSV檔案作為資料存儲，實現員工請假申請和管理者審核功能。

## 架構

### 系統架構
```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   React Frontend │ ◄─────────────────► │  Node.js Backend │
│                 │                     │                 │
│ - 登入頁面       │                     │ - 驗證服務       │
│ - 請假申請       │                     │ - 請假服務       │
│ - 請假紀錄       │                     │ - CSV處理        │
│ - 請假管理       │                     │ - 權限控制       │
│ - 多語言支援     │                     │                 │
└─────────────────┘                     └─────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────┐
                                        │   CSV 檔案系統   │
                                        │                 │
                                        │ - 個人資料.csv   │
                                        │ - 請假記錄.csv   │
                                        └─────────────────┘
```

### 前端架構
- **React 18** 與 TypeScript
- **React Router** 用於路由管理
- **React Hook Form** 用於表單處理
- **React Query** 用於API狀態管理
- **i18next** 用於多語言支援
- **Tailwind CSS** 用於響應式設計
- **自動登出系統** 用於會話安全管理

### 後端架構
- **Node.js** 與 Express.js
- **CSV Parser/Writer** 用於檔案處理
- **JWT** 用於會話管理
- **CORS** 用於跨域請求
- **Multer** 用於檔案上傳處理

## 組件和介面

### 前端組件結構
```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx          # 頁面標題和語言切換
│   │   ├── Layout.tsx          # 共用版面配置
│   │   ├── ProtectedRoute.tsx  # 權限路由保護
│   │   └── TimeSelector.tsx    # 時間選擇器組件
│   ├── auth/
│   │   └── LoginForm.tsx       # 登入表單
│   ├── leave/
│   │   ├── LeaveApplication.tsx # 請假申請表單
│   │   ├── LeaveRecord.tsx     # 請假紀錄查詢
│   │   └── LeaveManagement.tsx # 請假管理
│   └── ui/
│       ├── Button.tsx          # 按鈕組件
│       ├── Input.tsx           # 輸入欄位
│       ├── Select.tsx          # 下拉選單
│       └── Table.tsx           # 資料表格
├── pages/
│   ├── LoginPage.tsx
│   ├── LeaveApplicationPage.tsx
│   ├── LeaveRecordPage.tsx
│   └── admin/
│       └── LeaveManagementPage.tsx
├── hooks/
│   ├── useAuth.ts              # 驗證狀態管理
│   ├── useLeave.ts             # 請假資料管理
│   ├── useLanguage.ts          # 語言切換
│   └── useAutoLogout.ts        # 自動登出功能
├── services/
│   └── api.ts                  # API 呼叫服務
├── types/
│   └── index.ts                # TypeScript 型別定義
└── i18n/
    ├── zh-TW.json              # 繁體中文
    └── en-US.json              # 英文
```

### 後端API結構
```
server/
├── routes/
│   ├── auth.js                 # 登入驗證路由
│   ├── leave.js                # 請假相關路由
│   └── admin.js                # 管理功能路由
├── middleware/
│   ├── auth.js                 # JWT驗證中介軟體
│   └── permission.js           # 權限檢查中介軟體
├── services/
│   ├── csvService.js           # CSV檔案處理服務
│   ├── authService.js          # 驗證服務
│   └── leaveService.js         # 請假業務邏輯
├── utils/
│   ├── dateUtils.js            # 日期處理工具
│   └── validation.js           # 資料驗證工具
└── data/
    ├── 請假系統個人資料.csv
    └── 請假記錄.csv
```

### 用戶管理篩選功能

#### 工號篩選下拉選單設計

**組件位置**: `src/components/admin/UserManagement.tsx`

**功能描述**: 在用戶列表上方提供工號篩選下拉選單，允許管理者快速篩選特定員工的資料。

**介面設計**:
```typescript
interface EmployeeFilterProps {
  users: PersonalData[];
  selectedEmployeeId: string;
  onFilterChange: (employeeId: string) => void;
}

interface FilterState {
  selectedEmployeeId: string;  // 選中的工號，"all" 表示全部
  filteredUsers: PersonalData[]; // 篩選後的用戶列表
}
```

**UI佈局**:
```
┌─────────────────────────────────────────────────────────────┐
│ 用戶列表                                                     │
├─────────────────────────────────────────────────────────────┤
│ 工號篩選: [下拉選單 ▼] [匯出CSV] [新增用戶]                   │
│           ├─ 全部                                            │
│           ├─ A001                                           │
│           ├─ A002                                           │
│           └─ ...                                            │
├─────────────────────────────────────────────────────────────┤
│ [篩選後的用戶表格/卡片列表]                                   │
└─────────────────────────────────────────────────────────────┘
```

**篩選邏輯**:
1. **初始狀態**: 顯示所有用戶，篩選選項預設為"全部"
2. **選項生成**: 動態從當前用戶列表生成工號選項
3. **篩選執行**: 選擇特定工號時，僅顯示該工號的用戶資料
4. **狀態同步**: 新增/刪除用戶後自動更新篩選選項列表

**響應式設計**:
- **桌面版**: 篩選下拉選單與操作按鈕水平排列
- **手機版**: 篩選下拉選單與操作按鈕垂直堆疊，保持觸控友善

**實作細節**:
```typescript
// 篩選狀態管理
const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
const [filteredUsers, setFilteredUsers] = useState<PersonalData[]>(users);

// 篩選邏輯
const handleFilterChange = (employeeId: string) => {
  setSelectedEmployeeId(employeeId);
  if (employeeId === 'all') {
    setFilteredUsers(users);
  } else {
    setFilteredUsers(users.filter(user => user.employeeId === employeeId));
  }
};

// 選項生成
const filterOptions = [
  { value: 'all', label: '全部' },
  ...users.map(user => ({
    value: user.employeeId,
    label: user.employeeId
  }))
];
```

### 請假紀錄表格欄位順序修正

**組件位置**: `src/components/leave/LeaveRecord.tsx`

**功能描述**: 修正請假紀錄頁面中表格的欄位顯示順序，以提供更直觀的資訊瀏覽體驗。

**欄位順序調整**:
```
原始順序: 假別 → 開始時間 → 結束時間 → 請假時數 → 簽核狀況 → 申請時間 → 事由
修正順序: 簽核狀況 → 開始時間 → 結束時間 → 請假時數 → 假別 → 事由 → 申請時間
```

**修正邏輯**:
1. **優先顯示狀態**: 將簽核狀況移至第一欄，讓用戶快速了解請假申請的處理狀態
2. **時間資訊集中**: 開始時間和結束時間保持相鄰，便於查看請假時間範圍
3. **相關資訊分組**: 請假時數緊跟時間資訊，假別和事由作為申請詳情分組
4. **申請時間後置**: 申請時間移至最後，作為記錄的時間戳記資訊

**實作變更**:
```typescript
// 表格標題順序調整
<thead className="bg-gray-50">
  <tr>
    <th>{t('leave.records.approvalStatus')}</th>      {/* 簽核狀況 */}
    <th>{t('leave.application.startTime')}</th>       {/* 開始時間 */}
    <th>{t('leave.application.endTime')}</th>         {/* 結束時間 */}
    <th>{t('leave.application.leaveHours')}</th>      {/* 請假時數 */}
    <th>{t('leave.application.leaveType')}</th>       {/* 假別 */}
    <th>{t('leave.application.reason')}</th>          {/* 事由 */}
    <th>{t('leave.records.applicationTime')}</th>     {/* 申請時間 */}
  </tr>
</thead>

// 表格資料順序調整
<tbody>
  {records.map((record) => (
    <tr key={record.id}>
      <td>{/* 簽核狀況 */}</td>
      <td>{/* 開始時間 */}</td>
      <td>{/* 結束時間 */}</td>
      <td>{/* 請假時數 */}</td>
      <td>{/* 假別 */}</td>
      <td>{/* 事由 */}</td>
      <td>{/* 申請時間 */}</td>
    </tr>
  ))}
</tbody>
```

## 資料模型

### 個人資料 (PersonalData)
```typescript
interface PersonalData {
  employeeId: string;    // 工號
  password: string;      // 密碼
  name: string;          // 姓名
  permission: 'employee' | 'admin'; // 權限
}
```

### 請假記錄 (LeaveRecord)
```typescript
interface LeaveRecord {
  id: string;                    // 記錄ID
  employeeId: string;            // 工號
  name: string;                  // 姓名
  leaveType: LeaveType;          // 假別
  startDate: string;             // 開始日期 (YYYY-MM-DD)
  startTime: string;             // 開始時間 (HH:mm)
  endDate: string;               // 結束日期 (YYYY-MM-DD)
  endTime: string;               // 結束時間 (HH:mm)
  leaveHours: number;            // 請假時數（已扣除休息時間）
  reason?: string;               // 事由
  approvalStatus: ApprovalStatus; // 簽核狀態
  applicationDateTime: string;    // 申請日期時間
  approvalDate?: string;         // 簽核日期
  approver?: string;             // 簽核者
}

type LeaveType = '事假' | '公假' | '喪假' | '病假' | '其他';
type ApprovalStatus = '簽核中' | '已審核' | '已退回';

// 休息時間配置
interface RestPeriod {
  start: string;  // 開始時間 (HH:mm)
  end: string;    // 結束時間 (HH:mm)
}

const REST_PERIODS: RestPeriod[] = [
  { start: '12:00', end: '12:30' },  // 午休時間
  { start: '16:30', end: '17:00' }   // 下午休息時間
];

const MAX_REST_DEDUCTION_HOURS = 0.5; // 最大休息時間扣除（小時）
```

### API 回應格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface LoginResponse {
  token: string;
  user: {
    employeeId: string;
    name: string;
    permission: string;
  };
}

interface LeaveStatistics {
  [leaveType: string]: number; // 各假別的總時數
}

// 自動登出相關介面
interface AutoLogoutConfig {
  enabled: boolean;
  timeoutMinutes: number;
  environment: 'development' | 'production';
}

interface UseAutoLogout {
  showTimeoutMessage: boolean;
  remainingTime: number;
  relogin: () => void;
  isEnabled: boolean;
}

interface ActivityRecord {
  lastActivityTime: number;
  activityCount: number;
  sessionStartTime: number;
}

interface TimerState {
  isActive: boolean;
  startTime: number;
  lastResetTime: number;
}

// 時間選擇器相關介面
interface TimeSelectorProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  'aria-label'?: string;
}

interface TimeOption {
  value: string;  // 時間值 (HH:MM 或 HH:MM(+1))
  label: string;  // 顯示標籤
}

interface TimeValidationRules {
  format: RegExp;
  allowedValues: string[];
  required: boolean;
}

interface LeaveHoursCalculation {
  startTime: string;
  endTime: string;
  totalMinutes: number;
  restMinutesDeducted: number;
  leaveHours: number;
}
```

## 錯誤處理

### 前端錯誤處理
- **網路錯誤**: 顯示連線失敗訊息，提供重試選項
- **驗證錯誤**: 即時表單驗證，顯示具體錯誤訊息
- **權限錯誤**: 自動重導向到登入頁面
- **資料錯誤**: 顯示友善的錯誤訊息，記錄詳細錯誤到控制台

### 後端錯誤處理
- **CSV檔案錯誤**: 檔案不存在、格式錯誤、讀寫權限問題
- **資料驗證錯誤**: 必填欄位缺失、格式不正確、邏輯錯誤
- **權限錯誤**: 未授權存取、權限不足
- **系統錯誤**: 伺服器內部錯誤，記錄到日誌檔案

### 錯誤碼定義
```typescript
enum ErrorCode {
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
```

## 測試策略

### 單元測試
- **前端組件測試**: 使用 Jest 和 React Testing Library
- **後端服務測試**: 使用 Jest 和 Supertest
- **工具函數測試**: 日期計算、資料驗證、CSV處理

### 整合測試
- **API端點測試**: 測試完整的請求-回應流程
- **資料庫操作測試**: CSV檔案讀寫操作
- **權限控制測試**: 不同角色的存取權限

### 端對端測試
- **使用者流程測試**: 使用 Cypress 測試完整的使用者操作流程
- **跨瀏覽器測試**: 確保在不同瀏覽器上的相容性
- **響應式測試**: 測試在不同螢幕尺寸下的顯示效果

## 正確性屬性

*屬性是一個特徵或行為，應該在系統的所有有效執行中保持為真 - 本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規格和機器可驗證正確性保證之間的橋樑。*

**屬性 1: 未驗證使用者重導向**
*對於任何* 受保護的路由和未驗證的使用者，系統應該重導向到登入頁面
**驗證: 需求 1.1**

**屬性 2: 登入憑證驗證**
*對於任何* 登入嘗試，系統應該根據個人資料CSV中的記錄正確驗證工號和密碼組合
**驗證: 需求 1.2**

**屬性 3: 成功登入會話建立**
*對於任何* 有效的登入憑證，系統應該建立使用者會話並重導向到適當的頁面
**驗證: 需求 1.3**

**屬性 4: 登入失敗處理**
*對於任何* 無效的登入憑證，系統應該顯示錯誤訊息並保持在登入頁面
**驗證: 需求 1.4**

**屬性 5: 請假申請表單初始化**
*對於任何* 已驗證的員工存取請假申請頁面，系統應該自動填入工號和姓名並設為不可編輯
**驗證: 需求 2.1**

**屬性 6: 請假申請完整流程**
*對於任何* 有效的請假申請，系統應該驗證必填欄位、設定申請時間和簽核狀態、儲存到CSV並顯示完成訊息
**驗證: 需求 2.2, 2.3, 2.4**

**屬性 7: 請假時數計算**
*對於任何* 有效的開始和結束日期時間，系統應該正確計算請假時數並扣除休息時間
**驗證: 需求 2.5**

**屬性 17: 休息時間識別**
*對於任何* 請假時間範圍，系統應該正確識別並扣除每日12:00-12:30和16:30-17:00的休息時間
**驗證: 需求 2.6**

**屬性 18: 休息時間扣除上限**
*對於任何* 請假申請，系統應該限制休息時間扣除的累計上限為0.5小時
**驗證: 需求 2.7**

**屬性 8: 資料���選邏輯**
*對於任何* 篩選條件組合（年月範圍、簽核狀態、假別、工號），系統應該返回符合所有條件的記錄
**驗證: 需求 3.2, 3.5, 4.3**

**屬性 9: 員工資料隔離**
*對於任何* 員工查詢請假紀錄，系統應該僅顯示該員工自己的記錄
**驗證: 需求 3.3**

**屬性 10: 請假統計計算**
*對於任何* 請假記錄集合，系統應該正確依假別分類並加總請假時數
**驗證: 需求 3.4**

**屬性 11: 權限控制**
*對於任何* 管理功能存取嘗試，系統應該驗證使用者權限，拒絕非管理者並重導向到登入頁面
**驗證: 需求 4.1, 4.2**

**屬性 12: 記錄更新時間戳記**
*對於任何* 管理者更新的請假記錄，系統應該設定簽核日期為當前時間和簽核者為當前登入姓名
**驗證: 需求 4.5**

**屬性 13: CSV匯出內容一致性**
*對於任何* 匯出請求，系統應該匯出當前顯示的篩選資料並使用正確的檔案命名格式
**驗證: 需求 5.1, 5.2**

**屬性 14: 多語言文字更新**
*對於任何* 語言切換操作，系統應該更新所有介面文字為選定語言
**驗證: 需求 6.2**

**屬性 15: 資料格式語言無關性**
*對於任何* 資料儲存操作，系統應該保持資料格式一致不受語言設定影響
**驗證: 需求 6.3**

**屬性 16: CSV資料往返一致性**
*對於任何* 有效的系統資料物件，寫入CSV然後讀取應該產生等效的物件
**驗證: 需求 7.1, 7.2, 7.3**

**屬性 17: 活動重置計時器一致性**
*對於任何* 使用者活動事件，當活動被偵測到時，閒置計時器應該被重置到初始狀態
**驗證: 需求 8.2, 10.1, 10.2, 10.3, 10.4**

**屬性 18: 登出清理完整性**
*對於任何* 自動登出操作，所有相關的認證資料和會話狀態都應該被完全清除
**驗證: 需求 11.1, 11.2, 11.3**

**屬性 19: 配置更新即時性**
*對於任何* 配置變更，新的超時設定應該立即生效並影響當前的計時器行為
**驗證: 需求 12.2**

**屬性 20: 事件監聽一致性**
*對於任何* 支援的使用者活動類型（滑鼠、鍵盤、點擊、觸控），都應該被正確識別並記錄為活動
**驗證: 需求 10.1, 10.2, 10.3, 10.4**

**屬性 21: 時間選項完整性**
*對於任何* 時間選擇器實例，生成的時間選項應該包含從00:00到23:45的當日時間選項，以及從00:00(+1)到07:00(+1)的隔日時間選項，總共125個選項
**驗證: 需求 13.3, 15.1**

**屬性 22: 時間格式一致性**
*對於任何* 生成的時間選項，當日時間應該使用HH:MM格式，隔日時間應該使用HH:MM(+1)格式，且小時和分鐘都使用兩位數表示
**驗證: 需求 13.5, 15.2**

**屬性 23: 選擇值設定**
*對於任何* 有效的時間選項選擇，組件應該將選定的時間值正確設定到表單欄位並觸發onChange事件
**驗證: 需求 13.4, 17.4**

**屬性 24: 預設值顯示**
*對於任何* 有效的外部時間值，時間選擇器應該正確預選對應的選項
**驗證: 需求 14.2, 17.5**

**屬性 25: 表單整合更新**
*對於任何* 時間選擇變更，系統應該即時更新表單資料並觸發相關的驗證邏輯
**驗證: 需求 14.3**

**屬性 26: 資料儲存相容性**
*對於任何* 選定的時間值，儲存到CSV檔案的格式應該與現有的時間資料結構完全相容
**驗證: 需求 14.4, 15.5**

**屬性 27: 輸入驗證**
*對於任何* 時間值輸入，系統應該驗證該值是否存在於預定義的時間選項列表中
**驗證: 需求 15.3**

**屬性 28: 時數計算準確性**
*對於任何* 有效的開始和結束時間選擇，系統應該使用選定的時間值進行準確的請假時數計算
**驗證: 需求 15.4**

**屬性 29: 鍵盤導航**
*對於任何* 鍵盤輸入操作，時間選擇器應該正確定位到最接近的時間選項
**驗證: 需求 16.3**

**屬性 30: 組件屬性響應**
*對於任何* 有效的組件屬性設定（如disabled、error狀態），TimeSelector組件應該正確響應並更新其行為和外觀
**驗證: 需求 17.2**

**屬性 31: 隔日時間識別**
*對於任何* 帶有(+1)標記的時間選項，系統應該正確識別為隔日時間並在計算和儲存時進行相應處理
**驗證: 需求 18.3, 18.4, 18.5**

**屬性 32: 介面簡化**
*對於任何* 時間選擇操作，系統應該透過時間選項本身提供隔日選擇功能，而不需要額外的勾選欄位
**驗證: 需求 18.1, 18.2**

**屬性 33: 時間範圍驗證**
*對於任何* 開始時間和結束時間的組合，系統應該驗證結束時間晚於開始時間，並在不符合時顯示錯誤訊息
**驗證: 需求 18.6**

**屬性 34: 表單欄位順序**
*對於任何* 請假申請或編輯表單，系統應該按照邏輯順序排列欄位，將假別欄位放置在事由欄位之前
**驗證: 需求 19.1, 19.2, 19.3**

**屬性 35: 篩選選項完整性**
*對於任何* 用戶管理頁面的工號篩選下拉選單，應該包含所有現有用戶的工號選項以及"全部"選項
**驗證: 需求 20.2**

**屬性 36: 工號篩選邏輯**
*對於任何* 選定的特定工號，用戶列表應該僅顯示該工號對應的用戶資料
**驗證: 需求 20.3**

**屬性 37: 篩選即時更新**
*對於任何* 篩選條件變更，顯示的用戶列表應該即時更新以反映新的篩選結果
**驗證: 需求 20.5**

**屬性 38: 跨平台篩選一致性**
*對於任何* 篩選條件，桌面版表格和手機版卡片列表應該顯示相同的篩選結果
**驗證: 需求 20.6**

**屬性 39: 篩選選項同步**
*對於任何* 用戶新增或刪除操作，篩選下拉選單的選項列表應該自動更新以反映當前的用戶列表
**驗證: 需求 20.7**

**屬性 40: 請假紀錄欄位順序**
*對於任何* 請假紀錄表格顯示，欄位應該按照指定順序排列：簽核狀況、開始時間、結束時間、請假時數、假別、事由、申請時間
**驗證: 需求 21.1, 21.2, 21.3**