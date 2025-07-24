import { useQuery } from '@tanstack/react-query'
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Building2, Plus, Users, TreePine } from 'lucide-react'

export default function DepartmentManagement() {
  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments?tree=true')
      return response.data
    },
  })

  const renderDepartmentTree = (departments, level = 0) => {
    return departments?.map((dept) => (
      <div key={dept.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 mb-2">
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              level === 0 ? 'bg-blue-600' : level === 1 ? 'bg-green-600' : 'bg-purple-600'
            }`}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{dept.name}</h3>
                <Badge variant="outline">{dept.code}</Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{dept.employee_count || 0}명</span>
                {dept.children && dept.children.length > 0 && (
                  <>
                    <span>•</span>
                    <TreePine className="w-4 h-4" />
                    <span>하위 부서 {dept.children.length}개</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={dept.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {dept.is_active ? '활성' : '비활성'}
            </Badge>
            <Button variant="outline" size="sm">
              관리
            </Button>
          </div>
        </div>
        
        {dept.children && dept.children.length > 0 && (
          <div className="ml-4">
            {renderDepartmentTree(dept.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">부서 관리</h1>
            <p className="text-gray-600">조직 구조를 관리합니다</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalDepartments = departmentsData?.departments?.length || 0
  const activeDepartments = departmentsData?.departments?.filter(dept => dept.is_active).length || 0

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">부서 관리</h1>
          <p className="text-gray-600">조직 구조를 관리합니다</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          새 부서 생성
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">총 부서 수</p>
                <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
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
                <p className="text-sm font-medium text-gray-600">활성 부서</p>
                <p className="text-2xl font-bold text-gray-900">{activeDepartments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TreePine className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">조직 계층</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(...(departmentsData?.departments?.map(dept => 
                    dept.children?.length > 0 ? 2 : 1
                  ) || [1]))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 부서 트리 */}
      <Card>
        <CardHeader>
          <CardTitle>조직 구조</CardTitle>
          <CardDescription>
            부서의 계층 구조를 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalDepartments > 0 ? (
            <div className="space-y-2">
              {renderDepartmentTree(departmentsData.departments)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 부서가 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 번째 부서를 생성해보세요</p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 부서 생성
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 부서 관리 안내 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">부서 관리 기능</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>계층형 부서 구조 지원</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>부서별 직원 수 자동 집계</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>부서장 지정 및 관리</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>부서 활성화/비활성화 제어</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

