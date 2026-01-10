
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthProvider';
import { LanguageProvider } from './providers/LanguageProvider';
import { ErrorProvider } from './providers/ErrorProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorNotifications } from './components/common/ErrorNotifications';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { LeaveApplicationPage } from './pages/LeaveApplicationPage';
import { LeaveRecordPage } from './pages/LeaveRecordPage';
import { LeaveManagementPage } from './pages/admin/LeaveManagementPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { useEffect } from 'react';

// 建立 React Query 客戶端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // 全域錯誤處理
      onError: (error) => {
        console.error('Query error:', error);
        // 觸發全域錯誤事件
        window.dispatchEvent(new CustomEvent('app-error', {
          detail: { type: 'query', error }
        }));
      },
    },
    mutations: {
      // 全域錯誤處理
      onError: (error) => {
        console.error('Mutation error:', error);
        // 觸發全域錯誤事件
        window.dispatchEvent(new CustomEvent('app-error', {
          detail: { type: 'mutation', error }
        }));
      },
    },
  },
});

// 全域錯誤處理組件
const GlobalErrorHandler: React.FC = () => {
  useEffect(() => {
    // 處理未捕獲的 Promise 拒絕
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // 檢查是否為認證相關錯誤
      if (event.reason?.message?.includes('401') || 
          event.reason?.message?.includes('unauthorized')) {
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: { 
            type: 'session_invalid', 
            message: '會話已過期，請重新登入' 
          }
        }));
      }
      
      // 防止錯誤顯示在控制台
      event.preventDefault();
    };

    // 處理全域 JavaScript 錯誤
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };

    // 監聽全域錯誤事件
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ErrorProvider>
            <AuthProvider>
              <Router basename="/leave_system">
                {/* 全域錯誤處理 */}
                <GlobalErrorHandler />
                
                <Routes>
                  {/* 登入頁面 */}
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* 受保護的路由 */}
                  <Route 
                    path="/user/change-password" 
                    element={
                      <ProtectedRoute>
                        <ChangePasswordPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/leave/application" 
                    element={
                      <ProtectedRoute>
                        <LeaveApplicationPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/leave/records" 
                    element={
                      <ProtectedRoute>
                        <LeaveRecordPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* 管理者專用路由 */}
                  <Route 
                    path="/admin/leave-management" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <LeaveManagementPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/user-management" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <UserManagementPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* 預設重導向 */}
                  <Route path="/" element={<Navigate to="/leave/application" replace />} />
                  
                  {/* 404 頁面 */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                
                {/* 全域錯誤通知 */}
                <ErrorNotifications />
              </Router>
            </AuthProvider>
          </ErrorProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;