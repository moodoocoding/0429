import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'soro_sports_2026_react'
const TEAM_INFO = {
  blue: { name: '청팀', classes: [1, 3, 5] },
  white: { name: '백팀', classes: [2, 4, 6] },
}
const DEFAULT_POINT_RULES = {
  dodgeball: { win: 100, lose: 0 },
  plateflip: { win: 50, lose: 0 },
  tugofwar: { win: 100, lose: 0 },
  relay: { win: 300, lose: 100 },
  support: { win: 100, lose: 0 },
}
const PLATE_ROUND_TYPES = ['남', '여', '남', '여', '남', '여']
const GAME_TIMERS = {
  dodgeball: 7 * 60,
  plateflip: 7 * 60,
  tugofwar: 7 * 60,
  relay: 7 * 60,
  support: 7 * 60,
}

function createSupportPoints() {
  return { blue: 0, white: 0 }
}

function createInitialState() {
  return {
    pointRules: structuredClone(DEFAULT_POINT_RULES),
    teams: {
      blue: { ...TEAM_INFO.blue },
      white: { ...TEAM_INFO.white },
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
          { round: 5, team1: 5, team2: 4, winner: null },
        ],
      },
      plateFlip: {
        rounds: PLATE_ROUND_TYPES.map((type, index) => ({
          id: index + 1,
          type,
          blueCount: 0,
          whiteCount: 0,
          winner: null,
        })),
      },
      tugOfWar: {
        matches: [{ id: 1, team1: 1, team2: 2, winner: null }],
        blueRemaining: [3, 5],
        whiteRemaining: [4, 6],
        finalWinner: null,
      },
      relay: {
        winner: null,
      },
      support: {
        supportPoints: createSupportPoints(),
      },
    },
  }
}

function sumSupportPoints(supportPoints) {
  if (!supportPoints) return { blue: 0, white: 0 }

  if (typeof supportPoints.blue === 'number' || typeof supportPoints.white === 'number') {
    return {
      blue: Number(supportPoints.blue) || 0,
      white: Number(supportPoints.white) || 0,
    }
  }

  // Backward compatibility for old structure: { cheer: {..}, manner: {..} }
  return Object.values(supportPoints).reduce(
    (sum, category) => ({
      blue: sum.blue + (Number(category?.blue) || 0),
      white: sum.white + (Number(category?.white) || 0),
    }),
    { blue: 0, white: 0 },
  )
}

function calculateGameTotals(state) {
  const pointRules = state.pointRules || DEFAULT_POINT_RULES
  const totals = {
    dodgeball: { blue: 0, white: 0 },
    plateflip: { blue: 0, white: 0 },
    tugofwar: { blue: 0, white: 0 },
    relay: { blue: 0, white: 0 },
    support: { blue: 0, white: 0 },
  }

  state.games.dodgeball.matches.forEach((match) => {
    if (!match.winner) return
    const winnerTeam = state.teams.blue.classes.includes(match.winner) ? 'blue' : 'white'
    const loserTeam = winnerTeam === 'blue' ? 'white' : 'blue'
    totals.dodgeball[winnerTeam] += pointRules.dodgeball.win
    totals.dodgeball[loserTeam] += pointRules.dodgeball.lose
  })

  state.games.plateFlip.rounds.forEach((round) => {
    totals.plateflip.blue += Number(round.blueCount) || 0
    totals.plateflip.white += Number(round.whiteCount) || 0
    if (round.winner === 'blue') {
      totals.plateflip.blue += pointRules.plateflip.win
      totals.plateflip.white += pointRules.plateflip.lose
    }
    if (round.winner === 'white') {
      totals.plateflip.white += pointRules.plateflip.win
      totals.plateflip.blue += pointRules.plateflip.lose
    }
  })

  state.games.tugOfWar.matches.forEach((match) => {
    if (!match.winner) return
    const winnerTeam = state.teams.blue.classes.includes(match.winner) ? 'blue' : 'white'
    const loserTeam = winnerTeam === 'blue' ? 'white' : 'blue'
    totals.tugofwar[winnerTeam] += pointRules.tugofwar.win
    totals.tugofwar[loserTeam] += pointRules.tugofwar.lose
  })

  if (state.games.relay.winner === 'blue') {
    totals.relay.blue += pointRules.relay.win
    totals.relay.white += pointRules.relay.lose
  } else if (state.games.relay.winner === 'white') {
    totals.relay.white += pointRules.relay.win
    totals.relay.blue += pointRules.relay.lose
  }

  const supportTotal = sumSupportPoints(state.games.support?.supportPoints)
  totals.support.blue += supportTotal.blue
  totals.support.white += supportTotal.white

  return totals
}

function calculateScores(state) {
  const totals = calculateGameTotals(state)

  return Object.values(totals).reduce((sum, game) => {
    return {
      blue: sum.blue + game.blue,
      white: sum.white + game.white,
    }
  }, { blue: 0, white: 0 })
}

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

