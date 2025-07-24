from src.models.user import db
from datetime import datetime

class Employee(db.Model):
    __tablename__ = 'employees'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    employee_number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    position = db.Column(db.String(100))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    hire_date = db.Column(db.Date, nullable=False)
    birth_date = db.Column(db.Date)
    address = db.Column(db.Text)
    salary_grade = db.Column(db.String(10))
    status = db.Column(db.String(20), default='active', nullable=False)  # active, inactive, terminated
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with Department (will be defined later)
    # department = db.relationship('Department', backref='employees')
    
    def __repr__(self):
        return f'<Employee {self.employee_number}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_number': self.employee_number,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'position': self.position,
            'department_id': self.department_id,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'address': self.address,
            'salary_grade': self.salary_grade,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_summary_dict(self):
        """간단한 정보만 포함한 딕셔너리"""
        return {
            'id': self.id,
            'employee_number': self.employee_number,
            'name': self.name,
            'position': self.position,
            'status': self.status
        }

