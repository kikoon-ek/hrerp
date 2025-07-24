from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from .base import Base
import enum

class EvaluationStatus(enum.Enum):
    DRAFT = "초안"
    IN_PROGRESS = "진행중"
    COMPLETED = "완료"
    CLOSED = "마감"

class EvaluationType(enum.Enum):
    ANNUAL = "연간평가"
    SEMI_ANNUAL = "반기평가"
    QUARTERLY = "분기평가"
    PROJECT = "프로젝트평가"

class Evaluation(Base):
    __tablename__ = 'evaluations'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False, comment="평가 제목")
    description = Column(Text, comment="평가 설명")
    type = Column(Enum(EvaluationType), nullable=False, comment="평가 유형")
    status = Column(Enum(EvaluationStatus), default=EvaluationStatus.DRAFT, comment="평가 상태")
    
    # 평가 기간
    start_date = Column(DateTime, nullable=False, comment="평가 시작일")
    end_date = Column(DateTime, nullable=False, comment="평가 종료일")
    
    # 평가 기준 연결
    criteria_id = Column(Integer, ForeignKey('evaluation_criteria.id'), nullable=False)
    criteria = relationship("EvaluationCriteria", back_populates="evaluations")
    
    # 생성자 정보
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User", foreign_keys=[created_by])
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    evaluation_results = relationship("EvaluationResult", back_populates="evaluation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type.value if self.type else None,
            'status': self.status.value if self.status else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'criteria_id': self.criteria_id,
            'criteria': self.criteria.to_dict() if self.criteria else None,
            'created_by': self.created_by,
            'creator': self.creator.to_dict() if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'total_results': len(self.evaluation_results) if self.evaluation_results else 0,
            'completed_results': len([r for r in self.evaluation_results if r.status == EvaluationResultStatus.COMPLETED]) if self.evaluation_results else 0
        }

class EvaluationResultStatus(enum.Enum):
    NOT_STARTED = "미시작"
    IN_PROGRESS = "진행중"
    COMPLETED = "완료"
    APPROVED = "승인"

class EvaluationResult(Base):
    __tablename__ = 'evaluation_results'
    
    id = Column(Integer, primary_key=True)
    
    # 평가 연결
    evaluation_id = Column(Integer, ForeignKey('evaluations.id'), nullable=False)
    evaluation = relationship("Evaluation", back_populates="evaluation_results")
    
    # 피평가자
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    employee = relationship("Employee", foreign_keys=[employee_id])
    
    # 평가자
    evaluator_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    evaluator = relationship("Employee", foreign_keys=[evaluator_id])
    
    # 평가 결과
    status = Column(Enum(EvaluationResultStatus), default=EvaluationResultStatus.NOT_STARTED)
    total_score = Column(Float, comment="총점")
    weighted_score = Column(Float, comment="가중 평균 점수")
    grade = Column(String(10), comment="등급 (S, A, B, C, D)")
    
    # 평가 내용
    self_evaluation = Column(Text, comment="자기평가")
    evaluator_comments = Column(Text, comment="평가자 의견")
    improvement_areas = Column(Text, comment="개선 영역")
    strengths = Column(Text, comment="강점")
    
    # 승인 정보
    approved_by = Column(Integer, ForeignKey('employees.id'), nullable=True)
    approver = relationship("Employee", foreign_keys=[approved_by])
    approved_at = Column(DateTime, nullable=True)
    
    # 메타데이터
    submitted_at = Column(DateTime, nullable=True, comment="제출일시")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    evaluation_scores = relationship("EvaluationScore", back_populates="evaluation_result", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'evaluation_id': self.evaluation_id,
            'evaluation': self.evaluation.to_dict() if self.evaluation else None,
            'employee_id': self.employee_id,
            'employee': self.employee.to_dict() if self.employee else None,
            'evaluator_id': self.evaluator_id,
            'evaluator': self.evaluator.to_dict() if self.evaluator else None,
            'status': self.status.value if self.status else None,
            'total_score': self.total_score,
            'weighted_score': self.weighted_score,
            'grade': self.grade,
            'self_evaluation': self.self_evaluation,
            'evaluator_comments': self.evaluator_comments,
            'improvement_areas': self.improvement_areas,
            'strengths': self.strengths,
            'approved_by': self.approved_by,
            'approver': self.approver.to_dict() if self.approver else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'scores': [score.to_dict() for score in self.evaluation_scores] if self.evaluation_scores else []
        }

class EvaluationScore(Base):
    __tablename__ = 'evaluation_scores'
    
    id = Column(Integer, primary_key=True)
    
    # 평가 결과 연결
    evaluation_result_id = Column(Integer, ForeignKey('evaluation_results.id'), nullable=False)
    evaluation_result = relationship("EvaluationResult", back_populates="evaluation_scores")
    
    # 평가 항목 정보
    criteria_item = Column(String(200), nullable=False, comment="평가 항목명")
    weight = Column(Float, nullable=False, comment="가중치")
    max_score = Column(Float, default=100.0, comment="최대 점수")
    
    # 점수
    score = Column(Float, nullable=False, comment="획득 점수")
    weighted_score = Column(Float, comment="가중 점수")
    
    # 평가 내용
    comments = Column(Text, comment="평가 의견")
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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

