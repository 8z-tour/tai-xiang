/**
 * LINE Bot Reply System
 * 
 * This module implements a LINE Messaging API bot that responds to user messages
 * using the Reply API. It queries leave records from a CSV file and provides
 * formatted responses based on user commands.
 * 
 * Requirements: 需求 2, 需求 10
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { Client } = require('@line/bot-sdk');

// Environment variables are loaded by main index.ts
// require('dotenv').config(); // Removed - handled by main app

// Validate required environment variables (moved to router initialization)
function validateEnvironmentVariables() {
  const requiredEnvVars = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`錯誤: 缺少必要的環境變數: ${missingVars.join(', ')}`);
    console.error('請在 Render 平台的 Environment 中設定這些變數');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// LINE Bot configuration - with validation
function initializeLINEBot() {
  // Validate environment variables when actually needed
  validateEnvironmentVariables();
  
  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
  };
}

// Initialize LINE client (lazy initialization)
let lineClient;
let config;

function getLineClient() {
  if (!lineClient) {
    config = initializeLINEBot();
    lineClient = new Client(config);
  }
  return lineClient;
}

function getConfig() {
  if (!config) {
    config = initializeLINEBot();
  }
  return config;
}

// Create Express router
const router = express.Router();

/**
 * Verify LINE signature
 * @param {string} body - Request body as string
 * @param {string} signature - X-Line-Signature header value
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(body, signature) {
  const config = getConfig();
  const hash = crypto
    .createHmac('sha256', config.channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * Parse user message and identify command type
 * @param {string} messageText - User message text
 * @returns {string} - Command type: 'help', 'list', 'list -a', 'list -d', 'list -d -a', 'list -a -d', 'unknown'
 */
function parseMessage(messageText) {
  const text = messageText.toLowerCase().trim();
  
  if (text === 'help?') {
    return 'help';
  } else if (text === 'list -d -a' || text === 'list -a -d') {
    return text; // Return the exact command for switch statement
  } else if (text === 'list -a') {
    return 'list -a';
  } else if (text === 'list -d') {
    return 'list -d';
  } else if (text === 'list') {
    return 'list';
  }
  
  return 'unknown';
}

/**
 * Read leave records from CSV file
 * @returns {Promise<Array>} - Array of leave record objects
 */
function readLeaveRecords() {
  return new Promise((resolve, reject) => {
    const records = [];
    // 在 Render 環境中，data 目錄會被複製到 dist 目錄下
    const csvPath = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname, 'data/請假記錄.csv')
      : path.join(__dirname, '../data/請假記錄.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV 檔案不存在: ${csvPath}`));
      return;
    }
    
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        // Map CSV columns to LeaveRecord object structure
        const record = {
          name: row['姓名'],
          leaveType: row['假別'],
          leaveDate: row['請假日期'],
          startTime: row['開始時間'],
          endTime: row['結束時間'],
          status: row['簽核狀態']
        };
        
        // Only add record if all required fields are present
        if (record.name && record.leaveType && record.leaveDate && 
            record.startTime && record.endTime && record.status) {
          records.push(record);
        }
      })
      .on('end', () => {
        console.log(`成功讀取 ${records.length} 筆請假記錄`);
        resolve(records);
      })
      .on('error', (error) => {
        console.error('CSV 檔案讀取錯誤:', error);
        reject(error);
      });
  });
}

/**
 * Filter records by date and approval status
 * @param {Array} records - Array of leave records
 * @param {string} filterType - Filter type: 'future', 'future-approved', 'today', 'today-approved'
 * @param {string} targetDate - Target date in YYYY-MM-DD format
 * @returns {Array} - Filtered records
 */
function filterRecordsByDate(records, filterType, targetDate) {
  return records.filter(record => {
    const recordDate = record.leaveDate;
    
    switch (filterType) {
      case 'future':
        return recordDate >= targetDate;
      case 'future-approved':
        return recordDate >= targetDate && record.status === '已審核';
      case 'today':
        return recordDate === targetDate;
      case 'today-approved':
        return recordDate === targetDate && record.status === '已審核';
      default:
        return false;
    }
  });
}

/**
 * Format response message
 * @param {Array} records - Array of leave records
 * @param {string} responseType - Response type: 'help', 'future', 'future-approved', 'today', 'today-approved'
 * @returns {string} - Formatted response message
 */
