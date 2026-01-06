import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// 載入環境變數
dotenv.config();

// 除錯：檢查 LINE Bot 環境變數
console.log('🔍 主應用程式環境變數檢查:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('LINE_CHANNEL_ACCESS_TOKEN 存在:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
console.log('LINE_CHANNEL_SECRET 存在:', !!process.env.LINE_CHANNEL_SECRET);
if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  console.log('ACCESS_TOKEN 長度:', process.env.LINE_CHANNEL_ACCESS_TOKEN.length);
}
if (process.env.LINE_CHANNEL_SECRET) {
  console.log('CHANNEL_SECRET 長度:', process.env.LINE_CHANNEL_SECRET.length);
}

const app = express();
const PORT = process.env.PORT || 10000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 泰鄉食品後端系統啟動中 (方案 A)...');
console.log(`📍 環境: ${isProduction ? 'Production' : 'Development'}`);
console.log(`🔌 端口: ${PORT}`);

// 生產環境安全性設定
if (isProduction) {
  app.set('trust proxy', 1);
  
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// CORS 配置 - 允許主網站訪問
const corsOptions = {
  origin: isProduction 
    ? [
        'https://tai-xiang-website.onrender.com',  // 主網站 URL
        'http://localhost:5173',                   // 開發環境
        'http://localhost:3000'                    // 備用開發端口
      ]
    : true,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 靜態檔案服務配置
const staticOptions = {
  maxAge: isProduction ? '1d' : '0',
  etag: true,
  lastModified: true,
  index: false,
  setHeaders: (res: express.Response, filePath: string) => {
    if (isProduction) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
    
    if (filePath.endsWith('.html')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
  }
};

// 請假系統靜態檔案路徑
const leaveSystemDistPath = path.join(__dirname, '../../leave_system/dist');

console.log('📁 靜態檔案路徑:');
console.log(`   請假系統: ${leaveSystemDistPath}`);

// 提供請假系統前端靜態檔案
app.use('/leave_system', express.static(leaveSystemDistPath, staticOptions));

// 開發環境請求日誌
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// 路由導入
import authRoutes from './routes/auth';
import leaveRoutes from './routes/leave';
import adminRoutes from './routes/admin';
import usersRoutes from './routes/users';

// LINE Bot 路由導入
const lineBotRoutes = require('./line-bot.js');

// 健康檢查路由
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '泰鄉食品後端系統運行正常 (方案 A)',
    services: {
      leaveSystem: '請假系統',
      api: '後端 API',
      lineBot: 'LINE Bot Reply System'
    },
    endpoints: {
      leaveSystem: '/leave_system',
      apiHealth: '/api/health',
      lineBotHealth: '/line/health',
      lineBotWebhook: '/line/webhook'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    deployment: 'Plan A - Separate Services'
  });
});

// 根路徑重定向到請假系統
app.get('/', (req, res) => {
  res.redirect('/leave_system');
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', usersRoutes);

// LINE Bot 路由
app.use('/line', lineBotRoutes);

// SPA 路由處理 - 請假系統
app.get('/leave_system', (req, res, next) => {
  try {
    const indexPath = path.join(leaveSystemDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ 請假系統 SPA 錯誤:', err);
        next(err);
      }
    });
  } catch (error) {
    console.error('❌ 請假系統路由錯誤:', error);
    next(error);
  }
});

app.get('/leave_system/*', (req, res, next) => {
  try {
    const indexPath = path.join(leaveSystemDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ 請假系統 SPA 錯誤:', err);
        next(err);
      }
    });
  } catch (error) {
    console.error('❌ 請假系統路由錯誤:', error);
    next(error);
  }
});

// 404 處理 - 只處理 API 路由
app.use('/api/*', notFoundHandler);

// 其他路由重定向到請假系統
app.get('*', (req, res) => {
  res.redirect('/leave_system');
});

// 全域錯誤處理
app.use(errorHandler);

// 未捕獲異常處理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的 Promise 拒絕:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕獲的異常:', error);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log('✅ 泰鄉食品後端系統啟動成功! (方案 A)');
  console.log(`👥 請假系統: http://localhost:${PORT}/leave_system`);
  console.log(`🔧 API 健康檢查: http://localhost:${PORT}/api/health`);
  console.log(`🤖 LINE Bot 健康檢查: http://localhost:${PORT}/line/health`);
  console.log(`📞 LINE Bot Webhook: http://localhost:${PORT}/line/webhook`);
  console.log('');
  console.log('🌐 主網站部署在獨立的 Static Site 服務');
});

export default app;