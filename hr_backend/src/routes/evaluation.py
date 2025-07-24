from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import and_, or_, desc, asc
from datetime import datetime, timedelta
from ..models.user import db, User
from ..models.employee import Employee
from ..models.evaluation_criteria import EvaluationCriteria
from ..models.evaluation_simple import Evaluation, EvaluationResult, EvaluationScore
from ..models.audit_log import AuditLog
from ..utils.auth import token_required, admin_required
from ..utils.audit import log_action

evaluation_bp = Blueprint('evaluation', __name__)

@evaluation_bp.route('/evaluations', methods=['GET'])
@token_required
def get_evaluations(current_user):
    """평가 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        type_filter = request.args.get('type')
        search = request.args.get('search', '').strip()
        
        query = db.session.query(Evaluation)
        
        # 필터링
        if status:
            query = query.filter(Evaluation.status == status)
        if type_filter:
            query = query.filter(Evaluation.type == type_filter)
        if search:
            query = query.filter(
                or_(
                    Evaluation.title.ilike(f'%{search}%'),
                    Evaluation.description.ilike(f'%{search}%')
                )
            )
        
        # 정렬
        query = query.order_by(desc(Evaluation.created_at))
        
        # 페이지네이션
        total = query.count()
        evaluations = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'evaluations': [evaluation.to_dict() for evaluation in evaluations],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations', methods=['POST'])
@admin_required
def create_evaluation(current_user):
    """평가 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['title', 'type', 'start_date', 'end_date', 'criteria_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # 날짜 검증
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
        
        if start_date >= end_date:
            return jsonify({'error': 'End date must be after start date'}), 400
        
        # 평가 기준 존재 확인
        criteria = db.session.query(EvaluationCriteria).filter_by(id=data['criteria_id']).first()
        if not criteria:
            return jsonify({'error': 'Evaluation criteria not found'}), 404
        
        # 평가 생성
        evaluation = Evaluation(
            title=data['title'],
            description=data.get('description'),
            type=data['type'],
            start_date=start_date,
            end_date=end_date,
            criteria_id=data['criteria_id'],
            created_by=current_user.id
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'CREATE', 'evaluation', evaluation.id, 
                  f"평가 생성: {evaluation.title}")
        
        return jsonify({
            'message': 'Evaluation created successfully',
            'evaluation': evaluation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations/<int:evaluation_id>', methods=['GET'])
@token_required
def get_evaluation(current_user, evaluation_id):
    """평가 상세 조회"""
    try:
        evaluation = db.session.query(Evaluation).filter_by(id=evaluation_id).first()
        if not evaluation:
            return jsonify({'error': 'Evaluation not found'}), 404
        
        return jsonify({'evaluation': evaluation.to_dict()})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations/<int:evaluation_id>', methods=['PUT'])
@admin_required
def update_evaluation(current_user, evaluation_id):
    """평가 수정"""
    try:
        evaluation = db.session.query(Evaluation).filter_by(id=evaluation_id).first()
        if not evaluation:
            return jsonify({'error': 'Evaluation not found'}), 404
        
        data = request.get_json()
        
        # 수정 가능한 필드들
        updatable_fields = ['title', 'description', 'status', 'start_date', 'end_date']
        
        for field in updatable_fields:
            if field in data:
                if field in ['start_date', 'end_date']:
                    try:
                        setattr(evaluation, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                    except ValueError:
                        return jsonify({'error': f'Invalid {field} format'}), 400
                else:
                    setattr(evaluation, field, data[field])
        
        evaluation.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'UPDATE', 'evaluation', evaluation.id, 
                  f"평가 수정: {evaluation.title}")
        
        return jsonify({
            'message': 'Evaluation updated successfully',
            'evaluation': evaluation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations/<int:evaluation_id>', methods=['DELETE'])
@admin_required
def delete_evaluation(current_user, evaluation_id):
    """평가 삭제"""
    try:
        evaluation = db.session.query(Evaluation).filter_by(id=evaluation_id).first()
        if not evaluation:
            return jsonify({'error': 'Evaluation not found'}), 404
        
        evaluation_title = evaluation.title
        
        db.session.delete(evaluation)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'DELETE', 'evaluation', evaluation_id, 
                  f"평가 삭제: {evaluation_title}")
        
        return jsonify({'message': 'Evaluation deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations/<int:evaluation_id>/results', methods=['GET'])
@token_required
def get_evaluation_results(current_user, evaluation_id):
    """평가 결과 목록 조회"""
    try:
        evaluation = db.session.query(Evaluation).filter_by(id=evaluation_id).first()
        if not evaluation:
            return jsonify({'error': 'Evaluation not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        department_id = request.args.get('department_id', type=int)
        
        query = db.session.query(EvaluationResult).filter_by(evaluation_id=evaluation_id)
        
        # 필터링
        if status:
            query = query.filter(EvaluationResult.status == status)
        if department_id:
            query = query.join(Employee).filter(Employee.department_id == department_id)
        
        # 정렬
        query = query.order_by(desc(EvaluationResult.updated_at))
        
        # 페이지네이션
        total = query.count()
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'results': [result.to_dict() for result in results],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluations/<int:evaluation_id>/results', methods=['POST'])
@admin_required
def create_evaluation_result(current_user, evaluation_id):
    """평가 결과 생성"""
    try:
        evaluation = db.session.query(Evaluation).filter_by(id=evaluation_id).first()
        if not evaluation:
            return jsonify({'error': 'Evaluation not found'}), 404
        
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'evaluator_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # 직원 존재 확인
        employee = db.session.query(Employee).filter_by(id=data['employee_id']).first()
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        evaluator = db.session.query(Employee).filter_by(id=data['evaluator_id']).first()
        if not evaluator:
            return jsonify({'error': 'Evaluator not found'}), 404
        
        # 중복 확인
        existing = db.session.query(EvaluationResult).filter_by(
            evaluation_id=evaluation_id,
            employee_id=data['employee_id']
        ).first()
        if existing:
            return jsonify({'error': 'Evaluation result already exists for this employee'}), 400
        
        # 평가 결과 생성
        result = EvaluationResult(
            evaluation_id=evaluation_id,
            employee_id=data['employee_id'],
            evaluator_id=data['evaluator_id']
        )
        
        db.session.add(result)
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'CREATE', 'evaluation_result', result.id, 
                  f"평가 결과 생성: {employee.name} - {evaluation.title}")
        
        return jsonify({
            'message': 'Evaluation result created successfully',
            'result': result.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluation-results/<int:result_id>', methods=['GET'])
@token_required
def get_evaluation_result(current_user, result_id):
    """평가 결과 상세 조회"""
    try:
        result = db.session.query(EvaluationResult).filter_by(id=result_id).first()
        if not result:
            return jsonify({'error': 'Evaluation result not found'}), 404
        
        # 권한 확인 (관리자이거나 본인의 평가 결과)
        if current_user.role != 'admin' and result.employee.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({'result': result.to_dict()})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluation-results/<int:result_id>', methods=['PUT'])
@token_required
def update_evaluation_result(current_user, result_id):
    """평가 결과 수정"""
    try:
        result = db.session.query(EvaluationResult).filter_by(id=result_id).first()
        if not result:
            return jsonify({'error': 'Evaluation result not found'}), 404
        
        # 권한 확인 (관리자이거나 평가자)
        if current_user.role != 'admin' and result.evaluator.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # 수정 가능한 필드들
        updatable_fields = ['self_evaluation', 'evaluator_comments', 'improvement_areas', 'strengths', 'status']
        
        for field in updatable_fields:
            if field in data:
                setattr(result, field, data[field])
        
        # 점수 업데이트
        if 'scores' in data:
            # 기존 점수 삭제
            for score in result.evaluation_scores:
                db.session.delete(score)
            
            total_score = 0
            total_weight = 0
            
            # 새 점수 추가
            for score_data in data['scores']:
                score = EvaluationScore(
                    evaluation_result_id=result.id,
                    criteria_item=score_data['criteria_item'],
                    weight=score_data['weight'],
                    max_score=score_data.get('max_score', 100),
                    score=score_data['score'],
                    comments=score_data.get('comments')
                )
                score.weighted_score = (score.score / score.max_score) * score.weight
                db.session.add(score)
                
                total_score += score.weighted_score
                total_weight += score.weight
            
            # 총점 계산
            result.total_score = total_score
            result.weighted_score = (total_score / total_weight * 100) if total_weight > 0 else 0
            
            # 등급 계산
            if result.weighted_score >= 90:
                result.grade = 'S'
            elif result.weighted_score >= 80:
                result.grade = 'A'
            elif result.weighted_score >= 70:
                result.grade = 'B'
            elif result.weighted_score >= 60:
                result.grade = 'C'
            else:
                result.grade = 'D'
        
        # 제출 처리
        if data.get('status') == 'COMPLETED' and result.status != 'COMPLETED':
            result.submitted_at = datetime.utcnow()
        
        result.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'UPDATE', 'evaluation_result', result.id, 
                  f"평가 결과 수정: {result.employee.name}")
        
        return jsonify({
            'message': 'Evaluation result updated successfully',
            'result': result.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluation-results/<int:result_id>/approve', methods=['POST'])
@admin_required
def approve_evaluation_result(current_user, result_id):
    """평가 결과 승인"""
    try:
        result = db.session.query(EvaluationResult).filter_by(id=result_id).first()
        if not result:
            return jsonify({'error': 'Evaluation result not found'}), 404
        
        if result.status != 'COMPLETED':
            return jsonify({'error': 'Only completed evaluations can be approved'}), 400
        
        result.status = 'APPROVED'
        result.approved_by = current_user.employee.id if current_user.employee else None
        result.approved_at = datetime.utcnow()
        result.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 감사 로그
        log_action(current_user.id, 'UPDATE', 'evaluation_result', result.id, 
                  f"평가 결과 승인: {result.employee.name}")
        
        return jsonify({
            'message': 'Evaluation result approved successfully',
            'result': result.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/my-evaluations', methods=['GET'])
@token_required
def get_my_evaluations(current_user):
    """내 평가 목록 조회"""
    try:
        if not current_user.employee:
            return jsonify({'error': 'Employee profile not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        
        query = db.session.query(EvaluationResult).filter_by(employee_id=current_user.employee.id)
        
        if status:
            query = query.filter(EvaluationResult.status == status)
        
        query = query.order_by(desc(EvaluationResult.updated_at))
        
        total = query.count()
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'results': [result.to_dict() for result in results],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/evaluation-stats', methods=['GET'])
@admin_required
def get_evaluation_stats(current_user):
    """평가 통계 조회"""
    try:
        # 전체 평가 수
        total_evaluations = db.session.query(Evaluation).count()
        
        # 진행 중인 평가 수
        active_evaluations = db.session.query(Evaluation).filter(
            Evaluation.status.in_(['IN_PROGRESS', 'DRAFT'])
        ).count()
        
        # 완료된 평가 결과 수
        completed_results = db.session.query(EvaluationResult).filter_by(
            status='COMPLETED'
        ).count()
        
        # 승인된 평가 결과 수
        approved_results = db.session.query(EvaluationResult).filter_by(
            status='APPROVED'
        ).count()
        
        # 평균 점수
        avg_score = db.session.query(db.func.avg(EvaluationResult.weighted_score)).filter(
            EvaluationResult.weighted_score.isnot(None)
        ).scalar() or 0
        
        # 등급별 분포
        grade_distribution = {}
        grades = db.session.query(
            EvaluationResult.grade, 
            db.func.count(EvaluationResult.id)
        ).filter(
            EvaluationResult.grade.isnot(None)
        ).group_by(EvaluationResult.grade).all()
        
        for grade, count in grades:
            grade_distribution[grade] = count
        
        return jsonify({
            'total_evaluations': total_evaluations,
            'active_evaluations': active_evaluations,
            'completed_results': completed_results,
            'approved_results': approved_results,
            'average_score': round(avg_score, 2),
            'grade_distribution': grade_distribution
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

