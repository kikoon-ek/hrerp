import os
import sys
from datetime import timedelta

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# 모델 import
from src.models.user import db, User
from src.models.employee import Employee
from src.models.department import Department
from src.models.audit_log import AuditLog
from src.models.evaluation_criteria import EvaluationCriteria, EvaluationItem, EvaluationTemplate, TemplateCriteria
from src.models.bonus_policy import BonusPolicy, BonusCalculation, BonusDistribution
from src.models.evaluation_simple import Evaluation, EvaluationResult, EvaluationScore

# 라우트 import
from src.routes.auth import auth_bp
from src.routes.employee import employee_bp
from src.routes.department import department_bp
from src.routes.audit_log import audit_log_bp
from src.routes.evaluation_criteria import evaluation_criteria_bp
from src.routes.bonus_policy import bonus_policy_bp
from src.routes.attendance import attendance_bp
from src.routes.annual_leave import annual_leave_bp
from src.routes.leave_request import leave_request_bp
from src.routes.evaluation import evaluation_bp
from src.routes.payroll import payroll_bp
from src.routes.dashboard import dashboard_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# CORS 설정 (프론트엔드와의 통신을 위해)
CORS(app, origins=["*"])

# 기본 설정
app.config['SECRET_KEY'] = 'hr-system-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 데이터베이스 초기화
db.init_app(app)

# JWT 초기화
jwt = JWTManager(app)

# JWT 에러 핸들러
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return {'error': '토큰이 만료되었습니다.'}, 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return {'error': '유효하지 않은 토큰입니다.'}, 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return {'error': '토큰이 필요합니다.'}, 401

# 블루프린트 등록
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(employee_bp, url_prefix='/api')
app.register_blueprint(department_bp, url_prefix='/api')
app.register_blueprint(audit_log_bp, url_prefix='/api')
app.register_blueprint(evaluation_criteria_bp, url_prefix='/api')
app.register_blueprint(bonus_policy_bp, url_prefix='/api')
app.register_blueprint(attendance_bp, url_prefix='/api')
app.register_blueprint(annual_leave_bp, url_prefix='/api')
app.register_blueprint(leave_request_bp, url_prefix='/api')
app.register_blueprint(evaluation_bp, url_prefix='/api')
app.register_blueprint(payroll_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')

# 데이터베이스 초기화 및 초기 데이터
def init_database():
    """데이터베이스 초기화 및 기본 데이터 생성"""
    with app.app_context():
        # 테이블 생성
        db.create_all()
        
        # 기본 관리자 계정 확인 및 생성
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            # 관리자 계정 생성
            admin_user = User(
                username='admin',
                email='admin@company.com',
                role='admin'
            )
            admin_user.set_password('admin123')  # 실제 운영시에는 강력한 비밀번호 사용
            db.session.add(admin_user)
            db.session.flush()
            
            # 기본 부서 생성
            root_dept = Department(
                name='본사',
                code='HQ',
                description='본사 최상위 부서'
            )
            db.session.add(root_dept)
            db.session.flush()
            
            # 관리자 직원 정보 생성
            admin_employee = Employee(
                user_id=admin_user.id,
                employee_number='EMP001',
                name='시스템 관리자',
                email='admin@company.com',
                position='시스템 관리자',
                department_id=root_dept.id,
                hire_date=db.func.current_date(),
                status='active'
            )
            db.session.add(admin_employee)
            
            # 초기 감사 로그
            AuditLog.log_action(
                user_id=admin_user.id,
                action_type='CREATE',
                entity_type='system',
                entity_id=None,
                message='시스템 초기화 완료 - 관리자 계정 및 기본 부서 생성'
            )
            
            db.session.commit()
            print("기본 관리자 계정이 생성되었습니다:")
            print("사용자명: admin")
            print("비밀번호: admin123")
            print("이메일: admin@company.com")
        else:
            print("기본 관리자 계정이 이미 존재합니다.")

# 정적 파일 서빙 (프론트엔드)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

# API 상태 확인 엔드포인트
@app.route('/api/health', methods=['GET'])
def health_check():
    return {
        'status': 'healthy',
        'message': 'HR System API is running',
        'version': '1.0.0'
    }, 200

if __name__ == '__main__':
    # 데이터베이스 초기화
    init_database()
    
    # 서버 실행
    app.run(debug=True, host='0.0.0.0', port=5007)

