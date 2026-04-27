// --- State Management ---
let state = {
    teams: {
        blue: { name: '청군', classes: [1, 3, 5], totalScore: 0 },
        white: { name: '백군', classes: [2, 4, 6], totalScore: 0 }
    },
    games: {
        dodgeball: {
            matches: [
                { round: 1, team1: 1, team2: 2, winner: null },
                { round: 1, team1: 3, team2: 4, winner: null },
                { round: 2, team1: 5, team2: 6, winner: null },
                { round: 2, team1: 1, team2: 4, winner: null },
                { round: 3, team1: 3, team2: 6, winner: null },
                { round: 3, team1: 5, team2: 2, winner: null },
                { round: 4, team1: 1, team2: 6, winner: null },
                { round: 4, team1: 3, team2: 2, winner: null },
                { round: 5, team1: 5, team2: 4, winner: null }
            ]
        },
        plateFlip: {
            rounds: [
                { id: 1, type: '남', blueCount: 0, whiteCount: 0, winner: null },
                { id: 2, type: '여', blueCount: 0, whiteCount: 0, winner: null },
                { id: 3, type: '남', blueCount: 0, whiteCount: 0, winner: null },
                { id: 4, type: '여', blueCount: 0, whiteCount: 0, winner: null },
                { id: 5, type: '남', blueCount: 0, whiteCount: 0, winner: null },
                { id: 6, type: '여', blueCount: 0, whiteCount: 0, winner: null }
            ]
        },
        tugOfWar: {
            currentMatch: 0,
            matches: [
                { id: 1, team1: 1, team2: 2, winner: null }
            ],
            blueRemaining: [3, 5],
            whiteRemaining: [4, 6],
            finalWinner: null
        },
        relay: {
            ranks: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
        }
    }
};

const relayPoints = { 1: 500, 2: 400, 3: 300, 4: 200, 5: 100, 6: 50 };

// --- Persistence ---
function saveState() {
    calculateTotalScores();
    localStorage.setItem('soro_sports_2026', JSON.stringify(state));
    updateDashboardScores();
}

function loadState() {
    const saved = localStorage.getItem('soro_sports_2026');
    if (saved) {
        state = JSON.parse(saved);
    }
}

// --- Logic ---
function calculateTotalScores() {
    let blue = 0;
    let white = 0;

    // Dodgeball
    state.games.dodgeball.matches.forEach(m => {
        if (m.winner) {
            if (state.teams.blue.classes.includes(m.winner)) blue += 100;
            else white += 100;
        }
    });

    // Plate Flip
    state.games.plateFlip.rounds.forEach(r => {
        blue += Number(r.blueCount) || 0;
        white += Number(r.whiteCount) || 0;
        if (r.winner === 'blue') blue += 50;
        if (r.winner === 'white') white += 50;
    });

    // Tug of War
    state.games.tugOfWar.matches.forEach(m => {
        if (m.winner) {
            if (state.teams.blue.classes.includes(m.winner)) blue += 100;
            else white += 100;
        }
    });
    if (state.games.tugOfWar.finalWinner === 'blue') blue += 200;
    if (state.games.tugOfWar.finalWinner === 'white') white += 200;

    // Relay
    Object.entries(state.games.relay.ranks).forEach(([rank, classNum]) => {
        if (classNum) {
            const pts = relayPoints[rank];
            if (state.teams.blue.classes.includes(Number(classNum))) blue += pts;
            else white += pts;
        }
    });

    state.teams.blue.totalScore = blue;
    state.teams.white.totalScore = white;
}

// --- View Rendering ---
const viewContainer = document.getElementById('view-container');

