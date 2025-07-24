from datetime import datetime
from src.models.user import db

class AnnualLeaveGrant(db.Model):
    """연차 부여 모델"""
    __tablename__ = 'annual_leave_grants'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    grant_date = db.Column(db.Date, nullable=False)
    total_days = db.Column(db.Float, nullable=False)  # 부여된 연차 일수
    year = db.Column(db.Integer, nullable=False)  # 연차 적용 연도
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def to_dict(self):
        """딕셔너리로 변환"""
        from src.models.employee import Employee
        from src.models.user import User
        
        employee = Employee.query.get(self.employee_id)
        creator = User.query.get(self.created_by)
        
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'grant_date': self.grant_date.isoformat() if self.grant_date else None,
            'total_days': self.total_days,
            'year': self.year,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'employee_number': employee.employee_number
            } if employee else None,
            'creator': {
                'id': creator.id,
                'username': creator.username
            } if creator else None
        }

