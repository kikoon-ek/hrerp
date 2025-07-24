from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date
from sqlalchemy import and_, or_, desc
from src.models.user import db
from src.models.leave_request import LeaveRequest
from src.models.annual_leave_usage import AnnualLeaveUsage
from src.models.annual_leave_grant import AnnualLeaveGrant
from src.models.employee import Employee
from src.utils.auth import admin_required
from src.utils.audit import log_action

leave_request_bp = Blueprint('leave_request', __name__)

@leave_request_bp.route('/leave-requests', methods=['GET'])
@jwt_required()
def get_leave_requests():
    """휴가 신청 목록 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        status = request.args.get('status')
        leave_type = request.args.get('type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 기본 쿼리
        query = LeaveRequest.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 신청만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(LeaveRequest.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(LeaveRequest.employee_id == employee_id)
        
        # 상태 필터
        if status:
            query = query.filter(LeaveRequest.status == status)
        
        # 휴가 유형 필터
        if leave_type:
            query = query.filter(LeaveRequest.type == leave_type)
        
        # 날짜 필터
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(LeaveRequest.start_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '시작 날짜 형식이 올바르지 않습니다.'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(LeaveRequest.end_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '종료 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(LeaveRequest.created_at))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        requests = [req.to_dict() for req in pagination.items]
        
        return jsonify({
            'requests': requests,
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
        return jsonify({'error': f'휴가 신청 목록 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests', methods=['POST'])
@jwt_required()
def create_leave_request():
    """휴가 신청"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['type', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 정보 확인
        if user_role == 'admin' and 'employee_id' in data:
            employee_id = data['employee_id']
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        else:
            # 일반 사용자는 본인만 신청 가능
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            employee_id = employee.id
        
        # 날짜 파싱
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '날짜 형식이 올바르지 않습니다.'}), 400
        
        # 날짜 유효성 검증
        if start_date > end_date:
            return jsonify({'error': '시작 날짜가 종료 날짜보다 늦을 수 없습니다.'}), 400
        
        if start_date < date.today():
            return jsonify({'error': '과거 날짜로는 휴가를 신청할 수 없습니다.'}), 400
        
        # 휴가 신청 생성
        leave_request = LeaveRequest(
            employee_id=employee_id,
            type=data['type'],
            start_date=start_date,
            end_date=end_date,
            reason=data.get('reason')
        )
        
        # 휴가 일수 계산
        leave_request.calculate_days()
        
        # 연차인 경우 잔여일수 확인
        if data['type'] == '연차':
            year = start_date.year
            grant = AnnualLeaveGrant.query.filter_by(
                employee_id=employee_id,
                year=year
            ).first()
            
            if not grant:
                return jsonify({'error': f'{year}년도 연차가 부여되지 않았습니다.'}), 400
            
            # 사용한 연차 조회
            from sqlalchemy import func
            used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
                AnnualLeaveUsage.employee_id == employee_id,
                func.extract('year', AnnualLeaveUsage.usage_date) == year
            )
            total_used = used_query.scalar() or 0
            
            # 잔여 연차 확인
            remaining = grant.total_days - total_used
            if leave_request.days_requested > remaining:
                return jsonify({'error': f'연차 잔여일수가 부족합니다. (잔여: {remaining}일, 신청: {leave_request.days_requested}일)'}), 400
        
        db.session.add(leave_request)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='leave_request',
            entity_id=leave_request.id,
            message=f'휴가 신청: {employee.name} ({data["type"]} {leave_request.days_requested}일)'
        )
        
        return jsonify({
            'message': '휴가 신청이 완료되었습니다.',
            'request': leave_request.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'휴가 신청 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_leave_request(request_id):
    """휴가 신청 상세 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        leave_request = LeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'error': '휴가 신청을 찾을 수 없습니다.'}), 404
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or leave_request.employee_id != employee.id:
                return jsonify({'error': '조회 권한이 없습니다.'}), 403
        
        return jsonify({'request': leave_request.to_dict()})
        
    except Exception as e:
        return jsonify({'error': f'휴가 신청 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests/<int:request_id>', methods=['PUT'])
@jwt_required()
def update_leave_request(request_id):
    """휴가 신청 수정"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        leave_request = LeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'error': '휴가 신청을 찾을 수 없습니다.'}), 404
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or leave_request.employee_id != employee.id:
                return jsonify({'error': '수정 권한이 없습니다.'}), 403
            
            # 승인된 신청은 수정 불가
            if leave_request.status != '대기':
                return jsonify({'error': '대기 중인 신청만 수정할 수 있습니다.'}), 400
        
        data = request.get_json()
        
        # 날짜 수정
        if 'start_date' in data:
            try:
                start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
                if start_date < date.today():
                    return jsonify({'error': '과거 날짜로는 휴가를 신청할 수 없습니다.'}), 400
                leave_request.start_date = start_date
            except ValueError:
                return jsonify({'error': '시작 날짜 형식이 올바르지 않습니다.'}), 400
        
        if 'end_date' in data:
            try:
                end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
                leave_request.end_date = end_date
            except ValueError:
                return jsonify({'error': '종료 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 날짜 유효성 재검증
        if leave_request.start_date > leave_request.end_date:
            return jsonify({'error': '시작 날짜가 종료 날짜보다 늦을 수 없습니다.'}), 400
        
        # 기타 필드 수정
        if 'type' in data:
            leave_request.type = data['type']
        
        if 'reason' in data:
            leave_request.reason = data['reason']
        
        # 휴가 일수 재계산
        leave_request.calculate_days()
        
        # 연차인 경우 잔여일수 재확인
        if leave_request.type == '연차':
            year = leave_request.start_date.year
            grant = AnnualLeaveGrant.query.filter_by(
                employee_id=leave_request.employee_id,
                year=year
            ).first()
            
            if grant:
                from sqlalchemy import func
                used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
                    AnnualLeaveUsage.employee_id == leave_request.employee_id,
                    func.extract('year', AnnualLeaveUsage.usage_date) == year
                )
                total_used = used_query.scalar() or 0
                
                remaining = grant.total_days - total_used
                if leave_request.days_requested > remaining:
                    return jsonify({'error': f'연차 잔여일수가 부족합니다. (잔여: {remaining}일, 신청: {leave_request.days_requested}일)'}), 400
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='leave_request',
            entity_id=leave_request.id,
            message=f'휴가 신청 수정: {leave_request.employee.name} ({leave_request.type} {leave_request.days_requested}일)'
        )
        
        return jsonify({
            'message': '휴가 신청이 수정되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'휴가 신청 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests/<int:request_id>/approve', methods=['POST'])
@admin_required
def approve_leave_request(request_id):
    """휴가 신청 승인 (관리자만)"""
    try:
        current_user_id = get_jwt_identity()
        
        leave_request = LeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'error': '휴가 신청을 찾을 수 없습니다.'}), 404
        
        if leave_request.status != '대기':
            return jsonify({'error': '대기 중인 신청만 승인할 수 있습니다.'}), 400
        
        data = request.get_json() or {}
        note = data.get('note')
        
        # 휴가 승인
        leave_request.approve(current_user_id, note)
        
        # 연차인 경우 연차 사용 기록 생성
        if leave_request.type == '연차':
            usage = AnnualLeaveUsage(
                employee_id=leave_request.employee_id,
                usage_date=leave_request.start_date,
                used_days=leave_request.days_requested,
                linked_leave_request_id=leave_request.id,
                note=f'휴가 승인으로 인한 연차 사용 ({leave_request.start_date} ~ {leave_request.end_date})',
                created_by=current_user_id
            )
            db.session.add(usage)
            leave_request.annual_leave_usage = usage
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='leave_request',
            entity_id=leave_request.id,
            message=f'휴가 신청 승인: {leave_request.employee.name} ({leave_request.type} {leave_request.days_requested}일)'
        )
        
        return jsonify({
            'message': '휴가 신청이 승인되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'휴가 신청 승인 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests/<int:request_id>/reject', methods=['POST'])
@admin_required
def reject_leave_request(request_id):
    """휴가 신청 거부 (관리자만)"""
    try:
        current_user_id = get_jwt_identity()
        
        leave_request = LeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'error': '휴가 신청을 찾을 수 없습니다.'}), 404
        
        if leave_request.status != '대기':
            return jsonify({'error': '대기 중인 신청만 거부할 수 있습니다.'}), 400
        
        data = request.get_json()
        if not data or 'reason' not in data:
            return jsonify({'error': '거부 사유는 필수입니다.'}), 400
        
        # 휴가 거부
        leave_request.reject(current_user_id, data['reason'])
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='leave_request',
            entity_id=leave_request.id,
            message=f'휴가 신청 거부: {leave_request.employee.name} ({leave_request.type} {leave_request.days_requested}일)'
        )
        
        return jsonify({
            'message': '휴가 신청이 거부되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'휴가 신청 거부 중 오류가 발생했습니다: {str(e)}'}), 500

@leave_request_bp.route('/leave-requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_leave_request(request_id):
    """휴가 신청 삭제"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        leave_request = LeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'error': '휴가 신청을 찾을 수 없습니다.'}), 404
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or leave_request.employee_id != employee.id:
                return jsonify({'error': '삭제 권한이 없습니다.'}), 403
            
            # 승인된 신청은 삭제 불가
            if leave_request.status == '승인':
                return jsonify({'error': '승인된 신청은 삭제할 수 없습니다.'}), 400
        
        employee_name = leave_request.employee.name
        leave_type = leave_request.type
        days_requested = leave_request.days_requested
        
        # 연관된 연차 사용 기록도 삭제
        if leave_request.annual_leave_usage:
            db.session.delete(leave_request.annual_leave_usage)
        
        db.session.delete(leave_request)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='DELETE',
            entity_type='leave_request',
            entity_id=request_id,
            message=f'휴가 신청 삭제: {employee_name} ({leave_type} {days_requested}일)'
        )
        
        return jsonify({'message': '휴가 신청이 삭제되었습니다.'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'휴가 신청 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

