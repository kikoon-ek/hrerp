from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import and_, or_, desc, asc, func
from datetime import datetime, timedelta
from ..models.user import db, User
from ..models.employee import Employee
from ..models.department import Department
from ..models.bonus_policy import BonusPolicy
from ..models.bonus_calculation_advanced import (
    BonusCalculation, BonusDistribution, BonusPaymentHistory, BonusCalculationEngine
)
from ..models.audit_log import AuditLog
from ..utils.auth import token_required, admin_required
from ..utils.audit import log_action

bonus_calculation_bp = Blueprint('bonus_calculation', __name__)

# 성과급 계산 목록 조회
@bonus_calculation_bp.route('/bonus-calculations', methods=['GET'])
@admin_required
def get_bonus_calculations(current_user):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        period = request.args.get('period', '')
        
        query = BonusCalculation.query
        
        # 검색 조건
        if search:
            query = query.filter(
                or_(
                    BonusCalculation.title.contains(search),
                    BonusCalculation.description.contains(search),
                    BonusCalculation.period.contains(search)
                )
            )
        
        if status:
            query = query.filter(BonusCalculation.status == status)
        
        if period:
            query = query.filter(BonusCalculation.period == period)
        
        # 정렬
        query = query.order_by(desc(BonusCalculation.created_at))
        
        # 페이지네이션
        calculations = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'calculations': [calc.to_dict() for calc in calculations.items],
            'total': calculations.total,
            'pages': calculations.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 성과급 계산 생성
