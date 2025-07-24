from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class EvaluationCriteria(db.Model):
    """평가 기준 모델"""
    __tablename__ = 'evaluation_criteria'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    weight = db.Column(db.Float, nullable=False, default=0.0)
    min_score = db.Column(db.Float, nullable=False, default=0.0)
    max_score = db.Column(db.Float, nullable=False, default=100.0)
    is_active = db.Column(db.Boolean, default=True)
    version = db.Column(db.String(20), nullable=False, default='1.0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 관계
    evaluation_items = db.relationship("EvaluationItem", backref="criteria", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'weight': self.weight,
            'min_score': self.min_score,
            'max_score': self.max_score,
            'is_active': self.is_active,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'items_count': len(self.evaluation_items) if self.evaluation_items else 0
        }

class EvaluationItem(db.Model):
    """평가 항목 모델"""
    __tablename__ = 'evaluation_items'
    
    id = db.Column(db.Integer, primary_key=True)
    criteria_id = db.Column(db.Integer, db.ForeignKey('evaluation_criteria.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    weight = db.Column(db.Float, nullable=False, default=0.0)
    evaluation_method = db.Column(db.String(50))
    target_value = db.Column(db.String(100))
    measurement_unit = db.Column(db.String(20))
    order_index = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'criteria_id': self.criteria_id,
            'name': self.name,
            'description': self.description,
            'weight': self.weight,
            'evaluation_method': self.evaluation_method,
            'target_value': self.target_value,
            'measurement_unit': self.measurement_unit,
            'order_index': self.order_index,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EvaluationTemplate(db.Model):
    """평가 템플릿 모델"""
    __tablename__ = 'evaluation_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    template_type = db.Column(db.String(50), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    position_level = db.Column(db.String(50))
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    version = db.Column(db.String(20), nullable=False, default='1.0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 관계
    template_criteria = db.relationship("TemplateCriteria", backref="template", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'template_type': self.template_type,
            'department_id': self.department_id,
            'position_level': self.position_level,
            'is_default': self.is_default,
            'is_active': self.is_active,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'criteria_count': len(self.template_criteria) if self.template_criteria else 0
        }

class TemplateCriteria(db.Model):
    """템플릿-평가기준 연결 모델"""
    __tablename__ = 'template_criteria'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('evaluation_templates.id'), nullable=False)
    criteria_id = db.Column(db.Integer, db.ForeignKey('evaluation_criteria.id'), nullable=False)
    weight_override = db.Column(db.Float)
    is_required = db.Column(db.Boolean, default=True)
    order_index = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_id': self.template_id,
            'criteria_id': self.criteria_id,
            'weight_override': self.weight_override,
            'is_required': self.is_required,
            'order_index': self.order_index
        }

