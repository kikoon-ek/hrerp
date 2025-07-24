from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class BonusPolicy(db.Model):
    """성과급 정책 모델"""
    __tablename__ = 'bonus_policies'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    policy_type = db.Column(db.String(50), nullable=False)
    
    # 분배 비율 (총합 100%)
    ratio_base = db.Column(db.Float, nullable=False, default=0.0)
    ratio_team = db.Column(db.Float, nullable=False, default=0.0)
    ratio_personal = db.Column(db.Float, nullable=False, default=0.0)
    ratio_company = db.Column(db.Float, nullable=False, default=0.0)
    
    # 계산 방식
    calculation_method = db.Column(db.String(50), nullable=False, default='weighted')
    min_performance_score = db.Column(db.Float, default=0.0)
    max_bonus_multiplier = db.Column(db.Float, default=2.0)
    
    # 적용 범위 (JSON 문자열로 저장)
    target_departments = db.Column(db.Text)
    target_positions = db.Column(db.Text)
    
    # 상태 및 메타데이터
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    effective_from = db.Column(db.DateTime)
    effective_to = db.Column(db.DateTime)
    version = db.Column(db.String(20), nullable=False, default='1.0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 관계
    bonus_calculations = db.relationship("BonusCalculation", backref="policy")
    
    def get_target_departments(self):
        """JSON 문자열을 리스트로 변환"""
        if self.target_departments:
            try:
                return json.loads(self.target_departments)
            except:
                return []
        return []
    
    def set_target_departments(self, departments):
        """리스트를 JSON 문자열로 변환"""
        self.target_departments = json.dumps(departments) if departments else None
    
    def get_target_positions(self):
        """JSON 문자열을 리스트로 변환"""
        if self.target_positions:
            try:
                return json.loads(self.target_positions)
            except:
                return []
        return []
    
    def set_target_positions(self, positions):
        """리스트를 JSON 문자열로 변환"""
        self.target_positions = json.dumps(positions) if positions else None
    
    def to_dict(self):
        total_ratio = self.ratio_base + self.ratio_team + self.ratio_personal + self.ratio_company
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'policy_type': self.policy_type,
            'ratio_base': self.ratio_base,
            'ratio_team': self.ratio_team,
            'ratio_personal': self.ratio_personal,
            'ratio_company': self.ratio_company,
            'total_ratio': total_ratio,
            'calculation_method': self.calculation_method,
            'min_performance_score': self.min_performance_score,
            'max_bonus_multiplier': self.max_bonus_multiplier,
            'target_departments': self.get_target_departments(),
            'target_positions': self.get_target_positions(),
            'is_active': self.is_active,
            'is_default': self.is_default,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }
    
    def validate_ratios(self):
        """비율 합계가 100%인지 검증"""
        total = self.ratio_base + self.ratio_team + self.ratio_personal + self.ratio_company
        return abs(total - 100.0) < 0.01  # 부동소수점 오차 고려

class BonusCalculation(db.Model):
    """성과급 계산 모델"""
    __tablename__ = 'bonus_calculations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    policy_id = db.Column(db.Integer, db.ForeignKey('bonus_policies.id'), nullable=False)
    period = db.Column(db.String(20), nullable=False)
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    
    # 계산 기준
    base_calculation_date = db.Column(db.DateTime)
    target_department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    target_team_id = db.Column(db.Integer, nullable=True)
    
    # 성과 지표
    company_performance_score = db.Column(db.Float, default=0.0)
    team_performance_score = db.Column(db.Float, default=0.0)
    
    # 상태
    status = db.Column(db.String(20), default='draft')
    calculation_notes = db.Column(db.Text)
    
    # 메타데이터
    calculated_at = db.Column(db.DateTime)
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 관계
    distributions = db.relationship("BonusDistribution", backref="calculation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'policy_id': self.policy_id,
            'period': self.period,
            'total_amount': self.total_amount,
            'base_calculation_date': self.base_calculation_date.isoformat() if self.base_calculation_date else None,
            'target_department_id': self.target_department_id,
            'target_team_id': self.target_team_id,
            'company_performance_score': self.company_performance_score,
            'team_performance_score': self.team_performance_score,
            'status': self.status,
            'calculation_notes': self.calculation_notes,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'distributions_count': len(self.distributions) if self.distributions else 0
        }

class BonusDistribution(db.Model):
    """성과급 분배 모델"""
    __tablename__ = 'bonus_distributions'
    
    id = db.Column(db.Integer, primary_key=True)
    calculation_id = db.Column(db.Integer, db.ForeignKey('bonus_calculations.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # 성과급 계산 요소
    base_salary = db.Column(db.Float, default=0.0)
    personal_performance_score = db.Column(db.Float, default=0.0)
    team_contribution_ratio = db.Column(db.Float, default=0.0)
    
    # 계산된 성과급
    base_bonus = db.Column(db.Float, default=0.0)
    performance_bonus = db.Column(db.Float, default=0.0)
    team_bonus = db.Column(db.Float, default=0.0)
    company_bonus = db.Column(db.Float, default=0.0)
    total_bonus = db.Column(db.Float, default=0.0)
    
    # 조정 및 메모
    adjustment_amount = db.Column(db.Float, default=0.0)
    adjustment_reason = db.Column(db.Text)
    final_amount = db.Column(db.Float, default=0.0)
    
    # 상태
    status = db.Column(db.String(20), default='calculated')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'calculation_id': self.calculation_id,
            'employee_id': self.employee_id,
            'base_salary': self.base_salary,
            'personal_performance_score': self.personal_performance_score,
            'team_contribution_ratio': self.team_contribution_ratio,
            'base_bonus': self.base_bonus,
            'performance_bonus': self.performance_bonus,
            'team_bonus': self.team_bonus,
            'company_bonus': self.company_bonus,
            'total_bonus': self.total_bonus,
            'adjustment_amount': self.adjustment_amount,
            'adjustment_reason': self.adjustment_reason,
            'final_amount': self.final_amount,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

