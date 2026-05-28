// js/ui.js
// DOM 기반 HUD 업데이트 전담 클래스

export class UI {
  constructor() {
    this.scoreEl = document.getElementById('score-value');
    this.hpEl = document.getElementById('hp-bar-inner');
    this.hpTextEl = document.getElementById('hp-text');
    this.levelEl = document.getElementById('level-value');
    this.comboEl = document.getElementById('combo-display');
    this.messageEl = document.getElementById('message-display');

    this._comboTimer = null;
    this._messageTimer = null;
  }

  update({ score, hp, maxHp, level }) {
    if (this.scoreEl) this.scoreEl.textContent = score.toLocaleString();
    if (this.levelEl) this.levelEl.textContent = level;

    // HP 바
    const hpRatio = Math.max(0, hp / maxHp);
    if (this.hpEl) {
      this.hpEl.style.width = `${hpRatio * 100}%`;
      // HP 비율에 따라 색상 변경
      if (hpRatio > 0.5) {
        this.hpEl.style.background = 'linear-gradient(90deg, #00cc66, #00ff88)';
      } else if (hpRatio > 0.25) {
        this.hpEl.style.background = 'linear-gradient(90deg, #ff9900, #ffcc00)';
      } else {
        this.hpEl.style.background = 'linear-gradient(90deg, #cc0000, #ff3333)';
        this.hpEl.style.animation = 'hpPulse 0.5s ease infinite';
      }
    }
    if (this.hpTextEl) this.hpTextEl.textContent = `${hp} / ${maxHp}`;
  }

  showCombo(count) {
    if (!this.comboEl || count < 2) return;

    clearTimeout(this._comboTimer);
    this.comboEl.textContent = `${count} COMBO! 🔥`;
    this.comboEl.classList.add('visible');

    this._comboTimer = setTimeout(() => {
      this.comboEl.classList.remove('visible');
    }, 1500);
  }

  showMessage(text, type = 'info') {
    if (!this.messageEl) return;

    clearTimeout(this._messageTimer);
    this.messageEl.textContent = text;
    this.messageEl.className = `message-display visible ${type}`;

    this._messageTimer = setTimeout(() => {
      this.messageEl.classList.remove('visible');
    }, 2000);
  }

  showLevelUp(level) {
    this.showMessage(`🎉 LEVEL ${level} !`, 'levelup');
  }

  showDamage() {
    // HP 감소 시 화면 흔들림 효과
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 400);
  }
}