function classTeam(classNum) {
  return TEAM_INFO.blue.classes.includes(Number(classNum)) ? 'blue' : 'white'
}

function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createInitialState()

    try {
      const parsed = JSON.parse(saved)
      if (!parsed.pointRules) parsed.pointRules = structuredClone(DEFAULT_POINT_RULES)
      return parsed
    } catch {
      return createInitialState()
    }
  })
  const [view, setView] = useState('dashboard')
  const [now, setNow] = useState(new Date())
  const [timers, setTimers] = useState(GAME_TIMERS)
  const [runningTimer, setRunningTimer] = useState(null)
  const [activePlateRound, setActivePlateRound] = useState(0)
  const [activeDodgeRound, setActiveDodgeRound] = useState(1)

  const gameTotals = useMemo(() => calculateGameTotals(state), [state])
  const scores = useMemo(() => calculateScores(state), [state])
  const groupedDodgeballMatches = useMemo(() => {
    return state.games.dodgeball.matches.reduce((groups, match, index) => {
      const round = String(match.round)
      if (!groups[round]) groups[round] = []
      groups[round].push({ ...match, index })
      return groups
    }, {})
  }, [state.games.dodgeball.matches])
  const sportStatus = useMemo(() => {
    const dodgeFinished = state.games.dodgeball.matches.filter((match) => match.winner).length
    const plateFinished = state.games.plateFlip.rounds.filter((round) => round.winner).length
    const tug = state.games.tugOfWar
    const relayWinner = state.games.relay.winner
    const relayFinished = relayWinner ? 1 : 0
    const activePlate = state.games.plateFlip.rounds[activePlateRound] || state.games.plateFlip.rounds[0]

    return {
      dashboard: {
        title: '종합 진행 현황',
        primary: `${dodgeFinished + plateFinished + tug.matches.filter((match) => match.winner).length + relayFinished}개 기록 완료`,
        detail: '아래 카드에서 종목별 입력 상황을 확인하세요.',
      },
      dodgeball: {
        title: '피구 진행',
        primary: `${dodgeFinished}/${state.games.dodgeball.matches.length} 경기 기록`,
        detail: '라운드마다 2경기씩 묶어 승리 반을 선택합니다.',
      },
      plateflip: {
        title: '판뒤집기 진행',
        primary: `${activePlate.id}라운드 ${activePlate.blueCount}:${activePlate.whiteCount}`,
        detail: activePlate.winner === 'blue' ? '현재 라운드 청팀 보너스' : activePlate.winner === 'white' ? '현재 라운드 백팀 보너스' : '현재 라운드 동점',
      },
      tugofwar: {
        title: '줄다리기 진행',
        primary: tug.finalWinner ? `${tug.finalWinner === 'blue' ? '청팀' : '백팀'} 최종 승리` : `${tug.matches[tug.matches.length - 1].team1}반 vs ${tug.matches[tug.matches.length - 1].team2}반`,
        detail: `${tug.matches.filter((match) => match.winner).length}경기 완료`,
      },
      relay: {
        title: '이어달리기 진행',
        primary: relayWinner ? `${relayWinner === 'blue' ? '청군' : '백군'} 승리` : '승패 입력 대기',
        detail: relayWinner
          ? `승패 입력 완료 (승 ${state.pointRules.relay.win} / 패 ${state.pointRules.relay.lose})`
          : '승리 팀 버튼을 선택하세요.',
      },
      support: {
        title: '응원·매너 점수',
        primary: `청군 ${gameTotals.support.blue} / 백군 ${gameTotals.support.white}`,
        detail: `버튼 1회 클릭 시 선택팀 +${state.pointRules.support.win}, 상대팀 +${state.pointRules.support.lose}`,
      },
    }
  }, [activePlateRound, state, gameTotals.support.blue, gameTotals.support.white])
  const dodgeRounds = useMemo(() => {
    return Object.entries(groupedDodgeballMatches).map(([round, matches]) => ({
      round: Number(round),
      matches,
      finished: matches.filter((match) => match.winner).length,
    }))
  }, [groupedDodgeballMatches])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (!runningTimer) return undefined

    const interval = setInterval(() => {
      setTimers((prev) => {
        const nextValue = Math.max(prev[runningTimer] - 1, 0)
        if (nextValue === 0) setRunningTimer(null)
        return { ...prev, [runningTimer]: nextValue }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [runningTimer])

  useEffect(() => {
    const playInteractionSound = (event) => {
      if (!event.target.closest('button')) return

      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return

      const audio = new AudioContext()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(620, audio.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(920, audio.currentTime + 0.08)
      gain.gain.setValueAtTime(0.001, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.11)

      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.12)

      if (navigator.vibrate) navigator.vibrate(12)
      setTimeout(() => audio.close(), 160)
    }

    document.addEventListener('click', playInteractionSound)
    return () => document.removeEventListener('click', playInteractionSound)
  }, [])

  const navItems = [
    { key: 'dashboard', icon: 'fa-chart-line', label: '종합 대시보드' },
    { key: 'manual', icon: 'fa-book', label: '운영 매뉴얼' },
    { key: 'dodgeball', icon: 'fa-volleyball-ball', label: '피구' },
    { key: 'plateflip', icon: 'fa-sync-alt', label: '판뒤집기' },
    { key: 'tugofwar', icon: 'fa-people-arrows', label: '줄다리기' },
    { key: 'relay', icon: 'fa-running', label: '이어달리기' },
    { key: 'support', icon: 'fa-star', label: '응원·매너' },
  ]

  const gameTitles = {
    dodgeball: '피구',
    plateflip: '판뒤집기',
    tugofwar: '줄다리기',
    relay: '이어달리기',
    support: '응원·매너',
  }

  const updateDodgeWinner = (index, winnerClass) => {
    setState((prev) => {
      const next = structuredClone(prev)
      const match = next.games.dodgeball.matches[index]
      match.winner = match.winner === winnerClass ? null : winnerClass
      return next
    })
  }

  const updatePlateCount = (index, team, value) => {
    const normalized = Math.max(0, Number(value) || 0)

    setState((prev) => {
      const next = structuredClone(prev)
      const round = next.games.plateFlip.rounds[index]
      if (team === 'blue') round.blueCount = normalized
      else round.whiteCount = normalized

      if (round.blueCount > round.whiteCount) round.winner = 'blue'
      else if (round.whiteCount > round.blueCount) round.winner = 'white'
      else round.winner = null

      return next
    })
  }

  const adjustPlateCount = (index, team, amount) => {
    setState((prev) => {
      const next = structuredClone(prev)
      const round = next.games.plateFlip.rounds[index]
      const key = team === 'blue' ? 'blueCount' : 'whiteCount'
      round[key] = Math.max(0, (Number(round[key]) || 0) + amount)

      if (round.blueCount > round.whiteCount) round.winner = 'blue'
      else if (round.whiteCount > round.blueCount) round.winner = 'white'
      else round.winner = null

      return next
    })
  }

  const resolveTugMatch = (winnerClass) => {
    setState((prev) => {
      const next = structuredClone(prev)
      const tug = next.games.tugOfWar
      if (tug.finalWinner) return next

      const current = tug.matches[tug.matches.length - 1]
      const loserClass = current.team1 === winnerClass ? current.team2 : current.team1
      const loserIsBlue = next.teams.blue.classes.includes(loserClass)
      current.winner = winnerClass

      if (loserIsBlue) {
        const challenger = tug.blueRemaining.shift()
        if (challenger) tug.matches.push({ id: tug.matches.length + 1, team1: challenger, team2: winnerClass, winner: null })
        else tug.finalWinner = 'white'
      } else {
        const challenger = tug.whiteRemaining.shift()
        if (challenger) tug.matches.push({ id: tug.matches.length + 1, team1: winnerClass, team2: challenger, winner: null })
        else tug.finalWinner = 'blue'
      }

      return next
    })
  }

  const setRelayWinner = (winnerTeam) => {
    setState((prev) => {
      const next = structuredClone(prev)
      next.games.relay.winner = next.games.relay.winner === winnerTeam ? null : winnerTeam
      return next
    })
  }

  const addSupportPoint = (team) => {
    setState((prev) => {
      const next = structuredClone(prev)
      if (!next.games.support) next.games.support = { supportPoints: createSupportPoints() }
      if (typeof next.games.support.supportPoints?.blue !== 'number' || typeof next.games.support.supportPoints?.white !== 'number') {
        next.games.support.supportPoints = createSupportPoints()
      }
      const winnerTeam = team
      const loserTeam = team === 'blue' ? 'white' : 'blue'
      const supportRule = next.pointRules?.support || DEFAULT_POINT_RULES.support
      next.games.support.supportPoints[winnerTeam] += Number(supportRule.win) || 0
      next.games.support.supportPoints[loserTeam] += Number(supportRule.lose) || 0
      return next
    })
  }

  const updatePointRule = (gameKey, field, value) => {
    const normalized = Math.max(0, Number(value) || 0)
    setState((prev) => {
      const next = structuredClone(prev)
      if (!next.pointRules) next.pointRules = structuredClone(DEFAULT_POINT_RULES)
      if (!next.pointRules[gameKey]) next.pointRules[gameKey] = { win: 0, lose: 0 }
      next.pointRules[gameKey][field] = normalized
      return next
    })
  }

  const resetGameTimer = (game) => {
    setRunningTimer((current) => (current === game ? null : current))
    setTimers((prev) => ({ ...prev, [game]: GAME_TIMERS[game] }))
  }

  const adjustGameTimer = (game, amount) => {
    setTimers((prev) => ({ ...prev, [game]: Math.max(0, prev[game] + amount) }))
  }

  const resetAll = () => {
    if (!confirm('모든 데이터를 초기화하시겠습니까?')) return
    localStorage.removeItem(STORAGE_KEY)
    setState(createInitialState())
    setTimers(GAME_TIMERS)
    setRunningTimer(null)
    setActivePlateRound(0)
    setView('dashboard')
  }

  const renderGameTimer = (game) => (
    <div className="game-timer">
      <div>
        <p className="eyebrow">{gameTitles[game]} 타이머</p>
        <strong className={timers[game] <= 60 ? 'timer-display danger' : 'timer-display'}>{formatTime(timers[game])}</strong>
      </div>
      <div className="timer-controls">
        <button className="icon-btn" title="1분 감소" onClick={() => adjustGameTimer(game, -60)}>
          <i className="fas fa-minus"></i>
        </button>
        <button className="btn btn-primary" onClick={() => setRunningTimer((current) => (current === game ? null : game))}>
          <i className={runningTimer === game ? 'fas fa-pause' : 'fas fa-play'}></i>
          {runningTimer === game ? '일시정지' : '시작'}
        </button>
        <button className="icon-btn" title="1분 증가" onClick={() => adjustGameTimer(game, 60)}>
          <i className="fas fa-plus"></i>
        </button>
        <button className="btn btn-neutral" onClick={() => resetGameTimer(game)}>
          <i className="fas fa-rotate-left"></i>
          리셋
        </button>
      </div>
    </div>
  )

  const renderSupportGame = () => {
    const supportPoints = state.games.support?.supportPoints || createSupportPoints()
    const tabTotal = gameTotals.support || { blue: 0, white: 0 }
    const total = tabTotal.blue + tabTotal.white
    const blueRate = total === 0 ? 50 : Math.round((tabTotal.blue / total) * 100)
    const whiteRate = 100 - blueRate

    return (
      <div className="fade-in">
        <section className="support-board">
          <div className="view-heading">
            <h2><i className="fas fa-star"></i> 응원·매너 점수</h2>
            <span>버튼 1회 클릭: 선택팀 +{state.pointRules.support.win} / 상대팀 +{state.pointRules.support.lose}</span>
          </div>

          <div className="support-main-grid">
            <article className="support-team-card blue">
              <span>청군</span>
              <strong>{supportPoints.blue}</strong>
              <button className="btn btn-primary support-btn" onClick={() => addSupportPoint('blue')}>
                청군 선택
              </button>
            </article>

            <article className="support-center-card">
              <span>응원·매너 누적</span>
              <strong>{tabTotal.blue} : {tabTotal.white}</strong>
              <div className="plate-bar tall" aria-label="응원·매너 점수 비율">
                <span className="blue" style={{ width: `${blueRate}%` }}></span>
                <span className="white" style={{ width: `${whiteRate}%` }}></span>
              </div>
              <small>{blueRate}% : {whiteRate}%</small>
            </article>

            <article className="support-team-card white">
              <span>백군</span>
              <strong>{supportPoints.white}</strong>
              <button className="btn btn-dark support-btn" onClick={() => addSupportPoint('white')}>
                백군 선택
              </button>
            </article>
          </div>

          <div className="support-total wide">
            <strong>응원·매너 탭 누적 점수</strong>
            <span>청군 {tabTotal.blue}점</span>
            <span>백군 {tabTotal.white}점</span>
            <span>총점 {tabTotal.blue + tabTotal.white}점</span>
          </div>
        </section>
      </div>
    )
  }
  const renderDashboard = () => (
    <div className="fade-in">
      <div className="overview-grid">
        {[
          { key: 'dodgeball', icon: 'fa-volleyball-ball', label: '피구', value: sportStatus.dodgeball.primary },
          { key: 'plateflip', icon: 'fa-sync-alt', label: '판뒤집기', value: sportStatus.plateflip.primary },
          { key: 'tugofwar', icon: 'fa-people-arrows', label: '줄다리기', value: sportStatus.tugofwar.primary },
          { key: 'relay', icon: 'fa-running', label: '이어달리기', value: sportStatus.relay.primary },
          { key: 'support', icon: 'fa-star', label: '응원·매너', value: sportStatus.support.primary },
        ].map((item) => (
          <button className="overview-card" key={item.key} onClick={() => setView(item.key)}>
            <i className={`fas ${item.icon}`}></i>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>

      <section className="dashboard-summary">
        <h3>진행 요약</h3>
        <div className="dashboard-summary-list">
          <div className="dashboard-summary-row">
            <strong>피구</strong>
            <span>{state.games.dodgeball.matches.filter((match) => match.winner).length}/{state.games.dodgeball.matches.length} 경기 입력 완료</span>
          </div>
          <div className="dashboard-summary-row">
            <strong>판뒤집기</strong>
            <span>{state.games.plateFlip.rounds.filter((round) => round.blueCount > 0 || round.whiteCount > 0).length}/6 라운드 입력 완료</span>
          </div>
          <div className="dashboard-summary-row">
            <strong>줄다리기</strong>
            <span>
              {state.games.tugOfWar.finalWinner
                ? `최종 우승: ${state.games.tugOfWar.finalWinner === 'blue' ? '청팀' : '백팀'}`
                : `${state.games.tugOfWar.matches.filter((match) => match.winner).length}경기 완료`}
            </span>
          </div>
          <div className="dashboard-summary-row">
            <strong>이어달리기</strong>
            <span>
              {state.games.relay.winner
                ? `${state.games.relay.winner === 'blue' ? '청군 승리' : '백군 승리'} 입력 완료`
                : '승패 입력 대기'}
            </span>
          </div>
          <div className="dashboard-summary-row">
            <strong>응원·매너</strong>
            <span>청군 {gameTotals.support.blue}점 / 백군 {gameTotals.support.white}점</span>
          </div>
        </div>
      </section>
    </div>
  )

  const renderDodgeball = () => (
    <div className="fade-in">
      {(() => {
        const currentRound = dodgeRounds.find((item) => item.round === activeDodgeRound) || dodgeRounds[0]

        return (
          <section className="game-board">
            <div className="game-board-top">
              <div>
                <span className="sport-label"><i className="fas fa-volleyball-ball"></i> 피구</span>
                <h2>{currentRound.round}라운드</h2>
              </div>
              <div className="compact-timer">
                <strong>{formatTime(timers.dodgeball)}</strong>
                <button className="btn btn-primary" onClick={() => setRunningTimer((current) => (current === 'dodgeball' ? null : 'dodgeball'))}>
                  <i className={runningTimer === 'dodgeball' ? 'fas fa-pause' : 'fas fa-play'}></i>
                  {runningTimer === 'dodgeball' ? '정지' : '시작'}
                </button>
                <button className="icon-btn" title="리셋" onClick={() => resetGameTimer('dodgeball')}>
                  <i className="fas fa-rotate-left"></i>
                </button>
              </div>
            </div>

            <div className="active-match-grid">
              {currentRound.matches.map((match, order) => (
                <article className="active-match-card" key={`${match.round}-${match.team1}-${match.team2}`}>
                  <div className="match-number">{order + 1}경기</div>
                  <div className="versus-row">
                    {[match.team1, match.team2].map((classNum) => (
                      (() => {
                        const statusText = !match.winner
                          ? '선택'
                          : match.winner === classNum
                            ? '승리'
                            : '패배'

                        return (
                      <button
                        className={`class-choice ${classTeam(classNum)} ${match.winner === classNum ? 'selected' : ''}`}
                        key={classNum}
                        onClick={() => updateDodgeWinner(match.index, classNum)}
                      >
                        <span className="class-choice-name">{classNum}반</span>
                        <span className="class-choice-status">{statusText}</span>
                      </button>
                        )
                      })()
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <section className="fixture-board">
              <div className="fixture-head">
                <h3>?꾩껜 ?吏꾪몴</h3>
                <span>?쇱슫?쒕? ?꾨Ⅴ硫??대떦 ?낅젰 ?붾㈃?쇰줈 ?대룞</span>
              </div>
              <div className="fixture-grid">
                {dodgeRounds.map(({ round, matches, finished }) => (
                  <button
                    className={`fixture-round ${activeDodgeRound === round ? 'active' : ''}`}
                    key={`fixture-${round}`}
                    onClick={() => setActiveDodgeRound(round)}
                  >
                    <div className="fixture-round-top">
                      <strong>{round}라운드</strong>
                      <span>{finished}/{matches.length}</span>
                    </div>
                    {matches.map((match, idx) => (
                      <div className="fixture-match" key={`fixture-${round}-${idx}`}>
                        <span>{match.team1}반 vs {match.team2}반</span>
                        <em>{match.winner ? `${match.winner}반 승리` : '미입력'}</em>
                      </div>
                    ))}
                  </button>
                ))}
              </div>
            </section>
          </section>
        )
      })()}
    </div>
  )

  const renderPlateFlip = () => {
    const rounds = state.games.plateFlip.rounds
    const current = rounds[activePlateRound] || rounds[0]
    const previous = activePlateRound > 0 ? activePlateRound - 1 : null
    const next = activePlateRound < rounds.length - 1 ? activePlateRound + 1 : null
    const blueCount = Number(current.blueCount) || 0
    const whiteCount = Number(current.whiteCount) || 0
    const blueTotal = rounds.reduce((sum, round) => {
      const roundScore = Number(round.blueCount) || 0
      const bonus = round.winner === 'blue' ? 50 : 0
      return sum + roundScore + bonus
    }, 0)
    const whiteTotal = rounds.reduce((sum, round) => {
      const roundScore = Number(round.whiteCount) || 0
      const bonus = round.winner === 'white' ? 50 : 0
      return sum + roundScore + bonus
    }, 0)
    const totalCount = blueTotal + whiteTotal
    const bluePercent = totalCount === 0 ? 50 : Math.round((blueTotal / totalCount) * 100)
    const whitePercent = 100 - bluePercent
    const completedRounds = rounds.filter((round) => round.blueCount > 0 || round.whiteCount > 0).length
    const resultText = current.winner === 'blue' ? '청팀 승리 +50' : current.winner === 'white' ? '백팀 승리 +50' : '결과 미확정'

    return (
      <div className="fade-in">
        <section className="plate-compact-board">
          <div className="plate-compact-toolbar">
            <div>
              <span className="sport-label"><i className="fas fa-sync-alt"></i> 판뒤집기</span>
              <h2>{current.id}라운드({current.type})</h2>
            </div>
            <div className="compact-timer">
              <strong>{formatTime(timers.plateflip)}</strong>
              <button className="btn btn-primary" onClick={() => setRunningTimer((value) => (value === 'plateflip' ? null : 'plateflip'))}>
                <i className={runningTimer === 'plateflip' ? 'fas fa-pause' : 'fas fa-play'}></i>
                {runningTimer === 'plateflip' ? '정지' : '시작'}
              </button>
              <button className="icon-btn" title="리셋" onClick={() => resetGameTimer('plateflip')}>
                <i className="fas fa-rotate-left"></i>
              </button>
            </div>
          </div>

          <div className="plate-compact-main">
            <div className="plate-compact-team blue">
              <span>청팀</span>
              <label className="plate-compact-score-field">
                <input
                  type="number"
                  min="0"
                  value={current.blueCount}
                  onChange={(event) => updatePlateCount(activePlateRound, 'blue', event.target.value)}
                  aria-label="청팀 점수 입력"
                />
              </label>
              <div className="counter-controls compact">
                <button className="icon-btn" title="청팀 1 감소" onClick={() => adjustPlateCount(activePlateRound, 'blue', -1)}>
                  <i className="fas fa-minus"></i>
                </button>
                <button className="icon-btn" title="청팀 1 증가" onClick={() => adjustPlateCount(activePlateRound, 'blue', 1)}>
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>

            <div className="plate-compact-team white">
              <span>백팀</span>
              <label className="plate-compact-score-field">
                <input
                  type="number"
                  min="0"
                  value={current.whiteCount}
                  onChange={(event) => updatePlateCount(activePlateRound, 'white', event.target.value)}
                  aria-label="백팀 점수 입력"
                />
              </label>
              <div className="counter-controls compact">
                <button className="icon-btn" title="백팀 1 감소" onClick={() => adjustPlateCount(activePlateRound, 'white', -1)}>
                  <i className="fas fa-minus"></i>
                </button>
                <button className="icon-btn" title="백팀 1 증가" onClick={() => adjustPlateCount(activePlateRound, 'white', 1)}>
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>

            <div className="plate-compact-result">
              <span>{current.type} / {current.id}R</span>
              <strong>{resultText}</strong>
              <p>{blueTotal} : {whiteTotal}</p>
              <div className="plate-bar tall" aria-label={`${current.id}라운드별 점수 비율`}>
                <span className="blue" style={{ width: `${bluePercent}%` }}></span>
                <span className="white" style={{ width: `${whitePercent}%` }}></span>
              </div>
              <small>{bluePercent}% : {whitePercent}%</small>
            </div>
          </div>

          <div className="plate-compact-lower">
            <div className="plate-compact-round-section">
              <span className="subtle-label">라운드 이동</span>
              <div className="plate-compact-round-nav">
                <button className="btn btn-neutral" disabled={previous === null} onClick={() => setActivePlateRound(previous)}>
                  이전 라운드
                </button>
                <div className="plate-compact-round-strip">
                  {rounds.map((round, index) => (
                    <button
                      className={`plate-compact-chip ${activePlateRound === index ? 'active' : ''} ${(round.blueCount > 0 || round.whiteCount > 0) ? 'done' : ''}`}
                      key={round.id}
                      onClick={() => setActivePlateRound(index)}
                    >
                      {round.id}R
                    </button>
                  ))}
                </div>
                <button className="btn btn-neutral" disabled={next === null} onClick={() => setActivePlateRound(next)}>
                  다음 라운드
                </button>
              </div>
            </div>

            <div className="plate-compact-summary">
              <span>완료 라운드 <strong>{completedRounds}/6</strong></span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const renderTugOfWar = () => {
    const tug = state.games.tugOfWar
    const current = tug.matches[tug.matches.length - 1]
    const completedMatches = tug.matches.filter((match) => match.winner).length
    const maxMatches = state.teams.blue.classes.length + state.teams.white.classes.length - 1
    const progressPercent = Math.round((completedMatches / maxMatches) * 100)
    const blueMatchWins = tug.matches.filter((match) => match.winner && state.teams.blue.classes.includes(match.winner)).length
    const whiteMatchWins = tug.matches.filter((match) => match.winner && state.teams.white.classes.includes(match.winner)).length
    const blueAlive = tug.finalWinner
      ? tug.finalWinner === 'blue' ? 1 : 0
      : tug.blueRemaining.length + 1
    const whiteAlive = tug.finalWinner
      ? tug.finalWinner === 'white' ? 1 : 0
      : tug.whiteRemaining.length + 1
    const duelTeams = [current.team1, current.team2]
      .map((classNum) => ({ classNum, team: classTeam(classNum) }))
      .sort((a, b) => (a.team === b.team ? 0 : a.team === 'blue' ? -1 : 1))

    return (
      <div className="fade-in">
        <section className="tug-board">
          <div className="tug-toolbar">
            <div>
              <span className="sport-label"><i className="fas fa-people-arrows"></i> 줄다리기</span>
              <h2>{tug.finalWinner ? '경기 입력 완료' : `${current.id}경기 진행 중`}</h2>
            </div>
          </div>

          <div className="tug-status-grid">
            <article className="tug-status-card">
              <span>진행률</span>
              <strong>{completedMatches}/{maxMatches} 경기</strong>
            </article>
            <article className="tug-status-card">
              <span>팀 승리</span>
              <strong>청팀 {blueMatchWins} : {whiteMatchWins} 백팀</strong>
            </article>
            <article className="tug-status-card">
              <span>남은 반</span>
              <strong>청팀 {blueAlive} / 백팀 {whiteAlive}</strong>
            </article>
          </div>

          <div className="tug-progress" aria-label="줄다리기 진행률">
            <span style={{ width: `${progressPercent}%` }}></span>
          </div>

          <div className="tug-live-grid">
            <article className="tug-current-card">
              {tug.finalWinner ? (
                <div className="tug-final">
                  <i className="fas fa-crown winner-icon"></i>
                  <h3>{tug.finalWinner === 'blue' ? '청팀' : '백팀'} 최종 승리</h3>
                  <p>종목 우승 보너스 +200점</p>
                </div>
              ) : (
                <div className="tug-duel">
                  <button
                    key={`tug-choice-${duelTeams[0].classNum}`}
                    className={`tug-duel-btn ${duelTeams[0].team}`}
                    onClick={() => resolveTugMatch(duelTeams[0].classNum)}
                  >
                    <span className="eyebrow">청팀</span>
                    <strong>{duelTeams[0].classNum}반</strong>
                    <small>{duelTeams[0].classNum}반 승리 입력</small>
                  </button>
                  <div className="tug-duel-vs">VS</div>
                  <button
                    key={`tug-choice-${duelTeams[1].classNum}`}
                    className={`tug-duel-btn ${duelTeams[1].team}`}
                    onClick={() => resolveTugMatch(duelTeams[1].classNum)}
                  >
                    <span className="eyebrow">백팀</span>
                    <strong>{duelTeams[1].classNum}반</strong>
                    <small>{duelTeams[1].classNum}반 승리 입력</small>
                  </button>
                </div>
              )}
            </article>

            <article className="tug-history-card">
              <h3><i className="fas fa-history"></i> 경기 이력</h3>
              <div className="tug-history-list">
                {tug.matches.map((match) => (
                  <div className="tug-history-item" key={match.id}>
                    <span>{match.id}경기 {match.team1}반 vs {match.team2}반</span>
                    <strong className={match.winner ? classTeam(match.winner) : ''}>
                      {match.winner ? `${match.winner}반 승리` : '진행 중'}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    )
  }
  const renderRelay = () => (
    <div className="fade-in">
      <div className="view-heading">
        <h2><i className="fas fa-running"></i> 이어달리기</h2>
        <span>승패 입력</span>
      </div>

      <section className="game-board">
        <div className="game-board-top">
          <div>
            <span className="sport-label"><i className="fas fa-running"></i> 이어달리기</span>
            <h2>승리팀 선택</h2>
          </div>
          <p className="eyebrow">승리팀 {state.pointRules.relay.win}점 · 패배팀 {state.pointRules.relay.lose}점</p>
        </div>

        <div className="versus-row">
          {['blue', 'white'].map((team) => {
            const selected = state.games.relay.winner === team
            const statusText = !state.games.relay.winner
              ? '승리 선택'
              : selected
                ? `${team === 'blue' ? '청군' : '백군'} 승리`
                : `${team === 'blue' ? '청군' : '백군'} 패배`

            return (
              <button
                key={`relay-${team}`}
                className={`class-choice ${team} ${selected ? 'selected' : ''}`}
                onClick={() => setRelayWinner(team)}
              >
                <span className="class-choice-name">{team === 'blue' ? '청군' : '백군'}</span>
                <span className="class-choice-status">{statusText}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )

  const renderManual = () => (
    <div className="fade-in">
      <section className="manual-container">
        <div className="view-heading">
          <h2><i className="fas fa-book"></i> 운동회 운영 매뉴얼</h2>
          <span>동학년 선생님들을 위한 운영 지침입니다.</span>
        </div>

        <div className="manual-grid">
          <article className="manual-card">
            <h3><i className="fas fa-info-circle"></i> 전체 개요</h3>
            <ul>
              <li><strong>일시:</strong> 2026년 4월 29일 (수) 09:00 - 12:00</li>
              <li><strong>장소:</strong> 학교 운동장</li>
              <li><strong>준비물:</strong> 호각, 타이머(본 앱), 각 종목별 도구</li>
              <li><strong>진행순서:</strong> 개회식 → 피구 → 판뒤집기 → 줄다리기 → 이어달리기 → 폐회식</li>
            </ul>
          </article>

          <article className="manual-card">
            <h3><i className="fas fa-volleyball-ball"></i> 피구 규칙</h3>
            <ul>
              <li><strong>경기 시간:</strong> 라운드당 7분</li>
              <li><strong>인원:</strong> 학급 전원 참여 (내야/외야 구분)</li>
              <li><strong>승리 조건:</strong> 종료 시 내야 인원이 더 많은 반</li>
              <li><strong>교사 역할:</strong> 심판 1명(중앙), 인원 체크 및 안전 지도 1명</li>
            </ul>
          </article>

          <article className="manual-card">
            <h3><i className="fas fa-sync-alt"></i> 판뒤집기 규칙</h3>
            <ul>
              <li><strong>경기 방식:</strong> 남학생/여학생 교대로 6라운드 진행</li>
              <li><strong>승리 조건:</strong> 자신의 팀 색깔이 더 많이 보이도록 뒤집기</li>
              <li><strong>교사 역할:</strong> 경기 시작/종료 신호, 종료 후 판 개수 집계</li>
              <li><strong>주의사항:</strong> 손가락 부상 주의, 종료 신호 후 손 떼기 철저히 지도</li>
            </ul>
          </article>

          <article className="manual-card">
            <h3><i className="fas fa-people-arrows"></i> 줄다리기 규칙</h3>
            <ul>
              <li><strong>경기 방식:</strong> 토너먼트 형식으로 진행</li>
              <li><strong>승리 조건:</strong> 중앙 표시선이 자기 쪽으로 넘어오게 당기기</li>
              <li><strong>교사 역할:</strong> 줄 중앙 정렬 확인, 시작 신호, 장갑 착용 확인</li>
              <li><strong>안전:</strong> 줄에 몸을 감지 않도록 주의, 넘어진 학생 발생 시 즉시 중단</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  )

  const renderSettings = () => {
    const settingRows = [
      { key: 'dodgeball', label: '피구' },
      { key: 'plateflip', label: '판뒤집기' },
      { key: 'tugofwar', label: '줄다리기' },
      { key: 'relay', label: '이어달리기' },
      { key: 'support', label: '응원·매너' },
    ]

    return (
      <div className="fade-in">
        <section className="settings-board">
          <div className="view-heading">
            <h2><i className="fas fa-gear"></i> 점수 설정</h2>
            <span>종목별 승리/패배 점수를 원하는 값으로 수정하세요.</span>
          </div>

          <div className="settings-grid">
            {settingRows.map((item) => (
              <article className="settings-card" key={`settings-${item.key}`}>
                <h3>{item.label}</h3>
                <div className="settings-inputs">
                  <label>
                    <span>승리 점수</span>
                    <input
                      type="number"
                      min="0"
                      value={state.pointRules?.[item.key]?.win ?? DEFAULT_POINT_RULES[item.key].win}
                      onChange={(event) => updatePointRule(item.key, 'win', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>패배 점수</span>
                    <input
                      type="number"
                      min="0"
                      value={state.pointRules?.[item.key]?.lose ?? DEFAULT_POINT_RULES[item.key].lose}
                      onChange={(event) => updatePointRule(item.key, 'lose', event.target.value)}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const renderView = () => {
    switch (view) {
      case 'manual': return renderManual()
      case 'dodgeball': return renderDodgeball()
      case 'plateflip': return renderPlateFlip()
      case 'tugofwar': return renderTugOfWar()
      case 'relay': return renderRelay()
      case 'support': return renderSupportGame()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  return (
    <div id="app">
      <nav id="sidebar">
        <div className="sidebar-header">
          <i className="fas fa-trophy"></i>
          <span>체육대회 관리</span>
        </div>
        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.key} className={view === item.key ? 'active' : ''} onClick={() => setView(item.key)}>
              <i className={`fas ${item.icon}`}></i>
              {item.label}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button id="settings-btn" onClick={() => setView('settings')}>
            <i className="fas fa-gear"></i> 설정
          </button>
          <button id="reset-btn" onClick={resetAll}><i className="fas fa-undo"></i> 데이터 초기화</button>
        </div>
      </nav>

      <main id="main-content">
        <header className="main-header" aria-label="전체 누적 점수">
          <div className="scoreboard-meta">
            <span>2026 청주프로초 5학년 체육대회</span>
            <strong>전체 누적 점수</strong>
            <small>{now.toLocaleString('ko-KR')}</small>
          </div>
          <div className="hero-scoreboard">
            <div className="hero-team blue">
              <span>청팀</span>
              <strong>{scores.blue}</strong>
              <small>1, 3, 5반</small>
            </div>
            <div className="hero-vs">VS</div>
            <div className="hero-team white">
              <span>백팀</span>
              <strong>{scores.white}</strong>
              <small>2, 4, 6반</small>
            </div>
          </div>
        </header>

        <section id="view-container">{renderView()}</section>
      </main>
    </div>
  )
}

export default App


