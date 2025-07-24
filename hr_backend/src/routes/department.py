from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from src.models.user import db, User
from src.models.employee import Employee
from src.models.department import Department
from src.models.audit_log import AuditLog

department_bp = Blueprint('department', __name__)

def require_admin():
    """관리자 권한 확인 데코레이터"""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
    return None

@department_bp.route('/departments', methods=['GET'])
@jwt_required()
def get_departments():
    """부서 목록 조회"""
    try:
        tree_view = request.args.get('tree', 'false').lower() == 'true'
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        query = Department.query
        
        if not include_inactive:
            query = query.filter(Department.is_active == True)
        
        if tree_view:
            # 트리 구조로 반환 (최상위 부서만 조회)
            root_departments = query.filter(Department.parent_id.is_(None)).order_by(Department.name).all()
            departments_tree = [dept.to_tree_dict() for dept in root_departments]
            
            return jsonify({
                'departments': departments_tree,
                'tree_view': True
            }), 200
        else:
            # 플랫 리스트로 반환
            departments = query.order_by(Department.name).all()
            
            return jsonify({
                'departments': [dept.to_dict() for dept in departments],
                'tree_view': False
            }), 200
        
    except Exception as e:
        return jsonify({'error': f'부서 목록 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@department_bp.route('/departments/<int:department_id>', methods=['GET'])
@jwt_required()
def get_department(department_id):
    """특정 부서 정보 조회"""
    try:
        department = Department.query.get(department_id)
        if not department:
            return jsonify({'error': '부서를 찾을 수 없습니다.'}), 404
        
        # 부서 직원 목록도 함께 조회
        employees = Employee.query.filter_by(department_id=department_id, status='active').all()
        
        department_data = department.to_dict()
        department_data['employees'] = [emp.to_summary_dict() for emp in employees]
        
        return jsonify({'department': department_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'부서 정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@department_bp.route('/departments', methods=['POST'])
@jwt_required()
def create_department():
    """새 부서 생성 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '데이터가 필요합니다.'}), 400
        
        required_fields = ['name', 'code']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} 필드가 필요합니다.'}), 400
        
        # 중복 확인
        if Department.query.filter_by(code=data['code']).first():
            return jsonify({'error': '이미 존재하는 부서 코드입니다.'}), 400
        
        # 상위 부서 확인
        parent_id = data.get('parent_id')
        if parent_id:
            parent_dept = Department.query.get(parent_id)
            if not parent_dept:
                return jsonify({'error': '상위 부서를 찾을 수 없습니다.'}), 404
        
        # 부서장 확인
        manager_id = data.get('manager_id')
        if manager_id:
            manager = Employee.query.get(manager_id)
            if not manager:
                return jsonify({'error': '부서장으로 지정된 직원을 찾을 수 없습니다.'}), 404
        
        # 새 부서 생성
        department = Department(
            name=data['name'],
            code=data['code'],
            description=data.get('description'),
            parent_id=parent_id,
            manager_id=manager_id,
            is_active=data.get('is_active', True)
        )
        
        db.session.add(department)
        db.session.flush()  # department.id를 얻기 위해
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='department',
            entity_id=department.id,
            message=f'새 부서 생성: {department.name} ({department.code})',
            new_values=department.to_dict(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'message': '부서가 성공적으로 생성되었습니다.',
            'department': department.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'부서 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@department_bp.route('/departments/<int:department_id>', methods=['PUT'])
@jwt_required()
def update_department(department_id):
    """부서 정보 수정 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = get_jwt_identity()
        
        department = Department.query.get(department_id)
        if not department:
            return jsonify({'error': '부서를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '수정할 데이터가 필요합니다.'}), 400
        
        # 기존 값 저장 (감사 로그용)
        old_values = department.to_dict()
        
        # 부서 코드 중복 확인
        if 'code' in data and data['code'] != department.code:
            if Department.query.filter_by(code=data['code']).first():
                return jsonify({'error': '이미 존재하는 부서 코드입니다.'}), 400
        
        # 상위 부서 확인
        if 'parent_id' in data and data['parent_id']:
            if data['parent_id'] == department.id:
                return jsonify({'error': '자기 자신을 상위 부서로 설정할 수 없습니다.'}), 400
            
            parent_dept = Department.query.get(data['parent_id'])
            if not parent_dept:
                return jsonify({'error': '상위 부서를 찾을 수 없습니다.'}), 404
        
        # 부서장 확인
        if 'manager_id' in data and data['manager_id']:
            manager = Employee.query.get(data['manager_id'])
            if not manager:
                return jsonify({'error': '부서장으로 지정된 직원을 찾을 수 없습니다.'}), 404
        
        # 필드 업데이트
        updatable_fields = ['name', 'code', 'description', 'parent_id', 'manager_id', 'is_active']
        
        for field in updatable_fields:
            if field in data:
                setattr(department, field, data[field])
        
        department.updated_at = datetime.utcnow()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='department',
            entity_id=department.id,
            message=f'부서 정보 수정: {department.name} ({department.code})',
            old_values=old_values,
            new_values=department.to_dict(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'message': '부서 정보가 성공적으로 수정되었습니다.',
            'department': department.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'부서 정보 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@department_bp.route('/departments/<int:department_id>', methods=['DELETE'])
@jwt_required()
def delete_department(department_id):
    """부서 삭제 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = get_jwt_identity()
        
        department = Department.query.get(department_id)
        if not department:
            return jsonify({'error': '부서를 찾을 수 없습니다.'}), 404
        
        # 하위 부서 확인
        child_departments = Department.query.filter_by(parent_id=department_id).count()
        if child_departments > 0:
            return jsonify({'error': '하위 부서가 존재하는 부서는 삭제할 수 없습니다.'}), 400
        
        # 소속 직원 확인
        employees_count = Employee.query.filter_by(department_id=department_id, status='active').count()
        if employees_count > 0:
            return jsonify({'error': '소속 직원이 있는 부서는 삭제할 수 없습니다.'}), 400
        
        # 기존 값 저장 (감사 로그용)
        old_values = department.to_dict()
        department_name = department.name
        department_code = department.code
        
        # 감사 로그 (삭제 전에 기록)
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='DELETE',
            entity_type='department',
            entity_id=department.id,
            message=f'부서 삭제: {department_name} ({department_code})',
            old_values=old_values,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # 부서 삭제
        db.session.delete(department)
        db.session.commit()
        
        return jsonify({
            'message': f'부서 {department_name}이 성공적으로 삭제되었습니다.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'부서 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