@bonus_calculation_bp.route('/bonus-calculations', methods=['POST'])
@admin_required
def create_bonus_calculation(current_user):
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['title', 'period', 'start_date', 'end_date', 'bonus_policy_id', 'total_amount']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 성과급 정책 존재 확인
        policy = BonusPolicy.query.get(data['bonus_policy_id'])
        if not policy:
            return jsonify({'error': '존재하지 않는 성과급 정책입니다.'}), 400
        
        # 날짜 파싱
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        
        if start_date >= end_date:
            return jsonify({'error': '시작일은 종료일보다 이전이어야 합니다.'}), 400
        
        # 성과급 계산 생성
        calculation = BonusCalculation(
            title=data['title'],
            description=data.get('description', ''),
            period=data['period'],
            start_date=start_date,
            end_date=end_date,
            bonus_policy_id=data['bonus_policy_id'],
            total_amount=float(data['total_amount']),
            created_by=current_user.id
        )
        
        db.session.add(calculation)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='CREATE',
            entity_type='bonus_calculation',
            entity_id=calculation.id,
            message=f'성과급 계산 생성: {calculation.title}'
        )
        
        return jsonify({
            'message': '성과급 계산이 생성되었습니다.',
            'calculation': calculation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 성과급 계산 상세 조회
@bonus_calculation_bp.route('/bonus-calculations/<int:calculation_id>', methods=['GET'])
@admin_required
def get_bonus_calculation(current_user, calculation_id):
    try:
        calculation = BonusCalculation.query.get_or_404(calculation_id)
        
        # 분배 결과도 함께 조회
        distributions = BonusDistribution.query.filter_by(
            calculation_id=calculation_id
        ).all()
        
        result = calculation.to_dict()
        result['distributions'] = [dist.to_dict() for dist in distributions]
        
        return jsonify({'calculation': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 성과급 계산 실행
@bonus_calculation_bp.route('/bonus-calculations/<int:calculation_id>/calculate', methods=['POST'])
@admin_required
def execute_bonus_calculation(current_user, calculation_id):
    try:
        calculation = BonusCalculation.query.get_or_404(calculation_id)
        
        if calculation.status not in ['초안', '계산중']:
            return jsonify({'error': '이미 계산이 완료된 성과급입니다.'}), 400
        
        # 계산 상태 업데이트
        calculation.status = '계산중'
        db.session.commit()
        
        # 성과급 계산 실행
        result = BonusCalculationEngine.calculate_bonus_distribution(calculation_id)
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='UPDATE',
            entity_type='bonus_calculation',
            entity_id=calculation_id,
            message=f'성과급 계산 실행: {calculation.title}'
        )
        
        return jsonify({
            'message': '성과급 계산이 완료되었습니다.',
            'result': result
        })
        
    except Exception as e:
        db.session.rollback()
        # 계산 실패 시 상태 복원
        calculation = BonusCalculation.query.get(calculation_id)
        if calculation:
            calculation.status = '초안'
            db.session.commit()
        return jsonify({'error': str(e)}), 500

# 성과급 분배 결과 조회
@bonus_calculation_bp.route('/bonus-calculations/<int:calculation_id>/distributions', methods=['GET'])
@admin_required
def get_bonus_distributions(current_user, calculation_id):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        department_id = request.args.get('department_id', type=int)
        search = request.args.get('search', '')
        
        query = BonusDistribution.query.filter_by(calculation_id=calculation_id)
        
        # 부서 필터
        if department_id:
            query = query.filter(BonusDistribution.department_id == department_id)
        
        # 직원 이름 검색
        if search:
            query = query.join(Employee).filter(
                Employee.name.contains(search)
            )
        
        # 정렬 (성과급 금액 내림차순)
        query = query.order_by(desc(BonusDistribution.final_bonus))
        
        # 페이지네이션
        distributions = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 직원 및 부서 정보 포함
        result = []
        for dist in distributions.items:
            dist_dict = dist.to_dict()
            
            # 직원 정보 추가
            employee = Employee.query.get(dist.employee_id)
            if employee:
                dist_dict['employee'] = {
                    'name': employee.name,
                    'employee_number': employee.employee_number,
                    'position': employee.position
                }
            
            # 부서 정보 추가
            department = Department.query.get(dist.department_id)
            if department:
                dist_dict['department'] = {
                    'name': department.name
                }
            
            result.append(dist_dict)
        
        return jsonify({
            'distributions': result,
            'total': distributions.total,
            'pages': distributions.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 성과급 분배 결과 수정
@bonus_calculation_bp.route('/bonus-distributions/<int:distribution_id>', methods=['PUT'])
@admin_required
def update_bonus_distribution(current_user, distribution_id):
    try:
        distribution = BonusDistribution.query.get_or_404(distribution_id)
        data = request.get_json()
        
        # 계산이 완료된 상태에서만 수정 가능
        calculation = BonusCalculation.query.get(distribution.calculation_id)
        if calculation.status not in ['완료']:
            return jsonify({'error': '완료된 계산에서만 수정이 가능합니다.'}), 400
        
        # 조정 금액 및 사유 업데이트
        if 'adjustment_amount' in data:
            distribution.adjustment_amount = float(data['adjustment_amount'])
            distribution.final_bonus += distribution.adjustment_amount
        
        if 'adjustment_reason' in data:
            distribution.adjustment_reason = data['adjustment_reason']
        
        distribution.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='UPDATE',
            entity_type='bonus_distribution',
            entity_id=distribution_id,
            message=f'성과급 분배 결과 수정: 직원 ID {distribution.employee_id}'
        )
        
        return jsonify({
            'message': '성과급 분배 결과가 수정되었습니다.',
            'distribution': distribution.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 성과급 계산 승인
@bonus_calculation_bp.route('/bonus-calculations/<int:calculation_id>/approve', methods=['POST'])
@admin_required
def approve_bonus_calculation(current_user, calculation_id):
    try:
        calculation = BonusCalculation.query.get_or_404(calculation_id)
        
        if calculation.status != '완료':
            return jsonify({'error': '완료된 계산만 승인할 수 있습니다.'}), 400
        
        # 승인 처리
        calculation.status = '승인'
        calculation.approved_by = current_user.id
        calculation.approved_at = datetime.utcnow()
        
        # 모든 분배 결과 승인 상태로 변경
        BonusDistribution.query.filter_by(
            calculation_id=calculation_id
        ).update({'status': '승인'})
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='UPDATE',
            entity_type='bonus_calculation',
            entity_id=calculation_id,
            message=f'성과급 계산 승인: {calculation.title}'
        )
        
        return jsonify({
            'message': '성과급 계산이 승인되었습니다.',
            'calculation': calculation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 성과급 지급 처리
@bonus_calculation_bp.route('/bonus-distributions/<int:distribution_id>/pay', methods=['POST'])
@admin_required
def process_bonus_payment(current_user, distribution_id):
    try:
        distribution = BonusDistribution.query.get_or_404(distribution_id)
        data = request.get_json()
        
        if distribution.status != '승인':
            return jsonify({'error': '승인된 성과급만 지급할 수 있습니다.'}), 400
        
        # 지급 정보 검증
        required_fields = ['payment_date', 'payment_method']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        payment_date = datetime.fromisoformat(data['payment_date'].replace('Z', '+00:00'))
        payment_amount = distribution.final_bonus + distribution.adjustment_amount
        tax_amount = data.get('tax_amount', 0.0)
        net_amount = payment_amount - tax_amount
        
        # 지급 이력 생성
        payment_history = BonusPaymentHistory(
            distribution_id=distribution_id,
            employee_id=distribution.employee_id,
            payment_amount=payment_amount,
            payment_date=payment_date,
            payment_method=data['payment_method'],
            tax_amount=tax_amount,
            net_amount=net_amount,
            processed_by=current_user.id,
            processing_note=data.get('processing_note', '')
        )
        
        # 분배 상태 업데이트
        distribution.status = '지급완료'
        distribution.payment_date = payment_date
        distribution.payment_method = data['payment_method']
        
        db.session.add(payment_history)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='CREATE',
            entity_type='bonus_payment',
            entity_id=payment_history.id,
            message=f'성과급 지급 처리: 직원 ID {distribution.employee_id}, 금액 {net_amount:,}원'
        )
        
        return jsonify({
            'message': '성과급 지급이 처리되었습니다.',
            'payment_history': payment_history.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 성과급 통계 조회
@bonus_calculation_bp.route('/bonus-statistics', methods=['GET'])
@admin_required
def get_bonus_statistics(current_user):
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        
        # 연도별 성과급 통계
        calculations = BonusCalculation.query.filter(
            func.extract('year', BonusCalculation.start_date) == year
        ).all()
        
        # 기본 통계
        total_calculations = len(calculations)
        total_amount = sum(calc.total_amount for calc in calculations)
        total_distributed = sum(calc.total_distributed for calc in calculations)
        
        # 상태별 통계
        status_stats = {}
        for calc in calculations:
            status_stats[calc.status] = status_stats.get(calc.status, 0) + 1
        
        # 부서별 통계
        department_stats = {}
        for calc in calculations:
            distributions = BonusDistribution.query.filter_by(
                calculation_id=calc.id
            ).all()
            
            for dist in distributions:
                dept = Department.query.get(dist.department_id)
                if dept:
                    if dept.name not in department_stats:
                        department_stats[dept.name] = {
                            'total_amount': 0,
                            'employee_count': 0,
                            'average_bonus': 0
                        }
                    
                    department_stats[dept.name]['total_amount'] += dist.final_bonus
                    department_stats[dept.name]['employee_count'] += 1
        
        # 부서별 평균 계산
        for dept_name in department_stats:
            if department_stats[dept_name]['employee_count'] > 0:
                department_stats[dept_name]['average_bonus'] = (
                    department_stats[dept_name]['total_amount'] / 
                    department_stats[dept_name]['employee_count']
                )
        
        # 월별 지급 통계
        monthly_stats = {}
        payments = BonusPaymentHistory.query.filter(
            func.extract('year', BonusPaymentHistory.payment_date) == year
        ).all()
        
        for payment in payments:
            month = payment.payment_date.month
            if month not in monthly_stats:
                monthly_stats[month] = {
                    'total_amount': 0,
                    'payment_count': 0
                }
            
            monthly_stats[month]['total_amount'] += payment.net_amount
            monthly_stats[month]['payment_count'] += 1
        
        return jsonify({
            'year': year,
            'summary': {
                'total_calculations': total_calculations,
                'total_amount': total_amount,
                'total_distributed': total_distributed,
                'distribution_rate': (total_distributed / total_amount * 100) if total_amount > 0 else 0
            },
            'status_statistics': status_stats,
            'department_statistics': department_stats,
            'monthly_statistics': monthly_stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 내 성과급 내역 조회 (사용자용)
@bonus_calculation_bp.route('/my-bonus-history', methods=['GET'])
@token_required
def get_my_bonus_history(current_user):
    try:
        # 현재 사용자의 직원 정보 조회
        employee = Employee.query.filter_by(user_id=current_user.id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        # 성과급 분배 내역 조회
        distributions = BonusDistribution.query.filter_by(
            employee_id=employee.id
        ).order_by(desc(BonusDistribution.created_at)).all()
        
        result = []
        for dist in distributions:
            dist_dict = dist.to_dict()
            
            # 계산 정보 추가
            calculation = BonusCalculation.query.get(dist.calculation_id)
            if calculation:
                dist_dict['calculation'] = {
                    'title': calculation.title,
                    'period': calculation.period,
                    'status': calculation.status
                }
            
            # 지급 내역 추가
            payment = BonusPaymentHistory.query.filter_by(
                distribution_id=dist.id
            ).first()
            if payment:
                dist_dict['payment'] = payment.to_dict()
            
            result.append(dist_dict)
        
        return jsonify({'bonus_history': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

