import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Target, 
  DollarSign, 
  Clock, 
  Calendar, 
  Receipt, 
  FileText, 
  Shield,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Calculator,
  Award
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuCategories = [
    {
      category: '인사 관리',
      items: [
        { name: '대시보드', path: '/admin/dashboard', icon: BarChart3 },
        { name: '직원 관리', path: '/admin/employees', icon: Users },
        { name: '부서 관리', path: '/admin/departments', icon: Building2 }
      ]
    },
    {
      category: '평가 및 성과급',
      items: [
        { name: '평가 기준', path: '/admin/evaluation-criteria', icon: Target },
        { name: '성과급 정책', path: '/admin/bonus-policy', icon: DollarSign },
        { name: '성과 평가', path: '/admin/evaluation', icon: Award },
        { name: '성과급 계산', path: '/admin/bonus-calculation', icon: Calculator },
        { name: '급여명세서 관리', path: '/admin/payroll', icon: Receipt },
      ]
    },
    {
      category: '출근 및 연차 관리',
      items: [
        { name: '출퇴근 관리', path: '/admin/attendance', icon: Clock },
        { name: '연차 관리', path: '/admin/annual-leave', icon: Calendar },
        { name: '휴가 신청 관리', path: '/admin/leave-requests', icon: FileText }
      ]
    },
    {
      category: '리포트 및 분석',
      items: [
        { name: '대시보드 및 리포트', path: '/admin/dashboard-reports', icon: TrendingUp }
      ]
    },
    {
      category: '시스템',
      items: [
        { name: '감사 로그', path: '/admin/audit-logs', icon: Shield }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
      )}

      {/* 사이드바 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* 로고 및 헤더 */}
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-bold text-white">HR 시스템</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 사용자 정보 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">관리자</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="mt-6 px-3">
          {menuCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="absolute bottom-0 w-full p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="lg:pl-64">
        {/* 상단 헤더 */}
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1">
              {/* 추가 헤더 콘텐츠가 필요한 경우 여기에 */}
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <div className="relative">
                <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="sr-only">사용자 메뉴</span>
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

