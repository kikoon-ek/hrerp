from datetime import datetime, time
from src.models.user import db

class AttendanceRecord(db.Model):
    """출퇴근 기록 모델"""
    __tablename__ = 'attendance_records'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    check_in = db.Column(db.Time, nullable=True)
    check_out = db.Column(db.Time, nullable=True)
    work_hours = db.Column(db.Float, nullable=True)  # 근무 시간 (시간 단위)
    status = db.Column(db.String(20), nullable=False, default='출근')  # 출근, 지각, 결근, 조퇴
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def calculate_work_hours(self):
        """근무 시간 계산"""
        if self.check_in and self.check_out:
            # 시간을 datetime으로 변환하여 계산
            check_in_dt = datetime.combine(self.date, self.check_in)
            check_out_dt = datetime.combine(self.date, self.check_out)
            
            # 자정을 넘어간 경우 처리
            if check_out_dt < check_in_dt:
                from datetime import timedelta
                check_out_dt = check_out_dt + timedelta(days=1)
            
            work_duration = check_out_dt - check_in_dt
            self.work_hours = work_duration.total_seconds() / 3600  # 시간 단위로 변환
            
            # 점심시간 1시간 제외 (8시간 이상 근무 시)
            if self.work_hours >= 8:
                self.work_hours -= 1
                
        return self.work_hours
    
    def determine_status(self):
        """출근 상태 결정"""
        if not self.check_in:
            self.status = '결근'
        elif self.check_in > time(9, 0):  # 9시 이후 출근
            self.status = '지각'
        elif self.check_out and self.check_out < time(18, 0):  # 18시 이전 퇴근
            self.status = '조퇴'
        else:
            self.status = '출근'
        
        return self.status
    
    def to_dict(self):
        """딕셔너리로 변환"""
        from src.models.employee import Employee
        employee = Employee.query.get(self.employee_id)
        
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'date': self.date.isoformat() if self.date else None,
            'check_in': self.check_in.strftime('%H:%M:%S') if self.check_in else None,
            'check_out': self.check_out.strftime('%H:%M:%S') if self.check_out else None,
            'work_hours': self.work_hours,
            'status': self.status,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'employee_number': employee.employee_number
            } if employee else None
        }

