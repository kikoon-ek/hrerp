from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from src.models.user import db, User
from src.models.employee import Employee
from src.models.department import Department
from src.models.audit_log import AuditLog

employee_bp = Blueprint('employee', __name__)

def require_admin():
    """관리자 권한 확인 데코레이터"""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
    return None

@employee_bp.route('/employees', methods=['GET'])
@jwt_required()
def get_employees():
    """직원 목록 조회"""
    try:
        # 관리자는 모든 직원, 일반 사용자는 본인만
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get('role') == 'admin':
            # 관리자: 모든 직원 조회
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            search = request.args.get('search', '')
            department_id = request.args.get('department_id', type=int)
            status = request.args.get('status', 'active')
            
            query = Employee.query
            
            if search:
                query = query.filter(
                    db.or_(
                        Employee.name.contains(search),
                        Employee.employee_number.contains(search),
                        Employee.email.contains(search)
                    )
                )
            
            if department_id:
                query = query.filter(Employee.department_id == department_id)
            
            if status:
                query = query.filter(Employee.status == status)
            
            query = query.order_by(Employee.employee_number)
            employees = query.paginate(page=page, per_page=per_page, error_out=False)
            
            return jsonify({
                'employees': [emp.to_dict() for emp in employees.items],
                'total': employees.total,
                'pages': employees.pages,
                'current_page': page,
                'per_page': per_page
            }), 200
        else:
            # 일반 사용자: 본인 정보만
            user = User.query.get(current_user_id)
            if user and user.employee:
                return jsonify({
                    'employees': [user.employee.to_dict()],
                    'total': 1,
                    'pages': 1,
                    'current_page': 1,
                    'per_page': 1
                }), 200
            else:
                return jsonify({
                    'employees': [],
                    'total': 0,
                    'pages': 0,
                    'current_page': 1,
                    'per_page': 1
                }), 200
        
    except Exception as e:
        return jsonify({'error': f'직원 목록 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['GET'])
@jwt_required()
def get_employee(employee_id):
    """특정 직원 정보 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 권한 확인: 관리자이거나 본인인 경우만 조회 가능
        if claims.get('role') != 'admin' and employee.user_id != current_user_id:
            return jsonify({'error': '접근 권한이 없습니다.'}), 403
        
        return jsonify({'employee': employee.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': f'직원 정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@employee_bp.route('/employees', methods=['POST'])
@jwt_required()
def create_employee():
    """새 직원 등록 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '데이터가 필요합니다.'}), 400
        
        required_fields = ['username', 'email', 'password', 'employee_number', 'name', 'hire_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} 필드가 필요합니다.'}), 400
        
        # 중복 확인
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': '이미 존재하는 사용자명입니다.'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': '이미 존재하는 이메일입니다.'}), 400
        
        if Employee.query.filter_by(employee_number=data['employee_number']).first():
            return jsonify({'error': '이미 존재하는 사번입니다.'}), 400
        
        # 사용자 계정 생성
        user = User(
            username=data['username'],
            email=data['email'],
            role=data.get('role', 'user')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()  # user.id를 얻기 위해
        
        # 직원 정보 생성
        employee = Employee(
            user_id=user.id,
            employee_number=data['employee_number'],
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            position=data.get('position'),
            department_id=data.get('department_id'),
            hire_date=datetime.strptime(data['hire_date'], '%Y-%m-%d').date(),
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date() if data.get('birth_date') else None,
            address=data.get('address'),
            salary_grade=data.get('salary_grade'),
            status=data.get('status', 'active')
        )
        
        db.session.add(employee)
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='employee',
            entity_id=employee.id,
            message=f'새 직원 등록: {employee.name} ({employee.employee_number})',
            new_values=employee.to_dict(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'message': '직원이 성공적으로 등록되었습니다.',
            'employee': employee.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'직원 등록 중 오류가 발생했습니다: {str(e)}'}), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['PUT'])
@jwt_required()
def update_employee(employee_id):
    """직원 정보 수정"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 권한 확인: 관리자이거나 본인인 경우만 수정 가능
        if claims.get('role') != 'admin' and employee.user_id != current_user_id:
            return jsonify({'error': '접근 권한이 없습니다.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '수정할 데이터가 필요합니다.'}), 400
        
        # 기존 값 저장 (감사 로그용)
        old_values = employee.to_dict()
        
        # 일반 사용자는 제한된 필드만 수정 가능
        if claims.get('role') != 'admin':
            allowed_fields = ['phone', 'address']
            data = {k: v for k, v in data.items() if k in allowed_fields}
        
        # 필드 업데이트
        updatable_fields = [
            'name', 'email', 'phone', 'position', 'department_id',
            'birth_date', 'address', 'salary_grade', 'status'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['birth_date'] and data[field]:
                    setattr(employee, field, datetime.strptime(data[field], '%Y-%m-%d').date())
                else:
                    setattr(employee, field, data[field])
        
        employee.updated_at = datetime.utcnow()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='employee',
            entity_id=employee.id,
            message=f'직원 정보 수정: {employee.name} ({employee.employee_number})',
            old_values=old_values,
            new_values=employee.to_dict(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'message': '직원 정보가 성공적으로 수정되었습니다.',
            'employee': employee.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'직원 정보 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
@jwt_required()
def delete_employee(employee_id):
    """직원 삭제 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        current_user_id = get_jwt_identity()
        
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 기존 값 저장 (감사 로그용)
        old_values = employee.to_dict()
        employee_name = employee.name
        employee_number = employee.employee_number
        
        # 관련 사용자 계정도 함께 삭제
        user = User.query.get(employee.user_id)
        
        # 감사 로그 (삭제 전에 기록)
        AuditLog.log_action(
            user_id=current_user_id,
            action_type='DELETE',
            entity_type='employee',
            entity_id=employee.id,
            message=f'직원 삭제: {employee_name} ({employee_number})',
            old_values=old_values,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # 직원 및 사용자 삭제
        db.session.delete(employee)
        if user:
            db.session.delete(user)
        
        db.session.commit()
        
        return jsonify({
            'message': f'직원 {employee_name}이 성공적으로 삭제되었습니다.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'직원 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

