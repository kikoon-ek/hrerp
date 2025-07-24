from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, timedelta
import calendar
import tempfile
import os

from ..models.user import db, User
from ..models.employee import Employee
from ..models.department import Department
from ..models.payroll_record import PayrollRecord
from ..utils.pdf_generator import PayrollPDFGenerator
from ..models.audit_log import AuditLog
from ..utils.auth import admin_required, get_current_user

payroll_bp = Blueprint('payroll', __name__)

@payroll_bp.route('/payroll-records', methods=['GET'])
@jwt_required()
@admin_required
def get_payroll_records():
    """급여명세서 목록 조회 (관리자 전용)"""
    try:
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        period = request.args.get('period', '').strip()
        department_id = request.args.get('department_id', type=int)
        status = request.args.get('status', '').strip()
        
        # 기본 쿼리
        query = PayrollRecord.query.join(Employee).join(Department)
        
        # 검색 조건
        if search:
            query = query.filter(
                or_(
                    Employee.name.contains(search),
                    Employee.employee_number.contains(search),
                    Department.name.contains(search)
                )
            )
        
        if period:
            query = query.filter(PayrollRecord.period == period)
        
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        
        if status:
            query = query.filter(PayrollRecord.status == status)
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(PayrollRecord.year), desc(PayrollRecord.month), Employee.name)
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 통계 정보
        total_records = query.count()
        total_gross_pay = db.session.query(func.sum(PayrollRecord.gross_pay)).filter(
            PayrollRecord.id.in_([r.id for r in query.all()])
        ).scalar() or 0
        total_net_pay = db.session.query(func.sum(PayrollRecord.net_pay)).filter(
            PayrollRecord.id.in_([r.id for r in query.all()])
        ).scalar() or 0
        
        return jsonify({
            'payroll_records': [record.to_dict() for record in paginated.items],
            'pagination': {
                'page': page,
                'pages': paginated.pages,
                'per_page': per_page,
                'total': paginated.total
            },
            'statistics': {
                'total_records': total_records,
                'total_gross_pay': total_gross_pay,
                'total_net_pay': total_net_pay,
                'average_gross_pay': total_gross_pay / total_records if total_records > 0 else 0,
                'average_net_pay': total_net_pay / total_records if total_records > 0 else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'급여명세서 목록 조회 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-records', methods=['POST'])
@jwt_required()
@admin_required
def create_payroll_record():
    """급여명세서 생성 (관리자 전용)"""
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'period', 'basic_salary']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 직원 존재 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '존재하지 않는 직원입니다.'}), 404
        
        # 중복 확인
        existing = PayrollRecord.get_by_employee_and_period(data['employee_id'], data['period'])
        if existing:
            return jsonify({'error': '해당 직원의 해당 기간 급여명세서가 이미 존재합니다.'}), 400
        
        # 급여명세서 생성
        payroll_record = PayrollRecord(
            employee_id=data['employee_id'],
            period=data['period'],
            basic_salary=data.get('basic_salary', 0),
            position_allowance=data.get('position_allowance', 0),
            meal_allowance=data.get('meal_allowance', 0),
            transport_allowance=data.get('transport_allowance', 0),
            family_allowance=data.get('family_allowance', 0),
            overtime_allowance=data.get('overtime_allowance', 0),
            night_allowance=data.get('night_allowance', 0),
            holiday_allowance=data.get('holiday_allowance', 0),
            other_allowances=data.get('other_allowances', 0),
            performance_bonus=data.get('performance_bonus', 0),
            annual_bonus=data.get('annual_bonus', 0),
            special_bonus=data.get('special_bonus', 0),
            union_fee=data.get('union_fee', 0),
            other_deductions=data.get('other_deductions', 0),
            work_days=data.get('work_days', 0),
            overtime_hours=data.get('overtime_hours', 0),
            night_hours=data.get('night_hours', 0),
            holiday_hours=data.get('holiday_hours', 0),
            annual_leave_used=data.get('annual_leave_used', 0),
            annual_leave_remaining=data.get('annual_leave_remaining', 0),
            memo=data.get('memo', ''),
            created_by=current_user.id
        )
        
        # 세금 및 보험료 자동 계산
        payroll_record.calculate_tax_and_insurance()
        
        # 총액 계산
        payroll_record.calculate_totals()
        
        db.session.add(payroll_record)
        db.session.commit()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user.id,
            action_type='CREATE',
            entity_type='payroll_record',
            entity_id=payroll_record.id,
            message=f'급여명세서 생성: {employee.name} - {data["period"]}'
        )
        
        return jsonify({
            'message': '급여명세서가 생성되었습니다.',
            'payroll_record': payroll_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'급여명세서 생성 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-records/<int:record_id>', methods=['GET'])
@jwt_required()
def get_payroll_record(record_id):
    """급여명세서 상세 조회"""
    try:
        current_user = get_current_user()
        
        payroll_record = PayrollRecord.query.get_or_404(record_id)
        
        # 권한 확인 (관리자이거나 본인의 급여명세서인 경우)
        if current_user.role != 'admin' and payroll_record.employee.user_id != current_user.id:
            return jsonify({'error': '접근 권한이 없습니다.'}), 403
        
        return jsonify({
            'payroll_record': payroll_record.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'급여명세서 조회 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-records/<int:record_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_payroll_record(record_id):
    """급여명세서 수정 (관리자 전용)"""
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        payroll_record = PayrollRecord.query.get_or_404(record_id)
        
        # 확정된 급여명세서는 수정 불가
        if payroll_record.is_final:
            return jsonify({'error': '확정된 급여명세서는 수정할 수 없습니다.'}), 400
        
        # 수정 가능한 필드들
        updatable_fields = [
            'basic_salary', 'position_allowance', 'meal_allowance', 'transport_allowance',
            'family_allowance', 'overtime_allowance', 'night_allowance', 'holiday_allowance',
            'other_allowances', 'performance_bonus', 'annual_bonus', 'special_bonus',
            'union_fee', 'other_deductions', 'work_days', 'overtime_hours', 'night_hours',
            'holiday_hours', 'annual_leave_used', 'annual_leave_remaining', 'memo'
        ]
        
        # 필드 업데이트
        for field in updatable_fields:
            if field in data:
                setattr(payroll_record, field, data[field])
        
        # 세금 및 보험료 재계산
        payroll_record.calculate_tax_and_insurance()
        
        # 총액 재계산
        payroll_record.calculate_totals()
        
        payroll_record.updated_by = current_user.id
        payroll_record.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user.id,
            action_type='UPDATE',
            entity_type='payroll_record',
            entity_id=payroll_record.id,
            message=f'급여명세서 수정: {payroll_record.employee.name} - {payroll_record.period}'
        )
        
        return jsonify({
            'message': '급여명세서가 수정되었습니다.',
            'payroll_record': payroll_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'급여명세서 수정 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-records/<int:record_id>/finalize', methods=['POST'])
@jwt_required()
@admin_required
def finalize_payroll_record(record_id):
    """급여명세서 확정 (관리자 전용)"""
    try:
        current_user = get_current_user()
        
        payroll_record = PayrollRecord.query.get_or_404(record_id)
        
        if payroll_record.is_final:
            return jsonify({'error': '이미 확정된 급여명세서입니다.'}), 400
        
        payroll_record.is_final = True
        payroll_record.status = '확정'
        payroll_record.updated_by = current_user.id
        payroll_record.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user.id,
            action_type='UPDATE',
            entity_type='payroll_record',
            entity_id=payroll_record.id,
            message=f'급여명세서 확정: {payroll_record.employee.name} - {payroll_record.period}'
        )
        
        return jsonify({
            'message': '급여명세서가 확정되었습니다.',
            'payroll_record': payroll_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'급여명세서 확정 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-records/<int:record_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_payroll_record(record_id):
    """급여명세서 삭제 (관리자 전용)"""
    try:
        current_user = get_current_user()
        
        payroll_record = PayrollRecord.query.get_or_404(record_id)
        
        # 확정된 급여명세서는 삭제 불가
        if payroll_record.is_final:
            return jsonify({'error': '확정된 급여명세서는 삭제할 수 없습니다.'}), 400
        
        employee_name = payroll_record.employee.name
        period = payroll_record.period
        
        db.session.delete(payroll_record)
        db.session.commit()
        
        # 감사 로그
        AuditLog.log_action(
            user_id=current_user.id,
            action_type='DELETE',
            entity_type='payroll_record',
            entity_id=record_id,
            message=f'급여명세서 삭제: {employee_name} - {period}'
        )
        
        return jsonify({'message': '급여명세서가 삭제되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'급여명세서 삭제 실패: {str(e)}'}), 500

@payroll_bp.route('/my-payroll-records', methods=['GET'])
@jwt_required()
def get_my_payroll_records():
    """내 급여명세서 목록 조회 (사용자)"""
    try:
        current_user = get_current_user()
        
        # 현재 사용자의 직원 정보 조회
        employee = Employee.query.filter_by(user_id=current_user.id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        year = request.args.get('year', type=int)
        
        # 기본 쿼리
        query = PayrollRecord.query.filter_by(employee_id=employee.id)
        
        if year:
            query = query.filter(PayrollRecord.year == year)
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(PayrollRecord.year), desc(PayrollRecord.month))
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 연간 통계 (현재 연도)
        current_year = datetime.now().year
        yearly_records = PayrollRecord.query.filter_by(
            employee_id=employee.id,
            year=current_year
        ).all()
        
        yearly_stats = {
            'total_gross_pay': sum(r.gross_pay for r in yearly_records),
            'total_net_pay': sum(r.net_pay for r in yearly_records),
            'total_deductions': sum(r.total_deductions for r in yearly_records),
            'average_gross_pay': sum(r.gross_pay for r in yearly_records) / len(yearly_records) if yearly_records else 0,
            'records_count': len(yearly_records)
        }
        
        return jsonify({
            'payroll_records': [record.to_dict() for record in paginated.items],
            'pagination': {
                'page': page,
                'pages': paginated.pages,
                'per_page': per_page,
                'total': paginated.total
            },
            'yearly_stats': yearly_stats,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'employee_number': employee.employee_number,
                'position': employee.position,
                'department': {
                    'id': employee.department.id,
                    'name': employee.department.name
                } if employee.department else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'급여명세서 목록 조회 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-periods', methods=['GET'])
@jwt_required()
@admin_required
def get_payroll_periods():
    """급여 지급 기간 목록 조회 (관리자 전용)"""
    try:
        # 모든 급여 기간 조회
        periods = db.session.query(PayrollRecord.period).distinct().order_by(desc(PayrollRecord.period)).all()
        period_list = [period[0] for period in periods]
        
        # 각 기간별 통계
        period_stats = []
        for period in period_list:
            records = PayrollRecord.query.filter_by(period=period).all()
            stats = {
                'period': period,
                'employee_count': len(records),
                'total_gross_pay': sum(r.gross_pay for r in records),
                'total_net_pay': sum(r.net_pay for r in records),
                'average_gross_pay': sum(r.gross_pay for r in records) / len(records) if records else 0,
                'finalized_count': len([r for r in records if r.is_final])
            }
            period_stats.append(stats)
        
        return jsonify({
            'periods': period_list,
            'period_statistics': period_stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'급여 기간 조회 실패: {str(e)}'}), 500

@payroll_bp.route('/payroll-templates', methods=['GET'])
@jwt_required()
@admin_required
def get_payroll_templates():
    """급여 템플릿 조회 (관리자 전용)"""
    try:
        # 최근 급여명세서를 기반으로 템플릿 생성
        recent_records = PayrollRecord.query.order_by(desc(PayrollRecord.created_at)).limit(10).all()
        
        templates = []
        for record in recent_records:
            template = {
                'employee_id': record.employee_id,
                'employee_name': record.employee.name,
                'basic_salary': record.basic_salary,
                'position_allowance': record.position_allowance,
                'meal_allowance': record.meal_allowance,
                'transport_allowance': record.transport_allowance,
                'family_allowance': record.family_allowance,
                'union_fee': record.union_fee,
                'work_days': record.work_days
            }
            templates.append(template)
        
        return jsonify({
            'templates': templates
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'급여 템플릿 조회 실패: {str(e)}'}), 500



@payroll_bp.route('/payroll-records/<int:payroll_id>/pdf', methods=['GET'])
@jwt_required()
def download_payroll_pdf(payroll_id):
    """급여명세서 PDF 다운로드"""
    try:
        current_user = get_current_user()
        
        # 급여명세서 조회
        payroll = PayrollRecord.query.options(
            joinedload(PayrollRecord.employee).joinedload(Employee.department)
        ).filter_by(id=payroll_id).first()
        
        if not payroll:
            return jsonify({'error': '급여명세서를 찾을 수 없습니다.'}), 404
        
        # 권한 확인 (관리자이거나 본인의 급여명세서인 경우만)
        if current_user.role != 'admin' and payroll.employee.user_id != current_user.id:
            return jsonify({'error': '권한이 없습니다.'}), 403
        
        # PDF 생성
        pdf_generator = PayrollPDFGenerator()
        pdf_buffer = pdf_generator.generate_payroll_pdf(payroll)
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_buffer.getvalue())
            tmp_file_path = tmp_file.name
        
        # 파일명 생성
        filename = f"급여명세서_{payroll.employee.name}_{payroll.year}년{payroll.month:02d}월.pdf"
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='DOWNLOAD',
            entity_type='payroll_pdf',
            entity_id=payroll_id,
            message=f"급여명세서 PDF 다운로드: {payroll.employee.name} ({payroll.year}년 {payroll.month}월)"
        )
        
        return send_file(
            tmp_file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'}), 500
    finally:
        # 임시 파일 정리
        try:
            if 'tmp_file_path' in locals():
                os.unlink(tmp_file_path)
        except:
            pass

@payroll_bp.route('/my-payroll-records/<int:payroll_id>/pdf', methods=['GET'])
@jwt_required()
def download_my_payroll_pdf(payroll_id):
    """내 급여명세서 PDF 다운로드 (사용자용)"""
    try:
        current_user = get_current_user()
        
        # 내 직원 정보 조회
        employee = Employee.query.filter_by(user_id=current_user.id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        # 급여명세서 조회 (본인 것만)
        payroll = PayrollRecord.query.options(
            joinedload(PayrollRecord.employee).joinedload(Employee.department)
        ).filter_by(id=payroll_id, employee_id=employee.id).first()
        
        if not payroll:
            return jsonify({'error': '급여명세서를 찾을 수 없습니다.'}), 404
        
        # PDF 생성
        pdf_generator = PayrollPDFGenerator()
        pdf_buffer = pdf_generator.generate_payroll_pdf(payroll)
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_buffer.getvalue())
            tmp_file_path = tmp_file.name
        
        # 파일명 생성
        filename = f"급여명세서_{payroll.year}년{payroll.month:02d}월.pdf"
        
        # 감사 로그 기록
        log_action(
            user_id=current_user.id,
            action_type='DOWNLOAD',
            entity_type='my_payroll_pdf',
            entity_id=payroll_id,
            message=f"내 급여명세서 PDF 다운로드: {payroll.year}년 {payroll.month}월"
        )
        
        return send_file(
            tmp_file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'}), 500
    finally:
        # 임시 파일 정리
        try:
            if 'tmp_file_path' in locals():
                os.unlink(tmp_file_path)
        except:
            pass

def log_action(user_id, action_type, entity_type, entity_id, message):
    """감사 로그 기록 헬퍼 함수"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        print(f"감사 로그 기록 실패: {e}")
        db.session.rollback()

