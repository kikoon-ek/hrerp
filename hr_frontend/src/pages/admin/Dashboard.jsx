import { useQuery } from '@tanstack/react-query'
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Building2, FileText, Activity } from 'lucide-react'

export default function AdminDashboard() {
  // 대시보드 데이터 조회
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // 여러 API를 병렬로 호출하여 통계 데이터 수집
      const [employeesRes, departmentsRes, auditLogsRes] = await Promise.all([
        api.get('/employees?per_page=1'),
        api.get('/departments'),
        api.get('/audit-logs/summary?days=7')
      ])
      
      return {
        totalEmployees: employeesRes.data.total || 0,
        totalDepartments: departmentsRes.data.departments?.length || 0,
        weeklyActivity: auditLogsRes.data.total_logs || 0,
        recentLogs: auditLogsRes.data.daily_activity || []
      }
    },
    refetchInterval: 30000, // 30초마다 갱신
  })

  const statsCards = [
    {
      title: '총 직원 수',
      value: stats?.totalEmployees || 0,
      description: '현재 등록된 직원',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '부서 수',
      value: stats?.totalDepartments || 0,
      description: '활성 부서',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '주간 활동',
      value: stats?.weeklyActivity || 0,
      description: '최근 7일간 로그',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '감사 로그',
      value: stats?.recentLogs?.length || 0,
      description: '오늘의 활동',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-600">시스템 현황을 한눈에 확인하세요</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-600">시스템 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>시스템 개요</CardTitle>
            <CardDescription>
              HR 통합 관리 시스템의 주요 기능들
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">직원 관리</p>
                  <p className="text-sm text-gray-600">직원 정보 등록, 수정, 조회</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">부서 관리</p>
                  <p className="text-sm text-gray-600">조직 구조 및 부서 관리</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">감사 로그</p>
                  <p className="text-sm text-gray-600">시스템 활동 추적 및 모니터링</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>
              자주 사용하는 기능들에 빠르게 접근하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">새 직원 등록</div>
              <div className="text-sm text-gray-600">새로운 직원을 시스템에 등록합니다</div>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">부서 생성</div>
              <div className="text-sm text-gray-600">새로운 부서를 생성합니다</div>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">감사 로그 확인</div>
              <div className="text-sm text-gray-600">최근 시스템 활동을 확인합니다</div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Phase 1 완료 안내 */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Phase 1 구현 완료</CardTitle>
          <CardDescription className="text-green-700">
            기반 시스템이 성공적으로 구축되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>JWT 기반 인증 시스템</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>직원 관리 CRUD 기능</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>부서 관리 시스템</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>감사 로그 시스템</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

