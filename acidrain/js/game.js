// js/game.js
// 게임 루프 및 상태 관리 허브

import { Spawner } from './spawner.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { loadRanking, isHighScore, addEntry } from './ranking.js';
import { mergeWithDefaults } from './customWords.js';
import { WordEditor } from './wordEditor.js';

const MAX_HP = 5;
const SCORE_PER_LEVEL = 800;

export class Game {
  constructor(wordData) {
    this._defaultWordData = wordData;
    this.wordData = mergeWithDefaults(wordData);

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
      stats: this._freshStats(),
      freezeUntil: 0,    // 시간정지 파워업 종료 시각 (ms)
      blindUntil: 0,     // 블라인드 패널티 종료 시각 (ms)
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
    this.spawner = new Spawner(this.wordData, this.canvas);
    this.input = new InputHandler(this.inputEl);
    this.ui = new UI();
    this.wordEditor = new WordEditor();
    this.wordEditor.onWordsChanged = () => {
      this.wordData = mergeWithDefaults(this._defaultWordData);
      this.spawner.setWordData(this.wordData);
    };

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
    this._updateEditorButtonVisibility();
  }

  // 단어 관리 버튼은 idle/gameover 상태에서만 보임 (게임 중에는 가림)
  _updateEditorButtonVisibility() {
    const btn = document.getElementById('open-word-editor');
    if (!btn) return;
    const visible = this.state.status === 'idle' || this.state.status === 'gameover';
    btn.style.display = visible ? 'inline-flex' : 'none';
  }

  // ─── 크레이지 모드 ─────────────────────────────────────
  toggleCrazyMode() {
    this.crazyMode = !this.crazyMode;
    localStorage.setItem('acidrain_crazy', this.crazyMode ? '1' : '0');
    this._applyCrazyMode();

    if (this.crazyMode) {
      // 켤 때: 진동 가속 메커니즘에 대한 경고
      this.ui.showMessage(
        '🌈 크레이지 ON! ⚠ 속도가 수시로 빨라졌다 느려졌다 합니다',
        'danger'
      );
    } else {
      this.ui.showMessage('크레이지 모드 OFF', 'info');
    }
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
      stats: this._freshStats(true),  // startTime을 지금으로
      freezeUntil: 0,
      blindUntil: 0,
    };