function formatResponse(records, responseType) {
  if (responseType === 'help') {
    return 'list -d -a //列出含當日以後請假 ;d當日請假;-a已簽核';
  }
  
  if (records.length === 0) {
    return '目前沒有符合條件的請假記錄';
  }
  
  const formattedRecords = records.map(record => {
    const { name, leaveDate, startTime, endTime, leaveType, status } = record;
    
    switch (responseType) {
      case 'future':
        return `預計請假${name} ${leaveDate} ${startTime} ${endTime} ${leaveType} ${status}`;
      case 'future-approved':
        return `預計請假(已簽核)${name} ${leaveDate} ${startTime} ${endTime} ${leaveType}`;
      case 'today':
        return `今日請假${name} ${leaveDate} ${startTime} ${endTime} ${leaveType} ${status}`;
      case 'today-approved':
        return `今日請假(已簽核)${name} ${leaveDate} ${startTime} ${endTime} ${leaveType}`;
      default:
        return '';
    }
  });
  
  return formattedRecords.join(';');
}

/**
 * Reply to LINE user
 * @param {string} replyToken - LINE reply token
 * @param {string} message - Message to send
 * @returns {Promise} - LINE API response
 */
async function replyToLine(replyToken, message) {
  try {
    console.log(`準備回覆訊息: ${message}`);
    
    const client = getLineClient();
    const response = await client.replyMessage(replyToken, {
      type: 'text',
      text: message
    });
    
    console.log('LINE API 呼叫成功');
    return response;
    
  } catch (error) {
    console.error('LINE API 呼叫失敗:', error.message);
    
    // Handle specific LINE API errors
    if (error.statusCode === 400) {
      console.error('錯誤: Reply Token 無效或已過期');
    } else if (error.statusCode === 401) {
      console.error('錯誤: Channel Access Token 無效');
    } else if (error.statusCode === 403) {
      console.error('錯誤: 權限不足');
    } else {
      console.error('錯誤詳情:', error);
    }
    
    // Re-throw the error so calling code can handle it
    throw error;
  }
}

/**
 * Webhook handler - Complete message processing flow
 * Integrates signature verification, message parsing, data querying, and reply functionality
 * Requirements: 需求 1, 3, 4, 5, 6, 7, 8, 9
 */
