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
import { Slider } from '../../components/ui/slider'
import { Switch } from '../../components/ui/switch'
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Settings, Star, AlertTriangle } from 'lucide-react'

export default function BonusPolicy() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    policy_type: '',
    ratio_base: 25,
    ratio_team: 25,
    ratio_personal: 25,
    ratio_company: 25,
    calculation_method: 'weighted',
    min_performance_score: 0,
    max_bonus_multiplier: 2.0,
    is_default: false,
    effective_from: '',
    effective_to: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const queryClient = useQueryClient()

  // 성과급 정책 목록 조회
  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['bonus-policies'],
    queryFn: async () => {
      const response = await api.get('/bonus-policies')
      return response.data
    },
  })

  // 성과급 정책 요약 통계
  const { data: summaryData } = useQuery({
    queryKey: ['bonus-policies-summary'],
    queryFn: async () => {
      const response = await api.get('/bonus-policies/summary')
      return response.data
    },
  })

  // 성과급 정책 생성
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/bonus-policies', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-policies'])
      queryClient.invalidateQueries(['bonus-policies-summary'])
      setIsCreateDialogOpen(false)
      resetForm()
      setMessage({ type: 'success', text: '성과급 정책이 성공적으로 생성되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '성과급 정책 생성 중 오류가 발생했습니다.' })
    }
  })

  // 성과급 정책 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/bonus-policies/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-policies'])
      setIsEditDialogOpen(false)
      resetForm()
      setMessage({ type: 'success', text: '성과급 정책이 성공적으로 수정되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '성과급 정책 수정 중 오류가 발생했습니다.' })
    }
  })

  // 성과급 정책 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/bonus-policies/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-policies'])
      queryClient.invalidateQueries(['bonus-policies-summary'])
      setMessage({ type: 'success', text: '성과급 정책이 성공적으로 삭제되었습니다.' })
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.response?.data?.error || '성과급 정책 삭제 중 오류가 발생했습니다.' })
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      policy_type: '',
      ratio_base: 25,
      ratio_team: 25,
      ratio_personal: 25,
      ratio_company: 25,
      calculation_method: 'weighted',
      min_performance_score: 0,
      max_bonus_multiplier: 2.0,
      is_default: false,
      effective_from: '',
      effective_to: ''
    })
    setSelectedPolicy(null)
  }

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
    resetForm()
  }

  const handleEdit = (policy) => {
    setSelectedPolicy(policy)
    setFormData({
      name: policy.name,
      description: policy.description || '',
      policy_type: policy.policy_type,
      ratio_base: policy.ratio_base,
      ratio_team: policy.ratio_team,
      ratio_personal: policy.ratio_personal,
      ratio_company: policy.ratio_company,
      calculation_method: policy.calculation_method,
      min_performance_score: policy.min_performance_score,
      max_bonus_multiplier: policy.max_bonus_multiplier,
      is_default: policy.is_default,
      effective_from: policy.effective_from ? policy.effective_from.split('T')[0] : '',
      effective_to: policy.effective_to ? policy.effective_to.split('T')[0] : ''
    })
    setIsEditDialogOpen(true)
  }

  const handleRatioChange = (type, value) => {
    const newFormData = { ...formData }
    newFormData[`ratio_${type}`] = value[0]
    
    // 총합이 100%가 되도록 다른 비율들을 자동 조정
    const currentTotal = newFormData.ratio_base + newFormData.ratio_team + newFormData.ratio_personal + newFormData.ratio_company
    if (currentTotal !== 100) {
      const diff = 100 - currentTotal
      const otherTypes = ['base', 'team', 'personal', 'company'].filter(t => t !== type)
      const adjustment = diff / otherTypes.length
      
      otherTypes.forEach(t => {
        newFormData[`ratio_${t}`] = Math.max(0, Math.min(100, newFormData[`ratio_${t}`] + adjustment))
      })
    }
    
    setFormData(newFormData)
  }

  const getTotalRatio = () => {
    return formData.ratio_base + formData.ratio_team + formData.ratio_personal + formData.ratio_company
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.name || !formData.policy_type) {
      setMessage({ type: 'error', text: '필수 필드를 모두 입력해주세요.' })
      return
    }

    const totalRatio = getTotalRatio()
    if (Math.abs(totalRatio - 100) > 0.01) {
      setMessage({ type: 'error', text: '모든 비율의 합계는 100%여야 합니다.' })
      return
    }

    const submitData = {
      ...formData,
      effective_from: formData.effective_from || null,
      effective_to: formData.effective_to || null
    }

    if (selectedPolicy) {
      updateMutation.mutate({ id: selectedPolicy.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleDelete = (policy) => {
    if (policy.is_default) {
      setMessage({ type: 'error', text: '기본 정책은 삭제할 수 없습니다.' })
      return
    }
    
    if (window.confirm(`'${policy.name}' 성과급 정책을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(policy.id)
    }
  }

  const getPolicyTypeColor = (type) => {
    switch (type) {
      case '연간': return 'bg-blue-100 text-blue-800'
      case '분기별': return 'bg-green-100 text-green-800'
      case '프로젝트별': return 'bg-purple-100 text-purple-800'
      case '특별': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">성과급 정책 관리</h1>
            <p className="text-gray-600">성과급 분배 정책을 설정하고 관리합니다</p>
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
          <h1 className="text-2xl font-bold text-gray-900">성과급 정책 관리</h1>
          <p className="text-gray-600">성과급 분배 정책을 설정하고 관리합니다</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          새 성과급 정책
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
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">총 정책 수</p>
                <p className="text-2xl font-bold text-gray-900">{summaryData?.total_policies || 0}</p>
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
                <p className="text-sm font-medium text-gray-600">활성 정책</p>
                <p className="text-2xl font-bold text-gray-900">{summaryData?.active_policies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">기본 정책</p>
                <p className="text-lg font-bold text-gray-900">
                  {summaryData?.default_policy?.name || '없음'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">연간 정책</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData?.type_distribution?.['연간'] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 성과급 정책 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>성과급 정책 목록</CardTitle>
          <CardDescription>
            등록된 성과급 정책을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policiesData?.policies?.length > 0 ? (
            <div className="space-y-4">
              {policiesData.policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{policy.name}</h3>
                        <Badge className={getPolicyTypeColor(policy.policy_type)}>
                          {policy.policy_type}
                        </Badge>
                        {policy.is_default && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            기본
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{policy.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>기본급: {policy.ratio_base}%</span>
                        <span>팀성과: {policy.ratio_team}%</span>
                        <span>개인성과: {policy.ratio_personal}%</span>
                        <span>회사성과: {policy.ratio_company}%</span>
                        <span>최대배수: {policy.max_bonus_multiplier}x</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {policy.is_active ? '활성' : '비활성'}
                    </Badge>
                    {Math.abs(policy.total_ratio - 100) > 0.01 && (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        비율오류
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy)}
                      className="text-red-600 hover:text-red-700"
                      disabled={policy.is_default}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 성과급 정책이 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 번째 성과급 정책을 생성해보세요</p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 성과급 정책 생성
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPolicy ? '성과급 정책 수정' : '새 성과급 정책 생성'}
            </DialogTitle>
            <DialogDescription>
              성과급 분배에 사용할 정책을 설정하세요
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">정책명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="예: 2025년 연간 성과급 정책"
                  required
                />
              </div>
              <div>
                <Label htmlFor="policy_type">정책 유형 *</Label>
                <Select value={formData.policy_type} onValueChange={(value) => setFormData({...formData, policy_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="정책 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="연간">연간</SelectItem>
                    <SelectItem value="분기별">분기별</SelectItem>
                    <SelectItem value="프로젝트별">프로젝트별</SelectItem>
                    <SelectItem value="특별">특별</SelectItem>
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
                placeholder="성과급 정책에 대한 상세 설명을 입력하세요"
                rows={3}
              />
            </div>

            {/* 분배 비율 설정 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium">분배 비율 설정</Label>
                <div className={`text-sm font-medium ${Math.abs(getTotalRatio() - 100) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  총합: {getTotalRatio().toFixed(1)}%
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <Label>기본급 비중: {formData.ratio_base}%</Label>
                    <Slider
                      value={[formData.ratio_base]}
                      onValueChange={(value) => handleRatioChange('base', value)}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>팀 성과 비중: {formData.ratio_team}%</Label>
                    <Slider
                      value={[formData.ratio_team]}
                      onValueChange={(value) => handleRatioChange('team', value)}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>개인 성과 비중: {formData.ratio_personal}%</Label>
                    <Slider
                      value={[formData.ratio_personal]}
                      onValueChange={(value) => handleRatioChange('personal', value)}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>회사 성과 비중: {formData.ratio_company}%</Label>
                    <Slider
                      value={[formData.ratio_company]}
                      onValueChange={(value) => handleRatioChange('company', value)}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 계산 설정 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="calculation_method">계산 방식</Label>
                <Select value={formData.calculation_method} onValueChange={(value) => setFormData({...formData, calculation_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weighted">가중평균</SelectItem>
                    <SelectItem value="linear">선형계산</SelectItem>
                    <SelectItem value="exponential">지수계산</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="min_performance_score">최소 성과 점수</Label>
                <Input
                  id="min_performance_score"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.min_performance_score}
                  onChange={(e) => setFormData({...formData, min_performance_score: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="max_bonus_multiplier">최대 성과급 배수</Label>
                <Input
                  id="max_bonus_multiplier"
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={formData.max_bonus_multiplier}
                  onChange={(e) => setFormData({...formData, max_bonus_multiplier: parseFloat(e.target.value) || 1.0})}
                />
              </div>
            </div>

            {/* 적용 기간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_from">적용 시작일</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({...formData, effective_from: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="effective_to">적용 종료일</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => setFormData({...formData, effective_to: e.target.value})}
                />
              </div>
            </div>

            {/* 기본 정책 설정 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
              />
              <Label htmlFor="is_default">기본 정책으로 설정</Label>
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
                disabled={createMutation.isLoading || updateMutation.isLoading || Math.abs(getTotalRatio() - 100) > 0.01}
              >
                {selectedPolicy ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Phase 2 기능 안내 */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">성과급 정책 관리 기능</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>4가지 비율 기반 성과급 분배</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>실시간 비율 조정 및 검증</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>기본 정책 설정 및 관리</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>적용 기간 및 버전 관리</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

