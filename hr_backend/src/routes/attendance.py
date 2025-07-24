from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date, time
from sqlalchemy import and_, or_, desc
from src.models.user import db
from src.models.attendance_record import AttendanceRecord
from src.models.employee import Employee
from src.utils.auth import admin_required
from src.utils.audit import log_action

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/attendance', methods=['GET'])
@jwt_required()
def get_attendance_records():
    """출퇴근 기록 조회"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        # 기본 쿼리
        query = AttendanceRecord.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 기록만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(AttendanceRecord.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(AttendanceRecord.employee_id == employee_id)
        
        # 날짜 필터
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(AttendanceRecord.date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '시작 날짜 형식이 올바르지 않습니다.'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(AttendanceRecord.date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '종료 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 상태 필터
        if status:
            query = query.filter(AttendanceRecord.status == status)
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(AttendanceRecord.date), desc(AttendanceRecord.created_at))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        records = [record.to_dict() for record in pagination.items]
        
        return jsonify({
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'출퇴근 기록 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance', methods=['POST'])
@jwt_required()
def create_attendance_record():
    """출퇴근 기록 생성"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 정보 확인
        if user_role == 'admin' and 'employee_id' in data:
            employee_id = data['employee_id']
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        else:
            # 일반 사용자는 본인 기록만 생성
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            employee_id = employee.id
        
        # 날짜 파싱
        try:
            record_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '날짜 형식이 올바르지 않습니다.'}), 400
        
        # 중복 기록 확인
        existing_record = AttendanceRecord.query.filter_by(
            employee_id=employee_id,
            date=record_date
        ).first()
        
        if existing_record:
            return jsonify({'error': '해당 날짜의 출퇴근 기록이 이미 존재합니다.'}), 400
        
        # 시간 파싱
        check_in_time = None
        check_out_time = None
        
        if 'check_in' in data and data['check_in']:
            try:
                check_in_time = datetime.strptime(data['check_in'], '%H:%M:%S').time()
            except ValueError:
                try:
                    check_in_time = datetime.strptime(data['check_in'], '%H:%M').time()
                except ValueError:
                    return jsonify({'error': '출근 시간 형식이 올바르지 않습니다.'}), 400
        
        if 'check_out' in data and data['check_out']:
            try:
                check_out_time = datetime.strptime(data['check_out'], '%H:%M:%S').time()
            except ValueError:
                try:
                    check_out_time = datetime.strptime(data['check_out'], '%H:%M').time()
                except ValueError:
                    return jsonify({'error': '퇴근 시간 형식이 올바르지 않습니다.'}), 400
        
        # 출퇴근 기록 생성
        record = AttendanceRecord(
            employee_id=employee_id,
            date=record_date,
            check_in=check_in_time,
            check_out=check_out_time,
            note=data.get('note')
        )
        
        # 근무 시간 계산 및 상태 결정
        record.calculate_work_hours()
        record.determine_status()
        
        db.session.add(record)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='attendance_record',
            entity_id=record.id,
            message=f'출퇴근 기록 생성: {employee.name} ({record_date})'
        )
        
        return jsonify({
            'message': '출퇴근 기록이 생성되었습니다.',
            'record': record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'출퇴근 기록 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance/<int:record_id>', methods=['PUT'])
@jwt_required()
def update_attendance_record(record_id):
    """출퇴근 기록 수정"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        record = AttendanceRecord.query.get(record_id)
        if not record:
            return jsonify({'error': '출퇴근 기록을 찾을 수 없습니다.'}), 404
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or record.employee_id != employee.id:
                return jsonify({'error': '수정 권한이 없습니다.'}), 403
            
            # 일반 사용자는 당일 기록만 수정 가능
            if record.date != date.today():
                return jsonify({'error': '당일 기록만 수정할 수 있습니다.'}), 403
        
        data = request.get_json()
        
        # 시간 업데이트
        if 'check_in' in data:
            if data['check_in']:
                try:
                    record.check_in = datetime.strptime(data['check_in'], '%H:%M:%S').time()
                except ValueError:
                    try:
                        record.check_in = datetime.strptime(data['check_in'], '%H:%M').time()
                    except ValueError:
                        return jsonify({'error': '출근 시간 형식이 올바르지 않습니다.'}), 400
            else:
                record.check_in = None
        
        if 'check_out' in data:
            if data['check_out']:
                try:
                    record.check_out = datetime.strptime(data['check_out'], '%H:%M:%S').time()
                except ValueError:
                    try:
                        record.check_out = datetime.strptime(data['check_out'], '%H:%M').time()
                    except ValueError:
                        return jsonify({'error': '퇴근 시간 형식이 올바르지 않습니다.'}), 400
            else:
                record.check_out = None
        
        if 'note' in data:
            record.note = data['note']
        
        # 근무 시간 재계산 및 상태 재결정
        record.calculate_work_hours()
        record.determine_status()
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='attendance_record',
            entity_id=record.id,
            message=f'출퇴근 기록 수정: {record.employee.name} ({record.date})'
        )
        
        return jsonify({
            'message': '출퇴근 기록이 수정되었습니다.',
            'record': record.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'출퇴근 기록 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance/<int:record_id>', methods=['DELETE'])
@admin_required
def delete_attendance_record(record_id):
    """출퇴근 기록 삭제 (관리자만)"""
    try:
        current_user_id = get_jwt_identity()
        
        record = AttendanceRecord.query.get(record_id)
        if not record:
            return jsonify({'error': '출퇴근 기록을 찾을 수 없습니다.'}), 404
        
        employee_name = record.employee.name
        record_date = record.date
        
        db.session.delete(record)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='DELETE',
            entity_type='attendance_record',
            entity_id=record_id,
            message=f'출퇴근 기록 삭제: {employee_name} ({record_date})'
        )
        
        return jsonify({'message': '출퇴근 기록이 삭제되었습니다.'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'출퇴근 기록 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance/check-in', methods=['POST'])
@jwt_required()
def check_in():
    """출근 등록"""
    try:
        current_user_id = get_jwt_identity()
        
        # 직원 정보 확인
        employee = Employee.query.filter_by(user_id=current_user_id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        today = date.today()
        current_time = datetime.now().time()
        
        # 오늘 기록 확인
        existing_record = AttendanceRecord.query.filter_by(
            employee_id=employee.id,
            date=today
        ).first()
        
        if existing_record:
            if existing_record.check_in:
                return jsonify({'error': '이미 출근 등록이 완료되었습니다.'}), 400
            else:
                # 기존 기록에 출근 시간 추가
                existing_record.check_in = current_time
                existing_record.determine_status()
                db.session.commit()
                
                log_action(
                    user_id=current_user_id,
                    action_type='UPDATE',
                    entity_type='attendance_record',
                    entity_id=existing_record.id,
                    message=f'출근 등록: {employee.name}'
                )
                
                return jsonify({
                    'message': '출근이 등록되었습니다.',
                    'record': existing_record.to_dict()
                })
        else:
            # 새 기록 생성
            record = AttendanceRecord(
                employee_id=employee.id,
                date=today,
                check_in=current_time
            )
            record.determine_status()
            
            db.session.add(record)
            db.session.commit()
            
            log_action(
                user_id=current_user_id,
                action_type='CREATE',
                entity_type='attendance_record',
                entity_id=record.id,
                message=f'출근 등록: {employee.name}'
            )
            
            return jsonify({
                'message': '출근이 등록되었습니다.',
                'record': record.to_dict()
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'출근 등록 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance/check-out', methods=['POST'])
@jwt_required()
def check_out():
    """퇴근 등록"""
    try:
        current_user_id = get_jwt_identity()
        
        # 직원 정보 확인
        employee = Employee.query.filter_by(user_id=current_user_id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        today = date.today()
        current_time = datetime.now().time()
        
        # 오늘 기록 확인
        record = AttendanceRecord.query.filter_by(
            employee_id=employee.id,
            date=today
        ).first()
        
        if not record:
            return jsonify({'error': '출근 기록이 없습니다. 먼저 출근을 등록해주세요.'}), 400
        
        if not record.check_in:
            return jsonify({'error': '출근 시간이 등록되지 않았습니다.'}), 400
        
        if record.check_out:
            return jsonify({'error': '이미 퇴근 등록이 완료되었습니다.'}), 400
        
        # 퇴근 시간 등록
        record.check_out = current_time
        record.calculate_work_hours()
        record.determine_status()
        
        db.session.commit()
        
        log_action(
            user_id=current_user_id,
            action_type='UPDATE',
            entity_type='attendance_record',
            entity_id=record.id,
            message=f'퇴근 등록: {employee.name}'
        )
        
        return jsonify({
            'message': '퇴근이 등록되었습니다.',
            'record': record.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'퇴근 등록 중 오류가 발생했습니다: {str(e)}'}), 500

@attendance_bp.route('/attendance/today', methods=['GET'])
@jwt_required()
def get_today_attendance():
    """오늘 출퇴근 현황 조회"""
    try:
        current_user_id = get_jwt_identity()
        
        # 직원 정보 확인
        employee = Employee.query.filter_by(user_id=current_user_id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        today = date.today()
        
        # 오늘 기록 조회
        record = AttendanceRecord.query.filter_by(
            employee_id=employee.id,
            date=today
        ).first()
        
        if record:
            return jsonify({'record': record.to_dict()})
        else:
            return jsonify({'record': None})
        
    except Exception as e:
        return jsonify({'error': f'출퇴근 현황 조회 중 오류가 발생했습니다: {str(e)}'}), 500

