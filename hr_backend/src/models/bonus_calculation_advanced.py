from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func, and_

db = SQLAlchemy()

class BonusCalculation(db.Model):
    """성과급 계산 모델"""
    __tablename__ = 'bonus_calculations'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # 계산 기간
    period = db.Column(db.String(20), nullable=False)  # 2025-Q1, 2025-H1, 2025 등
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    # 성과급 정책 연결
    bonus_policy_id = db.Column(db.Integer, db.ForeignKey('bonus_policies.id'), nullable=False)
    
    # 총 성과급 금액
    total_amount = db.Column(db.Float, nullable=False)
    
    # 계산 상태
    status = db.Column(db.String(50), default='초안')  # 초안, 계산중, 완료, 승인, 지급완료
    
    # 계산 결과 요약
    total_employees = db.Column(db.Integer, default=0)
    total_distributed = db.Column(db.Float, default=0.0)
    average_bonus = db.Column(db.Float, default=0.0)
    
    # 승인 정보
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    
    # 생성자 정보
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    bonus_distributions = db.relationship("BonusDistribution", backref="calculation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'period': self.period,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'bonus_policy_id': self.bonus_policy_id,
            'total_amount': self.total_amount,
            'status': self.status,
            'total_employees': self.total_employees,
            'total_distributed': self.total_distributed,
            'average_bonus': self.average_bonus,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'distributions_count': len(self.bonus_distributions) if self.bonus_distributions else 0
        }

