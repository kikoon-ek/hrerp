import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const LeaveRequestManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(''); // approve, reject

  // 휴가 신청 목록 조회
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['leave-requests', selectedStatus, selectedType, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedType) params.append('type', selectedType);
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      
      const response = await axios.get(`http://localhost:5003/api/leave-requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
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

  // 휴가 신청 승인
  const approveMutation = useMutation({
    mutationFn: async ({ id, note }) => {
      const response = await axios.post(`http://localhost:5003/api/leave-requests/${id}/approve`, 
        { note }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
      setShowApprovalModal(false);
      setSelectedRequest(null);
    }
  });

  // 휴가 신청 거부
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await axios.post(`http://localhost:5003/api/leave-requests/${id}/reject`, 
        { reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
      setShowApprovalModal(false);
      setSelectedRequest(null);
    }
  });

  // 휴가 신청 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`http://localhost:5003/api/leave-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    }
  });

  const handleApprovalSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (approvalAction === 'approve') {
      const note = formData.get('note');
      approveMutation.mutate({ id: selectedRequest.id, note });
    } else if (approvalAction === 'reject') {
      const reason = formData.get('reason');
      if (!reason) {
        alert('거부 사유를 입력해주세요.');
        return;
      }
      rejectMutation.mutate({ id: selectedRequest.id, reason });
    }
  };

  const openApprovalModal = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalModal(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">휴가 신청 관리</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">전체 상태</option>
              <option value="대기">대기</option>
              <option value="승인">승인</option>
              <option value="거부">거부</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">휴가 유형</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">전체 유형</option>
              <option value="연차">연차</option>
              <option value="병가">병가</option>
              <option value="경조사">경조사</option>
              <option value="기타">기타</option>
            </select>
          </div>
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
        </div>
      </div>

      {/* 휴가 신청 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청자
                </th>
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
              {requestsData?.requests?.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.employee?.employee_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.employee?.department?.name}
                      </div>
                    </div>
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {request.status === '대기' && (
                      <>
                        <button
                          onClick={() => openApprovalModal(request, 'approve')}
                          className="text-green-600 hover:text-green-900"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => openApprovalModal(request, 'reject')}
                          className="text-red-600 hover:text-red-900"
                        >
                          거부
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('정말 삭제하시겠습니까?')) {
                          deleteMutation.mutate(request.id);
                        }
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!requestsData?.requests || requestsData.requests.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            휴가 신청이 없습니다.
          </div>
        )}
      </div>

      {/* 승인/거부 모달 */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              휴가 신청 {approvalAction === 'approve' ? '승인' : '거부'}
            </h2>
            
            {/* 신청 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">신청자:</span>
                <span className="text-sm font-medium">{selectedRequest.employee?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">휴가 유형:</span>
                <span className="text-sm font-medium">{selectedRequest.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">기간:</span>
                <span className="text-sm font-medium">
                  {selectedRequest.start_date} ~ {selectedRequest.end_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">일수:</span>
                <span className="text-sm font-medium">{selectedRequest.days_requested}일</span>
              </div>
              {selectedRequest.reason && (
                <div>
                  <span className="text-sm text-gray-600">사유:</span>
                  <p className="text-sm mt-1">{selectedRequest.reason}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleApprovalSubmit} className="space-y-4">
              {approvalAction === 'approve' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    승인 메모 (선택사항)
                  </label>
                  <textarea
                    name="note"
                    rows="3"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="승인 관련 메모를 입력하세요"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    거부 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reason"
                    rows="3"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="거부 사유를 입력하세요"
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {(approveMutation.isPending || rejectMutation.isPending) 
                    ? '처리 중...' 
                    : (approvalAction === 'approve' ? '승인' : '거부')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestManagement;

