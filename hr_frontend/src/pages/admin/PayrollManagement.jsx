import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  Plus, Calculator, Eye, Check, X, DollarSign, Users, TrendingUp,
  Calendar, FileText, Settings, Download, Filter, Edit, Trash2,
  Lock, Unlock, AlertCircle
} from 'lucide-react';

const PayrollManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    period: '',
    department_id: '',
    status: '',
    page: 1,
    per_page: 10
  });

  // 급여명세서 목록 조회
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll-records', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5005/api/payroll-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여명세서 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 직원 목록 조회
  const { data: employeesData } = useQuery({
    queryKey: ['employees-simple'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5005/api/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('직원 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 부서 목록 조회
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-simple'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5005/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('부서 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 급여 기간 목록 조회
  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5005/api/payroll-periods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여 기간을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 급여명세서 생성
  const createPayrollMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('http://localhost:5005/api/payroll-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('급여명세서 생성에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-records']);
      setShowCreateModal(false);
    }
  });

  // 급여명세서 수정
  const updatePayrollMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`http://localhost:5005/api/payroll-records/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('급여명세서 수정에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-records']);
      setShowEditModal(false);
      setSelectedPayroll(null);
    }
  });

  // 급여명세서 확정
  const finalizePayrollMutation = useMutation({
    mutationFn: async (payrollId) => {
      const response = await fetch(`http://localhost:5005/api/payroll-records/${payrollId}/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여명세서 확정에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-records']);
    }
  });

  // 급여명세서 삭제
  const deletePayrollMutation = useMutation({
    mutationFn: async (payrollId) => {
      const response = await fetch(`http://localhost:5005/api/payroll-records/${payrollId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('급여명세서 삭제에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-records']);
    }
  });

  const handleCreatePayroll = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      period: formData.get('period'),
      basic_salary: parseFloat(formData.get('basic_salary')) || 0,
      position_allowance: parseFloat(formData.get('position_allowance')) || 0,
      meal_allowance: parseFloat(formData.get('meal_allowance')) || 0,
      transport_allowance: parseFloat(formData.get('transport_allowance')) || 0,
      family_allowance: parseFloat(formData.get('family_allowance')) || 0,
      overtime_allowance: parseFloat(formData.get('overtime_allowance')) || 0,
      performance_bonus: parseFloat(formData.get('performance_bonus')) || 0,
      annual_bonus: parseFloat(formData.get('annual_bonus')) || 0,
      union_fee: parseFloat(formData.get('union_fee')) || 0,
      other_deductions: parseFloat(formData.get('other_deductions')) || 0,
      work_days: parseInt(formData.get('work_days')) || 0,
      overtime_hours: parseFloat(formData.get('overtime_hours')) || 0,
      annual_leave_used: parseInt(formData.get('annual_leave_used')) || 0,
      annual_leave_remaining: parseInt(formData.get('annual_leave_remaining')) || 0,
      memo: formData.get('memo') || ''
    };
    createPayrollMutation.mutate(data);
  };

  const handleUpdatePayroll = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      basic_salary: parseFloat(formData.get('basic_salary')) || 0,
      position_allowance: parseFloat(formData.get('position_allowance')) || 0,
      meal_allowance: parseFloat(formData.get('meal_allowance')) || 0,
      transport_allowance: parseFloat(formData.get('transport_allowance')) || 0,
      family_allowance: parseFloat(formData.get('family_allowance')) || 0,
      overtime_allowance: parseFloat(formData.get('overtime_allowance')) || 0,
      performance_bonus: parseFloat(formData.get('performance_bonus')) || 0,
      annual_bonus: parseFloat(formData.get('annual_bonus')) || 0,
      union_fee: parseFloat(formData.get('union_fee')) || 0,
      other_deductions: parseFloat(formData.get('other_deductions')) || 0,
      work_days: parseInt(formData.get('work_days')) || 0,
      overtime_hours: parseFloat(formData.get('overtime_hours')) || 0,
      annual_leave_used: parseInt(formData.get('annual_leave_used')) || 0,
      annual_leave_remaining: parseInt(formData.get('annual_leave_remaining')) || 0,
      memo: formData.get('memo') || ''
    };
    updatePayrollMutation.mutate({ id: selectedPayroll.id, data });
  };

  const getStatusBadge = (status, isFinal) => {
    if (isFinal) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Lock className="w-3 h-3 mr-1" />
          확정
        </span>
      );
    }
    
    const statusConfig = {
      '초안': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText },
      '확정': { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      '지급완료': { bg: 'bg-blue-100', text: 'text-blue-800', icon: DollarSign }
    };
    
    const config = statusConfig[status] || statusConfig['초안'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">급여명세서 관리</h1>
          <p className="text-gray-600">직원들의 급여명세서를 생성하고 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          급여명세서 생성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 명세서 수</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollData?.statistics?.total_records || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 지급액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.statistics?.total_gross_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">실지급액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.statistics?.total_net_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">평균 급여</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(payrollData?.statistics?.average_net_pay || 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              placeholder="직원명 또는 사번 검색..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">급여 기간</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {periodsData?.periods?.map((period) => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({...filters, department_id: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {departmentsData?.departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="초안">초안</option>
              <option value="확정">확정</option>
              <option value="지급완료">지급완료</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({search: '', period: '', department_id: '', status: '', page: 1, per_page: 10})}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 급여명세서 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">급여명세서 목록</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직원 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  급여 기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 지급액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실지급액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData?.payroll_records?.map((payroll) => (
                <tr key={payroll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payroll.employee?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payroll.employee?.employee_number} | {payroll.employee?.position}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payroll.employee?.department?.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payroll.period}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payroll.work_days}일 근무
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payroll.gross_pay.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-500">
                      기본급: {payroll.basic_salary.toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payroll.net_pay.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-500">
                      공제: {payroll.total_deductions.toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payroll.status, payroll.is_final)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayroll(payroll);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!payroll.is_final && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowEditModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => finalizePayrollMutation.mutate(payroll.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="확정"
                            disabled={finalizePayrollMutation.isLoading}
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('정말 삭제하시겠습니까?')) {
                                deletePayrollMutation.mutate(payroll.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="삭제"
                            disabled={deletePayrollMutation.isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {/* 급여명세서 생성 모달 */}
      {showCreateModal && (
        <PayrollCreateModal
          employees={employeesData?.employees || []}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePayroll}
          isLoading={createPayrollMutation.isLoading}
        />
      )}

      {/* 급여명세서 수정 모달 */}
      {showEditModal && selectedPayroll && (
        <PayrollEditModal
          payroll={selectedPayroll}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPayroll(null);
          }}
          onSubmit={handleUpdatePayroll}
          isLoading={updatePayrollMutation.isLoading}
        />
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

// 급여명세서 생성 모달 컴포넌트
const PayrollCreateModal = ({ employees, onClose, onSubmit, isLoading }) => {
  const currentDate = new Date();
  const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">급여명세서 생성</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">기본 정보</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원 선택</label>
                <select
                  name="employee_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">직원을 선택하세요</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number}) - {employee.position}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">급여 기간</label>
                <input
                  type="text"
                  name="period"
                  required
                  defaultValue={currentPeriod}
                  placeholder="2025-01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">근무일수</label>
                <input
                  type="number"
                  name="work_days"
                  min="0"
                  max="31"
                  defaultValue="22"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 급여 항목 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">급여 항목</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기본급</label>
                <input
                  type="number"
                  name="basic_salary"
                  required
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직책수당</label>
                <input
                  type="number"
                  name="position_allowance"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">식대</label>
                <input
                  type="number"
                  name="meal_allowance"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">교통비</label>
                <input
                  type="number"
                  name="transport_allowance"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 추가 수당 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">추가 수당</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가족수당</label>
                <input
                  type="number"
                  name="family_allowance"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연장근무수당</label>
                <input
                  type="number"
                  name="overtime_allowance"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연장근무시간</label>
                <input
                  type="number"
                  name="overtime_hours"
                  min="0"
                  step="0.5"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 보너스 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">보너스</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성과급</label>
                <input
                  type="number"
                  name="performance_bonus"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연말보너스</label>
                <input
                  type="number"
                  name="annual_bonus"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 공제 및 연차 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">공제 및 연차</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">조합비</label>
                <input
                  type="number"
                  name="union_fee"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기타공제</label>
                <input
                  type="number"
                  name="other_deductions"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용 연차</label>
                <input
                  type="number"
                  name="annual_leave_used"
                  min="0"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">잔여 연차</label>
                <input
                  type="number"
                  name="annual_leave_remaining"
                  min="0"
                  defaultValue="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              name="memo"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="급여명세서에 대한 메모를 입력하세요."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 급여명세서 수정 모달 컴포넌트
const PayrollEditModal = ({ payroll, onClose, onSubmit, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            급여명세서 수정 - {payroll.employee?.name} ({payroll.period})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 급여 항목 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">급여 항목</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기본급</label>
                <input
                  type="number"
                  name="basic_salary"
                  required
                  min="0"
                  step="1000"
                  defaultValue={payroll.basic_salary}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직책수당</label>
                <input
                  type="number"
                  name="position_allowance"
                  min="0"
                  step="1000"
                  defaultValue={payroll.position_allowance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">식대</label>
                <input
                  type="number"
                  name="meal_allowance"
                  min="0"
                  step="1000"
                  defaultValue={payroll.meal_allowance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">교통비</label>
                <input
                  type="number"
                  name="transport_allowance"
                  min="0"
                  step="1000"
                  defaultValue={payroll.transport_allowance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가족수당</label>
                <input
                  type="number"
                  name="family_allowance"
                  min="0"
                  step="1000"
                  defaultValue={payroll.family_allowance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연장근무수당</label>
                <input
                  type="number"
                  name="overtime_allowance"
                  min="0"
                  step="1000"
                  defaultValue={payroll.overtime_allowance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 보너스 및 공제 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">보너스 및 공제</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성과급</label>
                <input
                  type="number"
                  name="performance_bonus"
                  min="0"
                  step="1000"
                  defaultValue={payroll.performance_bonus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연말보너스</label>
                <input
                  type="number"
                  name="annual_bonus"
                  min="0"
                  step="1000"
                  defaultValue={payroll.annual_bonus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">조합비</label>
                <input
                  type="number"
                  name="union_fee"
                  min="0"
                  step="1000"
                  defaultValue={payroll.union_fee}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기타공제</label>
                <input
                  type="number"
                  name="other_deductions"
                  min="0"
                  step="1000"
                  defaultValue={payroll.other_deductions}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">근무일수</label>
                <input
                  type="number"
                  name="work_days"
                  min="0"
                  max="31"
                  defaultValue={payroll.work_days}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연장근무시간</label>
                <input
                  type="number"
                  name="overtime_hours"
                  min="0"
                  step="0.5"
                  defaultValue={payroll.overtime_hours}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사용 연차</label>
              <input
                type="number"
                name="annual_leave_used"
                min="0"
                defaultValue={payroll.annual_leave_used}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">잔여 연차</label>
              <input
                type="number"
                name="annual_leave_remaining"
                min="0"
                defaultValue={payroll.annual_leave_remaining}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              name="memo"
              rows="3"
              defaultValue={payroll.memo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="급여명세서에 대한 메모를 입력하세요."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 급여명세서 상세 모달 컴포넌트
const PayrollDetailModal = ({ payroll, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-5xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            급여명세서 상세 - {payroll.employee?.name} ({payroll.period})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 직원 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">직원 정보</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">이름:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.employee?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">사번:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.employee?.employee_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">부서:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.employee?.department?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">직급:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.employee?.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">급여 기간:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">근무일수:</span>
                <span className="text-sm font-medium text-gray-900">{payroll.work_days}일</span>
              </div>
            </div>
          </div>

          {/* 급여 지급 내역 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">지급 내역</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">기본급:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.basic_salary.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">직책수당:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.position_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">식대:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.meal_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">교통비:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.transport_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">가족수당:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.family_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">연장근무수당:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.overtime_allowance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">성과급:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.performance_bonus.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">연말보너스:</span>
                <span className="text-sm font-medium text-blue-900">{payroll.annual_bonus.toLocaleString()}원</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-blue-700">총 지급액:</span>
                  <span className="text-lg font-bold text-blue-900">{payroll.gross_pay.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* 공제 내역 */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-red-900 mb-3">공제 내역</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-red-700">국민연금:</span>
                <span className="text-sm font-medium text-red-900">{payroll.national_pension.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">건강보험:</span>
                <span className="text-sm font-medium text-red-900">{payroll.health_insurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">고용보험:</span>
                <span className="text-sm font-medium text-red-900">{payroll.employment_insurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">장기요양보험:</span>
                <span className="text-sm font-medium text-red-900">{payroll.long_term_care.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">소득세:</span>
                <span className="text-sm font-medium text-red-900">{payroll.income_tax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">지방소득세:</span>
                <span className="text-sm font-medium text-red-900">{payroll.local_tax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">조합비:</span>
                <span className="text-sm font-medium text-red-900">{payroll.union_fee.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">기타공제:</span>
                <span className="text-sm font-medium text-red-900">{payroll.other_deductions.toLocaleString()}원</span>
              </div>
              <div className="border-t border-red-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-red-700">총 공제액:</span>
                  <span className="text-lg font-bold text-red-900">{payroll.total_deductions.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 최종 정보 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 mb-3">최종 정보</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">총 지급액:</span>
                <span className="text-sm font-medium text-green-900">{payroll.gross_pay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">총 공제액:</span>
                <span className="text-sm font-medium text-red-600">-{payroll.total_deductions.toLocaleString()}원</span>
              </div>
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-medium text-green-700">실지급액:</span>
                  <span className="text-2xl font-bold text-green-900">{payroll.net_pay.toLocaleString()}원</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">연장근무시간:</span>
                  <span className="text-sm font-medium text-green-900">{payroll.overtime_hours}시간</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">사용 연차:</span>
                  <span className="text-sm font-medium text-green-900">{payroll.annual_leave_used}일</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">잔여 연차:</span>
                  <span className="text-sm font-medium text-green-900">{payroll.annual_leave_remaining}일</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">상태:</span>
                  <span>{payroll.is_final ? 
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Lock className="w-3 h-3 mr-1" />
                      확정
                    </span>
                    :
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <Unlock className="w-3 h-3 mr-1" />
                      {payroll.status}
                    </span>
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 */}
        {payroll.memo && (
          <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">메모</h4>
            <p className="text-sm text-yellow-800">{payroll.memo}</p>
          </div>
        )}

        <div className="flex justify-end mt-6">
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

export default PayrollManagement;

