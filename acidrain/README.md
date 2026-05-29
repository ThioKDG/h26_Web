# 산성비 타자연습 (Acid Rain Typing Game)

위에서 떨어지는 단어를 바닥에 닿기 전에 입력해서 제거하는 캔버스 기반 한글 타자 연습 게임입니다. ES6 모듈로 책임을 분리해 한 영역을 수정해도 다른 영역에 영향이 거의 가지 않도록 설계되었습니다.

---

## 사용한 기술

| 영역 | 기술 |
|------|------|
| 마크업 | HTML5 |
| 스타일 | CSS3 (Custom Properties, Flexbox, Grid, Keyframe Animation, Backdrop Filter) |
| 렌더링 | HTML5 Canvas API (2D Context) |
| 로직 | Vanilla JavaScript (ES6+ Modules, Class) |
| 데이터 저장 | `localStorage` (랭킹, 커스텀 단어, 모드 설정) |
| 폰트 | Google Fonts — Noto Sans KR, Orbitron |
| 빌드 도구 | 없음 — 정적 파일을 브라우저가 직접 모듈로 로드 |

---

## 프로젝트 구조

```
acidrain/
├── index.html              # 진입 HTML
├── style.css               # 전체 스타일
├── data/
│   └── words.json          # 기본 단어 풀 (easy / medium / hard)
└── js/
    ├── main.js             # 진입점: words.json 로드 후 Game 생성
    ├── game.js             # 게임 허브 (상태 관리 + 게임 루프)
    ├── spawner.js          # 단어 생성 (위치, 속도, 풀 선택)
    ├── word.js             # WordDrop 클래스 (단어 한 개의 상태/렌더)
    ├── input.js            # 키보드 입력과 단어 매칭
    ├── renderer.js         # Canvas 그리기 전담
    ├── ui.js               # DOM HUD 갱신
    ├── ranking.js          # 로컬 TOP 10 랭킹 (모드별 분리)
    ├── customWords.js      # 사용자 정의 단어 저장/조회
    └── wordEditor.js       # 단어 관리 모달 UI
```

---

## 각 모듈의 책임

### `main.js` — 진입점
- `data/words.json`을 fetch
- 실패 시 내장 fallback 단어 사용
- `new Game(wordData).init()` 호출

### `game.js` — 게임 허브
- 다른 모듈들을 조립하고 콜백으로 연결
- 5가지 상태를 가진 상태 머신 관리: `idle → playing → (paused) → naming → gameover`
- `requestAnimationFrame` 기반 게임 루프 (`_update` + `_draw`)
- 점수/콤보/HP/레벨/통계 계산
- 파워업 효과 발동 (`_triggerPowerUp`)
- 크레이지 모드 토글 + 게임 중 토글 시도 시 속도 가속 패널티

### `spawner.js` — 단어 생성기
- 시간을 누적해서 일정 주기마다 새 단어 반환
- 레벨에 따라 단어 풀 변화 (easy → medium → hard)
- 크레이지 모드: 4글자 이상 풀만 사용 + 30% 빠른 생성 + 50% 빠른 낙하
- `boostDifficulty()`: 게임 중 토글 패널티 (1.25배씩 누적, 최대 3배)
- 5% 확률로 파워업 단어(`freeze` / `bomb` / `heal`) 생성

### `word.js` — 떨어지는 단어
- 위치, 속도, 매칭 하이라이트 상태 관리
- 자기 자신을 캔버스에 그리는 `draw(ctx)` 메서드 보유
- 위험 구간(바닥 75% 이하)에 도달하면 빨간색으로 색 변환
- 입력된 글자(초록)와 남은 글자(흰)를 분리해서 렌더링
- 파워업 단어는 펄스 글로우 + 아이콘으로 시각적 구분

