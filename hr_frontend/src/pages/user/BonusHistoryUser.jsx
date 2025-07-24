import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  DollarSign, Calendar, TrendingUp, Award, FileText, 
  Eye, Download, CheckCircle, Clock, AlertCircle
} from 'lucide-react';

const BonusHistoryUser = () => {
  const { user } = useAuthStore();
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 내 성과급 내역 조회
  const { data: bonusHistoryData, isLoading } = useQuery({
    queryKey: ['my-bonus-history'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5005/api/my-bonus-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('성과급 내역을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      '계산완료': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      '승인': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      '지급완료': { bg: 'bg-purple-100', text: 'text-purple-800', icon: DollarSign }
    };
    
    const config = statusConfig[status] || statusConfig['계산완료'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const calculateTotalBonus = () => {
    if (!bonusHistoryData?.bonus_history) return 0;
    return bonusHistoryData.bonus_history.reduce((sum, bonus) => {
      return sum + (bonus.payment ? bonus.payment.net_amount : bonus.final_bonus);
    }, 0);
  };

  const calculateYearlyBonus = (year) => {
    if (!bonusHistoryData?.bonus_history) return 0;
    return bonusHistoryData.bonus_history
      .filter(bonus => {
        const bonusYear = new Date(bonus.created_at).getFullYear();
        return bonusYear === year;
      })
      .reduce((sum, bonus) => {
        return sum + (bonus.payment ? bonus.payment.net_amount : bonus.final_bonus);
      }, 0);
  };

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 성과급 내역</h1>
        <p className="text-gray-600">나의 성과급 지급 내역을 확인할 수 있습니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 성과급</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculateTotalBonus().toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{currentYear}년 성과급</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculateYearlyBonus(currentYear).toLocaleString()}원
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
              <p className="text-sm font-medium text-gray-600">{lastYear}년 성과급</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculateYearlyBonus(lastYear).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">지급 횟수</p>
              <p className="text-2xl font-bold text-gray-900">
                {bonusHistoryData?.bonus_history?.length || 0}회
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 성과급 내역 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">성과급 지급 내역</h3>
        </div>
        
        {bonusHistoryData?.bonus_history?.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">성과급 내역이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              아직 지급된 성과급이 없습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    계산 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    성과 점수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    성과급 금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    지급 정보
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
                {bonusHistoryData?.bonus_history?.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {bonus.calculation?.title || '성과급 계산'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {bonus.calculation?.period} | {new Date(bonus.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        개인: {bonus.individual_score}점
                      </div>
                      <div className="text-sm text-gray-500">
                        팀: {bonus.team_score}점 | 전사: {bonus.company_score}점
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bonus.final_bonus.toLocaleString()}원
                      </div>
                      {bonus.adjustment_amount !== 0 && (
                        <div className="text-sm text-blue-600">
                          조정: {bonus.adjustment_amount > 0 ? '+' : ''}{bonus.adjustment_amount.toLocaleString()}원
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        기여도: {bonus.contribution_ratio.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bonus.payment ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            실지급: {bonus.payment.net_amount.toLocaleString()}원
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(bonus.payment.payment_date).toLocaleDateString()} | {bonus.payment.payment_method}
                          </div>
                          {bonus.payment.tax_amount > 0 && (
                            <div className="text-sm text-red-600">
                              세금: {bonus.payment.tax_amount.toLocaleString()}원
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          지급 예정
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(bonus.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBonus(bonus);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 성과급 상세 모달 */}
      {showDetailModal && selectedBonus && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">성과급 상세 정보</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Eye className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">계산 정보</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">제목:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedBonus.calculation?.title || '성과급 계산'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">기간:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedBonus.calculation?.period}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">상태:</span>
                      <span>{getStatusBadge(selectedBonus.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">직원 정보</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">기본급:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedBonus.base_salary.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">직급:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedBonus.position_level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 성과 정보 */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">성과 점수</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">개인 성과:</span>
                      <span className="text-sm font-medium text-blue-900">
                        {selectedBonus.individual_score}점 (가중치: {(selectedBonus.individual_weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">팀 성과:</span>
                      <span className="text-sm font-medium text-blue-900">
                        {selectedBonus.team_score}점 (가중치: {(selectedBonus.team_weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">전사 성과:</span>
                      <span className="text-sm font-medium text-blue-900">
                        {selectedBonus.company_score}점 (가중치: {(selectedBonus.company_weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-3">성과급 계산</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">기본 성과급:</span>
                      <span className="text-sm font-medium text-green-900">
                        {selectedBonus.base_bonus.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">성과 성과급:</span>
                      <span className="text-sm font-medium text-green-900">
                        {selectedBonus.performance_bonus.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">팀 성과급:</span>
                      <span className="text-sm font-medium text-green-900">
                        {selectedBonus.team_bonus.toLocaleString()}원
                      </span>
                    </div>
                    {selectedBonus.adjustment_amount !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">조정 금액:</span>
                        <span className="text-sm font-medium text-green-900">
                          {selectedBonus.adjustment_amount > 0 ? '+' : ''}{selectedBonus.adjustment_amount.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <div className="border-t border-green-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-700">최종 성과급:</span>
                        <span className="text-lg font-bold text-green-900">
                          {selectedBonus.final_bonus.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-green-700">전체 기여도:</span>
                        <span className="text-sm font-medium text-green-900">
                          {selectedBonus.contribution_ratio.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 지급 정보 */}
            {selectedBonus.payment && (
              <div className="mt-6 bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-900 mb-3">지급 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-purple-700">지급일:</span>
                    <div className="text-sm font-medium text-purple-900">
                      {new Date(selectedBonus.payment.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-purple-700">지급 방법:</span>
                    <div className="text-sm font-medium text-purple-900">
                      {selectedBonus.payment.payment_method}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-purple-700">실지급액:</span>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedBonus.payment.net_amount.toLocaleString()}원
                    </div>
                  </div>
                </div>
                {selectedBonus.payment.tax_amount > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">총 지급액:</span>
                      <span className="text-sm font-medium text-purple-900">
                        {selectedBonus.payment.payment_amount.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">세금:</span>
                      <span className="text-sm font-medium text-red-600">
                        -{selectedBonus.payment.tax_amount.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                )}
                {selectedBonus.payment.processing_note && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <span className="text-sm text-purple-700">처리 메모:</span>
                    <div className="text-sm text-purple-900 mt-1">
                      {selectedBonus.payment.processing_note}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 조정 사유 */}
            {selectedBonus.adjustment_reason && (
              <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">조정 사유</h4>
                <p className="text-sm text-yellow-800">{selectedBonus.adjustment_reason}</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusHistoryUser;

