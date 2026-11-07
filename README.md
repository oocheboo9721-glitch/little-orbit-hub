# 작은 궤도 · Little Orbit

바이브 코딩으로 만든 웹앱을 모으는 개인 허브. 일기장은 소유자 전용 로그인 방식으로 전환 중입니다. 첫 번째 앱은 **나만의 일기장 · 하루의 조각**입니다.

- 허브: 앱 링크 추가·수정·삭제, 분류·검색, 즐겨찾기. 브라우저에만 저장.
- 일기장: 날짜별 작성·수정·삭제, 5가지 기분, 검색·월별 필터, 통계, 전체 JSON 백업.
- 기본 모드: 프론트엔드만으로 작동하는 localStorage 저장.
- 클라우드 모드: Firebase 설정 후 Google 로그인 + 본인 UID 하위 Firestore 문서.
- 로컬 데이터는 자동으로 클라우드에 업로드하지 않습니다.
- 한국어 반응형 UI. 별도 앱 서버·런타임 패키지 설치 없이 GitHub Pages에서 실행.

## 현재 Firebase 상태

**클라이언트 연동 코드와 보안 규칙은 구현·에뮬레이터 검증됐지만, 관리 계정 인증 전이므로 실제 프로젝트 생성과 Google 로그인 활성화는 완료되지 않았습니다.**
설정이 없으면 로그인 확인 화면에서 모든 일기 기능을 잠급니다. 기존 localStorage 기록은 보존하지만 화면에 표시하지 않습니다. 아래 절차로 연결 후 실제 배포 도메인에서 로그인을 확인하세요.

## 소유자 한 명만 허용

로그인 확인 화면은 검증된 소유자만 일기 앱을 실행합니다. Firestore는 `privateAccess/owner` 문서의 `uid`와 로그인 UID가 같고 이메일 인증된 Google 계정이어야 접근을 허용합니다. 이 문서는 앱에서 생성·수정·삭제할 수 없습니다. 다른 Google 계정은 자신의 UID 경로에도 일기를 만들 수 없습니다.

Firebase를 연결한 뒤 Authentication에서 본인 Google 로그인을 한 번 완료하고 해당 사용자의 UID를 확인하세요. 프로젝트 관리자 권한의 Firestore Console에서 `privateAccess` 컬렉션의 `owner` 문서를 만들고 문자열 필드 `uid`에 해당 UID를 넣으세요. 최초 로그인에서 권한 없음이 표시되는 것은 owner 등록 전의 정상 동작입니다. 이메일을 공개 코드에 넣거나 가입 순서로 소유자를 정하지 않습니다.

GitHub Pages의 소스·화면은 공개입니다. 로컬 저장소 자체는 암호화하지 않으므로 같은 기기의 개발자 도구나 파일 접근까지 막는 기능은 아닙니다. 기밀 기록은 공용 기기에 보관하지 마세요. 클라우드 접근 제한은 프론트 화면 숨김과 별개로 서버 보안 규칙이 강제합니다.

## 로컬 실행

Node.js 22 이상, Python 3:

```sh
npm test
npm run build
npm start
```

http://127.0.0.1:8000 에 접속하세요. Python 서버는 정적 파일 제공용이며 일기 백엔드가 아닙니다.

## Firebase 새 프로젝트 연결

관리 계정 로그인이 필요합니다. 로그인·서비스 계정 키·토큰을 소스나 이슈에 올리지 마세요.

```sh
npx -y firebase-tools@latest login
node scripts/firebase-setup.mjs YOUR_UNIQUE_PROJECT_ID YOUR_ACCOUNT.github.io YOUR_SUPPORT_EMAIL
```

스크립트는 새 Firebase 프로젝트, 서울(`asia-northeast3`) Standard Firestore, Web 앱을 만들고 Google 로그인·규칙을 배포합니다. Standard edition용 Web SDK를 사용합니다. 기존 프로젝트에 실행하지 마세요. 중간 실패 시 이미 생성된 프로젝트를 확인하고 해당 단계부터 복구하세요. 전체 스크립트를 반복하면 이미 존재하는 프로젝트 생성 단계에서 중단됩니다. Firebase 할당량·프로젝트 생성 권한과 제공자 설정에 따라 콘솔에서 OAuth 설정이 필요할 수 있습니다. 유료 플랜을 자동 활성화하지 않습니다.

