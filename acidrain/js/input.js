// js/input.js
// 사용자 입력을 감지하고 단어와 매칭하는 클래스

export class InputHandler {
  constructor(inputEl) {
    this.inputEl = inputEl;
    this.currentValue = '';
    this.enabled = false;

    // 콜백 (game.js에서 주입)
    this.onMatch = null;    // (word) => void
    this.onType = null;     // (value) => void
    this.onStart = null;    // () => void  — 첫 타이핑 시 게임 시작 신호

    this._bindEvents();
  }

  enable() {
    this.enabled = true;
    this.inputEl.focus();
  }

  disable() {
    this.enabled = false;
    this.reset();
  }

  reset() {
    this.currentValue = '';
    this.inputEl.blur();   // IME 조합 상태 강제 종료 후 value 초기화
    this.inputEl.value = '';
  }

  // 단어 배열을 받아 현재 입력값과 비교 및 하이라이트 처리
  // ※ onType/onMatch만 호출 — 절대 checkWords를 재귀 호출하지 않음
  checkWords(words) {
    const val = this.currentValue;

    for (const word of words) {
      if (word.isDying) continue;

      word.updateHighlight(val);

      if (word.isMatch(val)) {
        // 완전 일치!
        this.onMatch?.(word);
        this.reset();
        for (const w of words) w.updateHighlight('');
        return;
      }
    }
  }

  _bindEvents() {
    this.inputEl.addEventListener('input', (e) => {
      if (!this.enabled) {
        // 게임 시작 전 타이핑 → 시작 신호
        this.onStart?.();
        return;
      }
      this.currentValue = e.target.value;
      // 입력 이벤트에서 onType 호출 (checkWords 내부가 아님!)
      this.onType?.(this.currentValue);
    });

    // 모바일 대응: compositionend (한국어 IME)
    this.inputEl.addEventListener('compositionend', (e) => {
      if (!this.enabled) return;
      this.currentValue = e.target.value;
    });

    // 포커스 유지
    this.inputEl.addEventListener('blur', () => {
      if (this.enabled) {
        setTimeout(() => this.inputEl.focus(), 50);
      }
    });
  }
}
