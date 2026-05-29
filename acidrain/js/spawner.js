// js/spawner.js
// 단어를 언제, 어디서, 어떤 속도로 생성할지 관리

import { WordDrop } from './word.js';

export class Spawner {
  constructor(wordData, canvas) {
    this.wordData = wordData;   // words.json 데이터
    this.canvas = canvas;
    this.elapsed = 0;           // 마지막 생성 이후 경과 시간 (ms)
    this.interval = 3000;       // 단어 생성 주기 (ms)
    this.baseSpeed = 0.8;       // 기본 낙하 속도
    this.active = false;
    this.crazyMode = false;

    // 크레이지 모드 전용 단어 풀: medium + hard 중 4글자 이상만
    this._crazyPool = [
      ...wordData.medium,
      ...wordData.hard,
    ].filter((w) => w && w.length >= 4);
  }

  setCrazyMode(crazy) {
    this.crazyMode = !!crazy;
  }

  // 단어 데이터 교체 (커스텀 단어 추가/삭제 후 호출)
  setWordData(wordData) {
    this.wordData = wordData;
    this._crazyPool = [
      ...(wordData.medium || []),
      ...(wordData.hard || []),
    ].filter((w) => w && w.length >= 4);
  }

  start() {
    this.active = true;
    this.elapsed = this.interval; // 시작하자마자 첫 단어 생성
  }

  stop() {
    this.active = false;
    this.elapsed = 0;
  }

  // level: 1~N, delta: 경과 ms
  // 반환값: 새로운 WordDrop 인스턴스 or null
  update(delta, level) {
    if (!this.active) return null;

    this.elapsed += delta;
    const currentInterval = this._getInterval(level);

    if (this.elapsed >= currentInterval) {
      this.elapsed = 0;
      return this._spawnWord(level);
    }
    return null;
  }

  _spawnWord(level) {
    const padding = 60;
    const x = padding + Math.random() * (this.canvas.width - padding * 2);
    const speed = this._getSpeed(level);

    // 5% 확률로 파워업 단어 생성 (레벨 2 이상부터)
    if (level >= 2 && Math.random() < 0.05) {
      return this._spawnPowerUp(x, speed);
    }

    const text = this._getRandomWord(level);
    return new WordDrop({ text, x, speed });
  }

  _spawnPowerUp(x, speed) {
    const types = ['freeze', 'bomb', 'heal'];
    const powerUp = types[Math.floor(Math.random() * types.length)];
    const textByType = {
      freeze: '시간정지',
      bomb:   '폭탄제거',
      heal:   '체력회복',
    };
    return new WordDrop({
      text: textByType[powerUp],
      x,
      speed: speed * 0.85,   // 파워업은 약간 느리게 → 잡을 기회
      powerUp,
    });
  }

  _getRandomWord(level) {
    // 크레이지 모드: 4글자 이상 medium/hard 풀에서만 추출
    if (this.crazyMode) {
      const pool = this._crazyPool;
      if (pool.length === 0) return this.wordData.hard[0] || '크레이지';
      return pool[Math.floor(Math.random() * pool.length)];
    }

    let pool;
    if (level <= 2) {
      pool = this.wordData.easy;
    } else if (level <= 4) {
      // 중간 레벨: easy 30% + medium 70%
      pool = Math.random() < 0.3
        ? this.wordData.easy
        : this.wordData.medium;
    } else {
      // 고레벨: medium 40% + hard 60%
      pool = Math.random() < 0.4
        ? this.wordData.medium
        : this.wordData.hard;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  _getInterval(level) {
    // 레벨 오를수록 생성 빈도 증가 (최소 1초)
    const base = Math.max(1000, 3000 - (level - 1) * 300);
    // 크레이지 모드: 생성 주기 30% 단축
    return this.crazyMode ? base * 0.7 : base;
  }

  _getSpeed(level) {
    // 레벨 오를수록 속도 증가 + 약간의 랜덤성
    const base = this.baseSpeed + (level - 1) * 0.3;
    const random = (Math.random() - 0.5) * 0.4;
    return Math.max(0.5, base + random);
    // 크레이지 모드 가속은 매 프레임 word.update에서 동적으로 곱해짐
    // (getCrazySpeedMultiplier 참고)
  }

  // 크레이지 모드 실시간 속도 배수 (시간에 따라 진동 → 정신없는 효과)
  // 평균 1.5배, 0.6 ~ 2.4배 사이를 두 개의 사인파가 합쳐서 불규칙하게 오감
  getCrazySpeedMultiplier() {
    if (!this.crazyMode) return 1;
    const t = performance.now() / 1000;
    const primary   = Math.sin(t * 1.3);  // 주 진동 (~4.8초 주기)
    const secondary = Math.sin(t * 3.7);  // 보조 진동 (~1.7초 주기)
    const combined  = primary * 0.7 + secondary * 0.3;  // -1 ~ 1 범위
    return 1.5 + combined * 0.9;           // 0.6 ~ 2.4 범위
  }
}
