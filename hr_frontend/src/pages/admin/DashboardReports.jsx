import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  Users, Building, Clock, Calendar, TrendingUp, TrendingDown, DollarSign, 
  Award, Calculator, FileText, Download, RefreshCw, Filter, Eye,
  BarChart3, PieChart as PieChartIcon, Activity, AlertCircle, CheckCircle
} from 'lucide-react';

const DashboardReports = () => {
  const { user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [activeTab, setActiveTab] = useState('overview');

  // 대시보드 개요 데이터
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5007/api/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('대시보드 개요를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 출근 트렌드 데이터
  const { data: attendanceTrendData, isLoading: attendanceTrendLoading } = useQuery({
    queryKey: ['attendance-trend'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5007/api/dashboard/charts/attendance-trend', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('출근 트렌드를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 부서별 통계 데이터
  const { data: departmentStatsData, isLoading: departmentStatsLoading } = useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5007/api/dashboard/charts/department-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('부서별 통계를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 급여 트렌드 데이터
  const { data: payrollTrendData, isLoading: payrollTrendLoading } = useQuery({
    queryKey: ['payroll-trend'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5007/api/dashboard/charts/payroll-trend', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여 트렌드를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 종합 리포트 데이터
  const { data: summaryReportData, isLoading: summaryReportLoading } = useQuery({
    queryKey: ['summary-report', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams(selectedPeriod);
      const response = await fetch(`http://localhost:5007/api/dashboard/reports/summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('종합 리포트를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 리포트 다운로드 함수
  const downloadReport = async (format) => {
    try {
      const response = await fetch('http://localhost:5007/api/dashboard/reports/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: 'summary',
          format: format,
          year: selectedPeriod.year,
          month: selectedPeriod.month === 0 ? null : selectedPeriod.month
        })
      });

      if (!response.ok) {
        throw new Error('리포트 다운로드에 실패했습니다.');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // 파일명 설정
      const filename = `hr_report_summary_${selectedPeriod.year}${
        selectedPeriod.month > 0 ? `_${selectedPeriod.month.toString().padStart(2, '0')}` : ''
      }.${format}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('리포트 다운로드에 실패했습니다.');
    }
  };

  // 차트 색상 설정
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드 및 리포트</h1>
          <p className="text-gray-600">시스템 전반의 통계와 분석을 확인할 수 있습니다.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchOverview();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={() => downloadReport('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV 다운로드
          </button>
          <button
            onClick={() => downloadReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF 다운로드
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '개요', icon: BarChart3 },
            { id: 'charts', name: '차트 분석', icon: PieChartIcon },
            { id: 'reports', name: '종합 리포트', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 개요 탭 */}
      {activeTab === 'overview' && overviewData && (
        <div className="space-y-6">
          {/* 주요 지표 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 직원 현황 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 직원 수</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.overview.total_employees}명</p>
                </div>
              </div>
            </div>

            {/* 부서 현황 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 부서 수</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.overview.total_departments}개</p>
                </div>
              </div>
            </div>

            {/* 출근율 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">출근율</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.attendance.attendance_rate}%</p>
                </div>
              </div>
            </div>

            {/* 평가 완료율 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">평가 완료율</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.evaluation.completion_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 통계 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 출근 통계 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                출근 현황
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">총 출근 기록</span>
                  <span className="font-medium text-gray-900">{overviewData.attendance.total_records}건</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">평균 근무시간</span>
                  <span className="font-medium text-gray-900">{overviewData.attendance.avg_work_hours}시간</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">지각 횟수</span>
                  <span className="font-medium text-red-600">{overviewData.attendance.late_count}회</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">결근 횟수</span>
                  <span className="font-medium text-red-600">{overviewData.attendance.absent_count}회</span>
                </div>
              </div>
            </div>

            {/* 급여 통계 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                급여 현황
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">급여명세서 수</span>
                  <span className="font-medium text-gray-900">{overviewData.payroll.total_payrolls}건</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">총 지급액</span>
                  <span className="font-medium text-gray-900">{Math.round(overviewData.payroll.total_gross_pay).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">총 실지급액</span>
                  <span className="font-medium text-blue-600">{Math.round(overviewData.payroll.total_net_pay).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">평균 실지급액</span>
                  <span className="font-medium text-blue-600">{Math.round(overviewData.payroll.avg_net_pay).toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              최근 활동
            </h3>
            <div className="space-y-3">
              {overviewData.recent_activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className={`p-1 rounded-full mr-3 ${
                      activity.action_type === 'CREATE' ? 'bg-green-100 text-green-600' :
                      activity.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                      activity.action_type === 'DELETE' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.action_type === 'CREATE' && <CheckCircle className="w-3 h-3" />}
                      {activity.action_type === 'UPDATE' && <RefreshCw className="w-3 h-3" />}
                      {activity.action_type === 'DELETE' && <AlertCircle className="w-3 h-3" />}
                      {!['CREATE', 'UPDATE', 'DELETE'].includes(activity.action_type) && <Eye className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activity.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                    activity.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                    activity.action_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.action_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 차트 분석 탭 */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* 출근 트렌드 차트 */}
          {!attendanceTrendLoading && attendanceTrendData && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">출근 트렌드 (최근 12개월)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrendData.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="attendance_rate" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="출근율 (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avg_hours" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="평균 근무시간"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 부서별 통계 차트 */}
          {!departmentStatsLoading && departmentStatsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 부서별 직원 수 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">부서별 직원 수</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentStatsData.department_stats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}명`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="employee_count"
                      >
                        {departmentStatsData.department_stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 부서별 평균 급여 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">부서별 평균 급여</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStatsData.department_stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Math.round(value).toLocaleString()}원`, '평균 급여']} />
                      <Bar dataKey="avg_salary" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 급여 트렌드 차트 */}
          {!payrollTrendLoading && payrollTrendData && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">급여 트렌드 (최근 12개월)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={payrollTrendData.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Math.round(value).toLocaleString()}원`]} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total_gross" 
                      stackId="1"
                      stroke="#3B82F6" 
                      fill="#3B82F6"
                      name="총 지급액"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total_net" 
                      stackId="2"
                      stroke="#10B981" 
                      fill="#10B981"
                      name="실지급액"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 종합 리포트 탭 */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* 기간 선택 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">연도</label>
                <select
                  value={selectedPeriod.year}
                  onChange={(e) => setSelectedPeriod({...selectedPeriod, year: parseInt(e.target.value)})}
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">월</label>
                <select
                  value={selectedPeriod.month}
                  onChange={(e) => setSelectedPeriod({...selectedPeriod, month: parseInt(e.target.value)})}
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>전체</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{month}월</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 종합 리포트 */}
          {!summaryReportLoading && summaryReportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 직원 현황 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  직원 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 직원 수</span>
                    <span className="font-medium text-gray-900">{summaryReportData.employee.total_employees}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">활성 직원 수</span>
                    <span className="font-medium text-green-600">{summaryReportData.employee.active_employees}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">부서 수</span>
                    <span className="font-medium text-gray-900">{summaryReportData.employee.departments}개</span>
                  </div>
                </div>
              </div>

              {/* 출근 현황 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  출근 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 출근일</span>
                    <span className="font-medium text-gray-900">{summaryReportData.attendance.total_days}일</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">평균 근무시간</span>
                    <span className="font-medium text-gray-900">{summaryReportData.attendance.avg_hours}시간</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">출근율</span>
                    <span className="font-medium text-green-600">{summaryReportData.attendance.attendance_rate}%</span>
                  </div>
                </div>
              </div>

              {/* 급여 현황 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  급여 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">급여명세서 수</span>
                    <span className="font-medium text-gray-900">{summaryReportData.payroll.total_payrolls}건</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 지급액</span>
                    <span className="font-medium text-gray-900">{Math.round(summaryReportData.payroll.total_gross).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">실지급액</span>
                    <span className="font-medium text-blue-600">{Math.round(summaryReportData.payroll.total_net).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">평균 급여</span>
                    <span className="font-medium text-blue-600">{Math.round(summaryReportData.payroll.avg_net).toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* 평가 현황 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  평가 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 평가 수</span>
                    <span className="font-medium text-gray-900">{summaryReportData.evaluation.total_evaluations}건</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">완료된 평가</span>
                    <span className="font-medium text-green-600">{summaryReportData.evaluation.completed}건</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">완료율</span>
                    <span className="font-medium text-green-600">{summaryReportData.evaluation.completion_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">평균 점수</span>
                    <span className="font-medium text-purple-600">{summaryReportData.evaluation.avg_score}점</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardReports;

