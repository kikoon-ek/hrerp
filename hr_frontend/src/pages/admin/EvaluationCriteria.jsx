import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Plus, Edit, Trash2, Target, TrendingUp, Users, Building } from 'lucide-react'

export default function EvaluationCriteria() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCriteria, setSelectedCriteria] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    weight: '',
    min_score: '0',
    max_score: '100',
    items: []
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const queryClient = useQueryClient()

  // 평가 기준 목록 조회
  const { data: criteriaData, isLoading } = useQuery({
    queryKey: ['evaluation-criteria'],
    queryFn: async () => {
      const response = await api.get('/evaluation-criteria')
      return response.data
    },
  })

  // 평가 기준 요약 통계
  const { data: summaryData } = useQuery({
    queryKey: ['evaluation-criteria-summary'],
    queryFn: async () => {
      const response = await api.get('/evaluation-criteria/summary')
      return response.data
    },
  })

  // 평가 기준 생성
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/evaluation-criteria', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['evaluation-criteria'])
      queryClient.invalidateQueries(['evaluation-criteria-summary'])
      setIsCreateDialogOpen(false)
      resetForm()
      setMessage({ type: 'success', text: '평가 기준이 성공적으로 생성되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '평가 기준 생성 중 오류가 발생했습니다.' })
    }
  })

  // 평가 기준 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/evaluation-criteria/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['evaluation-criteria'])
      setIsEditDialogOpen(false)
      resetForm()
      setMessage({ type: 'success', text: '평가 기준이 성공적으로 수정되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '평가 기준 수정 중 오류가 발생했습니다.' })
    }
  })

  // 평가 기준 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/evaluation-criteria/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['evaluation-criteria'])
      queryClient.invalidateQueries(['evaluation-criteria-summary'])
      setMessage({ type: 'success', text: '평가 기준이 성공적으로 삭제되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '평가 기준 삭제 중 오류가 발생했습니다.' })
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      weight: '',
      min_score: '0',
      max_score: '100',
      items: []
    })
    setSelectedCriteria(null)
  }

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
    resetForm()
  }

  const handleEdit = (criteria) => {
    setSelectedCriteria(criteria)
    setFormData({
      name: criteria.name,
      description: criteria.description || '',
      category: criteria.category,
      weight: criteria.weight.toString(),
      min_score: criteria.min_score.toString(),
      max_score: criteria.max_score.toString(),
      items: criteria.items || []
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.name || !formData.category || !formData.weight) {
      setMessage({ type: 'error', text: '필수 필드를 모두 입력해주세요.' })
      return
    }

    const weight = parseFloat(formData.weight)
    if (weight < 0 || weight > 100) {
      setMessage({ type: 'error', text: '가중치는 0-100 사이의 값이어야 합니다.' })
      return
    }

    const submitData = {
      ...formData,
      weight: weight,
      min_score: parseFloat(formData.min_score),
      max_score: parseFloat(formData.max_score)
    }

    if (selectedCriteria) {
      updateMutation.mutate({ id: selectedCriteria.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleDelete = (criteria) => {
    if (window.confirm(`'${criteria.name}' 평가 기준을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(criteria.id)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case '전사': return <Building className="w-4 h-4" />
      case '직무': return <Target className="w-4 h-4" />
      case '개인': return <Users className="w-4 h-4" />
      default: return <TrendingUp className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case '전사': return 'bg-blue-100 text-blue-800'
      case '직무': return 'bg-green-100 text-green-800'
      case '개인': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">평가 기준 관리</h1>
            <p className="text-gray-600">성과 평가 기준을 설정하고 관리합니다</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">평가 기준 관리</h1>
          <p className="text-gray-600">성과 평가 기준을 설정하고 관리합니다</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          새 평가 기준
        </Button>
      </div>

      {/* 메시지 */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">총 평가 기준</p>
                <p className="text-2xl font-bold text-gray-900">{summaryData?.total_criteria || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">활성 기준</p>
                <p className="text-2xl font-bold text-gray-900">{summaryData?.active_criteria || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">전사 기준</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData?.category_distribution?.['전사'] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">개인 기준</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData?.category_distribution?.['개인'] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 평가 기준 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>평가 기준 목록</CardTitle>
          <CardDescription>
            등록된 평가 기준을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criteriaData?.criteria?.length > 0 ? (
            <div className="space-y-4">
              {criteriaData.criteria.map((criteria) => (
                <div key={criteria.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      {getCategoryIcon(criteria.category)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{criteria.name}</h3>
                        <Badge className={getCategoryColor(criteria.category)}>
                          {criteria.category}
                        </Badge>
                        <Badge variant="outline">{criteria.weight}%</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{criteria.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>점수 범위: {criteria.min_score}-{criteria.max_score}</span>
                        <span>평가 항목: {criteria.items_count}개</span>
                        <span>버전: {criteria.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={criteria.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {criteria.is_active ? '활성' : '비활성'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(criteria)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(criteria)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 평가 기준이 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 번째 평가 기준을 생성해보세요</p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 평가 기준 생성
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCriteria ? '평가 기준 수정' : '새 평가 기준 생성'}
            </DialogTitle>
            <DialogDescription>
              성과 평가에 사용할 기준을 설정하세요
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">평가 기준명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="예: 업무 성과"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">카테고리 *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전사">전사</SelectItem>
                    <SelectItem value="직무">직무</SelectItem>
                    <SelectItem value="개인">개인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="평가 기준에 대한 상세 설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">가중치 (%) *</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  placeholder="0-100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_score">최소 점수</Label>
                <Input
                  id="min_score"
                  type="number"
                  min="0"
                  value={formData.min_score}
                  onChange={(e) => setFormData({...formData, min_score: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="max_score">최대 점수</Label>
                <Input
                  id="max_score"
                  type="number"
                  min="1"
                  value={formData.max_score}
                  onChange={(e) => setFormData({...formData, max_score: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setIsEditDialogOpen(false)
                  resetForm()
                }}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedCriteria ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Phase 2 기능 안내 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">평가 기준 관리 기능</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>카테고리별 평가 기준 분류</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>가중치 기반 점수 계산</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>평가 항목 세부 관리</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>버전 관리 및 이력 추적</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

