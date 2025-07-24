import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const AnnualLeaveUser = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState('balance'); // balance, requests, usage

  // 연차 잔여 현황 조회
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['my-annual-leave-balance', selectedYear],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:5003/api/annual-leave/my-balance?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // 내 휴가 신청 내역 조회
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-leave-requests'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5003/api/leave-requests/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: activeTab === 'requests'
  });

  // 내 연차 사용 내역 조회
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['my-annual-leave-usage'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5003/api/annual-leave/my-usage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: activeTab === 'usage'
  });

  // 휴가 신청
  const requestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('http://localhost:5003/api/leave-requests', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-leave-requests']);
      queryClient.invalidateQueries(['my-annual-leave-balance']);
      setShowRequestModal(false);
    }
  });

  // 휴가 신청 취소
  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`http://localhost:5003/api/leave-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-leave-requests']);
      queryClient.invalidateQueries(['my-annual-leave-balance']);
    }
  });

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const startDate = new Date(formData.get('start_date'));
    const endDate = new Date(formData.get('end_date'));
    
    if (startDate > endDate) {
      alert('종료일은 시작일보다 늦어야 합니다.');
      return;
    }

    const data = {
      type: formData.get('type'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      reason: formData.get('reason') || null
    };
    
    requestMutation.mutate(data);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '대기': return 'text-yellow-600 bg-yellow-100';
      case '승인': return 'text-green-600 bg-green-100';
      case '거부': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case '연차': return 'text-blue-600 bg-blue-100';
      case '병가': return 'text-red-600 bg-red-100';
      case '경조사': return 'text-purple-600 bg-purple-100';
      case '기타': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          휴가 신청
        </button>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('balance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 현황
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            휴가 신청 내역
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 사용 내역
          </button>
        </nav>
      </div>

      {/* 연차 현황 탭 */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          {/* 연도 선택 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">연도 선택:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
          </div>

          {/* 연차 현황 */}
          <div className="bg-white rounded-lg shadow p-6">
            {balanceLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : balanceData ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {balanceData.year}년 연차 현황
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {balanceData.total_granted}일
                    </div>
                    <div className="text-sm text-gray-600 mt-1">부여된 연차</div>
                  </div>
                  
                  <div className="bg-red-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {balanceData.total_used}일
                    </div>
                    <div className="text-sm text-gray-600 mt-1">사용한 연차</div>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {balanceData.remaining}일
                    </div>
                    <div className="text-sm text-gray-600 mt-1">잔여 연차</div>
                  </div>
                </div>

                {/* 연차 사용률 */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>연차 사용률</span>
                    <span>{balanceData.total_granted > 0 ? Math.round((balanceData.total_used / balanceData.total_granted) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${balanceData.total_granted > 0 ? Math.min((balanceData.total_used / balanceData.total_granted) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* 알림 메시지 */}
                {balanceData.remaining <= 5 && balanceData.remaining > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="text-yellow-600">
                        ⚠️ 잔여 연차가 {balanceData.remaining}일 남았습니다. 연차 사용을 계획해보세요.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                연차 정보를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 휴가 신청 내역 탭 */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    휴가 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사유
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신청일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requestsLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : requestsData?.requests?.length > 0 ? (
                  requestsData.requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(request.type)}`}>
                          {request.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{request.start_date}</div>
                        <div className="text-gray-500">~ {request.end_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.days_requested}일
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {request.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        {request.status === '거부' && request.rejection_reason && (
                          <div className="text-xs text-red-600 mt-1">
                            {request.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === '대기' && (
                          <button
                            onClick={() => {
                              if (confirm('휴가 신청을 취소하시겠습니까?')) {
                                cancelMutation.mutate(request.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      휴가 신청 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 연차 사용 내역 탭 */}
      {activeTab === 'usage' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                {usageLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : usageData?.usages?.length > 0 ? (
                  usageData.usages.map((usage) => (
                    <tr key={usage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {usage.usage_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {usage.used_days}일
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usage.leave_request ? `#${usage.leave_request.id} (${usage.leave_request.type})` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {usage.note || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      연차 사용 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 휴가 신청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">휴가 신청</h2>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴가 유형</label>
                <select
                  name="type"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">휴가 유형을 선택하세요</option>
                  <option value="연차">연차</option>
                  <option value="병가">병가</option>
                  <option value="경조사">경조사</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  name="end_date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <textarea
                  name="reason"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="휴가 사유를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {requestMutation.isPending ? '신청 중...' : '신청'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualLeaveUser;