class BonusDistribution(db.Model):
    """성과급 분배 모델"""
    __tablename__ = 'bonus_distributions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 성과급 계산 연결
    calculation_id = db.Column(db.Integer, db.ForeignKey('bonus_calculations.id'), nullable=False)
    
    # 직원 정보
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # 성과 평가 연결 (해당 기간의 평가)
    evaluation_result_id = db.Column(db.Integer, db.ForeignKey('evaluation_results.id'), nullable=True)
    
    # 기본 정보
    base_salary = db.Column(db.Float, nullable=False)  # 기본급
    position_level = db.Column(db.String(50))  # 직급
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    
    # 성과 점수
    individual_score = db.Column(db.Float, default=0.0)  # 개인 성과 점수
    team_score = db.Column(db.Float, default=0.0)  # 팀 성과 점수
    company_score = db.Column(db.Float, default=0.0)  # 전사 성과 점수
    
    # 기여도 및 가중치
    individual_weight = db.Column(db.Float, default=0.0)  # 개인 가중치
    team_weight = db.Column(db.Float, default=0.0)  # 팀 가중치
    company_weight = db.Column(db.Float, default=0.0)  # 전사 가중치
    
    # 계산된 성과급
    base_bonus = db.Column(db.Float, default=0.0)  # 기본 성과급
    performance_bonus = db.Column(db.Float, default=0.0)  # 성과 성과급
    team_bonus = db.Column(db.Float, default=0.0)  # 팀 성과급
    final_bonus = db.Column(db.Float, default=0.0)  # 최종 성과급
    
    # 기여도 비율
    contribution_ratio = db.Column(db.Float, default=0.0)  # 전체 성과급 대비 비율
    
    # 조정 사항
    adjustment_amount = db.Column(db.Float, default=0.0)  # 조정 금액
    adjustment_reason = db.Column(db.Text)  # 조정 사유
    
    # 상태
    status = db.Column(db.String(50), default='계산완료')  # 계산완료, 승인, 지급완료
    
    # 지급 정보
    payment_date = db.Column(db.DateTime, nullable=True)
    payment_method = db.Column(db.String(50))  # 급여통합, 별도지급
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'calculation_id': self.calculation_id,
            'employee_id': self.employee_id,
            'evaluation_result_id': self.evaluation_result_id,
            'base_salary': self.base_salary,
            'position_level': self.position_level,
            'department_id': self.department_id,
            'individual_score': self.individual_score,
            'team_score': self.team_score,
            'company_score': self.company_score,
            'individual_weight': self.individual_weight,
            'team_weight': self.team_weight,
            'company_weight': self.company_weight,
            'base_bonus': self.base_bonus,
            'performance_bonus': self.performance_bonus,
            'team_bonus': self.team_bonus,
            'final_bonus': self.final_bonus,
            'contribution_ratio': self.contribution_ratio,
            'adjustment_amount': self.adjustment_amount,
            'adjustment_reason': self.adjustment_reason,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class BonusPaymentHistory(db.Model):
    """성과급 지급 이력 모델"""
    __tablename__ = 'bonus_payment_history'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 성과급 분배 연결
    distribution_id = db.Column(db.Integer, db.ForeignKey('bonus_distributions.id'), nullable=False)
    
    # 직원 정보
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # 지급 정보
    payment_amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    
    # 세금 정보
    tax_amount = db.Column(db.Float, default=0.0)
    net_amount = db.Column(db.Float, nullable=False)  # 실지급액
    
    # 처리 정보
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    processing_note = db.Column(db.Text)
    
    # 상태
    status = db.Column(db.String(50), default='지급완료')  # 지급완료, 취소, 환수
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'distribution_id': self.distribution_id,
            'employee_id': self.employee_id,
            'payment_amount': self.payment_amount,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'tax_amount': self.tax_amount,
            'net_amount': self.net_amount,
            'processed_by': self.processed_by,
            'processing_note': self.processing_note,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class BonusCalculationEngine:
    """성과급 계산 엔진"""
    
    @staticmethod
    def calculate_bonus_distribution(calculation_id):
        """성과급 분배 계산 실행"""
        calculation = BonusCalculation.query.get(calculation_id)
        if not calculation:
            raise ValueError("계산 정보를 찾을 수 없습니다.")
        
        # 성과급 정책 가져오기
        from .bonus_policy import BonusPolicy
        policy = BonusPolicy.query.get(calculation.bonus_policy_id)
        if not policy:
            raise ValueError("성과급 정책을 찾을 수 없습니다.")
        
        # 해당 기간의 직원 및 평가 결과 가져오기
        from .employee import Employee
        from .evaluation_simple import EvaluationResult
        
        employees = Employee.query.filter_by(status='active').all()
        
        # 기존 분배 결과 삭제
        BonusDistribution.query.filter_by(calculation_id=calculation_id).delete()
        
        total_distributed = 0.0
        distributions = []
        
        for employee in employees:
            # 해당 기간의 평가 결과 찾기
            evaluation_result = EvaluationResult.query.filter(
                and_(
                    EvaluationResult.employee_id == employee.id,
                    EvaluationResult.status.in_(['완료', '승인'])
                )
            ).first()
            
            # 기본 정보 설정
            base_salary = getattr(employee, 'salary', 50000000)  # 기본급 (임시값)
            
            # 성과 점수 계산
            individual_score = evaluation_result.weighted_score if evaluation_result else 70.0
            team_score = BonusCalculationEngine._calculate_team_score(employee.department_id, calculation.start_date, calculation.end_date)
            company_score = BonusCalculationEngine._calculate_company_score(calculation.start_date, calculation.end_date)
            
            # 가중치 적용
            individual_weight = policy.ratio_personal / 100.0
            team_weight = policy.ratio_team / 100.0
            company_weight = policy.ratio_base / 100.0
            
            # 성과급 계산
            base_bonus = calculation.total_amount * 0.3 / len(employees)  # 기본 분배
            performance_multiplier = (
                individual_score * individual_weight +
                team_score * team_weight +
                company_score * company_weight
            ) / 100.0
            
            performance_bonus = base_bonus * performance_multiplier
            team_bonus = calculation.total_amount * 0.2 * (team_score / 100.0) / BonusCalculationEngine._get_team_size(employee.department_id)
            
            final_bonus = base_bonus + performance_bonus + team_bonus
            contribution_ratio = final_bonus / calculation.total_amount * 100.0
            
            # 분배 결과 생성
            distribution = BonusDistribution(
                calculation_id=calculation_id,
                employee_id=employee.id,
                evaluation_result_id=evaluation_result.id if evaluation_result else None,
                base_salary=base_salary,
                position_level=employee.position,
                department_id=employee.department_id,
                individual_score=individual_score,
                team_score=team_score,
                company_score=company_score,
                individual_weight=individual_weight,
                team_weight=team_weight,
                company_weight=company_weight,
                base_bonus=base_bonus,
                performance_bonus=performance_bonus,
                team_bonus=team_bonus,
                final_bonus=final_bonus,
                contribution_ratio=contribution_ratio,
                status='계산완료'
            )
            
            distributions.append(distribution)
            total_distributed += final_bonus
        
        # 분배 결과 저장
        for distribution in distributions:
            db.session.add(distribution)
        
        # 계산 결과 업데이트
        calculation.total_employees = len(employees)
        calculation.total_distributed = total_distributed
        calculation.average_bonus = total_distributed / len(employees) if employees else 0
        calculation.status = '완료'
        
        db.session.commit()
        
        return {
            'total_employees': len(employees),
            'total_distributed': total_distributed,
            'average_bonus': calculation.average_bonus,
            'distributions': [d.to_dict() for d in distributions]
        }
    
    @staticmethod
    def _calculate_team_score(department_id, start_date, end_date):
        """팀 성과 점수 계산"""
        # 팀 평균 성과 점수 계산 (임시 구현)
        from .evaluation_simple import EvaluationResult
        from .employee import Employee
        
        team_employees = Employee.query.filter_by(department_id=department_id).all()
        if not team_employees:
            return 70.0
        
        total_score = 0.0
        count = 0
        
        for employee in team_employees:
            result = EvaluationResult.query.filter(
                and_(
                    EvaluationResult.employee_id == employee.id,
                    EvaluationResult.status.in_(['완료', '승인'])
                )
            ).first()
            
            if result and result.weighted_score:
                total_score += result.weighted_score
                count += 1
        
        return total_score / count if count > 0 else 70.0
    
    @staticmethod
    def _calculate_company_score(start_date, end_date):
        """전사 성과 점수 계산"""
        # 전사 평균 성과 점수 계산 (임시 구현)
        from .evaluation_simple import EvaluationResult
        
        results = EvaluationResult.query.filter(
            EvaluationResult.status.in_(['완료', '승인'])
        ).all()
        
        if not results:
            return 75.0
        
        total_score = sum(r.weighted_score for r in results if r.weighted_score)
        return total_score / len(results) if results else 75.0
    
    @staticmethod
    def _get_team_size(department_id):
        """팀 크기 계산"""
        from .employee import Employee
        return Employee.query.filter_by(department_id=department_id, status='active').count()