### `input.js` — 입력 처리
- HTML `<input>` 요소에 붙어 입력/포커스/IME 이벤트 처리
- `checkWords(words)`: 매 프레임 호출되어 입력값과 단어 매칭
- 완전 일치 시 `onMatch(word)` 콜백 발동
- 한국어 IME(`compositionend`) 대응
- 포커스 잃으면 자동 재포커스

### `renderer.js` — 캔버스 렌더링
- 배경 그라디언트 (HP 낮을수록 붉어짐)
- 빗방울 파티클 80개 애니메이션
- 단어 그리기, 매칭 플래시 효과
- 화면 오버레이: 시작 / 일시정지 / 이름입력 / 게임오버 / 시간정지
- TOP 10 랭킹 패널 (모드별 색상 차별화)

### `ui.js` — DOM HUD
- 상단 HUD (점수 / HP 바 / 레벨) 갱신
- 콤보 표시 (중앙 큰 글자)
- 메시지 토스트 (`info` / `danger` / `levelup`)
- HP 감소 시 화면 흔들림 효과(`screen-shake` 클래스)

### `ranking.js` — 로컬 랭킹
- 모드별로 localStorage 키 분리:
  - `acidrain_ranking_v1` — 일반 모드
  - `acidrain_ranking_crazy_v1` — 크레이지 모드
- TOP 10 유지, 점수 순 정렬
- 이름 / 점수 / 레벨 / 날짜 저장

### `customWords.js` + `wordEditor.js` — 사용자 단어 관리
- `customWords.js`: localStorage CRUD + 기본 단어와 병합하는 `mergeWithDefaults`
- `wordEditor.js`: 모달 UI 컨트롤러 (난이도별 추가/삭제, 중복/공백/길이 검증)
- 추가/삭제 즉시 spawner의 단어 풀에 반영 (`onWordsChanged` 콜백)

---

## 게임 흐름

### 상태 머신

```
        ┌──────┐    타이핑 시작      ┌──────────┐
        │ idle │ ─────────────────→ │ playing  │
        └──┬───┘                    └─────┬────┘
           ↑                               │
           │ 새 게임                  ESC ↕ │ HP=0
           │                               ↓
           │                        ┌──────────┐
           │                        │  paused  │
           │                        └──────────┘
           │                               
           │                               ↓ 점수 ≥ TOP10
           │                        ┌──────────┐
           │                        │  naming  │ 이름 입력 + Enter
           │                        └─────┬────┘
           │                               ↓
           │   다시 시작 클릭         ┌──────────┐
           └────────────────────────│ gameover │
                                    └──────────┘
```

### 핵심 데이터 흐름

```
[사용자 타이핑]
      ↓
InputHandler.currentValue 갱신
      ↓
매 프레임 Game._update() → input.checkWords(words)
      ↓
각 WordDrop.updateHighlight() → 시각적 하이라이트
      ↓
완전 일치 시 onMatch → Game._onWordMatched() (또는 파워업이면 _triggerPowerUp)
      ↓
점수/콤보/통계 갱신, 플래시 이펙트 등록
      ↓
Renderer가 다음 프레임에서 화면에 그림
```

### 한 프레임의 실행 순서 (`requestAnimationFrame` 기반)

```
loop(timestamp):
  delta = timestamp - lastTime
  
  _update(delta):
    1. spawner.update(delta, level)  → 새 단어 생성 (시간정지 중이면 건너뜀)
    2. 각 단어 word.update()           → 낙하 또는 페이드 아웃
    3. 죽은 단어 제거, 바닥 도달 단어 → _onWordMissed
    4. 플래시 이펙트 수명 감소
    5. input.checkWords()             → 매 프레임 매칭 검사
  
  _draw():
    1. 배경 그라디언트 (HP에 따라 색상 변화)
    2. 빗방울 파티클
    3. 단어들
    4. 시간정지 오버레이 (활성 시)
    5. 매칭 플래시
    6. 상태별 오버레이 (start / pause / naming / gameover)
```

---

## 주요 게임 기능

