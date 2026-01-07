import express from 'express';
import fs from 'fs';
import path from 'path';
import { PersonalDataService } from '../services/personalDataService';
import { authenticateToken } from '../middleware/auth';
import { adminMiddleware } from '../middleware/permission';
import { writeCsvFile } from '../utils/csvUtils';

const router = express.Router();
const personalDataService = new PersonalDataService();

// 所有路由都需要管理者權限
router.use(authenticateToken);
router.use(adminMiddleware);

// 獲取所有用戶
router.get('/', async (req, res) => {
  try {
    console.log('=== 獲取所有用戶 API 被調用 ===');
    console.log('請求用戶:', req.user);
    
    const users = await personalDataService.getAllUsers();
    console.log('查詢到的用戶數量:', users.length);
    console.log('用戶資料:', users);
    
    const responseData = users.map(user => ({
      employeeId: user.employeeId,
      name: user.name,
      password: user.password,  // 管理者可以查看密碼
      permission: user.permission,
      annualLeave: user.annualLeave,      // 年度特休
      sickLeave: user.sickLeave,          // 年度病假
      menstrualLeave: user.menstrualLeave, // 年度生理假
      personalLeave: user.personalLeave   // 年度事假
    }));
    
    console.log('回傳的資料:', responseData);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶列表失敗'
    });
  }
});

// 新增用戶
router.post('/', async (req, res) => {
  try {
    const { employeeId, name, password, permission } = req.body;

    // 驗證必填欄位
    if (!employeeId || !name || !password || !permission) {
      return res.status(400).json({
        success: false,
        message: '所有欄位都是必填的'
      });
    }

    // 驗證權限值
    if (!['employee', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: '權限值無效'
      });
    }

    // 檢查工號是否已存在
    const existingUser = await personalDataService.findByEmployeeId(employeeId);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '工號已存在'
      });
    }

    // 新增用戶
    await personalDataService.addUser({
      employeeId,
      name,
      password,
      permission,
      annualLeave: req.body.annualLeave || 14.0,
      sickLeave: req.body.sickLeave || 30.0,
      menstrualLeave: req.body.menstrualLeave || 3.0,
      personalLeave: req.body.personalLeave || 14.0
    });

    res.json({
      success: true,
      message: '用戶新增成功'
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: '新增用戶失敗'
    });
  }
});

// 更新用戶
router.put('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { name, password, permission } = req.body;

    // 驗證必填欄位
    if (!name || !password || !permission) {
      return res.status(400).json({
        success: false,
        message: '所有欄位都是必填的'
      });
    }

    // 驗證權限值
    if (!['employee', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: '權限值無效'
      });
    }

    // 檢查用戶是否存在
    const existingUser = await personalDataService.findByEmployeeId(employeeId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 更新用戶
    await personalDataService.updateUser(employeeId, {
      employeeId,
      name,
      password,
      permission,
      annualLeave: req.body.annualLeave !== undefined ? req.body.annualLeave : existingUser.annualLeave,
      sickLeave: req.body.sickLeave !== undefined ? req.body.sickLeave : existingUser.sickLeave,
      menstrualLeave: req.body.menstrualLeave !== undefined ? req.body.menstrualLeave : existingUser.menstrualLeave,
      personalLeave: req.body.personalLeave !== undefined ? req.body.personalLeave : (existingUser.personalLeave || 14.0)
    });

    res.json({
      success: true,
      message: '用戶更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '更新用戶失敗'
    });
  }
});

// 刪除用戶
router.delete('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // 檢查用戶是否存在
    const existingUser = await personalDataService.findByEmployeeId(employeeId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 防止刪除自己
    if (req.user?.employeeId === employeeId) {
      return res.status(400).json({
        success: false,
        message: '不能刪除自己的帳號'
      });
    }

    // 刪除用戶
    await personalDataService.deleteUser(employeeId);

    res.json({
      success: true,
      message: '用戶刪除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '刪除用戶失敗'
    });
  }
});

// 匯出權限資料CSV
router.post('/export', async (req, res) => {
  try {
    console.log('=== 匯出權限資料 CSV ===');
    
    // 獲取所有用戶資料
    const users = await personalDataService.getAllUsers();
    console.log('查詢到的用戶數量:', users.length);

    // 生成檔案名稱：請假系統權限資料 + 年月日
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const filename = `請假系統權限資料${year}${month}${day}.csv`;

    // 準備CSV標題
    const headers = [
      { id: 'employeeId', title: '工號' },
      { id: 'name', title: '姓名' },
      { id: 'password', title: '密碼' },
      { id: 'permission', title: '權限' },
      { id: 'annualLeave', title: '年度特休' },
      { id: 'sickLeave', title: '年度病假' },
      { id: 'menstrualLeave', title: '年度生理假' },
      { id: 'personalLeave', title: '年度事假' }
    ];

    // 格式化用戶資料
    const formattedUsers = users.map(user => ({
      employeeId: user.employeeId,
      name: user.name,
      password: user.password,
      permission: user.permission === 'admin' ? '管理者' : '員工',
      annualLeave: user.annualLeave || 0,
      sickLeave: user.sickLeave || 0,
      menstrualLeave: user.menstrualLeave || 0,
      personalLeave: user.personalLeave || 0
    }));

    // 建立臨時檔案路徑
    const tempDir = path.join(process.cwd(), 'server/temp');
    const tempFilePath = path.join(tempDir, filename);

    // 確保臨時目錄存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 寫入CSV檔案
    await writeCsvFile(tempFilePath, formattedUsers, headers);

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

    console.log('權限資料 CSV 匯出成功:', filename);

  } catch (error) {
    console.error('Export users CSV error:', error);
    res.status(500).json({
      success: false,
      message: '匯出失敗，請稍後再試'
    });
  }
});

export default router;