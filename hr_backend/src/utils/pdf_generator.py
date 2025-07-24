import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class PayrollPDFGenerator:
    """급여명세서 PDF 생성기"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_styles()
    
    def setup_styles(self):
        """PDF 스타일 설정"""
        # 제목 스타일
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.black
        )
        
        # 부제목 스타일
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.black
        )
        
        # 일반 텍스트 스타일
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_LEFT
        )
        
        # 오른쪽 정렬 스타일
        self.right_style = ParagraphStyle(
            'CustomRight',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT
        )
    
    def generate_payroll_pdf(self, payroll_record):
        """급여명세서 PDF 생성"""
        buffer = io.BytesIO()
        
        # PDF 문서 생성
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # 문서 내용 구성
        story = []
        
        # 헤더 추가
        story.extend(self._create_header(payroll_record))
        
        # 직원 정보 추가
        story.extend(self._create_employee_info(payroll_record))
        
        # 급여 내역 테이블 추가
        story.extend(self._create_payroll_table(payroll_record))
        
        # 요약 정보 추가
        story.extend(self._create_summary(payroll_record))
        
        # 근무 정보 추가
        story.extend(self._create_work_info(payroll_record))
        
        # 푸터 추가
        story.extend(self._create_footer(payroll_record))
        
        # PDF 빌드
        doc.build(story)
        
        buffer.seek(0)
        return buffer
    
    def _create_header(self, payroll_record):
        """헤더 생성"""
        elements = []
        
        # 회사명
        company_title = Paragraph("HR 통합 관리 시스템", self.title_style)
        elements.append(company_title)
        
        # 급여명세서 제목
        payroll_title = Paragraph(f"급여명세서", self.subtitle_style)
        elements.append(payroll_title)
        
        # 급여 기간
        period_text = Paragraph(f"급여 지급 기간: {payroll_record.period}", self.normal_style)
        elements.append(period_text)
        
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_employee_info(self, payroll_record):
        """직원 정보 테이블 생성"""
        elements = []
        
        # 직원 정보 데이터
        employee_data = [
            ['직원 정보', '', '', ''],
            ['성명', payroll_record.employee.name, '사번', payroll_record.employee.employee_number],
            ['부서', payroll_record.employee.department.name if payroll_record.employee.department else '-', 
             '직급', payroll_record.employee.position],
            ['근무일수', f"{payroll_record.work_days}일", '발행일', datetime.now().strftime('%Y년 %m월 %d일')]
        ]
        
        # 테이블 생성
        employee_table = Table(employee_data, colWidths=[2*cm, 4*cm, 2*cm, 4*cm])
        employee_table.setStyle(TableStyle([
            # 헤더 스타일
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('SPAN', (0, 0), (-1, 0)),  # 헤더 셀 병합
            
            # 데이터 스타일
            ('BACKGROUND', (0, 1), (0, -1), colors.lightgrey),
            ('BACKGROUND', (2, 1), (2, -1), colors.lightgrey),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(employee_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_payroll_table(self, payroll_record):
        """급여 내역 테이블 생성"""
        elements = []
        
        # 지급 내역 데이터
        income_data = [
            ['지급 내역', '금액(원)'],
            ['기본급', f"{payroll_record.basic_salary:,.0f}"],
            ['직책수당', f"{payroll_record.position_allowance:,.0f}"],
            ['식대', f"{payroll_record.meal_allowance:,.0f}"],
            ['교통비', f"{payroll_record.transport_allowance:,.0f}"],
            ['가족수당', f"{payroll_record.family_allowance:,.0f}"],
            ['연장근무수당', f"{payroll_record.overtime_allowance:,.0f}"],
            ['야간근무수당', f"{payroll_record.night_allowance:,.0f}"],
            ['휴일근무수당', f"{payroll_record.holiday_allowance:,.0f}"],
            ['기타수당', f"{payroll_record.other_allowances:,.0f}"],
            ['성과급', f"{payroll_record.performance_bonus:,.0f}"],
            ['연말보너스', f"{payroll_record.annual_bonus:,.0f}"],
            ['특별보너스', f"{payroll_record.special_bonus:,.0f}"],
            ['총 지급액', f"{payroll_record.gross_pay:,.0f}"]
        ]
        
        # 공제 내역 데이터
        deduction_data = [
            ['공제 내역', '금액(원)'],
            ['국민연금', f"{payroll_record.national_pension:,.0f}"],
            ['건강보험', f"{payroll_record.health_insurance:,.0f}"],
            ['고용보험', f"{payroll_record.employment_insurance:,.0f}"],
            ['장기요양보험', f"{payroll_record.long_term_care:,.0f}"],
            ['소득세', f"{payroll_record.income_tax:,.0f}"],
            ['지방소득세', f"{payroll_record.local_tax:,.0f}"],
            ['조합비', f"{payroll_record.union_fee:,.0f}"],
            ['기타공제', f"{payroll_record.other_deductions:,.0f}"],
            ['총 공제액', f"{payroll_record.total_deductions:,.0f}"]
        ]
        
        # 지급 테이블 생성
        income_table = Table(income_data, colWidths=[6*cm, 3*cm])
        income_table.setStyle(TableStyle([
            # 헤더 스타일
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            
            # 데이터 스타일
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 9),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            
            # 총계 스타일
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 10),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # 공제 테이블 생성
        deduction_table = Table(deduction_data, colWidths=[6*cm, 3*cm])
        deduction_table.setStyle(TableStyle([
            # 헤더 스타일
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightcoral),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            
            # 데이터 스타일
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 9),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            
            # 총계 스타일
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightcoral),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 10),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # 테이블을 나란히 배치
        table_data = [[income_table, deduction_table]]
        combined_table = Table(table_data, colWidths=[9*cm, 9*cm])
        combined_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(combined_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_summary(self, payroll_record):
        """급여 요약 정보 생성"""
        elements = []
        
        # 실지급액 계산 정보
        summary_data = [
            ['급여 계산 요약', '', ''],
            ['총 지급액', f"{payroll_record.gross_pay:,.0f}원", '(A)'],
            ['총 공제액', f"{payroll_record.total_deductions:,.0f}원", '(B)'],
            ['실지급액', f"{payroll_record.net_pay:,.0f}원", '(A-B)']
        ]
        
        summary_table = Table(summary_data, colWidths=[6*cm, 4*cm, 2*cm])
        summary_table.setStyle(TableStyle([
            # 헤더 스타일
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('SPAN', (0, 0), (-1, 0)),
            
            # 실지급액 강조
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgreen),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            
            # 일반 데이터 스타일
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_work_info(self, payroll_record):
        """근무 정보 생성"""
        elements = []
        
        # 근무 정보 데이터
        work_data = [
            ['근무 정보', ''],
            ['근무일수', f"{payroll_record.work_days}일"],
            ['연장근무시간', f"{payroll_record.overtime_hours}시간"],
            ['야간근무시간', f"{payroll_record.night_hours}시간"],
            ['휴일근무시간', f"{payroll_record.holiday_hours}시간"],
            ['사용 연차', f"{payroll_record.annual_leave_used}일"],
            ['잔여 연차', f"{payroll_record.annual_leave_remaining}일"]
        ]
        
        work_table = Table(work_data, colWidths=[6*cm, 6*cm])
        work_table.setStyle(TableStyle([
            # 헤더 스타일
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightyellow),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('SPAN', (0, 0), (-1, 0)),
            
            # 데이터 스타일
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(work_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_footer(self, payroll_record):
        """푸터 생성"""
        elements = []
        
        # 메모가 있는 경우 추가
        if payroll_record.memo:
            memo_text = Paragraph(f"<b>메모:</b> {payroll_record.memo}", self.normal_style)
            elements.append(memo_text)
            elements.append(Spacer(1, 10))
        
        # 발행 정보
        issue_info = [
            f"발행일: {datetime.now().strftime('%Y년 %m월 %d일')}",
            f"발행처: HR 통합 관리 시스템",
            f"상태: {'확정' if payroll_record.is_final else '임시'}",
        ]
        
        for info in issue_info:
            info_text = Paragraph(info, self.right_style)
            elements.append(info_text)
        
        elements.append(Spacer(1, 20))
        
        # 주의사항
        notice_text = Paragraph(
            "<b>※ 주의사항</b><br/>"
            "• 본 급여명세서는 공식 문서입니다.<br/>"
            "• 급여 관련 문의사항은 인사팀으로 연락바랍니다.<br/>"
            "• 본 문서의 무단 복제 및 배포를 금지합니다.",
            self.normal_style
        )
        elements.append(notice_text)
        
        return elements
    
    def save_pdf_to_file(self, payroll_record, file_path):
        """PDF를 파일로 저장"""
        buffer = self.generate_payroll_pdf(payroll_record)
        
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return file_path

