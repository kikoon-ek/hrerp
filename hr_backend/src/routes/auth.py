from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from src.models.user import db, User
from src.models.audit_log import AuditLog

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """사용자 로그인"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': '사용자명과 비밀번호를 입력해주세요.'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # 사용자 조회
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            # 로그인 실패 로그
            if user:
                AuditLog.log_action(
                    user_id=user.id,
                    action_type='LOGIN_FAILED',
                    entity_type='user',
                    entity_id=user.id,
                    message=f'로그인 실패: 잘못된 비밀번호 - {username}',
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            else:
                # 존재하지 않는 사용자에 대한 로그인 시도
                AuditLog.log_action(
                    user_id=1,  # 시스템 사용자 ID (추후 생성)
                    action_type='LOGIN_FAILED',
                    entity_type='user',
                    entity_id=None,
                    message=f'로그인 실패: 존재하지 않는 사용자 - {username}',
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            
            db.session.commit()
            return jsonify({'error': '사용자명 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        if not user.is_active:
            return jsonify({'error': '비활성화된 계정입니다.'}), 401
        
        # JWT 토큰 생성
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'role': user.role, 'username': user.username}
        )
        refresh_token = create_refresh_token(identity=user.id)
        
        # 마지막 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        
        # 로그인 성공 로그
        AuditLog.log_action(
            user_id=user.id,
            action_type='LOGIN_SUCCESS',
            entity_type='user',
            entity_id=user.id,
            message=f'로그인 성공 - {username}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'로그인 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """토큰 갱신"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': '유효하지 않은 사용자입니다.'}), 401
        
        new_access_token = create_access_token(
            identity=user.id,
            additional_claims={'role': user.role, 'username': user.username}
        )
        
        return jsonify({
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'토큰 갱신 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """사용자 로그아웃"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user:
            # 로그아웃 로그
            AuditLog.log_action(
                user_id=user.id,
                action_type='LOGOUT',
                entity_type='user',
                entity_id=user.id,
                message=f'로그아웃 - {user.username}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            db.session.commit()
        
        return jsonify({'message': '성공적으로 로그아웃되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'로그아웃 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """현재 사용자 정보 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 직원 정보도 함께 조회
        employee = None
        if user.employee:
            employee = user.employee.to_dict()
        
        return jsonify({
            'user': user.to_dict(),
            'employee': employee
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'사용자 정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """비밀번호 변경"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': '현재 비밀번호와 새 비밀번호를 입력해주세요.'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # 현재 비밀번호 확인
        if not user.check_password(current_password):
            return jsonify({'error': '현재 비밀번호가 올바르지 않습니다.'}), 400
        
        # 새 비밀번호 설정
        old_password_hash = user.password_hash
        user.set_password(new_password)
        
        # 비밀번호 변경 로그
        AuditLog.log_action(
            user_id=user.id,
            action_type='UPDATE',
            entity_type='user',
            entity_id=user.id,
            message=f'비밀번호 변경 - {user.username}',
            old_values={'password_changed': True},
            new_values={'password_changed': True},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({'message': '비밀번호가 성공적으로 변경되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'비밀번호 변경 중 오류가 발생했습니다: {str(e)}'}), 500

