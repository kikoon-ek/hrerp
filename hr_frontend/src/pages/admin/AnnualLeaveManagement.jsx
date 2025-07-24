import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const AnnualLeaveManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('grants'); // grants, usages, balance
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);

  // 연차 부여 내역 조회
  const { data: grantsData, isLoading: grantsLoading } = useQuery({
    queryKey: ['annual-leave-grants', selectedEmployee, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      if (selectedYear) params.append('year', selectedYear);
      
      const response = await axios.get(`http://localhost:5003/api/annual-leave/grants?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: activeTab === 'grants'
  });

  // 연차 사용 내역 조회
  const { data: usagesData, isLoading: usagesLoading } = useQuery({
    queryKey: ['annual-leave-usages', selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      
      const response = await axios.get(`http://localhost:5003/api/annual-leave/usages?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: activeTab === 'usages'
  });

  // 직원 목록 조회
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5003/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // 연차 잔여일수 조회
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['annual-leave-balance', selectedEmployee, selectedYear],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      
      const response = await axios.get(`http://localhost:5003/api/annual-leave/balance/${selectedEmployee}?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: activeTab === 'balance' && !!selectedEmployee
  });

  // 연차 부여
  const grantMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('http://localhost:5003/api/annual-leave/grants', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-grants']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      setShowGrantModal(false);
    }
  });

  // 연차 사용 등록
  const usageMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('http://localhost:5003/api/annual-leave/use', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-usages']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      setShowUsageModal(false);
    }
  });

  const handleGrantSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      total_days: parseFloat(formData.get('total_days')),
      year: parseInt(formData.get('year')),
      grant_date: formData.get('grant_date'),
      note: formData.get('note') || null
    };
    grantMutation.mutate(data);
  };

  const handleUsageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      usage_date: formData.get('usage_date'),
      used_days: parseFloat(formData.get('used_days')),
      note: formData.get('note') || null
    };
    usageMutation.mutate(data);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowGrantModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            연차 부여
          </button>
          <button
            onClick={() => setShowUsageModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            연차 사용 등록
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('grants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'grants'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 부여 내역
          </button>
          <button
            onClick={() => setActiveTab('usages')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 사용 내역
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 잔여 현황
          </button>
        </nav>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">전체 직원</option>
              {employeesData?.employees?.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 연차 부여 내역 탭 */}
      {activeTab === 'grants' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부여일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부여일자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grantsData?.grants?.map((grant) => (
                  <tr key={grant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {grant.employee?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {grant.employee?.employee_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.year}년
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.total_days}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.grant_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grant.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!grantsData?.grants || grantsData.grants.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              연차 부여 내역이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 연차 사용 내역 탭 */}
      {activeTab === 'usages' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용일자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연관 휴가신청
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usagesData?.usages?.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {usage.employee?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {usage.employee?.employee_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.usage_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.used_days}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.leave_request ? `#${usage.leave_request.id}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!usagesData?.usages || usagesData.usages.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              연차 사용 내역이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 연차 잔여 현황 탭 */}
      {activeTab === 'balance' && (
        <div className="bg-white rounded-lg shadow p-6">
          {selectedEmployee ? (
            balanceData ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {balanceData.employee_name}의 {balanceData.year}년 연차 현황
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {balanceData.total_granted}일
                    </div>
                    <div className="text-sm text-gray-600">부여된 연차</div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {balanceData.total_used}일
                    </div>
                    <div className="text-sm text-gray-600">사용한 연차</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {balanceData.remaining}일
                    </div>
                    <div className="text-sm text-gray-600">잔여 연차</div>
                  </div>
                </div>

                {/* 연차 사용률 바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>연차 사용률</span>
                    <span>{balanceData.total_granted > 0 ? Math.round((balanceData.total_used / balanceData.total_granted) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${balanceData.total_granted > 0 ? (balanceData.total_used / balanceData.total_granted) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {balanceLoading ? '로딩 중...' : '연차 정보를 불러올 수 없습니다.'}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              직원을 선택하세요.
            </div>
          )}
        </div>
      )}

      {/* 연차 부여 모달 */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">연차 부여</h2>
            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <select
                  name="employee_id"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">직원을 선택하세요</option>
                  {employeesData?.employees?.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                <select
                  name="year"
                  required
                  defaultValue={currentYear}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부여일수</label>
                <input
                  type="number"
                  name="total_days"
                  step="0.5"
                  min="0"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부여일자</label>
                <input
                  type="date"
                  name="grant_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  name="note"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="메모를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={grantMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {grantMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 연차 사용 등록 모달 */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">연차 사용 등록</h2>
            <form onSubmit={handleUsageSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <select
                  name="employee_id"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">직원을 선택하세요</option>
                  {employeesData?.employees?.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용일자</label>
                <input
                  type="date"
                  name="usage_date"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용일수</label>
                <input
                  type="number"
                  name="used_days"
                  step="0.5"
                  min="0.5"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  name="note"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="메모를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={usageMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {usageMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualLeaveManagement;

