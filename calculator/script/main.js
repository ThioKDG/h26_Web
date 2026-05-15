window.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttonSection = document.querySelector('.buttonSection');
    const proBtn = document.querySelector('.pro-btn');
    const calcBody = document.querySelector('.calcBody');
    const progSection = document.querySelector('.prog-buttons');
    const modeStatus = document.getElementById('mode-status');
    
    let currentInput = "";

    // 1. PRO 모드 전환 이벤트
    proBtn.addEventListener('click', () => {
        const isPro = calcBody.classList.toggle('pro-mode');
        
        if (isPro) {
            progSection.style.display = 'grid';
            modeStatus.innerText = "PROGRAMMER MODE";
            proBtn.innerText = "BASIC";
        } else {
            progSection.style.display = 'none';
            modeStatus.innerText = "BASIC";
            proBtn.innerText = "PRO";
            display.innerText = currentInput || "0";
        }
    });

    // 2. 버튼 클릭 이벤트 (이벤트 위임)
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('buttons')) return;

        const value = e.target.innerText;

        // 결과 계산 (=)
        if (value === '=') {
            try {
                if (currentInput === "") return;
                const result = eval(currentInput);
                
                if (Number.isFinite(result)) {
                    display.innerText = result;
                    currentInput = result.toString();
                } else {
                    display.innerText = "Error";
                    currentInput = "";
                }
            } catch (error) {
                display.innerText = "Error";
                currentInput = "";
            }
        } 
        // 초기화 (AC)
        else if (value === 'AC') {
            currentInput = "";
            display.innerText = "0";
            modeStatus.innerText = calcBody.classList.contains('pro-mode') ? "PROGRAMMER MODE" : "BASIC";
        } 
        // 진법 변환 (BIN, OCT, HEX)
        else if (["BIN", "OCT", "HEX"].includes(value)) {
            const num = Number(currentInput);
            if (!isNaN(num) && currentInput !== "") {
                let converted;
                if (value === "BIN") converted = num.toString(2);
                if (value === "OCT") converted = num.toString(8);
                if (value === "HEX") converted = num.toString(16).toUpperCase();
                
                display.innerText = converted;
                modeStatus.innerText = `PRO MODE (${value})`;
            }
        } 
        // 일반 숫자 및 연산자 입력
        else {
            if (currentInput === "" && !isNaN(value)) {
                currentInput = value;
            } else {
                currentInput += value;
            }
            display.innerText = currentInput;
        }
    });

    // 3. 키보드 입력 이벤트 처리
    window.addEventListener('keydown', (e) => {
        const key = e.key;
        
        // 키보드 키값과 화면 버튼 텍스트 매핑
        const buttons = Array.from(document.querySelectorAll('.buttons'));
        const targetBtn = buttons.find(btn => {
            const text = btn.innerText;
            if (key === 'Enter') return text === '=';
            if (key === 'Escape') return text === 'AC';
            if (key === 'Backspace') return false; // 백스페이스는 별도 처리
            return text === key;
        });

        // 백스페이스 처리 (마지막 글자 지우기)
        if (key === 'Backspace') {
            currentInput = currentInput.slice(0, -1);
            display.innerText = currentInput || "0";
            return;
        }

        // 매칭되는 버튼이 있으면 클릭 시뮬레이션
        if (targetBtn) {
            e.preventDefault(); // Enter 등 브라우저 기본 동작 방지
            
            // 시각적 피드백 (CSS의 :active 효과를 JS로 재현)
            targetBtn.style.transform = "translateY(4px)";
            targetBtn.style.boxShadow = "0 1px 0 #bbb";
            
            setTimeout(() => {
                targetBtn.style.transform = "";
                targetBtn.style.boxShadow = "";
            }, 100);

            // 실제 클릭 이벤트 발생
            targetBtn.click();
        }
    });
});