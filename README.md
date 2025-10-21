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

## ⚠️ Supabase 설정 유의사항

### 데이터베이스 테이블 구조

이 프로젝트를 실행하기 전에 Supabase에서 다음 테이블을 생성해야 합니다:

#### 1. `reservations` 테이블 생성

```sql
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(9) NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  auth_number VARCHAR(6) NOT NULL,
  lab_name VARCHAR(100) NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  reservation_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Row Level Security (RLS) 설정

```sql
-- RLS 활성화
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow read access for all users" ON reservations
  FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능
CREATE POLICY "Allow insert for all users" ON reservations
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 삭제 가능 (자신의 예약만)
CREATE POLICY "Allow delete for own reservations" ON reservations
  FOR DELETE USING (true);
```

#### 3. Realtime 기능 활성화

Supabase 대시보드에서 다음 설정을 확인하세요:

1. **Database** > **Replication** 메뉴로 이동
2. `reservations` 테이블의 Realtime 기능을 활성화
3. 또는 SQL로 실행:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
```

### 환경 변수 설정

`.env` 파일에 다음 변수들을 설정해야 합니다:

```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 중요 주의사항

1. **학번 형식**: 학번은 9자리 숫자로 입력되어야 합니다.
2. **인증번호**: 최소 4자리 이상의 숫자로 입력되어야 합니다.
3. **예약 제한**: 한 학번당 최대 2회까지만 예약 가능합니다.
4. **실시간 동기화**: 여러 사용자가 동시에 예약할 때 실시간으로 상태가 업데이트됩니다.
5. **데이터 무결성**: 중복 예약 방지를 위해 클라이언트와 서버 양쪽에서 검증이 이루어집니다.

### 문제 해결

- **연결 오류**: Supabase URL과 키가 올바른지 확인하세요.
- **실시간 업데이트 안됨**: Realtime 기능이 활성화되어 있는지 확인하세요.
- **예약 실패**: 학번과 인증번호 형식이 올바른지 확인하세요.

## 🔄 Supabase 비활성화 방지 (GitHub PING)

Supabase의 무료 플랜은 비활성 상태가 지속되면 프로젝트가 일시 중단될 수 있습니다. 이를 방지하기 위해 GitHub Actions를 사용하여 정기적으로 Supabase에 ping을 보낼 수 있습니다.

### GitHub PING 설정 방법

#### 1. GitHub Secrets 설정

GitHub 저장소의 `Settings` > `Secrets and variables` > `Actions`에서 다음 secrets를 추가하세요:

```
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

#### 2. GitHub Actions 워크플로우

프로젝트에 이미 `.github/workflows/ping-supabase.yml` 파일이 포함되어 있습니다. 이 워크플로우는:

- **자동 실행**: 매일 오전 9시 (UTC)에 실행
- **수동 실행**: 필요시 GitHub Actions 탭에서 수동 실행 가능
- **헬스체크**: Supabase REST API 엔드포인트에 ping 전송
- **로그 기록**: 실행 시간과 결과를 로그로 기록

#### 3. 워크플로우 활성화

1. GitHub 저장소의 `Actions` 탭으로 이동
2. `Ping Supabase to Prevent Inactivity` 워크플로우 클릭
3. `Enable workflow` 버튼 클릭하여 활성화

#### 4. 실행 확인

- 워크플로우가 정상적으로 실행되는지 확인
- `Actions` 탭에서 실행 로그 확인
- 실패 시 secrets 설정을 다시 확인

### PING의 효과

- **비활성화 방지**: 정기적인 ping으로 Supabase 프로젝트 활성 상태 유지
- **자동화**: 수동 개입 없이 자동으로 실행
- **비용 절약**: 무료 플랜에서 프로젝트 중단 방지
- **안정성**: 예약 시스템의 지속적인 가용성 보장

### 주의사항

- GitHub Actions는 월 2,000분까지 무료입니다.
- 매일 한 번 실행하므로 월 약 30분 정도 사용합니다.
- Supabase URL과 키가 올바르게 설정되어 있어야 합니다.