| 기능 | 설명 |
|------|------|
| **레벨 시스템** | 점수 800점마다 자동 레벨업, 단어 풀과 낙하 속도가 어려워짐 |
| **콤보 보너스** | 연속 정답 시 최대 5배까지 점수 가산 |
| **HP 시스템** | 단어 놓치면 HP -1, 0이 되면 게임오버 (최대 5) |
| **크레이지 모드** | 4글자 이상 단어 + 50% 가속. 게임 중 토글 시도하면 속도 패널티 누적 |
| **파워업 단어** | 5% 확률로 등장 — 시간정지(3초), 폭탄(전부 제거), 회복(HP+1) |
| **TOP 10 랭킹** | 모드별 분리 저장, 신기록 달성 시 이름 입력 화면 등장 |
| **게임 통계** | 게임오버 시 WPM, 정확도, 평균 반응 시간 표시 |
| **사용자 단어 추가** | 모달에서 본인이 원하는 단어를 난이도별로 추가/삭제 가능 |
| **일시정지** | ESC 키 |
| **반응형** | 창 크기 변경 시 캔버스 자동 리사이즈 |

---

## 점수 / WPM 계산 공식

### 점수
```
gained = word.length × min(combo, 5) × 10
```
- 단어 길이가 길수록, 콤보가 높을수록 많은 점수
- 콤보는 최대 5배까지만 (점수↑→레벨↑→점수↑ 피드백 루프 방지)

### WPM (Words Per Minute) — 표준 공식
```
WPM = (matchedChars / 5) / minutes
```
- 단어 길이의 평균이 5글자라는 가정에 기반한 국제 표준
- 영문 기준이지만 한글 타자 연습에도 일반적으로 사용

### 정확도
```
accuracy = (matchedWords / (matchedWords + missedWords)) × 100
```

---

## localStorage 스키마

| 키 | 형식 | 용도 |
|----|------|------|
| `acidrain_ranking_v1` | `[{name, score, level, date}]` | 일반 모드 TOP 10 |
| `acidrain_ranking_crazy_v1` | 동일 | 크레이지 모드 TOP 10 |
| `acidrain_custom_words_v1` | `{easy: [...], medium: [...], hard: [...]}` | 사용자 추가 단어 |
| `acidrain_crazy` | `"0"` 또는 `"1"` | 크레이지 모드 ON/OFF 상태 |

키 끝의 `_v1`은 미래에 데이터 스키마가 변경되어도 이전 버전과 호환성 단절을 명확히 표현할 수 있게 한 버전 마커입니다.

---

## 실행 방법

이 프로젝트는 빌드 도구가 없는 **순수 정적 사이트**라서 GitHub Pages로 바로 배포 가능합니다. ES Modules를 사용하므로 반드시 HTTP 프로토콜로 열어야 합니다 (`file://`에서는 브라우저 보안 정책 때문에 모듈 import가 차단됨).

### 1. GitHub Pages 배포 (공유/발표용)

#### 옵션 A — acidrain 폴더만 단독 레포지토리로 푸시 (권장)

URL이 짧고 깔끔합니다.

1. acidrain 폴더로 이동 후 git 초기화:
   ```bash
   cd project/game/acidrain
   git init
   git add .
   git commit -m "Initial commit: 산성비 타자연습"
   ```

2. GitHub에서 새 레포지토리 생성 (예: `acidrain-typing`).
   - **Public** 으로 만들어야 GitHub Pages 무료 사용 가능
   - README/`.gitignore` 등 자동 생성 옵션은 해제 (이미 있음)

3. 원격 연결 후 푸시:
   ```bash
   git remote add origin https://github.com/<your-username>/acidrain-typing.git
   git branch -M main
   git push -u origin main
   ```

4. GitHub 레포 페이지 → `Settings` → `Pages` 메뉴에서:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
   - `Save` 클릭

