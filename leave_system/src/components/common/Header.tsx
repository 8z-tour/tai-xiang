import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // 檢查是否在管理頁面
  const isAdminPage = location.pathname.startsWith('/admin/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageChange = (newLanguage: 'zh-TW' | 'en-US' | 'id-ID') => {
    changeLanguage(newLanguage);
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和標題 */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              {t('system.title')}
            </Link>
          </div>

          {/* 桌面版導航選單 */}
          {user && (
            <nav className="hidden md:flex items-center space-x-6">
              {isAdminPage && user.permission === 'admin' ? (
                // 管理頁面導航選單
                <>
                  <Link 
                    to="/admin/leave-management" 
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {t('nav.leaveManagement')}
                  </Link>
                  <Link 
                    to="/admin/user-management" 
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {t('nav.userManagement')}
                  </Link>
                </>
              ) : (
                // 一般頁面導航選單
                <>
                  <Link 
                    to="/user/change-password" 
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    變更密碼
                  </Link>
                  <Link 
                    to="/leave/application" 
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {t('nav.leaveApplication')}
                  </Link>
                  <Link 
                    to="/leave/records" 
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {t('nav.leaveRecords')}
                  </Link>
                  {/* 請假管理 - 根據權限顯示不同狀態 */}
                  {user.permission === 'admin' ? (
                    <Link 
                      to="/admin/leave-management" 
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      {t('nav.leaveManagement')}
                    </Link>
                  ) : (
                    <span 
                      className="text-gray-400 cursor-not-allowed"
                      title={t('errors.forbidden', '權限不足')}
                    >
                      {t('nav.leaveManagement')}
                    </span>
                  )}
                </>
              )}
            </nav>
          )}

          {/* 手機版選單按鈕 */}
          {user && (
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* 使用者資訊和語言切換 */}
          <div className="flex items-center space-x-4">
            {/* 語言切換 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleLanguageChange('zh-TW')}
                className={`px-2 py-1 text-sm rounded ${
                  language === 'zh-TW' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => handleLanguageChange('en-US')}
                className={`px-2 py-1 text-sm rounded ${
                  language === 'en-US' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('id-ID')}
                className={`px-2 py-1 text-sm rounded ${
                  language === 'id-ID' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                ID
              </button>
            </div>

            {/* 使用者資訊 */}
            {user && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {t('common.welcome')}, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 手機版導航選單 */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-2 space-y-2">
              {isAdminPage && user.permission === 'admin' ? (
                // 管理頁面手機版導航選單
                <>
                  <Link 
                    to="/admin/leave-management" 
                    className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.leaveManagement')}
                  </Link>
                  <Link 
                    to="/admin/user-management" 
                    className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.userManagement')}
                  </Link>
                </>
              ) : (
                // 一般頁面手機版導航選單
                <>
                  <Link 
                    to="/user/change-password" 
                    className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    變更密碼
                  </Link>
                  <Link 
                    to="/leave/application" 
                    className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.leaveApplication')}
                  </Link>
                  <Link 
                    to="/leave/records" 
                    className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.leaveRecords')}
                  </Link>
                  {/* 手機版請假管理 - 根據權限顯示不同狀態 */}
                  {user.permission === 'admin' ? (
                    <Link 
                      to="/admin/leave-management" 
                      className="block py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('nav.leaveManagement')}
                    </Link>
                  ) : (
                    <span 
                      className="block py-2 text-gray-400 cursor-not-allowed"
                      title={t('errors.forbidden', '權限不足')}
                    >
                      {t('nav.leaveManagement')}
                    </span>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};