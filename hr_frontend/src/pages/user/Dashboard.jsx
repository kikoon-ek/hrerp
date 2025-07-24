import { useAuthStore } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { User, Building2, Calendar, Settings } from 'lucide-react'

export default function UserDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              안녕하세요, {user?.username}님!
            </h1>
            <p className="text-gray-600 mt-1">
              오늘도 좋은 하루 되세요. HR 시스템에서 필요한 정보를 확인하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 빠른 액세스 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">내 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              개인 정보를 확인하고 수정할 수 있습니다
            </CardDescription>
            <Button variant="outline" className="w-full">
              정보 보기
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">출근 관리</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              출퇴근 기록과 연차 현황을 확인하세요
            </CardDescription>
            <Button variant="outline" className="w-full" disabled>
              준비 중
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">설정</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              계정 설정 및 비밀번호를 변경하세요
            </CardDescription>
            <Button variant="outline" className="w-full" disabled>
              준비 중
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 내 정보 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>현재 로그인한 계정의 기본 정보입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">사용자명</span>
              <span className="text-sm text-gray-900">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">이메일</span>
              <span className="text-sm text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">권한</span>
              <span className="text-sm text-green-600 font-medium">일반 사용자</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">계정 상태</span>
              <span className="text-sm text-green-600 font-medium">활성</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시스템 안내</CardTitle>
            <CardDescription>HR 시스템 사용 가이드</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-green-800">내 정보 관리</p>
                  <p className="text-sm text-green-700">개인 정보를 확인하고 일부 정보를 수정할 수 있습니다</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-blue-800">출근 관리 (준비 중)</p>
                  <p className="text-sm text-blue-700">출퇴근 기록과 연차 신청 기능이 곧 제공됩니다</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-purple-800">성과 관리 (준비 중)</p>
                  <p className="text-sm text-purple-700">성과 평가 결과와 급여 명세서를 확인할 수 있습니다</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase 안내 */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">개발 진행 상황</CardTitle>
          <CardDescription className="text-green-700">
            HR 시스템은 단계적으로 개발되고 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-800">Phase 1: 기반 시스템</p>
                <p className="text-sm text-green-700">인증, 직원 관리, 감사 로그 - 완료</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-600">Phase 2: 설정 시스템</p>
                <p className="text-sm text-gray-500">평가 기준, 성과급 정책 - 준비 중</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-600">Phase 3: 출근 및 연차 관리</p>
                <p className="text-sm text-gray-500">출퇴근 기록, 연차 관리 - 준비 중</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

