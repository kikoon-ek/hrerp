from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from src.models.user import User

def token_required(f):
    """JWT 토큰이 필요한 엔드포인트에 사용하는 데코레이터"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '유효하지 않은 사용자입니다.'}), 401
        
        return f(user, *args, **kwargs)
    return decorated_function

def admin_required(f):
    """관리자 권한이 필요한 엔드포인트에 사용하는 데코레이터"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
        
        return f(user, *args, **kwargs)
    return decorated_function

def get_current_user():
    """현재 로그인한 사용자 정보 반환"""
    current_user_id = get_jwt_identity()
    if current_user_id:
        return User.query.get(current_user_id)
    return None