    this.spawner.start();
    this.input.enable();
    this.inputEl.placeholder = '단어를 입력하세요';
    this.ui.update({ score: 0, hp: MAX_HP, maxHp: MAX_HP, level: 1 });
    this._updateEditorButtonVisibility();
  }

  _freshStats(withStart = false) {
    return {
      startTime: withStart ? performance.now() : 0,
      endTime: 0,
      matchedWords: 0,
      matchedStrokes: 0,  // 한글 자모 단위 누적 타수
      missedWords: 0,
      reactionTimes: [],  // 각 단어를 잡기까지 걸린 시간 (ms)
    };
  }

  // 한글 한 음절을 자모 단위 타수로 환산
  // - 받침 없음: 자음 + 모음 = 2타
  // - 받침 있음: 자음 + 모음 + 받침 = 3타
  // - 그 외(영문/숫자/기호): 1타
  _countStrokes(text) {
    let count = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const jongseongIndex = (code - 0xAC00) % 28;
        count += jongseongIndex === 0 ? 2 : 3;
      } else {
        count += 1;
      }
    }
    return count;
  }

  // 게임 종료/결과 계산을 위한 통계 헬퍼
  _computeStats() {
    const s = this.state.stats;
    const elapsedMs = (s.endTime || performance.now()) - (s.startTime || performance.now());
    const minutes = elapsedMs / 60000;
    // 분당 타수 (한컴타자 등 표준 한글 타수 측정 방식)
    const tasu = minutes > 0 ? Math.round(s.matchedStrokes / minutes) : 0;
    const totalAttempts = s.matchedWords + s.missedWords;
    const accuracy = totalAttempts > 0 ? Math.round((s.matchedWords / totalAttempts) * 100) : 0;
    const avgReaction = s.reactionTimes.length > 0
      ? Math.round(s.reactionTimes.reduce((a, b) => a + b, 0) / s.reactionTimes.length)
      : 0;
    return {
      tasu,
      accuracy,
      avgReactionMs: avgReaction,
      matchedWords: s.matchedWords,
      missedWords: s.missedWords,
      elapsedSec: Math.round(elapsedMs / 1000),
    };
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

    // 크레이지 모드 토글 (게임 중에는 차단 + 블라인드 패널티)
    if (this.crazyToggleBtn) {
      this.crazyToggleBtn.addEventListener('click', () => {
        if (this.state.status === 'playing' || this.state.status === 'paused') {
          const result = this._triggerBlindPenalty();
          const msg = result.capped
            ? '더 이상 가려질 수 없습니다! 👁'
            : `게임은 쉬우면 재미없습니다. +${result.addedSec}초 시야 차단! 👁`;
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

    // 파워업 단어면 별도 효과 처리 후 종료 (점수/콤보 없음)
    if (word.powerUp) {
      this._triggerPowerUp(word);
      return;
    }

    state.combo++;

    // 통계 기록
    state.stats.matchedWords++;
    state.stats.matchedStrokes += this._countStrokes(word.text);
    if (word.spawnTime) {
      state.stats.reactionTimes.push(performance.now() - word.spawnTime);
    }

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

  // 게임 중 크레이지 토글을 누른 사용자에게 시야 차단 패널티
  // 클릭당 +2초씩 누적, 최대 8초까지
  _triggerBlindPenalty() {
    const ADD_MS = 2000;
    const MAX_MS = 8000;
    const now = performance.now();
    const currentEnd = Math.max(this.state.blindUntil || 0, now);
    const capEnd = now + MAX_MS;

    if (currentEnd >= capEnd) {
      return { capped: true, addedSec: 0 };
    }

    const newEnd = Math.min(currentEnd + ADD_MS, capEnd);
    const added = (newEnd - currentEnd) / 1000;
    this.state.blindUntil = newEnd;
    return { capped: false, addedSec: added };
  }

  // 파워업 단어 매치 시 효과 발동
  _triggerPowerUp(word) {
    const { state } = this;
    word.startDying();

    // 매칭 자체에 작은 보너스 점수
    state.score += 50;
    state.stats.matchedWords++;
    state.stats.matchedStrokes += this._countStrokes(word.text);
    if (word.spawnTime) {
      state.stats.reactionTimes.push(performance.now() - word.spawnTime);
    }

    // 플래시 이펙트
    this._flashes.push({
      x: word.x, y: word.y, text: word.text,
      alpha: 1, life: 40,
    });

    switch (word.powerUp) {
      case 'freeze':
        state.freezeUntil = performance.now() + 3000;  // 3초 시간정지
        this.ui.showMessage('❄ 시간 정지 3초!', 'info');
        break;
      case 'bomb':
        // 현재 화면의 모든 일반 단어 제거 + 각 단어 길이만큼 보너스 점수
        let bombBonus = 0;
        for (const w of state.words) {
          if (w !== word && !w.isDying && !w.powerUp) {
            w.startDying();
            bombBonus += w.text.length * 10;
          }
        }
        state.score += bombBonus;
        this.ui.showMessage(`💣 폭탄! 모든 단어 제거 (+${bombBonus}점)`, 'levelup');
        break;
      case 'heal':
        if (state.hp < MAX_HP) {
          state.hp++;
          this.ui.showMessage('💖 체력 +1!', 'levelup');
        } else {
          state.score += 200;  // HP 만땅이면 점수 보너스로 대체
          this.ui.showMessage('💖 HP 가득 → +200 보너스!', 'levelup');
        }
        break;
    }

    this.ui.update({
      score: state.score,
      hp: state.hp,
      maxHp: MAX_HP,
      level: state.level,
    });
  }

  _onWordMissed(word) {
    const { state } = this;

    // 파워업 단어를 놓치는 건 페널티 없음 (그냥 사라짐)
    if (word.powerUp) {
      return;
    }

    state.combo = 0;
    state.hp--;
    state.stats.missedWords++;

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
    state.stats.endTime = performance.now();
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
    this._updateEditorButtonVisibility();
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
    this._updateEditorButtonVisibility();
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

    const now = performance.now();
    const isFrozen = now < state.freezeUntil;

    // 새 단어 생성 (시간정지 중이면 생성 안 함)
    if (!isFrozen) {
      const newWord = this.spawner.update(delta, state.level);
      if (newWord) state.words.push(newWord);
    }

    // 크레이지 모드 진동 배수 (이번 프레임 기준) — 모든 단어에 동일하게 적용
    const speedMul = this.spawner.getCrazySpeedMultiplier();
    // 데드라인 = 입력바 상단 — 이 선에 닿으면 HP 감소
    const deadlineY = this.renderer.getDeadlineY();

    // 단어 위치 업데이트 (시간정지 중이면 죽어가는 단어만 업데이트)
    const toRemove = [];
    for (const word of state.words) {
      if (!isFrozen || word.isDying) {
        word.update(speedMul);
      }

      if (word.isDying && word.isFullyFaded()) {
        toRemove.push(word);
        continue;
      }
      if (!word.isDying && word.isOutOfBound(deadlineY)) {
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

    // 시간정지 파워업 오버레이
    if (state.status === 'playing') {
      const freezeRem = state.freezeUntil - performance.now();
      if (freezeRem > 0) renderer.drawFreezeOverlay(freezeRem);
    }

    // 블라인드 패널티 오버레이 (playing/paused 모두에서 표시)
    if (state.status === 'playing' || state.status === 'paused') {
      const blindRem = state.blindUntil - performance.now();
      if (blindRem > 0) renderer.drawBlindOverlay(blindRem);
    }

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
      renderer.drawGameOver(
        state.score,
        state.level,
        this.ranking,
        state.newRankIndex,
        mode,
        this._computeStats()
      );
    }
  }
}
