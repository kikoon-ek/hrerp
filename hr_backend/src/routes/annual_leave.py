from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date
from sqlalchemy import and_, or_, desc, func
from src.models.user import db
from src.models.annual_leave_grant import AnnualLeaveGrant
from src.models.annual_leave_usage import AnnualLeaveUsage
from src.models.leave_request import LeaveRequest
from src.models.employee import Employee
from src.utils.auth import admin_required
from src.utils.audit import log_action

annual_leave_bp = Blueprint('annual_leave', __name__)

@annual_leave_bp.route('/annual-leave/grants', methods=['GET'])
@jwt_required()
def get_annual_leave_grants():
    """연차 부여 내역 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        year = request.args.get('year', type=int)
        
        # 기본 쿼리
        query = AnnualLeaveGrant.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 기록만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(AnnualLeaveGrant.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(AnnualLeaveGrant.employee_id == employee_id)
        
        # 연도 필터
        if year:
            query = query.filter(AnnualLeaveGrant.year == year)
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(AnnualLeaveGrant.year), desc(AnnualLeaveGrant.grant_date))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        grants = [grant.to_dict() for grant in pagination.items]
        
        return jsonify({
            'grants': grants,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 부여 내역 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/grants', methods=['POST'])
@admin_required
def create_annual_leave_grant():
    """연차 부여 (관리자만)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'total_days', 'year']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 중복 부여 확인
        existing_grant = AnnualLeaveGrant.query.filter_by(
            employee_id=data['employee_id'],
            year=data['year']
        ).first()
        
        if existing_grant:
            return jsonify({'error': f'{data["year"]}년도 연차가 이미 부여되었습니다.'}), 400
        
        # 부여 날짜 파싱
        grant_date = date.today()
        if 'grant_date' in data and data['grant_date']:
            try:
                grant_date = datetime.strptime(data['grant_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': '부여 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 연차 부여 생성
        grant = AnnualLeaveGrant(
            employee_id=data['employee_id'],
            grant_date=grant_date,
            total_days=data['total_days'],
            year=data['year'],
            note=data.get('note'),
            created_by=current_user_id
        )
        
        db.session.add(grant)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='annual_leave_grant',
            entity_id=grant.id,
            message=f'연차 부여: {employee.name} ({data["year"]}년 {data["total_days"]}일)'
        )
        
        return jsonify({
            'message': '연차가 부여되었습니다.',
            'grant': grant.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'연차 부여 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/usages', methods=['GET'])
@jwt_required()
def get_annual_leave_usages():
    """연차 사용 내역 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 기본 쿼리
        query = AnnualLeaveUsage.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 기록만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(AnnualLeaveUsage.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(AnnualLeaveUsage.employee_id == employee_id)
        
        # 날짜 필터
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(AnnualLeaveUsage.usage_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '시작 날짜 형식이 올바르지 않습니다.'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(AnnualLeaveUsage.usage_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '종료 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(AnnualLeaveUsage.usage_date))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        usages = [usage.to_dict() for usage in pagination.items]
        
        return jsonify({
            'usages': usages,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 사용 내역 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/balance/<int:employee_id>', methods=['GET'])
@jwt_required()
def get_annual_leave_balance(employee_id):
    """연차 잔여일수 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or employee.id != employee_id:
                return jsonify({'error': '조회 권한이 없습니다.'}), 403
        
        # 직원 확인
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        # 부여된 연차 조회
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee_id,
            year=year
        ).first()
        
        total_granted = grant.total_days if grant else 0
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == employee_id,
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 잔여 연차 계산
        remaining = total_granted - total_used
        
        return jsonify({
            'employee_id': employee_id,
            'employee_name': employee.name,
            'year': year,
            'total_granted': total_granted,
            'total_used': total_used,
            'remaining': remaining,
            'grant_info': grant.to_dict() if grant else None
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 잔여일수 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/balance', methods=['GET'])
@jwt_required()
def get_my_annual_leave_balance():
    """내 연차 잔여일수 조회"""
    try:
        current_user_id = get_jwt_identity()
        
        # 직원 정보 확인
        employee = Employee.query.filter_by(user_id=current_user_id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        # 부여된 연차 조회
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee.id,
            year=year
        ).first()
        
        total_granted = grant.total_days if grant else 0
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == employee.id,
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 잔여 연차 계산
        remaining = total_granted - total_used
        
        return jsonify({
            'employee_id': employee.id,
            'employee_name': employee.name,
            'year': year,
            'total_granted': total_granted,
            'total_used': total_used,
            'remaining': remaining,
            'grant_info': grant.to_dict() if grant else None
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 잔여일수 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/use', methods=['POST'])
@admin_required
def use_annual_leave():
    """연차 사용 등록 (관리자만)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'usage_date', 'used_days']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 날짜 파싱
        try:
            usage_date = datetime.strptime(data['usage_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '사용 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 연차 잔여일수 확인
        year = usage_date.year
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=data['employee_id'],
            year=year
        ).first()
        
        if not grant:
            return jsonify({'error': f'{year}년도 연차가 부여되지 않았습니다.'}), 400
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == data['employee_id'],
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 잔여 연차 확인
        remaining = grant.total_days - total_used
        if data['used_days'] > remaining:
            return jsonify({'error': f'연차 잔여일수가 부족합니다. (잔여: {remaining}일)'}), 400
        
        # 연차 사용 등록
        usage = AnnualLeaveUsage(
            employee_id=data['employee_id'],
            usage_date=usage_date,
            used_days=data['used_days'],
            linked_leave_request_id=data.get('linked_leave_request_id'),
            note=data.get('note'),
            created_by=current_user_id
        )
        
        db.session.add(usage)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='annual_leave_usage',
            entity_id=usage.id,
            message=f'연차 사용 등록: {employee.name} ({usage_date} {data["used_days"]}일)'
        )
        
        return jsonify({
            'message': '연차 사용이 등록되었습니다.',
            'usage': usage.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'연차 사용 등록 중 오류가 발생했습니다: {str(e)}'}), 500