5. 1 ~ 2분 후 다음 주소에서 접속 가능:
   ```
   https://<your-username>.github.io/acidrain-typing/
   ```

#### 옵션 B — workspace 전체와 함께 푸시

다른 프로젝트도 같이 관리하는 경우. URL이 폴더 경로를 따라갑니다:
```
https://<your-username>.github.io/<repo-name>/project/game/acidrain/
```

### 2. 로컬 개발 (개발/디버그용)

VS Code의 **Live Server** 확장을 사용해 빠르게 테스트:
1. `index.html` 우클릭 → `Open with Live Server`
2. `http://127.0.0.1:5500/...` 에서 자동 실행 + 파일 저장 시 자동 새로고침

### 배포 후 갱신할 때

코드를 수정하고 새 버전을 GitHub Pages에 반영하려면:
```bash
git add .
git commit -m "Update: <변경 내용 요약>"
git push
```

푸시 후 1~2분 안에 자동 빌드 / 배포됩니다. 변경이 즉시 안 보이면 **브라우저 강력 새로고침**(`Ctrl+Shift+R`)으로 캐시를 비우세요.

### 주의 사항

- 단어 풀(`data/words.json`)이나 코드를 푸시 후 갱신하면 GitHub의 CDN 캐시 때문에 잠시 동안 옛 버전이 보일 수 있습니다.
- **localStorage 데이터는 도메인 단위로 저장**되므로, GitHub Pages URL과 로컬 개발 URL의 랭킹/커스텀 단어는 서로 격리됩니다. 즉 로컬에서 만든 기록이 배포본에 나타나지 않고, 그 반대도 마찬가지입니다.

---

## 설계 결정 (왜 이렇게 만들었나)

### 1. 모듈 분리 (Separation of Concerns)
각 파일이 명확한 단일 책임을 가지도록 설계.
- 렌더링 변경 → `renderer.js` 만 수정
- 단어 풀 정책 변경 → `spawner.js` 만 수정
- 저장 방식 변경 → `ranking.js` 만 수정

→ 한 영역을 수정해도 다른 영역에 영향이 거의 없는 유지보수성.

### 2. 이벤트 + 게임 루프 이중 처리
- **이벤트 기반(input.js)**: 사용자 입력은 즉시 캡처해서 `currentValue` 변수에 저장
- **루프 기반(game.js)**: 매 프레임마다 `currentValue`로 단어 매칭 검사

이렇게 분리한 이유는 입력 이벤트 안에서 매칭을 검사하면 한국어 IME 조합 중에 매칭이 잘못 발동할 수 있기 때문. 매 프레임 검사 방식으로 통일해서 IME와 충돌하지 않게 함.

### 3. Canvas + DOM 혼합 구성
- 게임 화면(단어, 배경, 빗방울) → **Canvas** (자유로운 그래픽 표현)
- HUD, 입력창, 모달 → **DOM** (폼 입력과 접근성)

각 영역의 강점을 살려 둘을 섞었습니다.

### 4. localStorage 영속화
서버 없이도 랭킹과 사용자 데이터가 유지되도록 모든 영속 데이터를 localStorage에 저장. 키는 모드별로 분리되어 서로 영향이 없고, 버전 마커(`_v1`)로 스키마 변경 대비.

### 5. 상태 머신 명시화
`state.status`라는 단일 변수로 게임의 모든 상태를 관리. 어떤 상태에서 어떤 입력이 처리되는지 코드 한 곳에서 파악 가능 (예: 토글 클릭 핸들러는 `status === 'playing'` 일 때만 패널티 부여).

---

## 향후 개선 방향

- 사운드 효과 (Web Audio API)
- 백엔드 연동 글로벌 랭킹 (Node.js + MySQL/PostgreSQL)
- 모바일 가상 키보드 최적화
- 단어 카테고리 선택 (코딩 용어, 영어 단어 등)
- 다국어 지원
- 학습 곡선 분석 (게임 결과 누적 통계)
