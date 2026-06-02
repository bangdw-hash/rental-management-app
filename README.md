# 대관업무 관리 시스템

(재)아세아항공직업전문학교 대관업무 자동화 웹 시스템

---

## 구성

```
rental-management-app/
├── venue.html          공개 대관 안내 및 예약 요청 페이지
├── admin.html          관리자 페이지
├── css/style.css       전체 스타일
├── js/venue.js         공개 페이지 JavaScript
├── js/venue-admin.js   관리자 페이지 JavaScript
├── fonts/              KoPubWorld Dotum Bold/Medium/Light
└── gas/Code.gs         Google Apps Script 백엔드
```

---

## 배포 순서

### 1. Google 스프레드시트 생성

1. Google Drive에서 새 스프레드시트 생성
2. 스프레드시트 URL에서 ID 복사  
   예: `https://docs.google.com/spreadsheets/d/[여기가 ID]/edit`

### 2. Google Apps Script 배포

1. 스프레드시트 → 확장 프로그램 → Apps Script 열기
2. `gas/Code.gs` 파일 내용을 전부 붙여넣기
3. 코드 상단의 플레이스홀더 값 교체:
   ```javascript
   const SPREADSHEET_ID  = '여기에 스프레드시트 ID';
   const ADMIN_PASSWORD  = '원하는 비밀번호';
   const TELEGRAM_BOT_TOKEN = '텔레그램 봇 토큰';   // 선택
   const TELEGRAM_CHAT_ID   = '텔레그램 채팅 ID';   // 선택
   ```
4. 함수 선택 드롭다운에서 `initSheets` 선택 후 실행 (시트 초기 구성)
5. 배포 → 새 배포 → 웹 앱
   - 실행 사용자: **나**
   - 액세스 권한: **모든 사용자**
6. 배포 완료 후 표시되는 **웹 앱 URL** 복사

### 3. GitHub Pages 연결

1. `js/venue.js` 1행의 `GAS_URL` 교체:
   ```javascript
   const GAS_URL = '복사한 웹 앱 URL';
   ```
2. `js/venue-admin.js` 1행의 `GAS_URL` 동일하게 교체:
   ```javascript
   const GAS_URL = '복사한 웹 앱 URL';
   ```
3. GitHub 저장소 → Settings → Pages → Branch: `main` / `/(root)` 선택 → Save
4. 공개 URL 확인: `https://bangdw-hash.github.io/rental-management-app/`

---

## 페이지 안내

| 파일 | 용도 | 접근 권한 |
|------|------|-----------|
| `venue.html` | 표준 대관료 조회, 견적 생성, 예약 요청 | 공개 |
| `admin.html` | 예약 관리, 승인, 문서 발행, 설정 | 비밀번호 보호 |

---

## 주요 기능

### 공개 페이지 (venue.html)
- 건물별 시설 선택 및 표준 대관료 조회
- 3단계 위저드로 견적 계산 및 예약 요청
- 견적서 출력: 텍스트 전문 보기 / PDF 다운로드 / 이메일 발송
- 사업자등록증 첨부 (파일 업로드 / 텍스트 입력 / 생략 선택)
- 주말·공휴일·업무 외 시간 자동 할증 계산
- 전일 기준(6시간 이상) 자동 처리

### 관리자 페이지 (admin.html)
- **표준 대관료 관리**: 시설 추가·수정·비활성화, 인원별 단가 설정
- **예약 요청 현황**: 상태별 필터, 신속 승인/거절
- **공정 현황 칸반**: 7단계 워크플로 시각화
- **설정**: 발행처·담당자 정보, 할증률, 업무 시간, 알림 설정
- **리포트**: 기간별 건수·매출 통계, 시설별 현황

### 워크플로 상태
```
견적 발행 → 예약 요청 → 승인/거절 → 사용 중 → 사용 완료 → 계산서 발행 → 입금 완료
```

---

## 담당자 정보 (하드코딩)

| 항목 | 내용 |
|------|------|
| 발행처 | (재)아세아항공직업전문학교 |
| 이사장 | 전영숙 |
| 사업자번호 | 106-82-06370 |
| 법인번호 | 114222-0006574 |
| 주소 | 서울특별시 영등포구 당산로32길 16 |
| 계좌 | IBK기업 (재)아세아항공직업전문학교 025-049131-04-042 |
| 담당자 | 방시원 차장 010-2055-5883 bangsw@asea.or.kr |

---

## 글꼴

KoPubWorld Dotum 서체를 사용합니다 (한국출판인회의 배포).

| 굵기 | 용도 |
|------|------|
| Bold (700) | 제목, 총액 |
| Medium (500) | 본문, 라벨 |
| Light (300) | 주석, 각주 |

---

## 부가세 안내

본 시스템은 **부가세 면세** 사업장용으로 설정되어 있습니다.  
모든 견적·계산서에는 공급가액만 표기되며 부가세 항목은 표시되지 않습니다.