function renderDashboard() {
    viewContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="view-title"><i class="fas fa-chart-line"></i> 종합 대시보드</h2>
            <div class="dashboard-grid">
                <div class="score-card blue">
                    <div class="team-name">청군 (1, 3, 5반)</div>
                    <div class="total-score" id="blue-score">${state.teams.blue.totalScore}</div>
                    <div class="class-list">도전, 열정, 승리!</div>
                </div>
                <div class="score-card white">
                    <div class="team-name">백군 (2, 4, 6반)</div>
                    <div class="total-score" id="white-score">${state.teams.white.totalScore}</div>
                    <div class="class-list">정정당당, 화합, 우정!</div>
                </div>
            </div>
            
            <div class="card">
                <h3><i class="fas fa-info-circle"></i> 경기 안내</h3>
                <p style="margin-top:10px; color: var(--text-muted);">좌측 메뉴에서 종목을 선택하여 경기 결과를 입력하고 타이머를 사용할 수 있습니다.</p>
            </div>
        </div>
    `;
}

function updateDashboardScores() {
    const bScore = document.getElementById('blue-score');
    const wScore = document.getElementById('white-score');
    if (bScore) bScore.textContent = state.teams.blue.totalScore;
    if (wScore) wScore.textContent = state.teams.white.totalScore;
}

// --- Navigation ---
document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        li.classList.add('active');
        const view = li.getAttribute('data-view');
        switchView(view);
    });
});

function switchView(view) {
    if (view === 'dashboard') renderDashboard();
    else if (view === 'dodgeball') renderDodgeball();
    else if (view === 'plateflip') renderPlateFlip();
    else if (view === 'tugofwar') renderTugOfWar();
    else if (view === 'relay') renderRelay();
}

// --- Initial Launch ---
function init() {
    loadState();
    calculateTotalScores();
    renderDashboard();
    
    // Time Update
    setInterval(() => {
        const now = new Date();
        document.getElementById('current-time').textContent = now.toLocaleString('ko-KR');
    }, 1000);
}

// Placeholder for other renders (to be expanded)
// --- Dodgeball View ---
let timerInterval;
let timeLeft = 7 * 60;

function renderDodgeball() {
    viewContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="view-title"><i class="fas fa-volleyball-ball"></i> 피구 (리그전)</h2>
            
            <div class="dashboard-grid">
                <!-- Timer Card -->
                <div class="card" style="text-align: center;">
                    <h3><i class="fas fa-stopwatch"></i> 경기 타이머</h3>
                    <div id="timer-display" style="font-size: 4rem; font-weight: 800; margin: 20px 0;">07:00</div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="toggleTimer()" id="timer-btn">시작</button>
                        <button class="btn" style="background:#eee" onclick="resetTimer()">리셋</button>
                    </div>
                </div>

                <!-- Match List Card -->
                <div class="card">
                    <h3><i class="fas fa-list-ol"></i> 대진표 및 결과</h3>
                    <div class="match-list" style="margin-top:20px; max-height: 400px; overflow-y: auto;">
                        ${state.games.dodgeball.matches.map((m, i) => `
                            <div class="match-item" style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                                <span>${m.round}R: <b>${m.team1}반</b> vs <b>${m.team2}반</b></span>
                                <div style="display:flex; gap:5px;">
                                    <button class="btn ${m.winner === m.team1 ? 'btn-primary' : ''}" style="font-size:0.8rem; padding:5px 10px;" onclick="setDodgeWinner(${i}, ${m.team1})">${m.team1} 승</button>
                                    <button class="btn ${m.winner === m.team2 ? 'btn-primary' : ''}" style="font-size:0.8rem; padding:5px 10px;" onclick="setDodgeWinner(${i}, ${m.team2})">${m.team2} 승</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card">
                <h3><i class="fas fa-graduation-cap"></i> 규칙 안내</h3>
                <ul style="margin-left:20px; margin-top:10px; color:var(--text-muted); line-height:1.6;">
                    <li>경기 시간: 1게임당 7분 (타이머 활용)</li>
                    <li>승리 시 해당 반 팀(청/백)에 100점 부여</li>
                    <li>모든 경기는 리그전 형식으로 진행됩니다.</li>
                </ul>
            </div>
        </div>
    `;
    updateTimerDisplay();
}

function setDodgeWinner(matchIndex, winnerClass) {
    const match = state.games.dodgeball.matches[matchIndex];
    match.winner = match.winner === winnerClass ? null : winnerClass;
    saveState();
    renderDodgeball();
}

function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.textContent = '시작';
    } else {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                alert('경기 시간이 종료되었습니다!');
                btn.textContent = '시작';
            }
        }, 1000);
        btn.textContent = '일시정지';
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timeLeft = 7 * 60;
    updateTimerDisplay();
    const btn = document.getElementById('timer-btn');
    if (btn) btn.textContent = '시작';
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 60) display.style.color = '#ff7675';
    else display.style.color = 'var(--text-main)';
}
// --- Plate Flip View ---
function renderPlateFlip() {
    viewContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="view-title"><i class="fas fa-sync-alt"></i> 판 뒤집기 (6라운드)</h2>
            
            <div class="card">
                <h3><i class="fas fa-edit"></i> 결과 입력</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:12px; border-bottom:2px solid #eee;">라운드</th>
                                <th style="padding:12px; border-bottom:2px solid #eee;">대상</th>
                                <th style="padding:12px; border-bottom:2px solid #eee; color:var(--primary-blue)">청군 판 개수</th>
                                <th style="padding:12px; border-bottom:2px solid #eee;">백군 판 개수</th>
                                <th style="padding:12px; border-bottom:2px solid #eee;">보너스 (+50)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.games.plateFlip.rounds.map((r, i) => `
                                <tr>
                                    <td style="padding:15px; border-bottom:1px solid #eee;">${r.id}R</td>
                                    <td style="padding:15px; border-bottom:1px solid #eee;">
                                        <i class="fas ${r.type === '남' ? 'fa-mars' : 'fa-venus'}" style="color:${r.type === '남' ? '#4364F7' : '#ff7675'}"></i> ${r.type}
                                    </td>
                                    <td style="padding:15px; border-bottom:1px solid #eee;">
                                        <input type="number" value="${r.blueCount}" onchange="updatePlateCount(${i}, 'blue', this.value)" style="width:60px; padding:5px; text-align:center; border-radius:5px; border:1px solid #ddd;">
                                    </td>
                                    <td style="padding:15px; border-bottom:1px solid #eee;">
                                        <input type="number" value="${r.whiteCount}" onchange="updatePlateCount(${i}, 'white', this.value)" style="width:60px; padding:5px; text-align:center; border-radius:5px; border:1px solid #ddd;">
                                    </td>
                                    <td style="padding:15px; border-bottom:1px solid #eee;">
                                        <span class="badge" style="padding:5px 10px; border-radius:15px; font-size:0.8rem; background:${r.winner ? (r.winner === 'blue' ? 'var(--primary-blue)' : '#eee') : '#eee'}; color:${r.winner === 'blue' ? 'white' : '#999'}">청</span>
                                        <span class="badge" style="padding:5px 10px; border-radius:15px; font-size:0.8rem; background:${r.winner ? (r.winner === 'white' ? '#2d3436' : '#eee') : '#eee'}; color:${r.winner === 'white' ? 'white' : '#999'}">백</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <h3><i class="fas fa-info-circle"></i> 규칙 안내</h3>
                <p style="margin-top:10px; color:var(--text-muted);">뒤집은 판의 개수가 그대로 점수가 되며, 더 많은 판을 확보한 팀에게 승리 보너스 <b>50점</b>이 추가됩니다.</p>
            </div>
        </div>
    `;
}

function updatePlateCount(index, team, value) {
    const round = state.games.plateFlip.rounds[index];
    if (team === 'blue') round.blueCount = Number(value);
    else round.whiteCount = Number(value);

    // Determine Winner
    if (round.blueCount > round.whiteCount) round.winner = 'blue';
    else if (round.whiteCount > round.blueCount) round.winner = 'white';
    else round.winner = null;

    saveState();
    renderPlateFlip();
}
// --- Tug of War View ---
function renderTugOfWar() {
    const tow = state.games.tugOfWar;
    const current = tow.matches[tow.matches.length - 1];
    
    viewContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="view-title"><i class="fas fa-people-arrows"></i> 줄다리기 (서바이벌 연승전)</h2>
            
            <div class="dashboard-grid">
                <!-- Current Match Card -->
                <div class="card" style="text-align: center;">
                    <h3><i class="fas fa-swords"></i> 현재 대결</h3>
                    ${tow.finalWinner ? `
                        <div style="padding:40px 0;">
                            <i class="fas fa-crown" style="font-size:4rem; color:var(--accent-gold); margin-bottom:20px;"></i>
                            <h2 style="font-size:2rem;">${tow.finalWinner === 'blue' ? '청군' : '백군'} 최종 승리!</h2>
                            <p style="color:var(--text-muted); margin-top:10px;">종목 우승 보너스 +200점 획득</p>
                        </div>
                    ` : `
                        <div style="display:flex; justify-content:center; align-items:center; gap:30px; margin:40px 0;">
                            <div class="class-box blue" style="background:var(--primary-blue); color:white; padding:20px 30px; border-radius:15px; font-size:1.5rem; font-weight:800;">
                                ${current.team1}반
                            </div>
                            <span style="font-size:2rem; font-weight:800;">VS</span>
                            <div class="class-box white" style="background:#2d3436; color:white; padding:20px 30px; border-radius:15px; font-size:1.5rem; font-weight:800;">
                                ${current.team2}반
                            </div>
                        </div>
                        <div style="display:flex; gap:15px; justify-content:center;">
                            <button class="btn btn-primary" onclick="resolveTugMatch(${current.team1})">${current.team1}반 승리</button>
                            <button class="btn" style="background:#2d3436; color:white;" onclick="resolveTugMatch(${current.team2})">${current.team2}반 승리</button>
                        </div>
                    `}
                </div>

                <!-- Match History Card -->
                <div class="card">
                    <h3><i class="fas fa-history"></i> 경기 이력</h3>
                    <div style="margin-top:20px; max-height:300px; overflow-y:auto;">
                        ${tow.matches.map((m, i) => `
                            <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                                <span>${i+1}경기: ${m.team1}반 vs ${m.team2}반</span>
                                <b style="color:${state.teams.blue.classes.includes(m.winner) ? 'var(--primary-blue)' : '#e74c3c'}">
                                    ${m.winner ? m.winner + '반 승' : '-'}
                                </b>
                            </div>
                        `).reverse().join('')}
                    </div>
                </div>
            </div>

            <div class="card">
                <h3><i class="fas fa-info-circle"></i> 규칙 안내</h3>
                <ul style="margin-left:20px; margin-top:10px; color:var(--text-muted); line-height:1.6;">
                    <li>진 패배팀은 탈락하며, 다음 주자(반)가 즉시 투입됩니다.</li>
                    <li>이긴 팀은 그대로 남아서 경기를 계속 진행합니다.</li>
                    <li>매 경기 승리 시 100점, 모든 반을 탈락시킨 최종 우승 팀에게 보너스 200점이 주어집니다.</li>
                </ul>
            </div>
        </div>
    `;
}

