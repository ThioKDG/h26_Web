// js/customWords.js
// 사용자 정의 단어를 localStorage에 저장/관리

const STORAGE_KEY = 'acidrain_custom_words_v1';
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_WORD_LEN = 20;

function emptyData() {
  return { easy: [], medium: [], hard: [] };
}

export function loadCustomWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const data = JSON.parse(raw);
    const result = emptyData();
    for (const d of DIFFICULTIES) {
      if (Array.isArray(data[d])) {
        result[d] = data[d].filter((w) => typeof w === 'string' && w.length > 0);
      }
    }
    return result;
  } catch {
    return emptyData();
  }
}

function saveCustomWords(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('커스텀 단어 저장 실패:', err);
  }
}

// 단어 추가. 중복/공백/길이 검증
// 반환: { ok: boolean, reason?: string }
export function addWord(difficulty, word) {
  if (!DIFFICULTIES.includes(difficulty)) {
    return { ok: false, reason: '난이도 값이 잘못되었습니다.' };
  }
  const clean = (word || '').trim();
  if (!clean) return { ok: false, reason: '빈 단어는 추가할 수 없습니다.' };
  if (clean.length > MAX_WORD_LEN) {
    return { ok: false, reason: `단어는 ${MAX_WORD_LEN}자 이하여야 합니다.` };
  }
  if (/\s/.test(clean)) {
    return { ok: false, reason: '단어에 공백을 포함할 수 없습니다.' };
  }

  const data = loadCustomWords();
  // 모든 난이도 통틀어 중복 체크
  for (const d of DIFFICULTIES) {
    if (data[d].includes(clean)) {
      return { ok: false, reason: `이미 ${d}에 존재합니다.` };
    }
  }
  data[difficulty].push(clean);
  saveCustomWords(data);
  return { ok: true };
}

export function removeWord(difficulty, word) {
  if (!DIFFICULTIES.includes(difficulty)) return false;
  const data = loadCustomWords();
  const idx = data[difficulty].indexOf(word);
  if (idx === -1) return false;
  data[difficulty].splice(idx, 1);
  saveCustomWords(data);
  return true;
}

export function clearCustomWords() {
  saveCustomWords(emptyData());
}

// 기본 단어 데이터와 병합한 결과 반환
export function mergeWithDefaults(defaults) {
  const custom = loadCustomWords();
  return {
    easy:   [...(defaults.easy   || []), ...custom.easy],
    medium: [...(defaults.medium || []), ...custom.medium],
    hard:   [...(defaults.hard   || []), ...custom.hard],
  };
}
