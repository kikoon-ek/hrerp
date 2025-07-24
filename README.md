# HR 통합 관리 시스템

## 프로젝트 개요
완전한 기능을 갖춘 HR(인사) 통합 관리 시스템입니다. 인사, 급여, 근태, 성과관리를 통합하여 제공하는 엔터프라이즈급 웹 애플리케이션입니다.

## 기술 스택

### 백엔드
- **Framework**: Flask 3.0+
- **Database**: SQLAlchemy 2.0 + SQLite
- **Authentication**: JWT (PyJWT)
- **API**: RESTful API
- **PDF Generation**: ReportLab
- **Language**: Python 3.11+

### 프론트엔드
- **Framework**: React 18+ with Vite
- **Language**: JavaScript (ES6+)
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Routing**: React Router DOM
- **UI Components**: Lucide React (아이콘)
- **Charts**: Recharts
- **Styling**: Tailwind CSS

## 주요 기능

### 🔐 인증 및 권한 관리
- JWT 기반 로그인/로그아웃
- 관리자/사용자 권한 분리
- 자동 토큰 갱신
- 보안 세션 관리

### 👥 직원 및 부서 관리
- 직원 정보 CRUD
- 계층형 부서 구조
- 조직도 관리
- 직원 검색 및 필터링

### 📊 성과 평가 시스템
- 평가 기준 설정 및 관리
- 성과 평가 입력 및 승인
- 평가 결과 분석
- 평가 이력 관리

### 💰 성과급 및 급여 관리
- 성과급 정책 설정
- 자동 성과급 계산 및 분배
- 급여명세서 생성 및 관리
- PDF 급여명세서 다운로드

### ⏰ 출근 및 연차 관리
- 출퇴근 기록 관리
- 연차 부여 및 사용 관리
- 휴가 신청 워크플로우
- 근무시간 자동 계산

### 📈 대시보드 및 리포트
- 실시간 HR 통계 대시보드
- 차트 기반 데이터 시각화
- CSV/PDF 리포트 생성
- 기간별 데이터 분석

### 🔍 감사 및 로그
- 모든 시스템 활동 기록
- 사용자별 활동 추적
- 보안 감사 지원

## 시스템 구조

```
hr_system/
├── hr_backend/                 # Flask 백엔드
│   ├── src/
│   │   ├── models/            # 데이터베이스 모델
│   │   ├── routes/            # API 라우트
│   │   ├── utils/             # 유틸리티 함수
│   │   └── main.py           # 메인 애플리케이션
│   ├── venv/                  # Python 가상환경
│   └── requirements.txt       # Python 의존성
├── hr_frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── stores/           # Zustand 스토어
│   │   └── App.jsx           # 메인 앱 컴포넌트
│   ├── package.json          # Node.js 의존성
│   └── vite.config.js        # Vite 설정
└── README.md                 # 프로젝트 문서
```

## 설치 및 실행

### 백엔드 실행
```bash
cd hr_backend
source venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

### 프론트엔드 실행
```bash
cd hr_frontend
pnpm install
pnpm dev
```

## 접속 정보
- **백엔드 API**: http://localhost:5007
- **프론트엔드**: http://localhost:5175
- **관리자 계정**: admin / admin123

## 개발 현황
- **완료된 Phase**: 7/8 (87.5% 완료)
- **API 엔드포인트**: 80+ RESTful API
- **데이터베이스 테이블**: 30+ 테이블
- **React 컴포넌트**: 60+ 컴포넌트

## 라이센스
이 프로젝트는 개발 및 학습 목적으로 제작되었습니다.

## 개발자
HR System Development Team

---
*최종 업데이트: 2025년 7월 24일*

