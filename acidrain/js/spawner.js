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
    this._boostMul = 1;         // 패널티 가속 배수 (1 = 정상)

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

  // 게임 중 크레이지 토글 시도 시 호출됨 → 속도 + 생성 빈도 증가
  // 최대 3배까지만 누적, { mul, capped } 반환
  boostDifficulty(amount = 0.25) {
    const MAX = 3;
    const prev = this._boostMul;
    this._boostMul = Math.min(MAX, this._boostMul + amount);
    return { mul: this._boostMul, capped: prev === MAX };
  }

  start() {
    this.active = true;
    this.elapsed = this.interval; // 시작하자마자 첫 단어 생성
    this._boostMul = 1;           // 새 게임 시작 시 패널티 초기화
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
    return new WordDrop({
      text,
      x,
      speed,
      canvasHeight: this.canvas.height,
    });
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
      canvasHeight: this.canvas.height,
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
    const withCrazy = this.crazyMode ? base * 0.7 : base;
    // 패널티 부스트: 배수만큼 주기 단축, 최소 400ms 보장
    return Math.max(400, withCrazy / this._boostMul);
  }

  _getSpeed(level) {
    // 레벨 오를수록 속도 증가 + 약간의 랜덤성
    const base = this.baseSpeed + (level - 1) * 0.3;
    const random = (Math.random() - 0.5) * 0.4;
    const speed = Math.max(0.5, base + random);
    // 크레이지 모드: 낙하 속도 50% 가속
    const withCrazy = this.crazyMode ? speed * 1.5 : speed;
    // 패널티 부스트: 배수만큼 낙하 가속
    return withCrazy * this._boostMul;
  }
}
