from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from datetime import datetime
import traceback

from ..models.user import db, User
from ..models.employee import Employee
from ..models.department import Department
from ..models.bonus_policy import BonusPolicy, BonusCalculation, BonusDistribution
from ..utils.auth import admin_required
from ..utils.audit import log_action

bonus_policy_bp = Blueprint('bonus_policy', __name__)

@bonus_policy_bp.route('/bonus-policies', methods=['GET'])
@jwt_required()
@admin_required
def get_bonus_policies():
    """성과급 정책 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        policy_type = request.args.get('policy_type')
        is_active = request.args.get('is_active', type=bool)
        search = request.args.get('search', '').strip()
        
        query = BonusPolicy.query
        
        # 필터링
        if policy_type:
            query = query.filter(BonusPolicy.policy_type == policy_type)
        if is_active is not None:
            query = query.filter(BonusPolicy.is_active == is_active)
        if search:
            query = query.filter(or_(
                BonusPolicy.name.contains(search),
                BonusPolicy.description.contains(search)
            ))
        
        # 정렬
        query = query.order_by(BonusPolicy.is_default.desc(), BonusPolicy.created_at.desc())
        
        # 페이지네이션
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        policies = [policy.to_dict() for policy in pagination.items]
        
        return jsonify({
            'policies': policies,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"성과급 정책 조회 오류: {str(e)}")
        return jsonify({'error': '성과급 정책 조회 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies', methods=['POST'])
@jwt_required()
@admin_required
def create_bonus_policy():
    """성과급 정책 생성"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # 필수 필드 검증
        required_fields = ['name', 'policy_type', 'ratio_base', 'ratio_team', 'ratio_personal', 'ratio_company']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 비율 검증
        ratios = [
            float(data['ratio_base']),
            float(data['ratio_team']),
            float(data['ratio_personal']),
            float(data['ratio_company'])
        ]
        
        # 각 비율이 0-100 범위인지 확인
        for ratio in ratios:
            if not 0 <= ratio <= 100:
                return jsonify({'error': '각 비율은 0-100 사이의 값이어야 합니다.'}), 400
        
        # 총 비율이 100%인지 확인
        total_ratio = sum(ratios)
        if abs(total_ratio - 100.0) > 0.01:
            return jsonify({'error': '모든 비율의 합계는 100%여야 합니다.'}), 400
        
        # 성과급 정책 생성
        policy = BonusPolicy(
            name=data['name'],
            description=data.get('description', ''),
            policy_type=data['policy_type'],
            ratio_base=ratios[0],
            ratio_team=ratios[1],
            ratio_personal=ratios[2],
            ratio_company=ratios[3],
            calculation_method=data.get('calculation_method', 'weighted'),
            min_performance_score=float(data.get('min_performance_score', 0)),
            max_bonus_multiplier=float(data.get('max_bonus_multiplier', 2.0)),
            target_departments=data.get('target_departments', []),
            target_positions=data.get('target_positions', []),
            is_default=data.get('is_default', False),
            effective_from=datetime.fromisoformat(data['effective_from']) if data.get('effective_from') else None,
            effective_to=datetime.fromisoformat(data['effective_to']) if data.get('effective_to') else None,
            version=data.get('version', '1.0'),
            created_by=current_user_id
        )
        
        # 기본 정책 설정 시 다른 정책들의 기본 설정 해제
        if policy.is_default:
            BonusPolicy.query.filter_by(is_default=True).update({'is_default': False})
        
        db.session.add(policy)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'CREATE', 'bonus_policy', policy.id, 
                  f"성과급 정책 '{policy.name}' 생성")
        
        return jsonify({
            'message': '성과급 정책이 성공적으로 생성되었습니다.',
            'policy': policy.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': '잘못된 숫자 또는 날짜 형식입니다.'}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': '이미 존재하는 정책명입니다.'}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"성과급 정책 생성 오류: {str(e)}")
        return jsonify({'error': '성과급 정책 생성 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/<int:policy_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_bonus_policy_detail(policy_id):
    """성과급 정책 상세 조회"""
    try:
        policy = BonusPolicy.query.get_or_404(policy_id)
        return jsonify({'policy': policy.to_dict()}), 200
        
    except Exception as e:
        current_app.logger.error(f"성과급 정책 상세 조회 오류: {str(e)}")
        return jsonify({'error': '성과급 정책 조회 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/<int:policy_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_bonus_policy(policy_id):
    """성과급 정책 수정"""
    try:
        policy = BonusPolicy.query.get_or_404(policy_id)
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # 기본 정보 업데이트
        if 'name' in data:
            policy.name = data['name']
        if 'description' in data:
            policy.description = data['description']
        if 'policy_type' in data:
            policy.policy_type = data['policy_type']
        
        # 비율 업데이트
        ratio_fields = ['ratio_base', 'ratio_team', 'ratio_personal', 'ratio_company']
        if any(field in data for field in ratio_fields):
            ratios = [
                float(data.get('ratio_base', policy.ratio_base)),
                float(data.get('ratio_team', policy.ratio_team)),
                float(data.get('ratio_personal', policy.ratio_personal)),
                float(data.get('ratio_company', policy.ratio_company))
            ]
            
            # 비율 검증
            for ratio in ratios:
                if not 0 <= ratio <= 100:
                    return jsonify({'error': '각 비율은 0-100 사이의 값이어야 합니다.'}), 400
            
            total_ratio = sum(ratios)
            if abs(total_ratio - 100.0) > 0.01:
                return jsonify({'error': '모든 비율의 합계는 100%여야 합니다.'}), 400
            
            policy.ratio_base = ratios[0]
            policy.ratio_team = ratios[1]
            policy.ratio_personal = ratios[2]
            policy.ratio_company = ratios[3]
        
        # 기타 필드 업데이트
        if 'calculation_method' in data:
            policy.calculation_method = data['calculation_method']
        if 'min_performance_score' in data:
            policy.min_performance_score = float(data['min_performance_score'])
        if 'max_bonus_multiplier' in data:
            policy.max_bonus_multiplier = float(data['max_bonus_multiplier'])
        if 'target_departments' in data:
            policy.target_departments = data['target_departments']
        if 'target_positions' in data:
            policy.target_positions = data['target_positions']
        if 'is_active' in data:
            policy.is_active = data['is_active']
        if 'effective_from' in data:
            policy.effective_from = datetime.fromisoformat(data['effective_from']) if data['effective_from'] else None
        if 'effective_to' in data:
            policy.effective_to = datetime.fromisoformat(data['effective_to']) if data['effective_to'] else None
        
        # 기본 정책 설정
        if 'is_default' in data and data['is_default'] and not policy.is_default:
            BonusPolicy.query.filter_by(is_default=True).update({'is_default': False})
            policy.is_default = True
        elif 'is_default' in data and not data['is_default']:
            policy.is_default = False
        
        policy.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'UPDATE', 'bonus_policy', policy.id, 
                  f"성과급 정책 '{policy.name}' 수정")
        
        return jsonify({
            'message': '성과급 정책이 성공적으로 수정되었습니다.',
            'policy': policy.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': '잘못된 숫자 또는 날짜 형식입니다.'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"성과급 정책 수정 오류: {str(e)}")
        return jsonify({'error': '성과급 정책 수정 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/<int:policy_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_bonus_policy(policy_id):
    """성과급 정책 삭제"""
    try:
        policy = BonusPolicy.query.get_or_404(policy_id)
        current_user_id = get_jwt_identity()
        
        # 기본 정책은 삭제 불가
        if policy.is_default:
            return jsonify({'error': '기본 정책은 삭제할 수 없습니다.'}), 400
        
        # 사용 중인 정책인지 확인
        calculation_count = BonusCalculation.query.filter_by(policy_id=policy_id).count()
        if calculation_count > 0:
            return jsonify({'error': '이미 사용 중인 정책은 삭제할 수 없습니다. 비활성화를 권장합니다.'}), 400
        
        policy_name = policy.name
        db.session.delete(policy)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'DELETE', 'bonus_policy', policy_id, 
                  f"성과급 정책 '{policy_name}' 삭제")
        
        return jsonify({'message': '성과급 정책이 성공적으로 삭제되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"성과급 정책 삭제 오류: {str(e)}")
        return jsonify({'error': '성과급 정책 삭제 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/types', methods=['GET'])
@jwt_required()
@admin_required
def get_policy_types():
    """정책 유형 목록 조회"""
    try:
        types = db.session.query(BonusPolicy.policy_type).distinct().all()
        type_list = [t[0] for t in types if t[0]]
        
        # 기본 유형 추가
        default_types = ['연간', '분기별', '프로젝트별', '특별']
        for t in default_types:
            if t not in type_list:
                type_list.append(t)
        
        return jsonify({'types': sorted(type_list)}), 200
        
    except Exception as e:
        current_app.logger.error(f"정책 유형 조회 오류: {str(e)}")
        return jsonify({'error': '정책 유형 조회 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/summary', methods=['GET'])
@jwt_required()
@admin_required
def get_bonus_policy_summary():
    """성과급 정책 요약 통계"""
    try:
        total_policies = BonusPolicy.query.count()
        active_policies = BonusPolicy.query.filter_by(is_active=True).count()
        default_policy = BonusPolicy.query.filter_by(is_default=True).first()
        
        # 유형별 통계
        type_stats = db.session.query(
            BonusPolicy.policy_type,
            db.func.count(BonusPolicy.id).label('count')
        ).group_by(BonusPolicy.policy_type).all()
        
        type_distribution = {t: count for t, count in type_stats}
        
        return jsonify({
            'total_policies': total_policies,
            'active_policies': active_policies,
            'inactive_policies': total_policies - active_policies,
            'default_policy': default_policy.to_dict() if default_policy else None,
            'type_distribution': type_distribution
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"성과급 정책 요약 조회 오류: {str(e)}")
        return jsonify({'error': '요약 정보 조회 중 오류가 발생했습니다.'}), 500

@bonus_policy_bp.route('/bonus-policies/<int:policy_id>/validate', methods=['POST'])
@jwt_required()
@admin_required
def validate_bonus_policy(policy_id):
    """성과급 정책 검증"""
    try:
        policy = BonusPolicy.query.get_or_404(policy_id)
        
        validation_results = {
            'is_valid': True,
            'warnings': [],
            'errors': []
        }
        
        # 비율 검증
        if not policy.validate_ratios():
            validation_results['is_valid'] = False
            validation_results['errors'].append('비율 합계가 100%가 아닙니다.')
        
        # 적용 기간 검증
        if policy.effective_from and policy.effective_to:
            if policy.effective_from >= policy.effective_to:
                validation_results['is_valid'] = False
                validation_results['errors'].append('적용 시작일이 종료일보다 늦습니다.')
        
        # 성과 점수 범위 검증
        if policy.min_performance_score < 0 or policy.min_performance_score > 100:
            validation_results['warnings'].append('최소 성과 점수가 일반적인 범위(0-100)를 벗어납니다.')
        
        # 성과급 배수 검증
        if policy.max_bonus_multiplier > 5.0:
            validation_results['warnings'].append('최대 성과급 배수가 매우 높습니다.')
        
        return jsonify(validation_results), 200
        
    except Exception as e:
        current_app.logger.error(f"성과급 정책 검증 오류: {str(e)}")
        return jsonify({'error': '정책 검증 중 오류가 발생했습니다.'}), 500

