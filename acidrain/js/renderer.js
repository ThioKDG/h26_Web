// js/renderer.js
// Canvas에 그리는 것만 전담하는 클래스

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fonts = "'Noto Sans KR', sans-serif";

    // 빗방울 파티클 (배경 효과)
    this.rainDrops = Array.from({ length: 80 }, () => this._newRainDrop());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // 데드라인 Y 좌표 = 입력바 상단 (단어가 이 선에 닿으면 HP 감소)
  getDeadlineY() {
    const inputArea = document.getElementById('input-area');
    const inputH = inputArea ? inputArea.offsetHeight : 80;
    return this.canvas.height - inputH;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(dangerLevel = 0) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 그라디언트 배경
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (dangerLevel > 0.6) {
      grad.addColorStop(0, `rgba(40, 0, 0, 1)`);
      grad.addColorStop(1, `rgba(80, 10, 10, 1)`);
    } else {
      grad.addColorStop(0, '#0a0e1a');
      grad.addColorStop(1, '#0d1530');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ── 데드라인 시각화 ──
    const deadlineY = this.getDeadlineY();

    // 1) 데드라인 위 60px의 위험 구간 그라디언트 (투명 → 빨강)
    const dangerGrad = ctx.createLinearGradient(0, deadlineY - 60, 0, deadlineY);
    dangerGrad.addColorStop(0, 'rgba(255, 60, 60, 0)');
    dangerGrad.addColorStop(1, 'rgba(255, 60, 60, 0.2)');
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(0, deadlineY - 60, w, 60);

    // 2) 데드라인 라인 (펄스 글로우 — HP 낮을수록 진해짐)
    const pulse = 0.6 + Math.sin(performance.now() / 400) * 0.2;
    const lineAlpha = 0.55 + dangerLevel * 0.45;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 70, 70, ${lineAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff3322';
    ctx.shadowBlur = 14 * pulse;
    ctx.beginPath();
    ctx.moveTo(0, deadlineY);
    ctx.lineTo(w, deadlineY);
    ctx.stroke();
    ctx.restore();

    // 3) 우측 끝에 "DEADLINE" 라벨
    ctx.save();
    ctx.font = `bold 11px 'Orbitron', monospace`;
    ctx.fillStyle = `rgba(255, 100, 100, ${lineAlpha})`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('⚠ DEADLINE', w - 12, deadlineY - 4);
    ctx.restore();
  }

  drawRain() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 160, 255, 0.15)';
    ctx.lineWidth = 1;

    for (const drop of this.rainDrops) {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.speed * 0.3, drop.y + drop.len);
      ctx.stroke();

      drop.y += drop.speed;
      if (drop.y > this.canvas.height) {
        Object.assign(drop, this._newRainDrop());
      }
    }
    ctx.restore();
  }

  drawWords(words) {
    const deadlineY = this.getDeadlineY();
    for (const word of words) {
      word.draw(this.ctx, this.fonts, deadlineY);
    }
  }

  // 단어 매칭 성공 시 플래시 효과
  drawMatchFlash(x, y, text) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `bold 24px ${this.fonts}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.9;
    ctx.fillText(`✓ ${text}`, x, y);
    ctx.restore();
  }

  // ─── 레이아웃 헬퍼 ─────────────────────────────────────
  // HUD(상단 ~70px)와 입력바(하단 ~80px) 사이 가용 영역의 세로 중앙에 콘텐츠 배치
  _layoutCenter(contentHeight) {
    const HUD_H = 70;
    const INPUT_H = 80;
    const h = this.canvas.height;
    const availTop = HUD_H;
    const availBottom = h - INPUT_H;
    const availH = availBottom - availTop;
    return availTop + Math.max(20, (availH - contentHeight) / 2);
  }

  _rankingListHeight(ranking) {
    const headerH = 36;
    const emptyH = 50;
    const rowH = 28;
    const padding = 24;
    if (!ranking || ranking.length === 0) return headerH + emptyH;
    return headerH + ranking.length * rowH + padding;
  }

  // ─── 시작 화면 ────────────────────────────────────────
  drawStartScreen(ranking = [], mode = 'normal') {
    const ctx = this.ctx;
    const w = this.canvas.width;

    const titleBlockH = 140;
    const gap = 36;
    const rankH = this._rankingListHeight(ranking);
    const total = titleBlockH + gap + rankH;

    const top = this._layoutCenter(total);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 타이틀
    ctx.font = `bold 52px ${this.fonts}`;
    ctx.fillStyle = '#88ccff';
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 24;
    ctx.fillText('☔ 산성비 타자연습', w / 2, top + 30);

    // 서브타이틀
    ctx.shadowBlur = 0;
    ctx.font = `20px ${this.fonts}`;
    ctx.fillStyle = '#aaccee';
    ctx.fillText('단어가 떨어지기 전에 빠르게 입력하세요!', w / 2, top + 80);

    // 힌트
    ctx.font = `15px ${this.fonts}`;
    ctx.fillStyle = '#6699bb';
    ctx.fillText('아래 입력창을 클릭하거나 타이핑을 시작하면 게임이 시작됩니다', w / 2, top + 115);
    ctx.restore();

    this._drawRankingList(ranking, top + titleBlockH + gap, -1, mode);
  }

  // ─── 게임오버 화면 ────────────────────────────────────
  drawGameOver(score, level, ranking = [], newRankIndex = -1, mode = 'normal', stats = null) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const titleBlockH = stats ? 180 : 130;  // 통계 있으면 더 높게
    const gap = 30;
    const rankH = this._rankingListHeight(ranking);
    const btnReserve = 80;
    const total = titleBlockH + gap + rankH + btnReserve;

    const top = this._layoutCenter(total);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ff4455';
    ctx.font = `bold 56px ${this.fonts}`;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', w / 2, top + 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = `22px ${this.fonts}`;
    ctx.shadowBlur = 0;
    ctx.fillText(
      `최종 점수: ${score.toLocaleString()}점  /  레벨 ${level}`,
      w / 2,
      top + 90
    );

    // 통계 한 줄 표시
    if (stats) {
      ctx.font = `16px ${this.fonts}`;
      ctx.fillStyle = '#aaccee';
      ctx.fillText(
        `⌨ ${stats.tasu.toLocaleString()}타   ✓ 정확도 ${stats.accuracy}%   ⏱ 평균 ${stats.avgReactionMs}ms   📝 ${stats.matchedWords}맞춤 / ${stats.missedWords}놓침`,
        w / 2,
        top + 130
      );
    }
    ctx.restore();

    this._drawRankingList(ranking, top + titleBlockH + gap, newRankIndex, mode);
  }

  // ─── 이름 입력 화면 (신기록 달성 시) ──────────────────
  drawNamingScreen(score, level) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cy = this._layoutCenter(220) + 110;  // 컨텐츠 높이 220 기준 중앙

    // 신기록 타이틀
    ctx.font = `bold 60px ${this.fonts}`;
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 30;
    ctx.fillText('🏆 NEW RECORD!', w / 2, cy - 70);

    // 점수
    ctx.font = `28px ${this.fonts}`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`${score.toLocaleString()}점  /  레벨 ${level}`, w / 2, cy - 10);

    // 안내 문구
    ctx.font = `20px ${this.fonts}`;
    ctx.fillStyle = '#88ccff';
    ctx.fillText('아래 입력창에 이름을 입력 후 Enter', w / 2, cy + 40);

    ctx.font = `14px ${this.fonts}`;
    ctx.fillStyle = '#6688aa';
    ctx.fillText('(최대 8자, 비워두면 PLAYER로 저장됩니다)', w / 2, cy + 70);
    ctx.restore();
  }

  // ─── TOP 10 랭킹 리스트 (공통 헬퍼) ───────────────────
  _drawRankingList(ranking, startY, highlightIndex, mode = 'normal') {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const isCrazy = mode === 'crazy';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 헤더 (모드에 따라 라벨/색상 변경)
    ctx.font = `bold 22px ${this.fonts}`;
    if (isCrazy) {
      ctx.fillStyle = '#ff66cc';
      ctx.shadowColor = '#ff33aa';
    } else {
      ctx.fillStyle = '#ffaa44';
      ctx.shadowColor = '#ff8800';
    }
    ctx.shadowBlur = 12;
    const headerText = isCrazy
      ? '🌈 TOP 10 RANKING — CRAZY MODE'
      : '🏆 TOP 10 RANKING — NORMAL MODE';
    ctx.fillText(headerText, w / 2, startY);
    ctx.shadowBlur = 0;

    // 빈 상태
    if (!ranking || ranking.length === 0) {
      const panelW = Math.min(460, w - 40);
      const panelX = (w - panelW) / 2;
      const panelY = startY + 24;
      const panelH = 50;

      ctx.fillStyle = 'rgba(20, 30, 60, 0.5)';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      ctx.font = `16px ${this.fonts}`;
      ctx.fillStyle = '#6688aa';
      ctx.fillText('아직 기록이 없습니다', w / 2, panelY + panelH / 2);
      ctx.restore();
      return;
    }

    const rowH = 28;
    const rowsTop = startY + 24;
    const panelW = Math.min(460, w - 40);
    const panelX = (w - panelW) / 2;
    const panelH = rowH * ranking.length + 16;

    // 배경 패널
    ctx.fillStyle = 'rgba(20, 30, 60, 0.5)';
    ctx.fillRect(panelX, rowsTop, panelW, panelH);
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, rowsTop, panelW, panelH);

    for (let i = 0; i < ranking.length; i++) {
      const entry = ranking[i];
      const rowCenterY = rowsTop + 8 + i * rowH + rowH / 2;
      const isHighlight = i === highlightIndex;

      if (isHighlight) {
        ctx.fillStyle = 'rgba(255, 221, 68, 0.18)';
        ctx.fillRect(panelX + 4, rowCenterY - rowH / 2 + 2, panelW - 8, rowH - 4);
      }

      const rankColor =
        i === 0 ? '#ffd700' :
        i === 1 ? '#c0c8d0' :
        i === 2 ? '#cd7f32' :
        isHighlight ? '#ffdd44' : '#88aacc';

      // 순위
      ctx.font = `bold 16px ${this.fonts}`;
      ctx.fillStyle = rankColor;
      ctx.textAlign = 'left';
      ctx.fillText(`#${i + 1}`, panelX + 18, rowCenterY);

      // 이름
      ctx.fillStyle = isHighlight ? '#ffffff' : '#e8f4ff';
      ctx.font = `16px ${this.fonts}`;
      ctx.fillText(entry.name, panelX + 70, rowCenterY);

      // 점수
      ctx.textAlign = 'right';
      ctx.fillStyle = isHighlight ? '#ffdd44' : '#aaccee';
      ctx.font = `bold 16px ${this.fonts}`;
      ctx.fillText(entry.score.toLocaleString(), panelX + panelW - 80, rowCenterY);

      // 레벨
      ctx.fillStyle = '#6688aa';
      ctx.font = `13px ${this.fonts}`;
      ctx.fillText(`Lv.${entry.level}`, panelX + panelW - 18, rowCenterY);
    }
    ctx.restore();
  }

  // 블라인드 패널티 — 화면을 어둡게 덮고 카운트다운만 표시
  drawBlindOverlay(remainingMs) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    // 거의 새까만 오버레이로 단어/배경을 가림
    ctx.fillStyle = 'rgba(5, 5, 10, 0.88)';
    ctx.fillRect(0, 0, w, h);

    // 가장자리는 더 진하게 — 비네트 효과로 압박감 강화
    const vignette = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.15,
      w / 2, h / 2, Math.max(w, h) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // 카운트다운 큰 글자
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 44px ${this.fonts}`;
    ctx.fillStyle = '#ff6666';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 32;
    ctx.fillText(`👁 BLIND ${(remainingMs / 1000).toFixed(1)}s`, w / 2, h / 2 - 20);

    // 부연 설명
    ctx.font = `15px ${this.fonts}`;
    ctx.fillStyle = '#ffaaaa';
    ctx.shadowBlur = 0;
    ctx.fillText('크레이지 모드를 함부로 끄지 마세요', w / 2, h / 2 + 30);
    ctx.restore();
  }

  // 시간정지 파워업 활성 시 푸른 오버레이 + 잔여 시간
  drawFreezeOverlay(remainingMs) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    // 푸른 틴트
    ctx.fillStyle = 'rgba(100, 180, 255, 0.12)';
    ctx.fillRect(0, 0, w, h);

    // 상단에 큰 안내
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 32px ${this.fonts}`;
    ctx.fillStyle = '#aaeeff';
    ctx.shadowColor = '#33aaff';
    ctx.shadowBlur = 24;
    ctx.fillText(`❄ FROZEN ${(remainingMs / 1000).toFixed(1)}s`, w / 2, 110);
    ctx.restore();
  }

  drawPauseScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.font = `bold 52px ${this.fonts}`;
    ctx.fillStyle = '#88ccff';
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 24;
    ctx.fillText('⏸ 일시정지', w / 2, h / 2 - 20);

    ctx.font = `20px ${this.fonts}`;
    ctx.fillStyle = '#aaccee';
    ctx.shadowBlur = 0;
    ctx.fillText('ESC 키를 눌러 계속하기', w / 2, h / 2 + 40);
    ctx.restore();
  }

  _newRainDrop() {
    return {
      x: Math.random() * (this.canvas?.width || window.innerWidth),
      y: Math.random() * -200,
      len: 10 + Math.random() * 20,
      speed: 3 + Math.random() * 5,
    };
  }
}
