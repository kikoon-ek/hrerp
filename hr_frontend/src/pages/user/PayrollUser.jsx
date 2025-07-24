import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  DollarSign, FileText, Calendar, TrendingUp, Download, Eye,
  Calculator, CreditCard, PieChart, BarChart3, Receipt,
  Wallet, Building, User, Clock, Banknote, X
} from 'lucide-react';

const PayrollUser = () => {
  const { user } = useAuthStore();
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 12,
    year: new Date().getFullYear()
  });

  // 내 급여명세서 목록 조회
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['my-payroll-records', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5005/api/my-payroll-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여명세서 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 연도 목록 생성 (최근 5년)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getMonthName = (month) => {
    const months = [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    return months[month - 1];
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">내 급여명세서</h1>
          <p className="text-gray-600">급여명세서를 조회하고 다운로드할 수 있습니다.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: parseInt(e.target.value), page: 1})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 직원 정보 카드 */}
      {payrollData?.employee && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{payrollData.employee.name}</h2>
                <p className="text-blue-100">
                  {payrollData.employee.employee_number} | {payrollData.employee.position}
                </p>
                <p className="text-blue-100">
                  <Building className="w-4 h-4 inline mr-1" />
                  {payrollData.employee.department?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 연간 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">연간 총 지급액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.yearly_stats?.total_gross_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">연간 실지급액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.yearly_stats?.total_net_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calculator className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">연간 총 공제액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.yearly_stats?.total_deductions || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">월 평균 급여</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.yearly_stats?.average_gross_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 급여명세서 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">급여명세서 목록</h3>
          <p className="text-sm text-gray-600">
            총 {payrollData?.pagination?.total || 0}개의 급여명세서가 있습니다.
          </p>
        </div>

        {payrollData?.payroll_records?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {payrollData.payroll_records.map((payroll) => (
              <div key={payroll.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {payroll.year}년 {getMonthName(payroll.month)}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payroll.is_final 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payroll.is_final ? '확정' : payroll.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 지급액</span>
                    <span className="text-sm font-medium text-gray-900">
                      {payroll.gross_pay.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">공제액</span>
                    <span className="text-sm font-medium text-red-600">
                      -{payroll.total_deductions.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700">실지급액</span>
                    <span className="text-lg font-bold text-blue-600">
                      {payroll.net_pay.toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {payroll.work_days}일 근무
                  </div>
                  <div className="flex items-center">
                    <Receipt className="w-3 h-3 mr-1" />
                    연차 {payroll.annual_leave_used}일 사용
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedPayroll(payroll);
                      setShowDetailModal(true);
                    }}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    상세보기
                  </button>
                  <button
                    onClick={() => {
                      // PDF 다운로드 기능 (Phase 3에서 구현 예정)
                      alert('PDF 다운로드 기능은 곧 제공될 예정입니다.');
                    }}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-100 flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">급여명세서가 없습니다</h3>
            <p className="text-gray-600">
              {filters.year}년에 대한 급여명세서가 아직 생성되지 않았습니다.
            </p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {payrollData?.pagination?.pages > 1 && (
        <div className="flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({ length: payrollData.pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setFilters({...filters, page})}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === filters.page
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* 급여명세서 상세 모달 */}
      {showDetailModal && selectedPayroll && (
        <PayrollDetailModal
          payroll={selectedPayroll}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPayroll(null);
          }}
        />
      )}
    </div>
  );
};

// 급여명세서 상세 모달 컴포넌트
const PayrollDetailModal = ({ payroll, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            급여명세서 - {payroll.year}년 {payroll.month}월
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 급여명세서 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold">{payroll.employee?.name}</h4>
              <p className="text-blue-100">
                {payroll.employee?.employee_number} | {payroll.employee?.position}
              </p>
              <p className="text-blue-100">
                {payroll.employee?.department?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">급여 기간</p>
              <p className="text-xl font-bold">{payroll.period}</p>
              <p className="text-blue-100">{payroll.work_days}일 근무</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 지급 내역 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center">
              <Banknote className="w-5 h-5 mr-2" />
              지급 내역
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">기본급</span>
                <span className="font-medium text-green-900">{payroll.basic_salary.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">직책수당</span>
                <span className="font-medium text-green-900">{payroll.position_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">식대</span>
                <span className="font-medium text-green-900">{payroll.meal_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">교통비</span>
                <span className="font-medium text-green-900">{payroll.transport_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">가족수당</span>
                <span className="font-medium text-green-900">{payroll.family_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">연장근무수당</span>
                <span className="font-medium text-green-900">{payroll.overtime_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">야간근무수당</span>
                <span className="font-medium text-green-900">{payroll.night_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">휴일근무수당</span>
                <span className="font-medium text-green-900">{payroll.holiday_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">기타수당</span>
                <span className="font-medium text-green-900">{payroll.other_allowances.toLocaleString()}원</span>
              </div>
              
              <div className="border-t border-green-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">성과급</span>
                  <span className="font-medium text-green-900">{payroll.performance_bonus.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">연말보너스</span>
                  <span className="font-medium text-green-900">{payroll.annual_bonus.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">특별보너스</span>
                  <span className="font-medium text-green-900">{payroll.special_bonus.toLocaleString()}원</span>
                </div>
              </div>

              <div className="border-t-2 border-green-400 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-800">총 지급액</span>
                  <span className="text-xl font-bold text-green-900">{payroll.gross_pay.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 공제 내역 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-lg font-bold text-red-800 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              공제 내역
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">국민연금</span>
                <span className="font-medium text-red-900">{payroll.national_pension.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">건강보험</span>
                <span className="font-medium text-red-900">{payroll.health_insurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">고용보험</span>
                <span className="font-medium text-red-900">{payroll.employment_insurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">장기요양보험</span>
                <span className="font-medium text-red-900">{payroll.long_term_care.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">소득세</span>
                <span className="font-medium text-red-900">{payroll.income_tax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">지방소득세</span>
                <span className="font-medium text-red-900">{payroll.local_tax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">조합비</span>
                <span className="font-medium text-red-900">{payroll.union_fee.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-700">기타공제</span>
                <span className="font-medium text-red-900">{payroll.other_deductions.toLocaleString()}원</span>
              </div>

              <div className="border-t-2 border-red-400 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-red-800">총 공제액</span>
                  <span className="text-xl font-bold text-red-900">{payroll.total_deductions.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 실지급액 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-blue-800 flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                실지급액
              </h4>
              <p className="text-sm text-blue-600">총 지급액에서 공제액을 차감한 금액</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-900">{payroll.net_pay.toLocaleString()}원</p>
              <p className="text-sm text-blue-600">
                = {payroll.gross_pay.toLocaleString()}원 - {payroll.total_deductions.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 근무 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              근무 정보
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">근무일수</span>
                <span className="font-medium text-gray-900">{payroll.work_days}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">연장근무시간</span>
                <span className="font-medium text-gray-900">{payroll.overtime_hours}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">야간근무시간</span>
                <span className="font-medium text-gray-900">{payroll.night_hours}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">휴일근무시간</span>
                <span className="font-medium text-gray-900">{payroll.holiday_hours}시간</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              연차 정보
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-yellow-700">사용 연차</span>
                <span className="font-medium text-yellow-900">{payroll.annual_leave_used}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-700">잔여 연차</span>
                <span className="font-medium text-yellow-900">{payroll.annual_leave_remaining}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-700">상태</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  payroll.is_final 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {payroll.is_final ? '확정' : payroll.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 */}
        {payroll.memo && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
            <h4 className="text-lg font-bold text-purple-800 mb-2 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              메모
            </h4>
            <p className="text-purple-700">{payroll.memo}</p>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              // PDF 다운로드 기능 (Phase 3에서 구현 예정)
              alert('PDF 다운로드 기능은 곧 제공될 예정입니다.');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF 다운로드
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollUser;

