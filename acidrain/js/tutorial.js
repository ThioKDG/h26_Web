// js/tutorial.js
// 첫 방문 사용자에게 게임 사용법을 안내하는 5장 슬라이드 모달
// 완료 또는 건너뛰기 시 localStorage에 기록 → 다시는 표시되지 않음
// 다시 보고 싶다면 콘솔에서: localStorage.removeItem('acidrain_tutorial_done')

const STORAGE_KEY = 'acidrain_tutorial_done';

export class Tutorial {
  constructor() {
    this.modal = document.getElementById('tutorial-modal');
    if (!this.modal) return;

    this.slides = Array.from(this.modal.querySelectorAll('.tutorial-slide'));
    this.dots = Array.from(this.modal.querySelectorAll('.tutorial-dots .dot'));
    this.prevBtn = document.getElementById('tutorial-prev');
    this.nextBtn = document.getElementById('tutorial-next');
    this.startBtn = document.getElementById('tutorial-start');
    this.skipBtn = document.getElementById('tutorial-skip');

    this.currentStep = 1;
    this.totalSteps = this.slides.length;

    this._bindEvents();
  }

  // 첫 방문이면 모달 표시 후 true 반환, 아니면 false
  showIfFirstVisit() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return false;
    } catch {
      // localStorage 차단 환경이라도 그냥 보여주기
    }
    this.show();
    return true;
  }

  show() {
    if (!this.modal) return;
    this.currentStep = 1;
    this._updateView();
    this.modal.classList.remove('hidden');

    // 게임 입력창의 포커스를 빼앗아 타이핑이 게임으로 가지 않도록
    const gameInput = document.getElementById('word-input');
    if (gameInput) gameInput.blur();

    // 첫 진입 시 다음 버튼에 포커스 → Enter로 진행 가능
    setTimeout(() => this.nextBtn?.focus(), 60);
  }

  hide() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* noop */
    }

    // 닫힌 직후 게임 입력창에 포커스 → 바로 타이핑 시작 가능
    const gameInput = document.getElementById('word-input');
    if (gameInput) gameInput.focus();
  }

  isOpen() {
    return this.modal && !this.modal.classList.contains('hidden');
  }

  _bindEvents() {
    this.prevBtn.addEventListener('click', () => this._goto(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this._goto(this.currentStep + 1));
    this.startBtn.addEventListener('click', () => this.hide());
    this.skipBtn.addEventListener('click', () => this.hide());

    // 도트 클릭으로 해당 슬라이드 이동
    this.dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => this._goto(idx + 1));
    });

    // 키보드 단축키: ← → 이동, Enter 다음/시작, ESC 닫기
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); this._goto(this.currentStep - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this._goto(this.currentStep + 1); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.currentStep === this.totalSteps) this.hide();
        else this._goto(this.currentStep + 1);
      }
      if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
    });
  }

  _goto(step) {
    const clamped = Math.max(1, Math.min(this.totalSteps, step));
    if (clamped === this.currentStep) return;
    this.currentStep = clamped;
    this._updateView();
  }

  _updateView() {
    // 슬라이드 표시 토글
    this.slides.forEach((slide) => {
      const stepNum = Number(slide.dataset.step);
      slide.hidden = stepNum !== this.currentStep;
    });

    // 도트 활성화
    this.dots.forEach((dot) => {
      const stepNum = Number(dot.dataset.step);
      dot.classList.toggle('active', stepNum === this.currentStep);
    });

    // 이전/다음/시작 버튼 상태
    this.prevBtn.disabled = this.currentStep === 1;
    const isLast = this.currentStep === this.totalSteps;
    this.nextBtn.hidden = isLast;
    this.startBtn.hidden = !isLast;
  }
}
