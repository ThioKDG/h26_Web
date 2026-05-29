// js/word.js
// 떨어지는 단어 하나를 표현하는 클래스

// 파워업 타입별 표시 색상
const POWER_UP_COLORS = {
  freeze: { main: '#66ddff', glow: '#33aaff' },
  bomb:   { main: '#ff8844', glow: '#ff4422' },
  heal:   { main: '#88ff66', glow: '#33dd44' },
};

const POWER_UP_ICONS = {
  freeze: '❄',
  bomb:   '💣',
  heal:   '💖',
};

export class WordDrop {
  constructor({ text, x, speed, powerUp = null }) {
    this.text = text;
    this.x = x;
    this.y = -10;
    this.speed = speed;
    this.isHighlighted = false;
    this.matchedLength = 0;
    this.opacity = 1;
    this.isDying = false;
    this.scale = 1;
    this.powerUp = powerUp;           // 'freeze' | 'bomb' | 'heal' | null
    this.spawnTime = performance.now(); // 반응 시간 측정용
  }

  update(speedMul = 1) {
    if (this.isDying) {
      // 사라질 때 페이드아웃 + 스케일업 효과
      this.opacity -= 0.08;
      this.scale += 0.05;
      return;
    }
    // speedMul: 크레이지 모드의 실시간 진동 배수 (1이면 효과 없음)
    this.y += this.speed * speedMul;
  }

  draw(ctx, fonts, deadlineY) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    const fontSize = this.powerUp ? 24 : 22;
    ctx.font = `bold ${fontSize}px ${fonts}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 파워업 단어: 아이콘 + 컬러 글로우 + 펄스 배경
    if (this.powerUp) {
      const palette = POWER_UP_COLORS[this.powerUp] || POWER_UP_COLORS.heal;
      const icon = POWER_UP_ICONS[this.powerUp] || '★';
      const displayText = `${icon} ${this.text} ${icon}`;
      const baseColor = (this.isHighlighted && this.matchedLength > 0) ? '#00ff88' : palette.main;

      // 펄스(맥동) 효과: 시간에 따라 글로우 크기 변동
      const pulse = 10 + Math.sin(performance.now() / 200) * 6;
      ctx.fillStyle = baseColor;
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 18 + pulse;
      ctx.fillText(displayText, 0, 0);

      // 입력된 글자만 별도로 초록색 덮어쓰기
      if (this.isHighlighted && this.matchedLength > 0) {
        const matchedText = this.text.slice(0, this.matchedLength);
        const fullWidth = ctx.measureText(displayText).width;
        const iconPrefix = `${icon} `;
        const prefixWidth = ctx.measureText(iconPrefix).width;
        const startX = -fullWidth / 2 + prefixWidth;
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 14;
        ctx.textAlign = 'left';
        ctx.fillText(matchedText, startX, 0);
      }
      ctx.restore();
      return;
    }

    if (this.isHighlighted && this.matchedLength > 0) {
      const matchedText = this.text.slice(0, this.matchedLength);
      const remainText = this.text.slice(this.matchedLength);
      const totalWidth = ctx.measureText(this.text).width;
      const matchedWidth = ctx.measureText(matchedText).width;

      let startX = -totalWidth / 2;

      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.textAlign = 'left';
      ctx.fillText(matchedText, startX, 0);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 16;
      ctx.fillText(remainText, startX + matchedWidth, 0);
    } else {
      // 데드라인 기준 위험도 (0~1) — 데드라인에 가까울수록 위험
      const dangerRatio = deadlineY > 0 ? this.y / deadlineY : 0;
      if (dangerRatio > 0.75) {
        ctx.fillStyle = `rgb(255, ${Math.floor(100 * (1 - dangerRatio))}, 50)`;
        ctx.shadowColor = '#ff3322';
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = '#e8f4ff';
        ctx.shadowColor = '#88bbff';
        ctx.shadowBlur = 8;
      }
      ctx.textAlign = 'center';
      ctx.fillText(this.text, 0, 0);
    }

    ctx.restore();
  }

  // 데드라인(입력바 상단)을 넘으면 아웃 → HP 감소
  isOutOfBound(deadlineY) {
    return this.y > deadlineY;
  }

  isFullyFaded() {
    return this.opacity <= 0;
  }

  // 입력값 기준으로 하이라이트 상태 업데이트
  updateHighlight(inputValue) {
    if (!inputValue) {
      this.isHighlighted = false;
      this.matchedLength = 0;
      return false;
    }
    if (this.text.startsWith(inputValue)) {
      this.isHighlighted = true;
      this.matchedLength = inputValue.length;
      return true;
    }
    this.isHighlighted = false;
    this.matchedLength = 0;
    return false;
  }

  // 단어 완전 일치 여부
  isMatch(inputValue) {
    return this.text === inputValue;
  }

  // 사라지는 애니메이션 시작
  startDying() {
    this.isDying = true;
  }
}
