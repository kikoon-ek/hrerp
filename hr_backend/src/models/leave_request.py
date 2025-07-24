from datetime import datetime
from src.models.user import db

class LeaveRequest(db.Model):
    """휴가 신청 모델"""
    __tablename__ = 'leave_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 연차, 병가, 경조사, 기타
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days_requested = db.Column(db.Float, nullable=False)  # 신청한 휴가 일수
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='대기')  # 대기, 승인, 거부
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def calculate_days(self):
        """휴가 일수 계산 (주말 제외)"""
        if not self.start_date or not self.end_date:
            return 0
        
        current_date = self.start_date
        days = 0
        
        while current_date <= self.end_date:
            # 주말(토요일=5, 일요일=6) 제외
            if current_date.weekday() < 5:
                days += 1
            from datetime import timedelta
            current_date = current_date + timedelta(days=1)
        
        self.days_requested = days
        return days
    
    def approve(self, approver_id, note=None):
        """휴가 승인"""
        self.status = '승인'
        self.approved_by = approver_id
        self.approved_at = datetime.utcnow()
        if note:
            self.rejection_reason = note  # 승인 시에도 메모 저장
    
    def reject(self, approver_id, reason):
        """휴가 거부"""
        self.status = '거부'
        self.approved_by = approver_id
        self.approved_at = datetime.utcnow()
        self.rejection_reason = reason
    
    def to_dict(self):
        """딕셔너리로 변환"""
        from src.models.employee import Employee
        from src.models.user import User
        from src.models.department import Department
        
        employee = Employee.query.get(self.employee_id)
        approver = User.query.get(self.approved_by) if self.approved_by else None
        department = Department.query.get(employee.department_id) if employee and employee.department_id else None
        
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'type': self.type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'days_requested': self.days_requested,
            'reason': self.reason,
            'status': self.status,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'rejection_reason': self.rejection_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'employee_number': employee.employee_number,
                'department': {
                    'id': department.id,
                    'name': department.name
                } if department else None
            } if employee else None,
            'approver': {
                'id': approver.id,
                'username': approver.username
            } if approver else None
        }

