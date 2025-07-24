from src.models.user import db
from datetime import datetime
import json

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type = db.Column(db.String(50), nullable=False)  # user, employee, department, etc.
    entity_id = db.Column(db.Integer)  # ID of the affected entity
    old_values = db.Column(db.Text)  # JSON string of old values
    new_values = db.Column(db.Text)  # JSON string of new values
    ip_address = db.Column(db.String(45))  # IPv4 or IPv6
    user_agent = db.Column(db.String(500))
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship with User
    user = db.relationship('User', backref='audit_logs')
    
    def __repr__(self):
        return f'<AuditLog {self.action_type} on {self.entity_type} by User {self.user_id}>'
    
    def set_old_values(self, values_dict):
        """Set old values as JSON string"""
        if values_dict:
            self.old_values = json.dumps(values_dict, default=str)
    
    def set_new_values(self, values_dict):
        """Set new values as JSON string"""
        if values_dict:
            self.new_values = json.dumps(values_dict, default=str)
    
    def get_old_values(self):
        """Get old values as dictionary"""
        if self.old_values:
            return json.loads(self.old_values)
        return None
    
    def get_new_values(self):
        """Get new values as dictionary"""
        if self.new_values:
            return json.loads(self.new_values)
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'action_type': self.action_type,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'old_values': self.get_old_values(),
            'new_values': self.get_new_values(),
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def log_action(user_id, action_type, entity_type, entity_id, message, 
                   old_values=None, new_values=None, ip_address=None, user_agent=None):
        """Helper method to create audit log entry"""
        log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if old_values:
            log.set_old_values(old_values)
        if new_values:
            log.set_new_values(new_values)
        
        db.session.add(log)
        return log

