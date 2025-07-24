import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, Calendar, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const EvaluationManagement = () => {
  const { api } = useAuthStore();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);
  const [stats, setStats] = useState({});

  // 평가 목록 조회
  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const response = await api.get(`/evaluations?${params.toString()}`);
      setEvaluations(response.data.evaluations || []);
    } catch (error) {
      console.error('평가 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 평가 기준 목록 조회
  const fetchEvaluationCriteria = async () => {
    try {
      const response = await api.get('/evaluation-criteria');
      setEvaluationCriteria(response.data.criteria || []);
    } catch (error) {
      console.error('평가 기준 조회 실패:', error);
    }
  };

  // 평가 통계 조회
  const fetchStats = async () => {
    try {
      const response = await api.get('/evaluation-stats');
      setStats(response.data);
    } catch (error) {
      console.error('평가 통계 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchEvaluations();
    fetchEvaluationCriteria();
    fetchStats();
  }, [searchTerm, statusFilter, typeFilter]);

  // 평가 생성
  const handleCreateEvaluation = async (formData) => {
    try {
      await api.post('/evaluations', formData);
      setShowCreateModal(false);
      fetchEvaluations();
      fetchStats();
    } catch (error) {
      console.error('평가 생성 실패:', error);
      alert('평가 생성에 실패했습니다.');
    }
  };

  // 평가 삭제
  const handleDeleteEvaluation = async (id) => {
    if (!confirm('정말로 이 평가를 삭제하시겠습니까?')) return;
    
    try {
      await api.delete(`/evaluations/${id}`);
      fetchEvaluations();
      fetchStats();
    } catch (error) {
      console.error('평가 삭제 실패:', error);
      alert('평가 삭제에 실패했습니다.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      '초안': 'bg-gray-100 text-gray-800',
      '진행중': 'bg-blue-100 text-blue-800',
      '완료': 'bg-green-100 text-green-800',
      '마감': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      '연간평가': 'bg-purple-100 text-purple-800',
      '반기평가': 'bg-indigo-100 text-indigo-800',
      '분기평가': 'bg-cyan-100 text-cyan-800',
      '프로젝트평가': 'bg-orange-100 text-orange-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">성과 평가 관리</h1>
        <p className="text-gray-600">직원들의 성과 평가를 생성하고 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">전체 평가</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_evaluations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">진행 중인 평가</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_evaluations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">완료된 평가</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed_results || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">평균 점수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.average_score || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="평가 제목으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">모든 상태</option>
            <option value="초안">초안</option>
            <option value="진행중">진행중</option>
            <option value="완료">완료</option>
            <option value="마감">마감</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">모든 유형</option>
            <option value="연간평가">연간평가</option>
            <option value="반기평가">반기평가</option>
            <option value="분기평가">분기평가</option>
            <option value="프로젝트평가">프로젝트평가</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            평가 생성
          </button>
        </div>
      </div>

      {/* 평가 목록 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">등록된 평가가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평가 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평가 기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행률
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {evaluation.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {evaluation.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(evaluation.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(evaluation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {new Date(evaluation.start_date).toLocaleDateString()} ~
                      </div>
                      <div>
                        {new Date(evaluation.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {evaluation.completed_results || 0} / {evaluation.total_results || 0}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${evaluation.total_results > 0 ? (evaluation.completed_results / evaluation.total_results) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedEvaluation(evaluation)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* 편집 모달 열기 */}}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvaluation(evaluation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 평가 생성 모달 */}
      {showCreateModal && (
        <CreateEvaluationModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEvaluation}
          evaluationCriteria={evaluationCriteria}
        />
      )}

      {/* 평가 상세 모달 */}
      {selectedEvaluation && (
        <EvaluationDetailModal
          evaluation={selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}
    </div>
  );
};

// 평가 생성 모달 컴포넌트
const CreateEvaluationModal = ({ onClose, onSubmit, evaluationCriteria }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '연간평가',
    start_date: '',
    end_date: '',
    criteria_id: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date || !formData.end_date || !formData.criteria_id) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">새 평가 생성</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평가 제목 *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="평가 제목을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평가 설명
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="평가에 대한 설명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평가 유형 *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="연간평가">연간평가</option>
              <option value="반기평가">반기평가</option>
              <option value="분기평가">분기평가</option>
              <option value="프로젝트평가">프로젝트평가</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평가 기준 *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.criteria_id}
              onChange={(e) => setFormData({...formData, criteria_id: e.target.value})}
            >
              <option value="">평가 기준을 선택하세요</option>
              {evaluationCriteria.map((criteria) => (
                <option key={criteria.id} value={criteria.id}>
                  {criteria.name} (v{criteria.version})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일 *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일 *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 평가 상세 모달 컴포넌트
const EvaluationDetailModal = ({ evaluation, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">평가 상세 정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">평가 제목</label>
            <p className="mt-1 text-sm text-gray-900">{evaluation.title}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">평가 설명</label>
            <p className="mt-1 text-sm text-gray-900">{evaluation.description || '설명 없음'}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">평가 유형</label>
              <p className="mt-1 text-sm text-gray-900">{evaluation.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">상태</label>
              <p className="mt-1 text-sm text-gray-900">{evaluation.status}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">시작일</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(evaluation.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">종료일</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(evaluation.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">진행률</label>
            <div className="mt-1">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>완료: {evaluation.completed_results || 0}</span>
                <span>전체: {evaluation.total_results || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${evaluation.total_results > 0 ? (evaluation.completed_results / evaluation.total_results) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationManagement;

