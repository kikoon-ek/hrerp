from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .user import db

class PayrollRecord(db.Model):
    """급여명세서 모델"""
    __tablename__ = 'payroll_records'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    period = Column(String(20), nullable=False)  # 급여 지급 기간 (예: 2025-01)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # 기본 급여 정보
    basic_salary = Column(Float, nullable=False, default=0)  # 기본급
    position_allowance = Column(Float, nullable=False, default=0)  # 직책수당
    meal_allowance = Column(Float, nullable=False, default=0)  # 식대
    transport_allowance = Column(Float, nullable=False, default=0)  # 교통비
    family_allowance = Column(Float, nullable=False, default=0)  # 가족수당
    overtime_allowance = Column(Float, nullable=False, default=0)  # 연장근무수당
    night_allowance = Column(Float, nullable=False, default=0)  # 야간근무수당
    holiday_allowance = Column(Float, nullable=False, default=0)  # 휴일근무수당
    other_allowances = Column(Float, nullable=False, default=0)  # 기타수당
    
    # 성과급 및 보너스
    performance_bonus = Column(Float, nullable=False, default=0)  # 성과급
    annual_bonus = Column(Float, nullable=False, default=0)  # 연말보너스
    special_bonus = Column(Float, nullable=False, default=0)  # 특별보너스
    
    # 총 지급액
    total_allowances = Column(Float, nullable=False, default=0)  # 총 수당
    total_bonus = Column(Float, nullable=False, default=0)  # 총 보너스
    gross_pay = Column(Float, nullable=False, default=0)  # 총 지급액
    
    # 공제 항목
    national_pension = Column(Float, nullable=False, default=0)  # 국민연금
    health_insurance = Column(Float, nullable=False, default=0)  # 건강보험
    employment_insurance = Column(Float, nullable=False, default=0)  # 고용보험
    long_term_care = Column(Float, nullable=False, default=0)  # 장기요양보험
    income_tax = Column(Float, nullable=False, default=0)  # 소득세
    local_tax = Column(Float, nullable=False, default=0)  # 지방소득세
    union_fee = Column(Float, nullable=False, default=0)  # 조합비
    other_deductions = Column(Float, nullable=False, default=0)  # 기타공제
    
    # 총 공제액 및 실지급액
    total_deductions = Column(Float, nullable=False, default=0)  # 총 공제액
    net_pay = Column(Float, nullable=False, default=0)  # 실지급액
    
    # 근무 정보
    work_days = Column(Integer, nullable=False, default=0)  # 근무일수
    overtime_hours = Column(Float, nullable=False, default=0)  # 연장근무시간
    night_hours = Column(Float, nullable=False, default=0)  # 야간근무시간
    holiday_hours = Column(Float, nullable=False, default=0)  # 휴일근무시간
    
    # 연차 정보
    annual_leave_used = Column(Integer, nullable=False, default=0)  # 사용 연차
    annual_leave_remaining = Column(Integer, nullable=False, default=0)  # 잔여 연차
    
    # 메모 및 상태
    memo = Column(Text)  # 메모
    status = Column(String(20), nullable=False, default='초안')  # 상태: 초안, 확정, 지급완료
    is_final = Column(Boolean, nullable=False, default=False)  # 확정 여부
    
    # 생성 및 수정 정보
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('users.id'))
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # 관계 설정
    employee = relationship('Employee', backref='payroll_records')
    creator = relationship('User', foreign_keys=[created_by])
    updater = relationship('User', foreign_keys=[updated_by])
    
    def __init__(self, **kwargs):
        super(PayrollRecord, self).__init__(**kwargs)
        if self.period:
            year_month = self.period.split('-')
            if len(year_month) == 2:
                self.year = int(year_month[0])
                self.month = int(year_month[1])
    
    def calculate_totals(self):
        """총액 계산"""
        # 총 수당 계산
        self.total_allowances = (
            self.position_allowance + self.meal_allowance + self.transport_allowance +
            self.family_allowance + self.overtime_allowance + self.night_allowance +
            self.holiday_allowance + self.other_allowances
        )
        
        # 총 보너스 계산
        self.total_bonus = self.performance_bonus + self.annual_bonus + self.special_bonus
        
        # 총 지급액 계산
        self.gross_pay = self.basic_salary + self.total_allowances + self.total_bonus
        
        # 총 공제액 계산
        self.total_deductions = (
            self.national_pension + self.health_insurance + self.employment_insurance +
            self.long_term_care + self.income_tax + self.local_tax +
            self.union_fee + self.other_deductions
        )
        
        # 실지급액 계산
        self.net_pay = self.gross_pay - self.total_deductions
    
    def calculate_tax_and_insurance(self):
        """세금 및 보험료 자동 계산 (간단한 계산식)"""
        # 국민연금 (4.5%, 상한액 적용)
        pension_base = min(self.basic_salary + self.total_allowances, 5530000)  # 2025년 기준 상한액
        self.national_pension = pension_base * 0.045
        
        # 건강보험 (3.545%)
        health_base = self.basic_salary + self.total_allowances
        self.health_insurance = health_base * 0.03545
        
        # 장기요양보험 (건강보험료의 12.95%)
        self.long_term_care = self.health_insurance * 0.1295
        
        # 고용보험 (0.9%)
        self.employment_insurance = (self.basic_salary + self.total_allowances) * 0.009
        
        # 소득세 (간단한 계산 - 실제로는 더 복잡)
        taxable_income = self.gross_pay - (self.national_pension + self.health_insurance + self.employment_insurance)
        if taxable_income <= 1200000:
            self.income_tax = taxable_income * 0.06
        elif taxable_income <= 4600000:
            self.income_tax = 72000 + (taxable_income - 1200000) * 0.15
        elif taxable_income <= 8800000:
            self.income_tax = 582000 + (taxable_income - 4600000) * 0.24
        else:
            self.income_tax = 1590000 + (taxable_income - 8800000) * 0.35
        
        # 지방소득세 (소득세의 10%)
        self.local_tax = self.income_tax * 0.1
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee': {
                'id': self.employee.id,
                'name': self.employee.name,
                'employee_number': self.employee.employee_number,
                'position': self.employee.position,
                'department': {
                    'id': self.employee.department.id,
                    'name': self.employee.department.name
                } if self.employee.department else None
            } if self.employee else None,
            'period': self.period,
            'year': self.year,
            'month': self.month,
            
            # 기본 급여
            'basic_salary': self.basic_salary,
            'position_allowance': self.position_allowance,
            'meal_allowance': self.meal_allowance,
            'transport_allowance': self.transport_allowance,
            'family_allowance': self.family_allowance,
            'overtime_allowance': self.overtime_allowance,
            'night_allowance': self.night_allowance,
            'holiday_allowance': self.holiday_allowance,
            'other_allowances': self.other_allowances,
            
            # 보너스
            'performance_bonus': self.performance_bonus,
            'annual_bonus': self.annual_bonus,
            'special_bonus': self.special_bonus,
            
            # 총액
            'total_allowances': self.total_allowances,
            'total_bonus': self.total_bonus,
            'gross_pay': self.gross_pay,
            
            # 공제
            'national_pension': self.national_pension,
            'health_insurance': self.health_insurance,
            'employment_insurance': self.employment_insurance,
            'long_term_care': self.long_term_care,
            'income_tax': self.income_tax,
            'local_tax': self.local_tax,
            'union_fee': self.union_fee,
            'other_deductions': self.other_deductions,
            'total_deductions': self.total_deductions,
            'net_pay': self.net_pay,
            
            # 근무 정보
            'work_days': self.work_days,
            'overtime_hours': self.overtime_hours,
            'night_hours': self.night_hours,
            'holiday_hours': self.holiday_hours,
            
            # 연차 정보
            'annual_leave_used': self.annual_leave_used,
            'annual_leave_remaining': self.annual_leave_remaining,
            
            # 기타
            'memo': self.memo,
            'status': self.status,
            'is_final': self.is_final,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'creator': {
                'id': self.creator.id,
                'username': self.creator.username
            } if self.creator else None
        }
    
    @classmethod
    def get_by_employee_and_period(cls, employee_id, period):
        """직원과 기간으로 급여명세서 조회"""
        return cls.query.filter_by(employee_id=employee_id, period=period).first()
    
    @classmethod
    def get_by_period(cls, period):
        """기간별 급여명세서 목록 조회"""
        return cls.query.filter_by(period=period).all()
    
    @classmethod
    def get_employee_payroll_history(cls, employee_id, limit=12):
        """직원의 급여 내역 조회"""
        return cls.query.filter_by(employee_id=employee_id)\
                       .order_by(cls.year.desc(), cls.month.desc())\
                       .limit(limit).all()
    
    def __repr__(self):
        return f'<PayrollRecord {self.employee.name if self.employee else "Unknown"} - {self.period}>'

