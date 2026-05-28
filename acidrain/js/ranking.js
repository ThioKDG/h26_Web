// js/ranking.js
// localStorage 기반 TOP 10 랭킹 저장/조회 모듈
// 모드별로 별도 저장소 사용: normal / crazy

const STORAGE_KEYS = {
  normal: 'acidrain_ranking_v1',
  crazy:  'acidrain_ranking_crazy_v1',
};
const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 8;

function keyFor(mode) {
  return STORAGE_KEYS[mode] || STORAGE_KEYS.normal;
}

export function loadRanking(mode = 'normal') {
  try {
    const raw = localStorage.getItem(keyFor(mode));
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e) => e && typeof e.score === 'number' && typeof e.name === 'string'
    );
  } catch {
    return [];
  }
}

function saveRanking(list, mode) {
  try {
    localStorage.setItem(keyFor(mode), JSON.stringify(list));
  } catch (err) {
    console.warn('랭킹 저장 실패:', err);
  }
}

// 점수가 TOP 10에 들어갈 수 있는지 확인 (해당 모드 기준)
export function isHighScore(score, mode = 'normal') {
  if (score <= 0) return false;
  const list = loadRanking(mode);
  if (list.length < MAX_ENTRIES) return true;
  return score > list[list.length - 1].score;
}

// 새 점수를 등록 → { list, rank } 반환 (rank는 0-based, -1이면 미등록)
export function addEntry(name, score, level, mode = 'normal') {
  const cleanName = (name || 'PLAYER').trim().slice(0, MAX_NAME_LEN) || 'PLAYER';
  const entry = {
    name: cleanName,
    score,
    level,
    date: new Date().toISOString().slice(0, 10),
  };

  const list = loadRanking(mode);
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_ENTRIES);

  saveRanking(trimmed, mode);
  const rank = trimmed.indexOf(entry);
  return { list: trimmed, rank };
}

export function clearRanking(mode) {
  try {
    if (mode) {
      localStorage.removeItem(keyFor(mode));
    } else {
      // 모드 지정 안 하면 전체 삭제
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* noop */
  }
}
