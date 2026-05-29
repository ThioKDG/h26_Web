// js/main.js
// 진입점: words.json을 fetch하고 Game 인스턴스를 만들어 시작

import { Game } from './game.js';
import { Tutorial } from './tutorial.js';

async function main() {
  let game;
  try {
    const res = await fetch('./data/words.json');
    if (!res.ok) throw new Error(`단어 데이터 로드 실패: ${res.status}`);

    const wordData = await res.json();
    game = new Game(wordData);
    game.init();
  } catch (err) {
    console.error('게임 초기화 오류:', err);

    // 로드 실패 시 내장 fallback 단어로 시작
    const fallback = {
      easy: ['사과', '나무', '하늘', '바다', '바람', '구름', '달빛', '별빛'],
      medium: ['컴퓨터', '키보드', '도서관', '지하철', '자전거'],
      hard: ['프로그래밍', '인공지능', '대한민국', '알고리즘'],
    };
    game = new Game(fallback);
    game.init();
  }

  // 첫 방문 사용자에게만 튜토리얼 표시 (이후 자동 생략)
  const tutorial = new Tutorial();
  tutorial.showIfFirstVisit();
}

main();
