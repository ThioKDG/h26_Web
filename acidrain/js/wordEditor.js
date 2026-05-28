// js/wordEditor.js
// 사용자 단어 추가/삭제 모달 UI

import { loadCustomWords, addWord, removeWord } from './customWords.js';

export class WordEditor {
  constructor() {
    this.modal = document.getElementById('word-editor-modal');
    this.openBtn = document.getElementById('open-word-editor');
    this.closeBtn = document.getElementById('close-word-editor');
    this.input = document.getElementById('new-word-input');
    this.difficultySel = document.getElementById('new-word-difficulty');
    this.addBtn = document.getElementById('add-word-btn');
    this.feedbackEl = document.getElementById('word-editor-feedback');
    this.lists = {
      easy:   this.modal.querySelector('.word-list[data-diff="easy"]'),
      medium: this.modal.querySelector('.word-list[data-diff="medium"]'),
      hard:   this.modal.querySelector('.word-list[data-diff="hard"]'),
    };
    this.countEls = {
      easy:   this.modal.querySelector('.word-section[data-diff="easy"] .count'),
      medium: this.modal.querySelector('.word-section[data-diff="medium"] .count'),
      hard:   this.modal.querySelector('.word-section[data-diff="hard"] .count'),
    };

    // 외부에서 단어 변경을 감지할 콜백 (game.js → spawner 갱신용)
    this.onWordsChanged = null;

    this._bindEvents();
  }

  show() {
    this.modal.classList.remove('hidden');
    this._render();
    this.input.value = '';
    this.feedbackEl.textContent = '';
    setTimeout(() => this.input.focus(), 50);
  }

  hide() {
    this.modal.classList.add('hidden');
  }

  isOpen() {
    return !this.modal.classList.contains('hidden');
  }

  _bindEvents() {
    if (this.openBtn) this.openBtn.addEventListener('click', () => this.show());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.hide());

    // 모달 바깥(backdrop) 클릭 시 닫기
    const backdrop = this.modal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => this.hide());

    // ESC로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        e.stopPropagation();
        this.hide();
      }
    });

    // 추가 버튼
    this.addBtn.addEventListener('click', () => this._handleAdd());
    // Enter로 추가
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleAdd();
      }
    });
  }

  _handleAdd() {
    const word = this.input.value;
    const diff = this.difficultySel.value;
    const result = addWord(diff, word);
    if (result.ok) {
      this._showFeedback(`"${word.trim()}" 추가됨 ✓`, 'success');
      this.input.value = '';
      this._render();
      this._notifyChange();
    } else {
      this._showFeedback(result.reason || '추가 실패', 'error');
    }
    this.input.focus();
  }

  _handleRemove(diff, word) {
    if (removeWord(diff, word)) {
      this._showFeedback(`"${word}" 삭제됨`, 'success');
      this._render();
      this._notifyChange();
    }
  }

  _showFeedback(text, type) {
    this.feedbackEl.textContent = text;
    this.feedbackEl.className = `modal-feedback ${type === 'success' ? 'success' : ''}`;
    clearTimeout(this._fbTimer);
    this._fbTimer = setTimeout(() => {
      this.feedbackEl.textContent = '';
    }, 2500);
  }

  _render() {
    const data = loadCustomWords();
    for (const diff of ['easy', 'medium', 'hard']) {
      const ul = this.lists[diff];
      const countEl = this.countEls[diff];
      ul.innerHTML = '';
      countEl.textContent = data[diff].length;

      if (data[diff].length === 0) {
        const empty = document.createElement('li');
        empty.style.color = 'var(--text-dim)';
        empty.style.fontStyle = 'italic';
        empty.style.justifyContent = 'center';
        empty.textContent = '(추가된 단어 없음)';
        ul.appendChild(empty);
        continue;
      }

      for (const w of data[diff]) {
        const li = document.createElement('li');
        const text = document.createElement('span');
        text.className = 'word-text';
        text.textContent = w;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '✕';
        btn.title = '삭제';
        btn.addEventListener('click', () => this._handleRemove(diff, w));
        li.appendChild(text);
        li.appendChild(btn);
        ul.appendChild(li);
      }
    }
  }

  _notifyChange() {
    if (typeof this.onWordsChanged === 'function') {
      this.onWordsChanged();
    }
  }
}
