import { useQuery } from '@tanstack/react-query'
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { FileText, Activity, User, Calendar, Filter } from 'lucide-react'

export default function AuditLogs() {
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get('/audit-logs?per_page=20')
      return response.data
    },
  })

  const { data: summaryData } = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: async () => {
      const response = await api.get('/audit-logs/summary?days=7')
      return response.data
    },
  })

  const getActionBadge = (actionType) => {
    const variants = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN_SUCCESS: 'bg-purple-100 text-purple-800',
      LOGIN_FAILED: 'bg-orange-100 text-orange-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    }
    
    const labels = {
      CREATE: '생성',
      UPDATE: '수정',
      DELETE: '삭제',
      LOGIN_SUCCESS: '로그인',
      LOGIN_FAILED: '로그인 실패',
      LOGOUT: '로그아웃'
    }

    return (
      <Badge className={variants[actionType] || 'bg-gray-100 text-gray-800'}>
        {labels[actionType] || actionType}
      </Badge>
    )
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="text-gray-600">시스템 활동을 추적하고 모니터링합니다</p>
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
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="text-gray-600">시스템 활동을 추적하고 모니터링합니다</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            필터
          </button>
          <button className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            <Calendar className="w-4 h-4 mr-2" />
            기간 선택
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">총 로그</p>
                <p className="text-2xl font-bold text-gray-900">{summaryData?.total_logs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">오늘 활동</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData?.daily_activity?.find(day => 
                    new Date(day.date).toDateString() === new Date().toDateString()
                  )?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData?.top_users?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">주간 평균</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((summaryData?.total_logs || 0) / 7)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>액션 타입별 통계</CardTitle>
            <CardDescription>최근 7일간 활동 유형별 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summaryData?.action_statistics || {}).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(action)}
                    <span className="text-sm text-gray-600">{action}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 활성 사용자</CardTitle>
            <CardDescription>활동량이 많은 사용자 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summaryData?.top_users?.slice(0, 5).map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <Badge variant="outline">{user.activity_count}회</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 로그 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동 로그</CardTitle>
          <CardDescription>
            시스템에서 발생한 모든 활동을 시간순으로 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsData?.logs?.length > 0 ? (
            <div className="space-y-3">
              {logsData.logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getActionBadge(log.action_type)}
                      <span className="text-sm font-medium text-gray-900">{log.username}</span>
                      <span className="text-xs text-gray-500">{log.entity_type}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{log.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDateTime(log.created_at)}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">로그가 없습니다</h3>
              <p className="text-gray-600">시스템 활동이 기록되면 여기에 표시됩니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 감사 로그 기능 안내 */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800">감사 로그 기능</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>모든 시스템 활동 자동 기록</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>사용자별 활동 추적</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>IP 주소 및 브라우저 정보 기록</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>변경 전후 데이터 비교</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