`assets/firebase-config.js`에는 공개 Web 설정 네 항목만 기록합니다. `firebase.local.json`은 지원 이메일이 들어가므로 Git에서 제외됩니다. 생성 후 로그인 도메인 목록에 **정확한 GitHub Pages 호스트**가 있는지 확인하세요. 개발용 localhost는 필요할 때만 추가하세요.

그 후 공개 설정 파일을 커밋하거나 GitHub Actions 변수 `FIREBASE_WEB_CONFIG`에 다음 네 필드로 된 JSON을 저장하세요: `apiKey`, `authDomain`, `projectId`, `appId`. Web API key는 클라이언트에 공개되는 프로젝트 식별 설정이며 관리자 시크릿이 아닙니다. Firestore 규칙이 데이터 접근을 제한합니다. 설정은 `npm run build`에서 검증됩니다.

다른 에디션의 기존 DB를 사용할 경우 먼저 `npx -y firebase-tools@latest firestore:databases:list --project PROJECT_ID`와 `firestore:databases:get`으로 에디션을 확인하고 SDK·쿼리를 맞춰야 합니다.

## GitHub Pages

이 저장소의 **Settings → Pages → Source: GitHub Actions**를 선택하세요. `main`에 푸시하면 `.github/workflows/pages.yml`이 테스트·빌드 후 `dist/`만 게시합니다. Firebase 관리자 키는 Actions에 넣지 않습니다. 워크플로는 공식 Actions를 커밋 SHA로 고정하며, 배포 작업에만 Pages 쓰기 권한을 부여합니다.

## 보안 검증

`SECURITY.md`에 검토 결과와 제한을 기록했습니다.

로컬 테스트: `npm test` (저장·중복·수정·삭제·잘못된 입력·저장 실패·XSS 출력·위험 URL).

규칙 검증은 개발용 임시 폴더에 의존성을 설치해 실행할 수 있습니다:

```sh
npm install --prefix ./work/rules-test --no-audit --no-fund @firebase/rules-unit-testing@5.0.0 firebase@12.5.0
RULE_TEST_PACKAGE="$PWD/work/rules-test/package.json" npx -y firebase-tools@latest emulators:exec --only firestore --project demo-little-orbit "node --test tests/firestore.rules.mjs"
```

Java 21 이상이 필요합니다. 실서비스 자격증명 없이 데모 프로젝트 에뮬레이터에서 테스트합니다.

## 데이터와 제한

일기는 민감한 정보를 포함할 수 있습니다. 브라우저 저장소·JSON 파일은 암호화 금고가 아닙니다. 공용 기기 사용을 피하세요. Firestore도 종단간 암호화를 제공하지 않으며 프로젝트 관리자는 관리 권한으로 접근할 수 있습니다.

하루 한 편, 제목 120자·본문 20,000자 제한. 기존 일기의 날짜는 변경할 수 없습니다. 클라우드는 200편씩 읽고 ‘이전 일기 더 불러오기’로 추가 조회합니다. 검색·통계는 읽어온 기록 기준, JSON 백업은 전체 기록을 조회합니다. JSON 가져오기는 제공하지 않습니다. 허브 카탈로그는 브라우저별로 분리되며 공개 프로젝트 목록을 늘리려면 `assets/hub.js`의 기본 카탈로그를 수정하세요.

## 교사의 별자리

등록 API 안내를 공개 HTTP로 읽고 클라이언트를 검토했습니다. 실제 공개 URL의 HTTP 응답을 확인한 뒤 허브 이름·소개·주소·분류·문양만 제출합니다. 개인 일기·앱 목록·로그인 정보는 제출하지 않습니다. 접수는 게시 완료와 구분해 보고합니다.
