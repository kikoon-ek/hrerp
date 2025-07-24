from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from datetime import datetime
import traceback

from ..models.user import db, User
from ..models.employee import Employee
from ..models.evaluation_criteria import EvaluationCriteria, EvaluationItem, EvaluationTemplate, TemplateCriteria
from ..utils.auth import admin_required
from ..utils.audit import log_action

evaluation_criteria_bp = Blueprint('evaluation_criteria', __name__)

@evaluation_criteria_bp.route('/evaluation-criteria', methods=['GET'])
@jwt_required()
def get_evaluation_criteria():
    """평가 기준 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category = request.args.get('category')
        is_active = request.args.get('is_active', type=bool)
        search = request.args.get('search', '').strip()
        
        query = EvaluationCriteria.query
        
        # 필터링
        if category:
            query = query.filter(EvaluationCriteria.category == category)
        if is_active is not None:
            query = query.filter(EvaluationCriteria.is_active == is_active)
        if search:
            query = query.filter(or_(
                EvaluationCriteria.name.contains(search),
                EvaluationCriteria.description.contains(search)
            ))
        
        # 정렬
        query = query.order_by(EvaluationCriteria.category, EvaluationCriteria.created_at.desc())
        
        # 페이지네이션
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        criteria_list = []
        for criteria in pagination.items:
            criteria_dict = criteria.to_dict()
            # 평가 항목 포함
            criteria_dict['items'] = [item.to_dict() for item in criteria.evaluation_items]
            criteria_list.append(criteria_dict)
        
        return jsonify({
            'criteria': criteria_list,
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
        current_app.logger.error(f"평가 기준 조회 오류: {str(e)}")
        return jsonify({'error': '평가 기준 조회 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria', methods=['POST'])
@jwt_required()
@admin_required
def create_evaluation_criteria():
    """평가 기준 생성"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # 필수 필드 검증
        required_fields = ['name', 'category', 'weight']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 가중치 검증
        weight = float(data['weight'])
        if not 0 <= weight <= 100:
            return jsonify({'error': '가중치는 0-100 사이의 값이어야 합니다.'}), 400
        
        # 점수 범위 검증
        min_score = float(data.get('min_score', 0))
        max_score = float(data.get('max_score', 100))
        if min_score >= max_score:
            return jsonify({'error': '최소 점수는 최대 점수보다 작아야 합니다.'}), 400
        
        # 평가 기준 생성
        criteria = EvaluationCriteria(
            name=data['name'],
            description=data.get('description', ''),
            category=data['category'],
            weight=weight,
            min_score=min_score,
            max_score=max_score,
            version=data.get('version', '1.0'),
            created_by=current_user_id
        )
        
        db.session.add(criteria)
        db.session.flush()  # ID 생성을 위해
        
        # 평가 항목 추가
        items_data = data.get('items', [])
        total_item_weight = 0
        
        for item_data in items_data:
            if 'name' not in item_data or 'weight' not in item_data:
                return jsonify({'error': '평가 항목의 이름과 가중치는 필수입니다.'}), 400
            
            item_weight = float(item_data['weight'])
            total_item_weight += item_weight
            
            item = EvaluationItem(
                criteria_id=criteria.id,
                name=item_data['name'],
                description=item_data.get('description', ''),
                weight=item_weight,
                evaluation_method=item_data.get('evaluation_method', '정성'),
                target_value=item_data.get('target_value', ''),
                measurement_unit=item_data.get('measurement_unit', ''),
                order_index=item_data.get('order_index', 0)
            )
            db.session.add(item)
        
        # 항목 가중치 합계 검증 (선택사항)
        if items_data and abs(total_item_weight - 100.0) > 0.01:
            return jsonify({'error': '평가 항목의 가중치 합계는 100%여야 합니다.'}), 400
        
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'CREATE', 'evaluation_criteria', criteria.id, 
                  f"평가 기준 '{criteria.name}' 생성")
        
        return jsonify({
            'message': '평가 기준이 성공적으로 생성되었습니다.',
            'criteria': criteria.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': '잘못된 숫자 형식입니다.'}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': '이미 존재하는 평가 기준명입니다.'}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"평가 기준 생성 오류: {str(e)}")
        return jsonify({'error': '평가 기준 생성 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria/<int:criteria_id>', methods=['GET'])
@jwt_required()
def get_evaluation_criteria_detail(criteria_id):
    """평가 기준 상세 조회"""
    try:
        criteria = EvaluationCriteria.query.get_or_404(criteria_id)
        
        criteria_dict = criteria.to_dict()
        criteria_dict['items'] = [item.to_dict() for item in criteria.evaluation_items]
        
        return jsonify({'criteria': criteria_dict}), 200
        
    except Exception as e:
        current_app.logger.error(f"평가 기준 상세 조회 오류: {str(e)}")
        return jsonify({'error': '평가 기준 조회 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria/<int:criteria_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_evaluation_criteria(criteria_id):
    """평가 기준 수정"""
    try:
        criteria = EvaluationCriteria.query.get_or_404(criteria_id)
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # 기본 정보 업데이트
        if 'name' in data:
            criteria.name = data['name']
        if 'description' in data:
            criteria.description = data['description']
        if 'category' in data:
            criteria.category = data['category']
        if 'weight' in data:
            weight = float(data['weight'])
            if not 0 <= weight <= 100:
                return jsonify({'error': '가중치는 0-100 사이의 값이어야 합니다.'}), 400
            criteria.weight = weight
        if 'min_score' in data:
            criteria.min_score = float(data['min_score'])
        if 'max_score' in data:
            criteria.max_score = float(data['max_score'])
        if 'is_active' in data:
            criteria.is_active = data['is_active']
        
        criteria.updated_at = datetime.utcnow()
        
        # 평가 항목 업데이트 (전체 교체)
        if 'items' in data:
            # 기존 항목 삭제
            EvaluationItem.query.filter_by(criteria_id=criteria_id).delete()
            
            # 새 항목 추가
            items_data = data['items']
            total_item_weight = 0
            
            for item_data in items_data:
                if 'name' not in item_data or 'weight' not in item_data:
                    return jsonify({'error': '평가 항목의 이름과 가중치는 필수입니다.'}), 400
                
                item_weight = float(item_data['weight'])
                total_item_weight += item_weight
                
                item = EvaluationItem(
                    criteria_id=criteria.id,
                    name=item_data['name'],
                    description=item_data.get('description', ''),
                    weight=item_weight,
                    evaluation_method=item_data.get('evaluation_method', '정성'),
                    target_value=item_data.get('target_value', ''),
                    measurement_unit=item_data.get('measurement_unit', ''),
                    order_index=item_data.get('order_index', 0)
                )
                db.session.add(item)
            
            # 항목 가중치 합계 검증
            if items_data and abs(total_item_weight - 100.0) > 0.01:
                return jsonify({'error': '평가 항목의 가중치 합계는 100%여야 합니다.'}), 400
        
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'UPDATE', 'evaluation_criteria', criteria.id, 
                  f"평가 기준 '{criteria.name}' 수정")
        
        return jsonify({
            'message': '평가 기준이 성공적으로 수정되었습니다.',
            'criteria': criteria.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': '잘못된 숫자 형식입니다.'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"평가 기준 수정 오류: {str(e)}")
        return jsonify({'error': '평가 기준 수정 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria/<int:criteria_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_evaluation_criteria(criteria_id):
    """평가 기준 삭제"""
    try:
        criteria = EvaluationCriteria.query.get_or_404(criteria_id)
        current_user_id = get_jwt_identity()
        
        criteria_name = criteria.name
        
        # 관련 평가 항목도 함께 삭제 (cascade)
        db.session.delete(criteria)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user_id, 'DELETE', 'evaluation_criteria', criteria_id, 
                  f"평가 기준 '{criteria_name}' 삭제")
        
        return jsonify({'message': '평가 기준이 성공적으로 삭제되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"평가 기준 삭제 오류: {str(e)}")
        return jsonify({'error': '평가 기준 삭제 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria/categories', methods=['GET'])
@jwt_required()
def get_evaluation_categories():
    """평가 기준 카테고리 목록 조회"""
    try:
        categories = db.session.query(EvaluationCriteria.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        # 기본 카테고리 추가
        default_categories = ['전사', '직무', '개인']
        for cat in default_categories:
            if cat not in category_list:
                category_list.append(cat)
        
        return jsonify({'categories': sorted(category_list)}), 200
        
    except Exception as e:
        current_app.logger.error(f"카테고리 조회 오류: {str(e)}")
        return jsonify({'error': '카테고리 조회 중 오류가 발생했습니다.'}), 500

@evaluation_criteria_bp.route('/evaluation-criteria/summary', methods=['GET'])
@jwt_required()
def get_evaluation_criteria_summary():
    """평가 기준 요약 통계"""
    try:
        total_criteria = EvaluationCriteria.query.count()
        active_criteria = EvaluationCriteria.query.filter_by(is_active=True).count()
        
        # 카테고리별 통계
        category_stats = db.session.query(
            EvaluationCriteria.category,
            db.func.count(EvaluationCriteria.id).label('count')
        ).group_by(EvaluationCriteria.category).all()
        
        category_distribution = {cat: count for cat, count in category_stats}
        
        return jsonify({
            'total_criteria': total_criteria,
            'active_criteria': active_criteria,
            'inactive_criteria': total_criteria - active_criteria,
            'category_distribution': category_distribution
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"평가 기준 요약 조회 오류: {str(e)}")
        return jsonify({'error': '요약 정보 조회 중 오류가 발생했습니다.'}), 500