function resolveTugMatch(winner) {
    const tow = state.games.tugOfWar;
    const current = tow.matches[tow.matches.length - 1];
    current.winner = winner;

    const loser = (winner === current.team1) ? current.team2 : current.team1;
    
    // Check next opponent
    let nextBlue = tow.blueRemaining.length > 0 ? tow.blueRemaining[0] : null;
    let nextWhite = tow.whiteRemaining.length > 0 ? tow.whiteRemaining[0] : null;

    if (state.teams.blue.classes.includes(loser)) {
        // Blue lost
        if (nextBlue) {
            tow.blueRemaining.shift();
            tow.matches.push({ team1: nextBlue, team2: winner, winner: null });
        } else {
            tow.finalWinner = 'white';
        }
    } else {
        // White lost
        if (nextWhite) {
            tow.whiteRemaining.shift();
            tow.matches.push({ team1: winner, team2: nextWhite, winner: null });
        } else {
            tow.finalWinner = 'blue';
        }
    }

    saveState();
    renderTugOfWar();
}
// --- Relay View ---
function renderRelay() {
    viewContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="view-title"><i class="fas fa-running"></i> 이어달리기</h2>
            
            <div class="card">
                <h3><i class="fas fa-medal"></i> 최종 순위 기록</h3>
                <div style="margin-top:20px; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
                    ${[1, 2, 3, 4, 5, 6].map(rank => `
                        <div style="padding:20px; border-radius:15px; border:1px solid #eee; text-align:center; background:${rank <= 3 ? '#fff9db' : '#fff'}">
                            <div style="font-size:1.2rem; font-weight:800; margin-bottom:10px;">${rank}위 (${relayPoints[rank]}점)</div>
                            <select onchange="setRelayRank(${rank}, this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; font-weight:600;">
                                <option value="">반 선택</option>
                                ${[1, 2, 3, 4, 5, 6].map(c => `
                                    <option value="${c}" ${state.games.relay.ranks[rank] == c ? 'selected' : ''}>${c}반</option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card">
                <h3><i class="fas fa-info-circle"></i> 배점 안내</h3>
                <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                    <span class="badge" style="background:var(--accent-gold); padding:8px 15px; border-radius:20px;">1위 500점</span>
                    <span class="badge" style="background:#ced4da; padding:8px 15px; border-radius:20px;">2위 400점</span>
                    <span class="badge" style="background:#e9ecef; padding:8px 15px; border-radius:20px;">3위 300점</span>
                    <span class="badge" style="background:#f8f9fa; padding:8px 15px; border-radius:20px; border:1px solid #ddd;">4위 200점</span>
                    <span class="badge" style="background:#f8f9fa; padding:8px 15px; border-radius:20px; border:1px solid #ddd;">5위 100점</span>
                    <span class="badge" style="background:#f8f9fa; padding:8px 15px; border-radius:20px; border:1px solid #ddd;">6위 50점</span>
                </div>
                <p style="margin-top:15px; color:var(--text-muted);">대회의 마지막 경기로, 가장 높은 배점이 걸려 있어 역전의 기회가 있습니다.</p>
            </div>
        </div>
    `;
}

function setRelayRank(rank, classNum) {
    state.games.relay.ranks[rank] = classNum ? Number(classNum) : null;
    saveState();
    renderRelay();
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
        localStorage.removeItem('soro_sports_2026');
        location.reload();
    }
});

init();
