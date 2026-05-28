// js/word.js
// 떨어지는 단어 하나를 표현하는 클래스

export class WordDrop {
  constructor({ text, x, speed, canvasHeight }) {
    this.text = text;
    this.x = x;
    this.y = -10;
    this.speed = speed;
    this.canvasHeight = canvasHeight;
    this.isHighlighted = false;
    this.matchedLength = 0; // 현재 몇 글자까지 입력됐는지
    this.opacity = 1;
    this.isDying = false;   // 제거 애니메이션 중
    this.scale = 1;
  }

  update() {
    if (this.isDying) {
      // 사라질 때 페이드아웃 + 스케일업 효과
      this.opacity -= 0.08;
      this.scale += 0.05;
      return;
    }
    this.y += this.speed;
  }

  draw(ctx, fonts) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    const fontSize = 22;
    ctx.font = `bold ${fontSize}px ${fonts}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.isHighlighted && this.matchedLength > 0) {
      // 이미 입력된 글자 (초록색)
      const matchedText = this.text.slice(0, this.matchedLength);
      const remainText = this.text.slice(this.matchedLength);
      const totalWidth = ctx.measureText(this.text).width;
      const matchedWidth = ctx.measureText(matchedText).width;

      let startX = -totalWidth / 2;

      // 입력된 부분
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.textAlign = 'left';
      ctx.fillText(matchedText, startX, 0);

      // 남은 부분
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 16;
      ctx.fillText(remainText, startX + matchedWidth, 0);
    } else {
      // 일반 단어
      const dangerRatio = this.y / this.canvasHeight;
      if (dangerRatio > 0.75) {
        // 위험 구간 - 빨간색
        ctx.fillStyle = `rgb(255, ${Math.floor(100 * (1 - dangerRatio))}, 50)`;
        ctx.shadowColor = '#ff3322';
        ctx.shadowBlur = 14;
      } else {
        // 일반 - 흰색 계열
        ctx.fillStyle = '#e8f4ff';
        ctx.shadowColor = '#88bbff';
        ctx.shadowBlur = 8;
      }
      ctx.textAlign = 'center';
      ctx.fillText(this.text, 0, 0);
    }

    ctx.restore();
  }

  isOutOfBound() {
    return this.y > this.canvasHeight + 30;
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
