import csv
import io
from datetime import datetime, date
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class ReportGenerator:
    """리포트 생성 유틸리티 클래스"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        # 한글 폰트 설정 (시스템에 설치된 폰트 사용)
        try:
            # 나눔고딕 폰트 등록 시도
            pdfmetrics.registerFont(TTFont('NanumGothic', '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'))
            self.korean_font = 'NanumGothic'
        except:
            # 폰트가 없으면 기본 폰트 사용
            self.korean_font = 'Helvetica'
        
        # 커스텀 스타일 생성
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontName=self.korean_font,
            fontSize=18,
            textColor=colors.black,
            alignment=TA_CENTER,
            spaceAfter=30
        )
        
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontName=self.korean_font,
            fontSize=14,
            textColor=colors.black,
            alignment=TA_LEFT,
            spaceBefore=20,
            spaceAfter=10
        )
        
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontName=self.korean_font,
            fontSize=10,
            textColor=colors.black,
            alignment=TA_LEFT
        )

    def generate_csv_report(self, data, report_type, period=None):
        """CSV 리포트 생성"""
        output = io.StringIO()
        
        if report_type == 'summary':
            return self._generate_summary_csv(data, output, period)
        elif report_type == 'attendance':
            return self._generate_attendance_csv(data, output, period)
        elif report_type == 'payroll':
            return self._generate_payroll_csv(data, output, period)
        elif report_type == 'evaluation':
            return self._generate_evaluation_csv(data, output, period)
        else:
            raise ValueError(f"지원하지 않는 리포트 타입: {report_type}")

    def generate_pdf_report(self, data, report_type, period=None):
        """PDF 리포트 생성"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch)
        story = []
        
        # 제목 추가
        title = f"HR 시스템 {self._get_report_title(report_type)}"
        if period:
            title += f" ({period})"
        story.append(Paragraph(title, self.title_style))
        story.append(Spacer(1, 20))
        
        # 생성 날짜 추가
        story.append(Paragraph(f"생성일: {datetime.now().strftime('%Y년 %m월 %d일 %H:%M')}", self.normal_style))
        story.append(Spacer(1, 20))
        
        if report_type == 'summary':
            self._add_summary_pdf_content(story, data)
        elif report_type == 'attendance':
            self._add_attendance_pdf_content(story, data)
        elif report_type == 'payroll':
            self._add_payroll_pdf_content(story, data)
        elif report_type == 'evaluation':
            self._add_evaluation_pdf_content(story, data)
        
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _generate_summary_csv(self, data, output, period):
        """종합 리포트 CSV 생성"""
        writer = csv.writer(output)
        
        # 헤더 정보
        writer.writerow(['HR 시스템 종합 리포트'])
        writer.writerow([f'기간: {period or "전체"}'])
        writer.writerow([f'생성일: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        writer.writerow([])
        
        # 직원 현황
        writer.writerow(['=== 직원 현황 ==='])
        writer.writerow(['항목', '값'])
        writer.writerow(['총 직원 수', f"{data.get('employee', {}).get('total_employees', 0)}명"])
        writer.writerow(['활성 직원 수', f"{data.get('employee', {}).get('active_employees', 0)}명"])
        writer.writerow(['부서 수', f"{data.get('employee', {}).get('departments', 0)}개"])
        writer.writerow([])
        
        # 출근 현황
        writer.writerow(['=== 출근 현황 ==='])
        writer.writerow(['항목', '값'])
        attendance = data.get('attendance', {})
        writer.writerow(['총 출근일', f"{attendance.get('total_days', 0)}일"])
        writer.writerow(['평균 근무시간', f"{attendance.get('avg_hours', 0)}시간"])
        writer.writerow(['지각 횟수', f"{attendance.get('late_days', 0)}회"])
        writer.writerow(['결근 횟수', f"{attendance.get('absent_days', 0)}회"])
        writer.writerow(['출근율', f"{attendance.get('attendance_rate', 0)}%"])
        writer.writerow([])
        
        # 급여 현황
        writer.writerow(['=== 급여 현황 ==='])
        writer.writerow(['항목', '값'])
        payroll = data.get('payroll', {})
        writer.writerow(['급여명세서 수', f"{payroll.get('total_payrolls', 0)}건"])
        writer.writerow(['총 지급액', f"{int(payroll.get('total_gross', 0)):,}원"])
        writer.writerow(['총 실지급액', f"{int(payroll.get('total_net', 0)):,}원"])
        writer.writerow(['평균 급여', f"{int(payroll.get('avg_net', 0)):,}원"])
        writer.writerow([])
        
        # 평가 현황
        writer.writerow(['=== 평가 현황 ==='])
        writer.writerow(['항목', '값'])
        evaluation = data.get('evaluation', {})
        writer.writerow(['총 평가 수', f"{evaluation.get('total_evaluations', 0)}건"])
        writer.writerow(['완료된 평가', f"{evaluation.get('completed', 0)}건"])
        writer.writerow(['완료율', f"{evaluation.get('completion_rate', 0)}%"])
        writer.writerow(['평균 점수', f"{evaluation.get('avg_score', 0)}점"])
        
        output.seek(0)
        return output.getvalue()

    def _add_summary_pdf_content(self, story, data):
        """종합 리포트 PDF 내용 추가"""
        # 직원 현황
        story.append(Paragraph("직원 현황", self.heading_style))
        employee_data = [
            ['항목', '값'],
            ['총 직원 수', f"{data.get('employee', {}).get('total_employees', 0)}명"],
            ['활성 직원 수', f"{data.get('employee', {}).get('active_employees', 0)}명"],
            ['부서 수', f"{data.get('employee', {}).get('departments', 0)}개"]
        ]
        employee_table = Table(employee_data, colWidths=[3*inch, 2*inch])
        employee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), self.korean_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(employee_table)
        story.append(Spacer(1, 20))
        
        # 출근 현황
        story.append(Paragraph("출근 현황", self.heading_style))
        attendance = data.get('attendance', {})
        attendance_data = [
            ['항목', '값'],
            ['총 출근일', f"{attendance.get('total_days', 0)}일"],
            ['평균 근무시간', f"{attendance.get('avg_hours', 0)}시간"],
            ['지각 횟수', f"{attendance.get('late_days', 0)}회"],
            ['결근 횟수', f"{attendance.get('absent_days', 0)}회"],
            ['출근율', f"{attendance.get('attendance_rate', 0)}%"]
        ]
        attendance_table = Table(attendance_data, colWidths=[3*inch, 2*inch])
        attendance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), self.korean_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(attendance_table)
        story.append(Spacer(1, 20))
        
        # 급여 현황
        story.append(Paragraph("급여 현황", self.heading_style))
        payroll = data.get('payroll', {})
        payroll_data = [
            ['항목', '값'],
            ['급여명세서 수', f"{payroll.get('total_payrolls', 0)}건"],
            ['총 지급액', f"{int(payroll.get('total_gross', 0)):,}원"],
            ['총 실지급액', f"{int(payroll.get('total_net', 0)):,}원"],
            ['평균 급여', f"{int(payroll.get('avg_net', 0)):,}원"]
        ]
        payroll_table = Table(payroll_data, colWidths=[3*inch, 2*inch])
        payroll_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), self.korean_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(payroll_table)
        story.append(Spacer(1, 20))
        
        # 평가 현황
        story.append(Paragraph("평가 현황", self.heading_style))
        evaluation = data.get('evaluation', {})
        evaluation_data = [
            ['항목', '값'],
            ['총 평가 수', f"{evaluation.get('total_evaluations', 0)}건"],
            ['완료된 평가', f"{evaluation.get('completed', 0)}건"],
            ['완료율', f"{evaluation.get('completion_rate', 0)}%"],
            ['평균 점수', f"{evaluation.get('avg_score', 0)}점"]
        ]
        evaluation_table = Table(evaluation_data, colWidths=[3*inch, 2*inch])
        evaluation_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), self.korean_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(evaluation_table)

    def _get_report_title(self, report_type):
        """리포트 타입별 제목 반환"""
        titles = {
            'summary': '종합 리포트',
            'attendance': '출근 현황 리포트',
            'payroll': '급여 현황 리포트',
            'evaluation': '평가 현황 리포트'
        }
        return titles.get(report_type, '리포트')

    def _generate_attendance_csv(self, data, output, period):
        """출근 현황 CSV 생성 (향후 확장용)"""
        writer = csv.writer(output)
        writer.writerow(['출근 현황 리포트'])
        writer.writerow([f'기간: {period or "전체"}'])
        writer.writerow([f'생성일: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        writer.writerow([])
        writer.writerow(['기능 구현 예정'])
        
        output.seek(0)
        return output.getvalue()

    def _generate_payroll_csv(self, data, output, period):
        """급여 현황 CSV 생성 (향후 확장용)"""
        writer = csv.writer(output)
        writer.writerow(['급여 현황 리포트'])
        writer.writerow([f'기간: {period or "전체"}'])
        writer.writerow([f'생성일: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        writer.writerow([])
        writer.writerow(['기능 구현 예정'])
        
        output.seek(0)
        return output.getvalue()

    def _generate_evaluation_csv(self, data, output, period):
        """평가 현황 CSV 생성 (향후 확장용)"""
        writer = csv.writer(output)
        writer.writerow(['평가 현황 리포트'])
        writer.writerow([f'기간: {period or "전체"}'])
        writer.writerow([f'생성일: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        writer.writerow([])
        writer.writerow(['기능 구현 예정'])
        
        output.seek(0)
        return output.getvalue()

    def _add_attendance_pdf_content(self, story, data):
        """출근 현황 PDF 내용 추가 (향후 확장용)"""
        story.append(Paragraph("출근 현황 상세 리포트", self.heading_style))
        story.append(Paragraph("기능 구현 예정", self.normal_style))

    def _add_payroll_pdf_content(self, story, data):
        """급여 현황 PDF 내용 추가 (향후 확장용)"""
        story.append(Paragraph("급여 현황 상세 리포트", self.heading_style))
        story.append(Paragraph("기능 구현 예정", self.normal_style))

    def _add_evaluation_pdf_content(self, story, data):
        """평가 현황 PDF 내용 추가 (향후 확장용)"""
        story.append(Paragraph("평가 현황 상세 리포트", self.heading_style))
        story.append(Paragraph("기능 구현 예정", self.normal_style))

