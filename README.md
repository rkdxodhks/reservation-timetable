# 연구실 체험부스 실시간 예약 시스템 (2025)

이 프로젝트는 교내 행사 등에서 사용할 수 있는 연구실 체험 부스 예약 시스템입니다. React와 Supabase를 사용하여 실시간으로 예약 현황을 확인할 수 있습니다.

## ✨ 주요 기능

-   **실시간 예약 현황:** Supabase의 Realtime 기능을 사용하여 다른 사용자의 예약 현황이 실시간으로 업데이트됩니다.
-   **직관적인 UI:** 예약 가능한 시간, 부분적으로 예약된 시간, 예약이 마감된 시간, 나의 예약, 예약 불가 상태를 색상으로 구분하여 쉽게 파악할 수 있습니다.
-   **예약 제한 기능:** 한 학번당 전체 기간(오늘, 내일)에 걸쳐 최대 2회까지만 예약할 수 있습니다.
-   **간편한 예약 및 취소:** 시간표의 카드를 클릭하여 간단하게 예약하거나 취소할 수 있습니다.

## 🚀 시작하기

### 1. 프로젝트 복제

```bash
git clone https://github.com/rkdxodhks/reservation-timetable.git
cd reservation-timetable
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Supabase 환경 변수 설정

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고, 자신의 Supabase 프로젝트 정보를 입력합니다.

```
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **참고:** Supabase 프로젝트의 URL과 `anon` 키는 Supabase 대시보드의 `Settings` > `API` 메뉴에서 확인할 수 있습니다.

### 4. 애플리케이션 실행

```bash
npm start
```

브라우저에서 `http://localhost:3000` 주소로 접속하여 시스템을 확인할 수 있습니다.