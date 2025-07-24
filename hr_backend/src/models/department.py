from src.models.user import db
from datetime import datetime

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    manager_id = db.Column(db.Integer, db.ForeignKey('employees.id'))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship for parent/child departments
    children = db.relationship('Department', backref=db.backref('parent', remote_side=[id]))
    
    # Relationship with employees
    employees = db.relationship('Employee', backref='department', foreign_keys='Employee.department_id')
    
    # Relationship with manager
    manager = db.relationship('Employee', backref='managed_department', foreign_keys=[manager_id])
    
    def __repr__(self):
        return f'<Department {self.code}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'parent_id': self.parent_id,
            'manager_id': self.manager_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'employee_count': len(self.employees) if self.employees else 0
        }
    
    def to_tree_dict(self):
        """트리 구조로 표현하기 위한 딕셔너리"""
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'parent_id': self.parent_id,
            'manager_id': self.manager_id,
            'employee_count': len(self.employees) if self.employees else 0,
            'children': [child.to_tree_dict() for child in self.children if child.is_active]
        }

