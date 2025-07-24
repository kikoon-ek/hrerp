from src.models.user import db
from src.models.audit_log import AuditLog
from datetime import datetime

def log_action(user_id, action_type, entity_type, entity_id, message, ip_address=None):
    """감사 로그 기록"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
    except Exception as e:
        # 감사 로그 실패는 메인 작업에 영향을 주지 않도록 처리
        db.session.rollback()
        print(f"감사 로그 기록 실패: {str(e)}")

