// js/game.js
// 게임 루프 및 상태 관리 허브

import { Spawner } from './spawner.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { loadRanking, isHighScore, addEntry } from './ranking.js';

const MAX_HP = 5;
const SCORE_PER_LEVEL = 800;

export class Game {
  constructor(wordData) {
    this.wordData = wordData;

    // DOM 요소
    this.canvas = document.getElementById('game-canvas');
    this.inputEl = document.getElementById('word-input');
    this.restartBtn = document.getElementById('restart-btn');
    this.crazyToggleBtn = document.getElementById('crazy-toggle');

    // 크레이지 모드 (localStorage에서 상태 복원)
    this.crazyMode = localStorage.getItem('acidrain_crazy') === '1';

    // 현재 모드 문자열 헬퍼
    this._modeKey = () => (this.crazyMode ? 'crazy' : 'normal');

    // 게임 상태
    this.state = {
      status: 'idle',  // 'idle' | 'playing' | 'paused' | 'naming' | 'gameover'
      words: [],
      score: 0,
      hp: MAX_HP,
      level: 1,
      combo: 0,
      newRankIndex: -1,  // 방금 등록된 랭킹 인덱스 (하이라이트용)
    };

    // 랭킹 데이터 (현재 모드 기준으로 로드)
    this.ranking = loadRanking(this.crazyMode ? 'crazy' : 'normal');

    // 타이밍
    this._lastTime = null;
    this._animFrameId = null;

    // 플래시 이펙트 큐
    this._flashes = [];

    // 모듈 초기화
    this.renderer = new Renderer(this.canvas);
    this.spawner = new Spawner(wordData, this.canvas);
    this.input = new InputHandler(this.inputEl);
    this.ui = new UI();

    this._bindCallbacks();
    this._bindEvents();
  }

  init() {
    this.renderer.resize();
    this._startLoop();

    // 크레이지 모드 초기 상태 반영
    this._applyCrazyMode();

    // 시작 화면 표시
    this.state.status = 'idle';
  }

  // ─── 크레이지 모드 ─────────────────────────────────────
  toggleCrazyMode() {
    this.crazyMode = !this.crazyMode;
    localStorage.setItem('acidrain_crazy', this.crazyMode ? '1' : '0');
    this._applyCrazyMode();
    this.ui.showMessage(
      this.crazyMode ? '🌈 크레이지 모드 ON!' : '크레이지 모드 OFF',
      this.crazyMode ? 'levelup' : 'info'
    );
  }

  _applyCrazyMode() {
    // body 클래스 토글 → CSS 무지개 애니메이션 활성화
    document.body.classList.toggle('crazy-mode', this.crazyMode);

    // 버튼 표시 갱신
    if (this.crazyToggleBtn) {
      this.crazyToggleBtn.setAttribute('aria-pressed', this.crazyMode ? 'true' : 'false');
      const label = this.crazyToggleBtn.querySelector('.crazy-label');
      if (label) label.textContent = `크레이지 모드: ${this.crazyMode ? 'ON' : 'OFF'}`;
    }

    // Spawner에 모드 전달
    this.spawner.setCrazyMode(this.crazyMode);

    // 모드 전환 시 해당 모드의 랭킹을 다시 로드
    this.ranking = loadRanking(this._modeKey());
    // 새 랭킹 로드 시 이전 게임의 하이라이트는 무효화
    this.state.newRankIndex = -1;
  }

  start() {
    if (this.state.status === 'playing') return;

    this.state = {
      status: 'playing',
      words: [],
      score: 0,
      hp: MAX_HP,
      level: 1,
      combo: 0,
      newRankIndex: -1,
    };

    this.spawner.start();
    this.input.enable();
    this.inputEl.placeholder = '단어를 입력하세요';
    this.ui.update({ score: 0, hp: MAX_HP, maxHp: MAX_HP, level: 1 });
  }

  restart() {
    if (this.restartBtn) this.restartBtn.style.display = 'none';
    this.start();
  }

