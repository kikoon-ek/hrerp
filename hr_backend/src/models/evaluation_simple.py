from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Evaluation(db.Model):
    """성과 평가 모델"""
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(50), nullable=False)  # 연간평가, 반기평가 등
    status = db.Column(db.String(50), default='초안')  # 초안, 진행중, 완료, 마감
    
    # 평가 기간
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    # 평가 기준 연결
    criteria_id = db.Column(db.Integer, db.ForeignKey('evaluation_criteria.id'), nullable=False)
    
    # 생성자 정보
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    evaluation_results = db.relationship("EvaluationResult", backref="evaluation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'criteria_id': self.criteria_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'total_results': len(self.evaluation_results) if self.evaluation_results else 0
        }

class EvaluationResult(db.Model):
    """평가 결과 모델"""
    __tablename__ = 'evaluation_results'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 평가 연결
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluations.id'), nullable=False)
    
    # 피평가자
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # 평가자
    evaluator_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # 평가 결과
    status = db.Column(db.String(50), default='미시작')  # 미시작, 진행중, 완료, 승인
    total_score = db.Column(db.Float)
    weighted_score = db.Column(db.Float)
    grade = db.Column(db.String(10))  # S, A, B, C, D
    
    # 평가 내용
    self_evaluation = db.Column(db.Text)
    evaluator_comments = db.Column(db.Text)
    improvement_areas = db.Column(db.Text)
    strengths = db.Column(db.Text)
    
    # 승인 정보
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    
    # 메타데이터
    submitted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    evaluation_scores = db.relationship("EvaluationScore", backref="evaluation_result", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'evaluation_id': self.evaluation_id,
            'employee_id': self.employee_id,
            'evaluator_id': self.evaluator_id,
            'status': self.status,
            'total_score': self.total_score,
            'weighted_score': self.weighted_score,
            'grade': self.grade,
            'self_evaluation': self.self_evaluation,
            'evaluator_comments': self.evaluator_comments,
            'improvement_areas': self.improvement_areas,
            'strengths': self.strengths,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'scores': [score.to_dict() for score in self.evaluation_scores] if self.evaluation_scores else []
        }

class EvaluationScore(db.Model):
    """평가 점수 모델"""
    __tablename__ = 'evaluation_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 평가 결과 연결
    evaluation_result_id = db.Column(db.Integer, db.ForeignKey('evaluation_results.id'), nullable=False)
    
    # 평가 항목 정보
    criteria_item = db.Column(db.String(200), nullable=False)
    weight = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, default=100.0)
    
    # 점수
    score = db.Column(db.Float, nullable=False)
    weighted_score = db.Column(db.Float)
    
    # 평가 내용
    comments = db.Column(db.Text)
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'evaluation_result_id': self.evaluation_result_id,
            'criteria_item': self.criteria_item,
            'weight': self.weight,
            'max_score': self.max_score,
            'score': self.score,
            'weighted_score': self.weighted_score,
            'comments': self.comments,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

