from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from src.models.user import db, User
from src.models.audit_log import AuditLog

audit_log_bp = Blueprint('audit_log', __name__)

def require_admin():
    """관리자 권한 확인 데코레이터"""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
    return None

@audit_log_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """감사 로그 목록 조회 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id', type=int)
        action_type = request.args.get('action_type')
        entity_type = request.args.get('entity_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 기본 쿼리
        query = AuditLog.query
        
        # 필터 적용
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        
        if start_date:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(AuditLog.created_at >= start_datetime)
        
        if end_date:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(AuditLog.created_at < end_datetime)
        
        # 최신순 정렬
        query = query.order_by(AuditLog.created_at.desc())
        
        # 페이지네이션
        logs = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 통계 정보
        total_logs = query.count()
        action_types = db.session.query(AuditLog.action_type, db.func.count(AuditLog.id)).group_by(AuditLog.action_type).all()
        entity_types = db.session.query(AuditLog.entity_type, db.func.count(AuditLog.id)).group_by(AuditLog.entity_type).all()
        
        return jsonify({
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page,
            'per_page': per_page,
            'statistics': {
                'total_logs': total_logs,
                'action_types': dict(action_types),
                'entity_types': dict(entity_types)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'감사 로그 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@audit_log_bp.route('/audit-logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_audit_log(log_id):
    """특정 감사 로그 상세 조회 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        log = AuditLog.query.get(log_id)
        if not log:
            return jsonify({'error': '감사 로그를 찾을 수 없습니다.'}), 404
        
        return jsonify({'log': log.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': f'감사 로그 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@audit_log_bp.route('/audit-logs/my', methods=['GET'])
@jwt_required()
def get_my_audit_logs():
    """내 활동 로그 조회"""
    try:
        current_user_id = get_jwt_identity()
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        action_type = request.args.get('action_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 본인의 로그만 조회
        query = AuditLog.query.filter(AuditLog.user_id == current_user_id)
        
        # 필터 적용
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        
        if start_date:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(AuditLog.created_at >= start_datetime)
        
        if end_date:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(AuditLog.created_at < end_datetime)
        
        # 최신순 정렬
        query = query.order_by(AuditLog.created_at.desc())
        
        # 페이지네이션
        logs = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 민감한 정보 제거 (본인 로그이지만 보안상)
        sanitized_logs = []
        for log in logs.items:
            log_dict = log.to_dict()
            # old_values, new_values에서 민감한 정보 제거
            if log_dict.get('old_values'):
                log_dict['old_values'] = {k: v for k, v in log_dict['old_values'].items() 
                                        if k not in ['password_hash', 'password']}
            if log_dict.get('new_values'):
                log_dict['new_values'] = {k: v for k, v in log_dict['new_values'].items() 
                                        if k not in ['password_hash', 'password']}
            sanitized_logs.append(log_dict)
        
        return jsonify({
            'logs': sanitized_logs,
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'내 활동 로그 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@audit_log_bp.route('/audit-logs/summary', methods=['GET'])
@jwt_required()
def get_audit_log_summary():
    """감사 로그 요약 통계 (관리자 전용)"""
    try:
        # 관리자 권한 확인
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        # 기간 설정 (기본: 최근 30일)
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # 기본 통계
        total_logs = AuditLog.query.filter(AuditLog.created_at >= start_date).count()
        
        # 액션 타입별 통계
        action_stats = db.session.query(
            AuditLog.action_type, 
            db.func.count(AuditLog.id)
        ).filter(
            AuditLog.created_at >= start_date
        ).group_by(AuditLog.action_type).all()
        
        # 엔티티 타입별 통계
        entity_stats = db.session.query(
            AuditLog.entity_type, 
            db.func.count(AuditLog.id)
        ).filter(
            AuditLog.created_at >= start_date
        ).group_by(AuditLog.entity_type).all()
        
        # 사용자별 활동 통계 (상위 10명)
        user_stats = db.session.query(
            AuditLog.user_id,
            User.username,
            db.func.count(AuditLog.id).label('activity_count')
        ).join(User).filter(
            AuditLog.created_at >= start_date
        ).group_by(
            AuditLog.user_id, User.username
        ).order_by(
            db.func.count(AuditLog.id).desc()
        ).limit(10).all()
        
        # 일별 활동 통계 (최근 7일)
        daily_stats = db.session.query(
            db.func.date(AuditLog.created_at).label('date'),
            db.func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= datetime.utcnow() - timedelta(days=7)
        ).group_by(
            db.func.date(AuditLog.created_at)
        ).order_by('date').all()
        
        return jsonify({
            'period_days': days,
            'total_logs': total_logs,
            'action_statistics': dict(action_stats),
            'entity_statistics': dict(entity_stats),
            'top_users': [
                {
                    'user_id': stat.user_id,
                    'username': stat.username,
                    'activity_count': stat.activity_count
                } for stat in user_stats
            ],
            'daily_activity': [
                {
                    'date': stat.date.isoformat(),
                    'count': stat.count
                } for stat in daily_stats
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'감사 로그 요약 조회 중 오류가 발생했습니다: {str(e)}'}), 500

