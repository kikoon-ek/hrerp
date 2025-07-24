import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Star, FileText, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const EvaluationUser = () => {
  const { api } = useAuthStore();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  // 내 평가 목록 조회
  const fetchMyEvaluations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/my-evaluations');
      setEvaluations(response.data.results || []);
    } catch (error) {
      console.error('내 평가 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 평가 결과 상세 조회
  const fetchEvaluationResult = async (resultId) => {
    try {
      const response = await api.get(`/evaluation-results/${resultId}`);
      setEvaluationResult(response.data.result);
    } catch (error) {
      console.error('평가 결과 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchMyEvaluations();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      '미시작': { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
      '진행중': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      '완료': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      '승인': { bg: 'bg-purple-100', text: 'text-purple-800', icon: Star }
    };
    
    const config = statusConfig[status] || statusConfig['미시작'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  const getGradeBadge = (grade) => {
    const gradeConfig = {
      'S': 'bg-purple-100 text-purple-800',
      'A': 'bg-blue-100 text-blue-800',
      'B': 'bg-green-100 text-green-800',
      'C': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeConfig[grade] || 'bg-gray-100 text-gray-800'}`}>
        {grade}
      </span>
    );
  };

  const handleViewEvaluation = async (evaluation) => {
    setSelectedEvaluation(evaluation);
    await fetchEvaluationResult(evaluation.id);
    setShowEvaluationModal(true);
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">내 성과 평가</h1>
        <p className="text-gray-600">나의 성과 평가 현황을 확인하고 관리하세요</p>
      </div>

      {/* 평가 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">전체 평가</p>
              <p className="text-2xl font-bold text-gray-900">{evaluations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">진행 중</p>
              <p className="text-2xl font-bold text-gray-900">
                {evaluations.filter(e => e.status === '진행중').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">완료</p>
              <p className="text-2xl font-bold text-gray-900">
                {evaluations.filter(e => e.status === '완료' || e.status === '승인').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">평균 점수</p>
              <p className="text-2xl font-bold text-gray-900">
                {evaluations.length > 0 
                  ? Math.round(evaluations.reduce((sum, e) => sum + (e.weighted_score || 0), 0) / evaluations.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 평가 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">평가 목록</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">진행 중인 평가가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {evaluation.evaluation?.title}
                      </h3>
                      {getStatusBadge(evaluation.status)}
                      {evaluation.grade && getGradeBadge(evaluation.grade)}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        평가 기간: {new Date(evaluation.evaluation?.start_date).toLocaleDateString()} ~ {new Date(evaluation.evaluation?.end_date).toLocaleDateString()}
                      </div>
                      {evaluation.weighted_score && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          점수: {Math.round(evaluation.weighted_score)}점
                        </div>
                      )}
                    </div>

                    {evaluation.evaluation?.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {evaluation.evaluation.description}
                      </p>
                    )}

                    {/* 진행률 표시 */}
                    {evaluation.status === '진행중' && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>진행률</span>
                          <span>
                            {evaluation.scores?.length || 0} / {evaluation.evaluation?.criteria?.items_count || 0} 항목 완료
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${evaluation.evaluation?.criteria?.items_count > 0 
                                ? ((evaluation.scores?.length || 0) / evaluation.evaluation.criteria.items_count) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* 평가자 정보 */}
                    {evaluation.evaluator && (
                      <div className="text-sm text-gray-600">
                        평가자: {evaluation.evaluator.name} ({evaluation.evaluator.position})
                      </div>
                    )}
                  </div>

                  <div className="ml-6">
                    <button
                      onClick={() => handleViewEvaluation(evaluation)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {evaluation.status === '미시작' || evaluation.status === '진행중' ? '평가 진행' : '결과 보기'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 평가 상세/진행 모달 */}
      {showEvaluationModal && selectedEvaluation && (
        <EvaluationModal
          evaluation={selectedEvaluation}
          evaluationResult={evaluationResult}
          onClose={() => {
            setShowEvaluationModal(false);
            setSelectedEvaluation(null);
            setEvaluationResult(null);
          }}
          onUpdate={fetchMyEvaluations}
        />
      )}
    </div>
  );
};

// 평가 모달 컴포넌트
const EvaluationModal = ({ evaluation, evaluationResult, onClose, onUpdate }) => {
  const { api } = useAuthStore();
  const [formData, setFormData] = useState({
    self_evaluation: evaluationResult?.self_evaluation || '',
    scores: evaluationResult?.scores || []
  });
  const [saving, setSaving] = useState(false);

  const isEditable = evaluation.status === '미시작' || evaluation.status === '진행중';

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/evaluation-results/${evaluation.id}`, {
        ...formData,
        status: '진행중'
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('평가 저장 실패:', error);
      alert('평가 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('평가를 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) return;
    
    try {
      setSaving(true);
      await api.put(`/evaluation-results/${evaluation.id}`, {
        ...formData,
        status: '완료'
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('평가 제출 실패:', error);
      alert('평가 제출에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {evaluation.evaluation?.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                평가 기간: {new Date(evaluation.evaluation?.start_date).toLocaleDateString()} ~ {new Date(evaluation.evaluation?.end_date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 평가 정보 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">평가 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">평가 유형:</span>
                  <span className="ml-2 text-gray-900">{evaluation.evaluation?.type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">현재 상태:</span>
                  <span className="ml-2">{getStatusBadge(evaluation.status)}</span>
                </div>
                {evaluation.weighted_score && (
                  <div>
                    <span className="font-medium text-gray-700">점수:</span>
                    <span className="ml-2 text-gray-900">{Math.round(evaluation.weighted_score)}점</span>
                  </div>
                )}
                {evaluation.grade && (
                  <div>
                    <span className="font-medium text-gray-700">등급:</span>
                    <span className="ml-2">{getGradeBadge(evaluation.grade)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 자기평가 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">자기평가</h3>
            {isEditable ? (
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="6"
                placeholder="자신의 성과와 성장에 대해 평가해주세요..."
                value={formData.self_evaluation}
                onChange={(e) => setFormData({...formData, self_evaluation: e.target.value})}
              />
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {evaluationResult?.self_evaluation || '자기평가가 작성되지 않았습니다.'}
                </p>
              </div>
            )}
          </div>

          {/* 평가자 의견 (완료된 평가만) */}
          {!isEditable && evaluationResult?.evaluator_comments && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">평가자 의견</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {evaluationResult.evaluator_comments}
                </p>
              </div>
            </div>
          )}

          {/* 강점 및 개선사항 (완료된 평가만) */}
          {!isEditable && (evaluationResult?.strengths || evaluationResult?.improvement_areas) && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {evaluationResult.strengths && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">강점</h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {evaluationResult.strengths}
                      </p>
                    </div>
                  </div>
                )}
                
                {evaluationResult.improvement_areas && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">개선 영역</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {evaluationResult.improvement_areas}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 세부 점수 (완료된 평가만) */}
          {!isEditable && evaluationResult?.scores && evaluationResult.scores.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">세부 평가 점수</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        평가 항목
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가중치
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        점수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가중 점수
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {evaluationResult.scores.map((score, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {score.criteria_item}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {score.weight}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {score.score}/{score.max_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(score.weighted_score || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        {isEditable && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                disabled={saving}
              >
                {saving ? '저장 중...' : '임시 저장'}
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? '제출 중...' : '평가 제출'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationUser;

