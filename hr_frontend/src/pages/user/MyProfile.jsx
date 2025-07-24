import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { User, Mail, Phone, MapPin, Building2, Calendar, Edit, Save, X } from 'lucide-react'

export default function MyProfile() {
  const { user, getCurrentUser, changePassword } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [editForm, setEditForm] = useState({
    phone: '',
    address: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  // 사용자 정보 조회
  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    enabled: !!user,
  })

  const employee = userData?.employee

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm({
        phone: employee?.phone || '',
        address: employee?.address || ''
      })
    } else {
      setEditForm({
        phone: employee?.phone || '',
        address: employee?.address || ''
      })
    }
    setIsEditing(!isEditing)
    setMessage({ type: '', text: '' })
  }

  const handleSaveProfile = async () => {
    // 프로필 수정 기능은 Phase 1에서는 기본 구조만 제공
    setMessage({ type: 'info', text: '프로필 수정 기능은 곧 제공될 예정입니다.' })
    setIsEditing(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' })
      return
    }

    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    
    if (result.success) {
      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
          <p className="text-gray-600">개인 정보를 확인하고 관리하세요</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
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
          <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
          <p className="text-gray-600">개인 정보를 확인하고 관리하세요</p>
        </div>
      </div>

      {/* 메시지 */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>계정 및 직원 기본 정보</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditToggle}
              disabled={isChangingPassword}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  취소
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">이름</p>
                <p className="text-gray-900">{employee?.name || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Badge className="bg-blue-100 text-blue-800">사번</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">직원번호</p>
                <p className="text-gray-900">{employee?.employee_number || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">이메일</p>
                <p className="text-gray-900">{employee?.email || user?.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">연락처</p>
                {isEditing ? (
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="연락처를 입력하세요"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-gray-900">{employee?.phone || '정보 없음'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">주소</p>
                {isEditing ? (
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    placeholder="주소를 입력하세요"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-gray-900">{employee?.address || '정보 없음'}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveProfile} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
                <Button variant="outline" onClick={handleEditToggle} className="flex-1">
                  취소
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 직장 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>직장 정보</CardTitle>
            <CardDescription>부서 및 직책 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">부서</p>
                <p className="text-gray-900">{employee?.department_name || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Badge className="bg-green-100 text-green-800">직책</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">직책</p>
                <p className="text-gray-900">{employee?.position || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">입사일</p>
                <p className="text-gray-900">
                  {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString('ko-KR') : '정보 없음'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">재직 상태</p>
                <Badge className={employee?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {employee?.status === 'active' ? '재직' : '비재직'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>보안 설정</CardTitle>
            <CardDescription>계정 보안을 위해 정기적으로 비밀번호를 변경하세요</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsChangingPassword(!isChangingPassword)
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
              setMessage({ type: '', text: '' })
            }}
            disabled={isEditing}
          >
            {isChangingPassword ? '취소' : '비밀번호 변경'}
          </Button>
        </CardHeader>
        {isChangingPassword && (
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  비밀번호 변경
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