router.post('/webhook', async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 收到 Webhook 請求`);
  
  try {
    // Step 1: Verify signature (需求 1)
    const signature = req.headers['x-line-signature'];
    
    if (!signature) {
      console.warn('缺少 X-Line-Signature 標頭');
      return res.status(400).send('Missing signature header');
    }
    
    const body = JSON.stringify(req.body);
    
    if (!verifySignature(body, signature)) {
      console.warn(`[安全警告] 簽名驗證失敗 - IP: ${req.ip}, User-Agent: ${req.headers['user-agent']}`);
      return res.status(400).send('Invalid signature');
    }
    
    console.log('簽名驗證成功');
    
    // Step 2: Validate request format (需求 1)
    if (!req.body || !req.body.events) {
      console.warn('請求格式錯誤: 缺少 events 欄位');
      return res.status(400).send('Invalid request format');
    }
    
    // Step 3: Process events
    const events = req.body.events || [];
    console.log(`處理 ${events.length} 個事件`);
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const messageText = event.message.text;
        const replyToken = event.replyToken;
        const userId = event.source?.userId || 'unknown';
        
        console.log(`用戶 ${userId} 發送訊息: "${messageText}"`);
        
        // Step 4: Parse message and identify command (需求 3)
        const command = parseMessage(messageText);
        console.log(`解析指令: ${command}`);
        
        if (command === 'unknown') {
          console.log('未知指令，不執行任何動作 (符合需求 3.2)');
          continue;
        }
        
        // Step 5: Handle help command (需求 3)
        if (command === 'help') {
          try {
            const helpMessage = formatResponse([], 'help');
            await replyToLine(replyToken, helpMessage);
            console.log('已成功回覆 help 訊息');
          } catch (error) {
            console.error('回覆 help 訊息失敗:', error.message);
          }
          continue;
        }
        
        // Step 6: Read and process leave records (需求 4, 5, 6, 7, 8)
        try {
          console.log('開始讀取請假記錄...');
          const records = await readLeaveRecords();
          
          // Get current date for filtering
          const today = new Date().toISOString().split('T')[0];
          console.log(`使用日期基準: ${today}`);
          
          // Step 7: Filter records based on command
          let filteredRecords;
          let responseType;
          
          switch (command) {
            case 'list':
              filteredRecords = filterRecordsByDate(records, 'future', today);
              responseType = 'future';
              console.log(`list 指令: 找到 ${filteredRecords.length} 筆未來請假記錄`);
              break;
            case 'list -a':
              filteredRecords = filterRecordsByDate(records, 'future-approved', today);
              responseType = 'future-approved';
              console.log(`list -a 指令: 找到 ${filteredRecords.length} 筆未來已簽核記錄`);
              break;
            case 'list -d':
              filteredRecords = filterRecordsByDate(records, 'today', today);
              responseType = 'today';
              console.log(`list -d 指令: 找到 ${filteredRecords.length} 筆當日請假記錄`);
              break;
            case 'list -d -a':
            case 'list -a -d':
              filteredRecords = filterRecordsByDate(records, 'today-approved', today);
              responseType = 'today-approved';
              console.log(`list -d -a 指令: 找到 ${filteredRecords.length} 筆當日已簽核記錄`);
              break;
            default:
              console.warn(`未處理的指令: ${command}`);
              continue;
          }
          
          // Step 8: Format and send response (需求 9)
          const responseMessage = formatResponse(filteredRecords, responseType);
          console.log(`準備回覆訊息 (長度: ${responseMessage.length} 字元)`);
          
          await replyToLine(replyToken, responseMessage);
          console.log(`已成功回覆 ${command} 查詢結果給用戶 ${userId}`);
          
        } catch (csvError) {
          console.error('CSV 處理錯誤:', csvError.message);
          console.error('錯誤堆疊:', csvError.stack);
          
          try {
            await replyToLine(replyToken, '查詢失敗，請稍後再試');
            console.log('已回覆錯誤訊息給用戶');
          } catch (replyError) {
            console.error('回覆錯誤訊息失敗:', replyError.message);
          }
        }
      } else {
        console.log(`忽略非文字訊息事件: type=${event.type}, messageType=${event.message?.type}`);
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Webhook 處理完成，耗時: ${processingTime}ms`);
    res.status(200).send('OK');
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Webhook 處理錯誤 (耗時: ${processingTime}ms):`, error.message);
    console.error('錯誤堆疊:', error.stack);
    
    // Return appropriate error status based on error type
    if (error.message.includes('signature') || error.message.includes('format')) {
      res.status(400).send('Bad Request');
    } else {
      res.status(500).send('Internal Server Error');
    }
  }
});

/**
 * Health check endpoint
 * Returns system status and configuration information
 * Requirements: 需求 2
 */
router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    service: 'LINE Bot Reply System',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    }
  };
  
  // Check CSV file accessibility
  try {
    // 在 Render 環境中，data 目錄會被複製到 dist 目錄下
    const csvPath = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname, 'data/請假記錄.csv')
      : path.join(__dirname, '../data/請假記錄.csv');
    const csvExists = fs.existsSync(csvPath);
    
    healthCheck.dataSource = {
      csvFile: csvPath,
      accessible: csvExists,
      lastModified: csvExists ? fs.statSync(csvPath).mtime.toISOString() : null
    };
    
    // If CSV is accessible, try to read a sample to verify format
    if (csvExists) {
      try {
        const records = await readLeaveRecords();
        healthCheck.dataSource.recordCount = records.length;
        healthCheck.dataSource.sampleRecord = records.length > 0 ? {
          hasName: !!records[0].name,
          hasLeaveType: !!records[0].leaveType,
          hasLeaveDate: !!records[0].leaveDate,
          hasStartTime: !!records[0].startTime,
          hasEndTime: !!records[0].endTime,
          hasStatus: !!records[0].status
        } : null;
      } catch (csvError) {
        healthCheck.dataSource.error = csvError.message;
        healthCheck.status = 'warning';
      }
    } else {
      healthCheck.status = 'warning';
      healthCheck.dataSource.error = 'CSV file not found';
    }
    
  } catch (error) {
    healthCheck.dataSource = {
      error: error.message,
      accessible: false
    };
    healthCheck.status = 'warning';
  }
  
  // Test LINE API connectivity (optional check)
  try {
    // Check if environment variables are available
    const config = getConfig();
    
    healthCheck.config = {
      hasAccessToken: !!config.channelAccessToken,
      hasChannelSecret: !!config.channelSecret,
      accessTokenLength: config.channelAccessToken ? config.channelAccessToken.length : 0,
      environment: process.env.NODE_ENV || 'development'
    };
    
    // We don't actually call the API to avoid unnecessary requests
    // Just verify that we have the required configuration
    if (!config.channelAccessToken || !config.channelSecret) {
      healthCheck.lineApi = {
        configured: false,
        error: 'Missing LINE API credentials'
      };
      healthCheck.status = 'error';
    } else {
      healthCheck.lineApi = {
        configured: true,
        ready: true
      };
    }
  } catch (error) {
    healthCheck.config = {
      hasAccessToken: false,
      hasChannelSecret: false,
      accessTokenLength: 0,
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    };
    healthCheck.lineApi = {
      configured: false,
      error: error.message
    };
    healthCheck.status = 'error';
  }
  
  // Set appropriate HTTP status code
  const httpStatus = healthCheck.status === 'ok' ? 200 : 
                    healthCheck.status === 'warning' ? 200 : 503;
  
  console.log(`健康檢查請求 - 狀態: ${healthCheck.status}`);
  res.status(httpStatus).json(healthCheck);
});

module.exports = router;
