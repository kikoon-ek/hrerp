import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  Plus, Calculator, Eye, Check, X, DollarSign, Users, TrendingUp,
  Calendar, FileText, Settings, Download, Filter
} from 'lucide-react';

const BonusCalculationManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCalculation, setSelectedCalculation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    period: '',
    page: 1,
    per_page: 10
  });

  // 성과급 계산 목록 조회
  const { data: calculationsData, isLoading } = useQuery({
    queryKey: ['bonus-calculations', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5005/api/bonus-calculations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('성과급 계산 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 성과급 정책 목록 조회
  const { data: policiesData } = useQuery({
    queryKey: ['bonus-policies'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5005/api/bonus-policies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('성과급 정책을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 성과급 계산 생성
  const createCalculationMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('http://localhost:5005/api/bonus-calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('성과급 계산 생성에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-calculations']);
      setShowCreateModal(false);
    }
  });

  // 성과급 계산 실행
  const executeCalculationMutation = useMutation({
    mutationFn: async (calculationId) => {
      const response = await fetch(`http://localhost:5005/api/bonus-calculations/${calculationId}/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('성과급 계산 실행에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-calculations']);
    }
  });

  // 성과급 계산 승인
  const approveCalculationMutation = useMutation({
    mutationFn: async (calculationId) => {
      const response = await fetch(`http://localhost:5005/api/bonus-calculations/${calculationId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('성과급 계산 승인에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-calculations']);
    }
  });

  const handleCreateCalculation = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      period: formData.get('period'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      bonus_policy_id: parseInt(formData.get('bonus_policy_id')),
      total_amount: parseFloat(formData.get('total_amount'))
    };
    createCalculationMutation.mutate(data);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      '초안': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText },
      '계산중': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Calculator },
      '완료': { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      '승인': { bg: 'bg-purple-100', text: 'text-purple-800', icon: Check },
      '지급완료': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: DollarSign }
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
          <h1 className="text-2xl font-bold text-gray-900">성과급 계산 관리</h1>
          <p className="text-gray-600">성과급 계산 및 분배를 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 계산 생성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 계산 건수</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculationsData?.total || 0}
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
              <p className="text-sm font-medium text-gray-600">총 성과급 금액</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculationsData?.calculations?.reduce((sum, calc) => sum + calc.total_amount, 0)?.toLocaleString() || 0}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">대상 직원 수</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculationsData?.calculations?.reduce((sum, calc) => sum + calc.total_employees, 0) || 0}명
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
              <p className="text-sm font-medium text-gray-600">평균 성과급</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculationsData?.calculations?.length > 0 
                  ? Math.round(calculationsData.calculations.reduce((sum, calc) => sum + calc.average_bonus, 0) / calculationsData.calculations.length).toLocaleString()
                  : 0}원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              placeholder="제목 또는 설명 검색..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              <option value="계산중">계산중</option>
              <option value="완료">완료</option>
              <option value="승인">승인</option>
              <option value="지급완료">지급완료</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
            <input
              type="text"
              placeholder="2025-Q1, 2025-H1 등"
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({search: '', status: '', period: '', page: 1, per_page: 10})}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 성과급 계산 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">성과급 계산 목록</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목 / 기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상 직원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calculationsData?.calculations?.map((calculation) => (
                <tr key={calculation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {calculation.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {calculation.period} ({new Date(calculation.start_date).toLocaleDateString()} ~ {new Date(calculation.end_date).toLocaleDateString()})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {calculation.total_amount.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-500">
                      분배: {calculation.total_distributed.toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {calculation.total_employees}명
                    </div>
                    <div className="text-sm text-gray-500">
                      평균: {Math.round(calculation.average_bonus).toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(calculation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(calculation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCalculation(calculation);
                          setShowDistributionModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {calculation.status === '초안' && (
                        <button
                          onClick={() => executeCalculationMutation.mutate(calculation.id)}
                          className="text-green-600 hover:text-green-900"
                          disabled={executeCalculationMutation.isLoading}
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                      )}
                      {calculation.status === '완료' && (
                        <button
                          onClick={() => approveCalculationMutation.mutate(calculation.id)}
                          className="text-purple-600 hover:text-purple-900"
                          disabled={approveCalculationMutation.isLoading}
                        >
                          <Check className="w-4 h-4" />
                        </button>
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
      {calculationsData?.pages > 1 && (
        <div className="flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({ length: calculationsData.pages }, (_, i) => i + 1).map((page) => (
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

      {/* 성과급 계산 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">새 성과급 계산 생성</h3>
              <form onSubmit={handleCreateCalculation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2025년 1분기 성과급"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    name="description"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="성과급 계산에 대한 설명을 입력하세요."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
                  <input
                    type="text"
                    name="period"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2025-Q1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성과급 정책</label>
                  <select
                    name="bonus_policy_id"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">정책을 선택하세요</option>
                    {policiesData?.policies?.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name} (개인:{policy.ratio_personal}% 팀:{policy.ratio_team}% 전사:{policy.ratio_base}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">총 성과급 금액</label>
                  <input
                    type="number"
                    name="total_amount"
                    required
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100000000"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={createCalculationMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createCalculationMutation.isLoading ? '생성 중...' : '생성'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 분배 결과 모달 */}
      {showDistributionModal && selectedCalculation && (
        <BonusDistributionModal
          calculation={selectedCalculation}
          onClose={() => {
            setShowDistributionModal(false);
            setSelectedCalculation(null);
          }}
        />
      )}
    </div>
  );
};

// 성과급 분배 결과 모달 컴포넌트
const BonusDistributionModal = ({ calculation, onClose }) => {
  const [filters, setFilters] = useState({
    search: '',
    department_id: '',
    page: 1,
    per_page: 20
  });

  const { data: distributionsData, isLoading } = useQuery({
    queryKey: ['bonus-distributions', calculation.id, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5005/api/bonus-calculations/${calculation.id}/distributions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('분배 결과를 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-5/6 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            성과급 분배 결과 - {calculation.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 요약 정보 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600">총 성과급</div>
            <div className="text-xl font-bold text-blue-900">
              {calculation.total_amount.toLocaleString()}원
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600">분배 금액</div>
            <div className="text-xl font-bold text-green-900">
              {calculation.total_distributed.toLocaleString()}원
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600">대상 직원</div>
            <div className="text-xl font-bold text-purple-900">
              {calculation.total_employees}명
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600">평균 성과급</div>
            <div className="text-xl font-bold text-orange-900">
              {Math.round(calculation.average_bonus).toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 분배 결과 테이블 */}
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  직원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  부서/직급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  성과 점수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  최종 성과급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  기여도
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {distributionsData?.distributions?.map((distribution) => (
                <tr key={distribution.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {distribution.employee?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {distribution.employee?.employee_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {distribution.department?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {distribution.position_level}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      개인: {distribution.individual_score}점
                    </div>
                    <div className="text-sm text-gray-500">
                      팀: {distribution.team_score}점 | 전사: {distribution.company_score}점
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {distribution.final_bonus.toLocaleString()}원
                    </div>
                    {distribution.adjustment_amount !== 0 && (
                      <div className="text-sm text-blue-600">
                        조정: {distribution.adjustment_amount > 0 ? '+' : ''}{distribution.adjustment_amount.toLocaleString()}원
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {distribution.contribution_ratio.toFixed(2)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
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

export default BonusCalculationManagement;

