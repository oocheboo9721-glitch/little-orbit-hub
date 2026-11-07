# 공개 전 보안·개인정보 검토

검토일: 2026-11-07. 대상: 정적 허브·일기 클라이언트, Firebase 규칙, Pages workflow.

## 결과

- 개인 일기·기존 SQLite 파일·백업·로그·관리자 키를 프로젝트에 복사하지 않았습니다.
- Git 제외 규칙으로 DB·자격증명·로컬 설정·환경 파일·에뮬레이터 로그를 제외합니다.
- 사용자 입력은 HTML escaping 또는 textContent로 표시합니다. 외부 앱 URL은 HTTPS만 허용하고 인증 정보·별도 포트를 거절합니다. 새 탭에 noopener/noreferrer를 사용합니다.
- CSP로 inline script/eval/object를 차단합니다. 허브는 네트워크 연결을 요청하지 않고, 일기장은 클라우드 모드에서만 Firebase SDK를 동적 로드합니다. 추적·광고·분석 SDK를 넣지 않았습니다.
- Firebase Web 설정 네 항목만 클라이언트에 사용합니다. 서비스 계정·OAuth secret을 번들에 넣는 방식은 사용하지 않습니다.
- 로그인은 탭 세션 지속성, Firestore는 메모리 캐시입니다. 로그아웃·계정 전환 시 이전 계정 화면과 데이터 참조를 비우고 진행 중 백업의 다운로드를 중단합니다.
- 본인 UID 경로 + Google 제공자 인증에만 Firestore 접근을 허용합니다. 생성·수정 모두 같은 필드·형식·크기 validator를 통과해야 합니다. 수정 시 생성 시각과 날짜를 고정하고 수정 시각은 서버 시각을 요구합니다.
- 읽기 쿼리는 본인 경로에서 최대 200개씩 조회합니다. 앱의 실제 orderBy(date desc) + limit + cursor 패턴이 규칙 테스트를 통과했습니다.
- 본문·제목 인덱싱을 제외합니다. 부모 프로필 문서는 저장하지 않고, 경로의 UID를 소유권으로 삼습니다. 부모 문서가 없어도 본인 일기만 접근하는 것은 의도된 설계입니다.
- Pages는 dist만 배포합니다. CI Actions는 SHA로 고정, 기본 contents:read, 배포 작업에만 pages:write/id-token:write입니다.

## 검증 기록

- Node 기능 테스트: 5개 통과.
- Firestore Standard 에뮬레이터 규칙 컴파일 및 테스트: 9개 통과.
- 공격 검증: 비로그인 목록/문서 조회 차단, 타인 get/create/update/delete 차단, 익명 제공자 차단, 과대 입력의 create/update 차단, 필드 삭제·타입 변조·알 수 없는 필드 차단, 소유권 필드/관리자 역할 추가 차단, 생성 시각 변조 차단, 과거 수정 시각 차단, 문서 ID와 날짜 불일치 차단, 무제한/200 초과 조회 차단, 알 수 없는 하위 경로 차단.
- 역할·상태 전이·카운터·사용자 지정 Storage 경로는 존재하지 않아 관련 권한 상승·카운터 재실행·Storage 경로 공격의 대상이 없습니다.
- 실제 Firebase 원격 프로젝트·Google OAuth 로그인은 관리 계정 인증 전이라 검증하지 못했습니다.
- 브라우저 제어 도구(cua_repl.js)가 이 세션에 제공되지 않아 실브라우저 레이아웃·상호작용 검증은 하지 못했습니다. JS 구문·정적 링크·빌드 및 기능/규칙 단위 검증과는 구분합니다.

## 남은 운영 제한

보안 규칙이 모든 공격을 보장하지는 않습니다. 인증한 사용자는 자신의 경로에 여러 문서를 만들어 무료 할당량을 사용할 수 있습니다. 대규모 공개 전 App Check·할당량 감시·필요한 남용 방지를 검토해야 합니다. App Check는 Google 로그인이나 UID 기반 규칙을 대체하지 않습니다.

로컬 저장과 백업은 평문이며 Firestore는 종단간 암호화가 아닙니다. 공용 기기 및 학생·타인의 개인정보 저장에 적합한 별도 보호 정책은 구현하지 않았습니다. CDN SDK·GitHub Pages·Google 서비스의 가용성과 운영 정책에 의존합니다. HTTP 응답 헤더 설정에 제한이 있는 Pages 특성상 CSP는 meta로 제공하며 frame-ancestors 헤더는 구성하지 않았습니다.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for private diary entries by restricting access to the authenticated Google user's UID path, validating creates and updates, and rejecting unexpected fields and oversized content. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Structured audit assessment

```json
{
  "score": 4,
  "summary": "Tested private-diary prototype: ownership and create/update validation passed emulator tests. Live project provisioning and real OAuth login remain unverified.",
  "findings": [
    {
      "check": "Resource exhaustion / authenticated-user abuse",
      "severity": "minor",
      "issue": "Document size and query limits are enforced, but the number of documents an authenticated owner can create is not rate-limited.",
      "recommendation": "Before broad public use, add appropriate App Check enforcement and quota monitoring; use trusted server-side rate limits if stronger abuse resistance is required."
    }
  ]
}
```


## 소유자 전용 변경

일기장은 초기 HTML부터 잠금 상태이며 Firebase 미설정·로그아웃·오류 시 일기 앱을 실행하지 않습니다. 기존 기기 기록은 자동 업로드하거나 삭제하지 않습니다. 이는 로컬 저장소 암호화가 아니므로 같은 기기의 개발자 도구 접근을 차단하지는 않습니다.

서버 규칙은 관리자가 생성한 privateAccess/owner.uid, 검증된 이메일, Google 제공자, 일기 경로 UID가 모두 일치할 때만 접근을 허용합니다. owner 문서의 모든 클라이언트 쓰기와 목록 조회를 차단했습니다. 본인 외 Google 사용자의 자기 경로 접근, owner 탈취, 이메일 미인증, owner 누락을 추가 검증합니다. 실제 Firebase 배포·관리자 owner 등록은 관리 인증 대기 중입니다.
