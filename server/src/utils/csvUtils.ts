import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import * as createCsvWriter from 'csv-writer';

/**
 * CSV工具函數 - 處理CSV檔案讀取和寫入
 * 支援UTF-8編碼和特殊字元處理
 */

export interface CsvWriterOptions {
  path: string;
  header: Array<{ id: string; title: string }>;
  encoding?: string;
}

/**
 * 讀取CSV檔案
 * @param filePath CSV檔案路徑
 * @param encoding 檔案編碼，預設為utf8
 * @returns Promise<any[]> 解析後的資料陣列
 */
export function readCsvFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const absolutePath = path.resolve(filePath);

    // 檢查檔案是否存在
    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`CSV檔案不存在: ${absolutePath}`));
      return;
    }

    fs.createReadStream(absolutePath, { encoding })
      .pipe(csv({
        mapHeaders: ({ header }: { header: string }) => header.trim(),
        mapValues: ({ value }: { value: string }) => {
          // 處理特殊字元和去除前後空白
          if (typeof value === 'string') {
            return value.trim();
          }
          return value;
        }
      }))
      .on('data', (data) => {
        // 過濾空行
        if (Object.values(data).some(value => value && value.toString().trim())) {
          results.push(data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(new Error(`讀取CSV檔案失敗: ${error.message}`));
      });
  });
}

/**
 * 寫入CSV檔案
 * @param filePath CSV檔案路徑
 * @param data 要寫入的資料陣列
 * @param headers 欄位標題配置
 * @param encoding 檔案編碼，預設為utf8
 * @returns Promise<void>
 */
export function writeCsvFile(
  filePath: string,
  data: any[],
  headers: Array<{ id: string; title: string }>,
  encoding: BufferEncoding = 'utf8'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath);
    
    // 確保目錄存在
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: absolutePath,
      header: headers,
      encoding: encoding
    });

    csvWriter.writeRecords(data)
      .then(() => {
        // 如果是 UTF-8 編碼，添加 BOM 以確保在 Windows 系統上正確顯示中文
        if (encoding === 'utf8') {
          addBomToFile(absolutePath);
        }
        resolve();
      })
      .catch((error: any) => {
        reject(new Error(`寫入CSV檔案失敗: ${error.message}`));
      });
  });
}

/**
 * 為 UTF-8 檔案添加 BOM (Byte Order Mark)
 * 這樣可以確保在 Windows 系統上正確顯示中文字符
 * @param filePath 檔案路徑
 */
function addBomToFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath);
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    
    // 檢查檔案是否已經有 BOM
    if (content.length >= 3 && 
        content[0] === 0xEF && 
        content[1] === 0xBB && 
        content[2] === 0xBF) {
      // 檔案已經有 BOM，不需要添加
      return;
    }
    
    // 添加 BOM 到檔案開頭
    const contentWithBom = Buffer.concat([bom, content]);
    fs.writeFileSync(filePath, contentWithBom);
  } catch (error) {
    console.error('添加 BOM 失敗:', error);
    // 不拋出錯誤，因為這不是致命錯誤
  }
}

/**
 * 追加資料到CSV檔案
 * @param filePath CSV檔案路徑
 * @param data 要追加的資料陣列
 * @param headers 欄位標題配置（僅在檔案不存在時使用）
 * @param encoding 檔案編碼，預設為utf8
 * @returns Promise<void>
 */
export function appendToCsvFile(
  filePath: string,
  data: any[],
  headers: Array<{ id: string; title: string }>,
  encoding: BufferEncoding = 'utf8'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath);
    const fileExists = fs.existsSync(absolutePath);
    
    // 確保目錄存在
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: absolutePath,
      header: headers,
      encoding: encoding,
      append: fileExists // 如果檔案存在則追加，否則建立新檔案
    });

    csvWriter.writeRecords(data)
      .then(() => {
        // 如果是新建檔案且使用 UTF-8 編碼，添加 BOM
        if (!fileExists && encoding === 'utf8') {
          addBomToFile(absolutePath);
        }
        resolve();
      })
      .catch((error: any) => {
        reject(new Error(`追加CSV檔案失敗: ${error.message}`));
      });
  });
}

/**
 * 檢查CSV檔案是否存在且可讀取
 * @param filePath CSV檔案路徑
 * @returns boolean
 */
export function checkCsvFileExists(filePath: string): boolean {
  try {
    const absolutePath = path.resolve(filePath);
    return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * 建立CSV檔案的備份
 * @param filePath 原始檔案路徑
 * @param backupSuffix 備份檔案後綴，預設為時間戳記
 * @returns Promise<string> 備份檔案路徑
 */
export function backupCsvFile(filePath: string, backupSuffix?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`原始檔案不存在: ${absolutePath}`));
      return;
    }

    const suffix = backupSuffix || new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = absolutePath.replace(/\.csv$/i, `_backup_${suffix}.csv`);

    fs.copyFile(absolutePath, backupPath, (error) => {
      if (error) {
        reject(new Error(`建立備份失敗: ${error.message}`));
      } else {
        resolve(backupPath);
      }
    });
  });
}

/**
 * 驗證CSV資料格式
 * @param data 要驗證的資料
 * @param requiredFields 必填欄位陣列
 * @returns { isValid: boolean; errors: string[] }
 */
export function validateCsvData(data: any[], requiredFields: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('資料必須是陣列格式');
    return { isValid: false, errors };
  }

  if (data.length === 0) {
    errors.push('資料不能為空');
    return { isValid: false, errors };
  }

  // 檢查每筆記錄的必填欄位
  data.forEach((record, index) => {
    if (!record || typeof record !== 'object') {
      errors.push(`第 ${index + 1} 筆記錄格式錯誤`);
      return;
    }

    requiredFields.forEach(field => {
      if (!record.hasOwnProperty(field) || !record[field] || record[field].toString().trim() === '') {
        errors.push(`第 ${index + 1} 筆記錄缺少必填欄位: ${field}`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}