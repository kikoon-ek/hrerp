import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const AttendanceManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // 출퇴근 기록 조회
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDate) {
        params.append('start_date', selectedDate);
        params.append('end_date', selectedDate);
      }
      if (selectedEmployee) {
        params.append('employee_id', selectedEmployee);
      }
      
      const response = await axios.get(`http://localhost:5003/api/attendance?${params}`, {
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

  // 출퇴근 기록 생성
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('http://localhost:5003/api/attendance', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
      setShowCreateModal(false);
    }
  });

  // 출퇴근 기록 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`http://localhost:5003/api/attendance/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
      setEditingRecord(null);
    }
  });

  // 출퇴근 기록 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`http://localhost:5003/api/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    }
  });

  const handleCreateRecord = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      date: formData.get('date'),
      check_in: formData.get('check_in') || null,
      check_out: formData.get('check_out') || null,
      note: formData.get('note') || null
    };
    createMutation.mutate(data);
  };

  const handleUpdateRecord = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      check_in: formData.get('check_in') || null,
      check_out: formData.get('check_out') || null,
      note: formData.get('note') || null
    };
    updateMutation.mutate({ id: editingRecord.id, data });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '출근': return 'text-green-600 bg-green-100';
      case '지각': return 'text-yellow-600 bg-yellow-100';
      case '조퇴': return 'text-orange-600 bg-orange-100';
      case '결근': return 'text-red-600 bg-red-100';
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
        <h1 className="text-2xl font-bold text-gray-900">출퇴근 관리</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          출퇴근 기록 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
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

      {/* 출퇴근 기록 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출근시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  퇴근시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  근무시간
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
              {attendanceData?.records?.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.employee?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.employee?.employee_number}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_in || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_out || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.work_hours ? `${record.work_hours.toFixed(1)}시간` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingRecord(record)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('정말 삭제하시겠습니까?')) {
                          deleteMutation.mutate(record.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!attendanceData?.records || attendanceData.records.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            출퇴근 기록이 없습니다.
          </div>
        )}
      </div>

      {/* 출퇴근 기록 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">출퇴근 기록 추가</h2>
            <form onSubmit={handleCreateRecord} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={selectedDate}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">출근시간</label>
                <input
                  type="time"
                  name="check_in"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">퇴근시간</label>
                <input
                  type="time"
                  name="check_out"
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
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 출퇴근 기록 수정 모달 */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">출퇴근 기록 수정</h2>
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <input
                  type="text"
                  value={`${editingRecord.employee?.name} (${editingRecord.employee?.employee_number})`}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  type="text"
                  value={editingRecord.date}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">출근시간</label>
                <input
                  type="time"
                  name="check_in"
                  defaultValue={editingRecord.check_in || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">퇴근시간</label>
                <input
                  type="time"
                  name="check_out"
                  defaultValue={editingRecord.check_out || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  name="note"
                  rows="3"
                  defaultValue={editingRecord.note || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="메모를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;