  // ─── 콜백 연결 ───────────────────────────────────────────
  _bindCallbacks() {
    // 단어 완전 일치
    this.input.onMatch = (word) => {
      word.startDying();
      this._onWordMatched(word);
    };

    // 타이핑 중 → currentValue만 갱신 (하이라이트는 게임 루프 _update에서 처리)
    this.input.onType = (value) => {
      // 게임 루프(_update)에서 매 프레임 checkWords를 호출하므로 여기선 아무것도 안 함
    };

    // 첫 타이핑 → 게임 시작 (naming 상태에서는 무시 — 이름 입력 중)
    this.input.onStart = () => {
      if (this.state.status === 'naming') return;
      this.start();
      this.input.enable();
      // 현재 입력한 글자도 반영
      this.input.currentValue = this.inputEl.value;
    };
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.renderer.resize());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state.status === 'playing') this._pause();
        else if (this.state.status === 'paused') this._resume();
      }
    });

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.restart());
    }

    // 크레이지 모드 토글 (게임 중에는 차단 + 속도 패널티)
    if (this.crazyToggleBtn) {
      this.crazyToggleBtn.addEventListener('click', () => {
        if (this.state.status === 'playing' || this.state.status === 'paused') {
          const { mul, capped } = this.spawner.boostDifficulty();
          const pct = Math.round((mul - 1) * 100);
          const msg = capped
            ? '더 이상 빨라질 수 없습니다! 🔥'
            : `게임은 쉬우면 재미없습니다. 속도 +${pct}% ⚡`;
          this.ui.showMessage(msg, 'danger');
          this.ui.showDamage();   // 화면 흔들림으로 즉각적인 피드백
          this.inputEl.focus();
          return;
        }
        this.toggleCrazyMode();
      });
    }

    // 이름 입력 상태에서 Enter → 랭킹 등록
    this.inputEl.addEventListener('keydown', (e) => {
      if (this.state.status !== 'naming') return;
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const name = this.inputEl.value;
      this._submitName(name);
    });
  }

  // ─── 게임 이벤트 핸들러 ───────────────────────────────────
  _onWordMatched(word) {
    const { state } = this;
    state.combo++;

    // 점수 계산: 단어 길이 * 콤보 보너스 (레벨은 제외 — 점수↑→레벨↑→점수↑ 피드백 루프 방지)
    const comboBonus = Math.min(state.combo, 5);
    const gained = word.text.length * comboBonus * 10;
    state.score += gained;

    // 플래시 이펙트 등록
    this._flashes.push({
      x: word.x,
      y: word.y,
      text: word.text,
      alpha: 1,
      life: 40,
    });

    // 레벨업 체크
    const newLevel = Math.floor(state.score / SCORE_PER_LEVEL) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      this.ui.showLevelUp(newLevel);
    }

    // UI 업데이트
    this.ui.update({
      score: state.score,
      hp: state.hp,
      maxHp: MAX_HP,
      level: state.level,
    });
    this.ui.showCombo(state.combo);
  }

  _onWordMissed(word) {
    const { state } = this;
    state.combo = 0;
    state.hp--;

    this.ui.showDamage();
    this.ui.showMessage(`"${word.text}" 놓쳤습니다! 💥`, 'danger');
    this.ui.update({
      score: state.score,
      hp: state.hp,
      maxHp: MAX_HP,
      level: state.level,
    });

    if (state.hp <= 0) {
      this._gameOver();
    }
  }

  _pause() {
    this.state.status = 'paused';
    this.input.disable();
    this.inputEl.placeholder = 'ESC 키를 눌러 계속하기';
  }

  _resume() {
    this.state.status = 'playing';
    this.input.enable();
    this.inputEl.placeholder = '단어를 입력하세요';
  }

  _gameOver() {
    const { state } = this;
    this.spawner.stop();

    // TOP 10 자격이 있으면 이름 입력 단계로 진입 (현재 모드 기준)
    if (isHighScore(state.score, this._modeKey())) {
      state.status = 'naming';
      this.input.disable();
      this.inputEl.value = '';
      this.inputEl.placeholder = '🏆 이름 입력 후 Enter (최대 8자)';
      // disable()이 blur 시켰으니 다시 포커스
      setTimeout(() => this.inputEl.focus(), 60);
      return;
    }

    state.status = 'gameover';
    this.input.disable();
    if (this.restartBtn) this.restartBtn.style.display = 'block';
  }

  // naming 상태에서 Enter → 현재 모드의 랭킹에 저장
  _submitName(name) {
    const { state } = this;
    const { list, rank } = addEntry(name, state.score, state.level, this._modeKey());
    this.ranking = list;
    state.newRankIndex = rank;
    state.status = 'gameover';
    this.inputEl.value = '';
    this.inputEl.placeholder = '타이핑을 시작하면 게임이 시작됩니다';
    if (this.restartBtn) this.restartBtn.style.display = 'block';
  }

  // ─── 게임 루프 ────────────────────────────────────────────
  _startLoop() {
    const loop = (timestamp) => {
      const delta = this._lastTime ? timestamp - this._lastTime : 16;
      this._lastTime = timestamp;

      this._update(delta);
      this._draw();

      this._animFrameId = requestAnimationFrame(loop);
    };
    this._animFrameId = requestAnimationFrame(loop);
  }

  _update(delta) {
    const { state } = this;
    if (state.status !== 'playing') return;

    // 새 단어 생성
    const newWord = this.spawner.update(delta, state.level);
    if (newWord) state.words.push(newWord);

    // 단어 위치 업데이트
    const toRemove = [];
    for (const word of state.words) {
      word.update();

      if (word.isDying && word.isFullyFaded()) {
        toRemove.push(word);
        continue;
      }
      if (!word.isDying && word.isOutOfBound()) {
        toRemove.push(word);
        this._onWordMissed(word);
      }
    }

    // 제거
    state.words = state.words.filter((w) => !toRemove.includes(w));

    // 플래시 업데이트
    this._flashes = this._flashes.filter((f) => {
      f.life--;
      f.alpha = f.life / 40;
      f.y -= 1.5;
      return f.life > 0;
    });

    // 입력 체크 (매 프레임)
    if (this.input.currentValue) {
      this.input.checkWords(state.words);
    }
  }

  _draw() {
    const { state, renderer } = this;
    const hpRatio = 1 - state.hp / MAX_HP;

    renderer.clear();
    renderer.drawBackground(hpRatio);
    renderer.drawRain();

    const mode = this._modeKey();

    if (state.status === 'idle') {
      renderer.drawStartScreen(this.ranking, mode);
      return;
    }

    renderer.drawWords(state.words);

    // 플래시 이펙트
    for (const f of this._flashes) {
      this.canvas.getContext('2d').save();
      this.canvas.getContext('2d').globalAlpha = f.alpha;
      renderer.drawMatchFlash(f.x, f.y, f.text);
      this.canvas.getContext('2d').restore();
    }

    if (state.status === 'paused') {
      renderer.drawPauseScreen();
    }

    if (state.status === 'naming') {
      renderer.drawNamingScreen(state.score, state.level);
    }

    if (state.status === 'gameover') {
      renderer.drawGameOver(state.score, state.level, this.ranking, state.newRankIndex, mode);
    }
  }
}
