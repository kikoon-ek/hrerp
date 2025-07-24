import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const AttendanceUser = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // 오늘 출퇴근 현황 조회
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5003/api/attendance/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    refetchInterval: 30000 // 30초마다 갱신
  });

  // 월별 출퇴근 기록 조회
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['attendance-monthly', selectedMonth],
    queryFn: async () => {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await axios.get(`http://localhost:5003/api/attendance?start_date=${startDate}&end_date=${endDateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // 출근 등록
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('http://localhost:5003/api/attendance/check-in', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-today']);
      queryClient.invalidateQueries(['attendance-monthly']);
    }
  });

  // 퇴근 등록
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('http://localhost:5003/api/attendance/check-out', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-today']);
      queryClient.invalidateQueries(['attendance-monthly']);
    }
  });

  const handleCheckIn = () => {
    if (confirm('출근을 등록하시겠습니까?')) {
      checkInMutation.mutate();
    }
  };

  const handleCheckOut = () => {
    if (confirm('퇴근을 등록하시겠습니까?')) {
      checkOutMutation.mutate();
    }
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

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5); // HH:MM 형식으로 표시
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const todayRecord = todayData?.record;
  const currentTime = getCurrentTime();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">출퇴근 관리</h1>
        <div className="text-lg font-mono text-gray-600">
          {currentTime}
        </div>
      </div>

      {/* 오늘 출퇴근 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">오늘 출퇴근 현황</h2>
        
        {todayLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 출퇴근 버튼 */}
            <div className="flex space-x-4">
              <button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending || (todayRecord && todayRecord.check_in)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkInMutation.isPending ? '등록 중...' : '출근'}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending || !todayRecord?.check_in || todayRecord?.check_out}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkOutMutation.isPending ? '등록 중...' : '퇴근'}
              </button>
            </div>

            {/* 오늘 기록 정보 */}
            {todayRecord ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">출근시간</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatTime(todayRecord.check_in)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">퇴근시간</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatTime(todayRecord.check_out)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">근무시간</div>
                  <div className="text-lg font-semibold text-green-600">
                    {todayRecord.work_hours ? `${todayRecord.work_hours.toFixed(1)}시간` : '-'}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">상태</div>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(todayRecord.status)}`}>
                      {todayRecord.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                아직 출근 등록을 하지 않았습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 월별 출퇴근 기록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">월별 출퇴근 기록</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">월 선택</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  메모
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : monthlyData?.records?.length > 0 ? (
                monthlyData.records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('ko-KR', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.check_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.check_out)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.work_hours ? `${record.work_hours.toFixed(1)}시간` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {record.note || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    해당 월의 출퇴근 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 월별 통계 */}
        {monthlyData?.records?.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">월별 통계</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {monthlyData.records.length}일
                </div>
                <div className="text-xs text-gray-600">총 근무일</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {monthlyData.records.filter(r => r.status === '출근').length}일
                </div>
                <div className="text-xs text-gray-600">정상 출근</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-yellow-600">
                  {monthlyData.records.filter(r => r.status === '지각').length}일
                </div>
                <div className="text-xs text-gray-600">지각</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  {monthlyData.records.reduce((sum, r) => sum + (r.work_hours || 0), 0).toFixed(1)}시간
                </div>
                <div className="text-xs text-gray-600">총 근무시간</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceUser;

