import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Tone from "tone";

/* ============================================================
   MINI STYLED-COMPONENTS ENGINE
   (real `styled-components` isn't available in this sandbox,
   so this reproduces the same tagged-template API: styled.div`...`
   with automatic theme injection + transient $props support)
   ============================================================ */
let sheetEl;
function getSheet() {
  if (!sheetEl) {
    sheetEl = document.createElement("style");
    sheetEl.setAttribute("data-styled-engine", "true");
    document.head.appendChild(sheetEl);
  }
  return sheetEl;
}
const ruleCache = new Map();
let counter = 0;

function resolveCss(strings, values, props) {
  let css = strings[0];
  values.forEach((v, i) => {
    const val = typeof v === "function" ? v(props) : v;
    css += (val ?? "") + strings[i + 1];
  });
  return css;
}

function styledFactory(tag) {
  return (strings, ...values) => {
    return React.forwardRef(function StyledComponent(props, ref) {
      const theme = useContext(ThemeContext);
      const mergedProps = { ...props, theme };
      const css = resolveCss(strings, values, mergedProps);

      const className = useMemo(() => {
        if (ruleCache.has(css)) return ruleCache.get(css);
        const name = `sc-${(counter++).toString(36)}`;
        getSheet().textContent += `\n.${name}{${css}}\n`;
        ruleCache.set(css, name);
        return name;
      }, [css]);

      const domProps = {};
      Object.keys(props).forEach((k) => {
        if (k === "children" || k.startsWith("$")) return;
        domProps[k] = props[k];
      });

      return React.createElement(
        tag,
        { ref, ...domProps, className: `${className} ${props.className || ""}`.trim() },
        props.children
      );
    });
  };
}
const styled = new Proxy(styledFactory, {
  get: (target, prop) => target(prop),
});

/* ============================================================
   THEME
   ============================================================ */
const themes = {
  dark: {
    name: "dark",
    bg: "#0a0e1a",
    surface: "#121a30",
    surface2: "#1b2547",
    border: "#2c3768",
    text: "#e9edfb",
    textDim: "#8b93c4",
    cyan: "#33e6ff",
    magenta: "#ff4fc3",
    amber: "#ffce3d",
    shadow: "0 20px 60px rgba(0,0,0,0.55)",
    screenGlow: "0 0 24px rgba(51,230,255,0.15)",
  },
  light: {
    name: "light",
    bg: "#e6eaf4",
    surface: "#fbfcff",
    surface2: "#eef1fa",
    border: "#c7cfe6",
    text: "#141a33",
    textDim: "#5c6690",
    cyan: "#0091a8",
    magenta: "#c21f85",
    amber: "#a5760a",
    shadow: "0 20px 50px rgba(30,40,80,0.18)",
    screenGlow: "0 0 0 rgba(0,0,0,0)",
  },
};
const ThemeContext = createContext(themes.dark);

/* ============================================================
   SOUND ENGINE (Tone.js) — SFX + mixtape music player
   ============================================================ */
const TRACKS = [
  {
    name: "8-BIT BOP",
    bpm: 128,
    wave: "square",
    notes: ["C4", "E4", "G4", "C5", "G4", "E4", "A4", "E4"],
    subdivision: "8n",
  },
  {
    name: "CHILL BYTE",
    bpm: 84,
    wave: "triangle",
    notes: ["D4", "F4", "A4", "F4", "C4", "A3", "D4", "A3"],
    subdivision: "4n",
  },
  {
    name: "NEON RUSH",
    bpm: 160,
    wave: "sawtooth",
    notes: ["E4", "G4", "B4", "E5", "B4", "G4", "D5", "G4"],
    subdivision: "16n",
  },
];

const SoundContext = createContext(null);

function SoundProvider({ children }) {
  const clickSynth = useRef(null);
  const winSynth = useRef(null);
  const musicSynth = useRef(null);
  const seq = useRef(null);
  const started = useRef(false);

  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(-10);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      volume: -8,
    }).toDestination();

    winSynth.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.4 },
      volume: -6,
    }).toDestination();

    musicSynth.current = new Tone.Synth({
      oscillator: { type: TRACKS[0].wave },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.05, release: 0.08 },
      volume,
    }).toDestination();

    return () => {
      seq.current?.dispose();
      clickSynth.current?.dispose();
      winSynth.current?.dispose();
      musicSynth.current?.dispose();
      Tone.Transport.stop();
    };
    // eslint-disable-next-line
  }, []);

  const ensureStarted = useCallback(async () => {
    if (!started.current) {
      await Tone.start();
      started.current = true;
    }
  }, []);

  const buildSequence = useCallback((idx) => {
    seq.current?.dispose();
    const track = TRACKS[idx];
    musicSynth.current.oscillator.type = track.wave;
    Tone.Transport.bpm.value = track.bpm;
    let step = 0;
    seq.current = new Tone.Sequence(
      (time, note) => {
        musicSynth.current.triggerAttackRelease(note, "16n", time);
        step = (step + 1) % track.notes.length;
        Tone.Draw.schedule(() => setBeat(step), time);
      },
      track.notes,
      track.subdivision
    ).start(0);
  }, []);

  useEffect(() => {
    buildSequence(trackIndex);
    if (playing) Tone.Transport.start();
    // eslint-disable-next-line
  }, [trackIndex]);

  useEffect(() => {
    musicSynth.current && (musicSynth.current.volume.value = muted ? -Infinity : volume);
  }, [volume, muted]);

  const playClick = useCallback(async () => {
    await ensureStarted();
    if (muted) return;
    clickSynth.current.triggerAttackRelease("C5", "32n");
  }, [muted, ensureStarted]);

  const playWin = useCallback(async () => {
    await ensureStarted();
    if (muted) return;
    const now = Tone.now();
    ["C4", "E4", "G4", "C5"].forEach((n, i) =>
      winSynth.current.triggerAttackRelease(n, "8n", now + i * 0.09)
    );
  }, [muted, ensureStarted]);

  const playDraw = useCallback(async () => {
    await ensureStarted();
    if (muted) return;
    const now = Tone.now();
    ["A3", "G3", "F3"].forEach((n, i) =>
      winSynth.current.triggerAttackRelease(n, "8n", now + i * 0.1)
    );
  }, [muted, ensureStarted]);

  const toggleMusic = useCallback(async () => {
    await ensureStarted();
    if (playing) {
      Tone.Transport.pause();
      setPlaying(false);
    } else {
      Tone.Transport.start();
      setPlaying(true);
    }
  }, [playing, ensureStarted]);

  const nextTrack = useCallback(() => {
    setTrackIndex((i) => (i + 1) % TRACKS.length);
  }, []);
  const prevTrack = useCallback(() => {
    setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  }, []);

  const value = {
    playClick,
    playWin,
    playDraw,
    toggleMusic,
    nextTrack,
    prevTrack,
    playing,
    muted,
    setMuted,
    volume,
    setVolume,
    trackIndex,
    beat,
    track: TRACKS[trackIndex],
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
const useSound = () => useContext(SoundContext);

/* ============================================================
   STYLED PRIMITIVES
   ============================================================ */
const Cabinet = styled.div`
  width: min(94vw, 460px);
  background: ${(p) => p.theme.surface};
  border: 2px solid ${(p) => p.theme.border};
  border-radius: 22px;
  padding: 22px 22px 26px;
  box-shadow: ${(p) => p.theme.shadow};
  position: relative;
  transition: background 0.35s ease, border-color 0.35s ease;
  font-family: "Space Mono", ui-monospace, monospace;
`;

const Screw = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.theme.border};
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.4);
`;

const Marquee = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: 15px;
  letter-spacing: 2px;
  text-align: center;
  color: ${(p) => p.theme.text};
  padding: 10px 6px 14px;
  text-shadow: ${(p) => (p.theme.name === "dark" ? `0 0 10px ${p.theme.cyan}88` : "none")};
`;

const ChaseLights = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
`;

const Light = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$on ? p.theme.amber : p.theme.border)};
  box-shadow: ${(p) => (p.$on ? `0 0 8px ${p.theme.amber}` : "none")};
  transition: background 0.15s, box-shadow 0.15s;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const ScoreStrip = styled.div`
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: ${(p) => p.theme.textDim};
`;

const ScoreChip = styled.span`
  padding: 3px 8px;
  border-radius: 8px;
  background: ${(p) => p.theme.surface2};
  border: 1px solid ${(p) => p.theme.border};
  color: ${(p) => p.$color || p.theme.text};
`;

const ThemeSwitch = styled.button`
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.surface2};
  color: ${(p) => p.theme.text};
  border-radius: 999px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  &:hover { transform: rotate(18deg) scale(1.08); }
  &:active { transform: scale(0.92); }
`;

const Screen = styled.div`
  background: ${(p) => (p.theme.name === "dark" ? "#060a14" : "#f4f6fc")};
  border: 1px solid ${(p) => p.theme.border};
  border-radius: 14px;
  padding: 14px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), ${(p) => p.theme.screenGlow};
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const Cell = styled.button`
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$win ? `${p.theme.amber}22` : p.theme.surface2)};
  color: ${(p) => (p.$value === "X" ? p.theme.cyan : p.theme.magenta)};
  font-family: "Press Start 2P", monospace;
  font-size: clamp(20px, 6vw, 28px);
  cursor: ${(p) => (p.$value || p.$gameOver ? "default" : "pointer")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: ${(p) => (p.$win ? `0 0 14px ${p.theme.amber}66` : "none")};
  &:hover {
    background: ${(p) => (!p.$value && !p.$gameOver ? p.theme.border : p.$win ? `${p.theme.amber}22` : p.theme.surface2)};
  }
  &:active { transform: ${(p) => (!p.$value && !p.$gameOver ? "scale(0.94)" : "none")}; }
`;

const StatusBar = styled.div`
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: ${(p) => p.theme.textDim};
  min-height: 18px;
`;

const Highlight = styled.span`
  color: ${(p) => (p.$who === "X" ? p.theme.cyan : p.$who === "O" ? p.theme.magenta : p.theme.amber)};
  font-weight: bold;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
`;

const GhostButton = styled.button`
  flex: 1;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.border};
  background: transparent;
  color: ${(p) => p.theme.text};
  font-family: "Space Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  cursor: pointer;
  opacity: ${(p) => (p.disabled ? 0.4 : 1)};
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s ease, transform 0.1s ease;
  &:hover { background: ${(p) => (p.disabled ? "transparent" : p.theme.surface2)}; }
  &:active { transform: ${(p) => (p.disabled ? "none" : "scale(0.97)")}; }
`;

const ModeRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
`;

const ModeBtn = styled.button`
  flex: 1;
  padding: 7px 6px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$active ? p.theme.cyan : "transparent")};
  color: ${(p) => (p.$active ? (p.theme.name === "dark" ? "#06121a" : "#fff") : p.theme.textDim)};
  font-family: "Space Mono", monospace;
  font-size: 9.5px;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  &:hover { background: ${(p) => (p.$active ? p.theme.cyan : p.theme.surface2)}; }
`;

const HistoryList = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const HistoryBtn = styled.button`
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 7px;
  border: 1px solid ${(p) => (p.$active ? p.theme.amber : p.theme.border)};
  background: ${(p) => (p.$active ? `${p.theme.amber}22` : p.theme.surface2)};
  color: ${(p) => p.theme.text};
  font-family: "Space Mono", monospace;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
`;

/* ---------- Mixtape music player ---------- */
const Mixtape = styled.div`
  margin-top: 18px;
  border-radius: 12px;
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.surface2};
  padding: 12px 14px;
`;

const TapeWindow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${(p) => (p.theme.name === "dark" ? "#060a14" : "#eef1fb")};
  border: 1px solid ${(p) => p.theme.border};
  border-radius: 8px;
  padding: 10px 16px;
`;

const Reel = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid ${(p) => p.theme.textDim};
  border-top-color: ${(p) => p.theme.cyan};
  animation: ${(p) => (p.$spin ? "spin 0.9s linear infinite" : "none")};
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const TrackName = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: 10px;
  color: ${(p) => p.theme.text};
  letter-spacing: 1px;
`;

const TrackSub = styled.div`
  font-size: 10px;
  color: ${(p) => p.theme.textDim};
  margin-top: 4px;
`;

const TapeButtons = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 10px;
  align-items: center;
`;

const TapeBtn = styled.button`
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$active ? p.theme.cyan : p.theme.surface)};
  color: ${(p) => (p.$active ? (p.theme.name === "dark" ? "#06121a" : "#fff") : p.theme.text)};
  border-radius: 8px;
  width: 30px;
  height: 26px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  &:active { transform: scale(0.92); }
`;

const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const Range = styled.input`
  width: 68px;
  accent-color: ${(p) => p.theme.cyan};
`;

/* ============================================================
   GAME LOGIC
   ============================================================ */
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function calculateWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function emptyIndices(board) {
  return board.reduce((acc, v, i) => (v ? acc : [...acc, i]), []);
}

// AI is always "O", human is always "X".
// minimax explores every remaining line to the end and scores terminal
// boards: +10 for an O win, -10 for an X win, 0 for a draw, adjusted by
// depth so the AI prefers to win sooner and lose later.
function minimax(board, depth, isMaximizing) {
  const result = calculateWinner(board);
  if (result) return result.winner === "O" ? 10 - depth : depth - 10;
  if (board.every(Boolean)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of emptyIndices(board)) {
      board[i] = "O";
      best = Math.max(best, minimax(board, depth + 1, false));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of emptyIndices(board)) {
      board[i] = "X";
      best = Math.min(best, minimax(board, depth + 1, true));
      board[i] = null;
    }
    return best;
  }
}

function getBestMove(board) {
  let bestScore = -Infinity;
  let move = null;
  for (const i of emptyIndices(board)) {
    board[i] = "O";
    const score = minimax(board, 0, false);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

function getRandomMove(board) {
  const options = emptyIndices(board);
  return options[Math.floor(Math.random() * options.length)];
}

const MODES = [
  { id: "pvp", label: "2P" },
  { id: "ai-easy", label: "VS AI · EASY" },
  { id: "ai-hard", label: "VS AI · HARD" },
];

/* ============================================================
   GAME
   ============================================================ */
function Game() {
  const theme = useContext(ThemeContext);
  const sound = useSound();

  // history[0] is the empty board; history[n] is the board after move n.
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [chaseIndex, setChaseIndex] = useState(0);
  const [mode, setMode] = useState("pvp");

  const board = history[currentMove];
  const xIsNext = currentMove % 2 === 0;
  const result = calculateWinner(board);
  const isDraw = !result && board.every(Boolean);
  const gameOver = Boolean(result) || isDraw;
  const isReplaying = currentMove !== history.length - 1;
  const aiTurn = mode !== "pvp" && !xIsNext && !gameOver && !isReplaying;

  useEffect(() => {
    const id = setInterval(() => setChaseIndex((i) => (i + 1) % 6), 260);
    return () => clearInterval(id);
  }, []);

  const scoredRef = useRef(false);
  useEffect(() => {
    if (isReplaying) return;
    if (result && !scoredRef.current) {
      scoredRef.current = true;
      setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
      sound.playWin();
    } else if (isDraw && !scoredRef.current) {
      scoredRef.current = true;
      setScores((s) => ({ ...s, D: s.D + 1 }));
      sound.playDraw();
    }
    // eslint-disable-next-line
  }, [result, isDraw, isReplaying]);

  const makeMove = useCallback(
    (i) => {
      setHistory((h) => {
        const base = h.slice(0, currentMove + 1);
        const current = base[base.length - 1];
        if (current[i] || calculateWinner(current)) return h;
        const next = current.slice();
        next[i] = currentMove % 2 === 0 ? "X" : "O";
        return [...base, next];
      });
      setCurrentMove((m) => m + 1);
    },
    [currentMove]
  );

  const handleClick = (i) => {
    if (board[i] || gameOver || isReplaying || aiTurn) return;
    sound.playClick();
    makeMove(i);
  };

  // AI's turn: after a short "thinking" delay, play a move.
  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const b = board.slice();
      const move = mode === "ai-hard" ? getBestMove(b) : getRandomMove(b);
      if (move != null) {
        sound.playClick();
        makeMove(move);
      }
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [aiTurn, board, mode]);

  const jumpTo = (move) => setCurrentMove(move);
  const undo = () => currentMove > 0 && setCurrentMove((m) => m - 1);
  const redo = () => currentMove < history.length - 1 && setCurrentMove((m) => m + 1);

  const resetRound = () => {
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
    scoredRef.current = false;
  };

  const resetAll = () => {
    resetRound();
    setScores({ X: 0, O: 0, D: 0 });
  };

  const changeMode = (id) => {
    setMode(id);
    resetRound();
  };

  let statusNode;
  if (isReplaying) {
    statusNode = <>VIEWING MOVE {currentMove}/{history.length - 1}</>;
  } else if (result) {
    statusNode = <>WINNER: <Highlight $who={result.winner}>{result.winner}</Highlight></>;
  } else if (isDraw) {
    statusNode = <Highlight $who="D">DRAW GAME</Highlight>;
  } else if (aiTurn) {
    statusNode = <>AI THINKING…</>;
  } else {
    statusNode = <>TURN: <Highlight $who={xIsNext ? "X" : "O"}>{xIsNext ? "X" : "O"}</Highlight></>;
  }

  return (
    <Cabinet>
      <Screw style={{ top: 10, left: 10 }} />
      <Screw style={{ top: 10, right: 10 }} />
      <Screw style={{ bottom: 10, left: 10 }} />
      <Screw style={{ bottom: 10, right: 10 }} />

      <TopRow>
        <ScoreStrip>
          <ScoreChip $color={theme.cyan}>X {scores.X}</ScoreChip>
          <ScoreChip $color={theme.magenta}>O {scores.O}</ScoreChip>
          <ScoreChip $color={theme.amber}>= {scores.D}</ScoreChip>
        </ScoreStrip>
        <ThemeSwitchButton />
      </TopRow>

      <Marquee>TIC · TAC · TOE</Marquee>
      <ChaseLights>
        {Array.from({ length: 6 }).map((_, i) => (
          <Light key={i} $on={i === chaseIndex} />
        ))}
      </ChaseLights>

      <ModeRow>
        {MODES.map((m) => (
          <ModeBtn key={m.id} $active={mode === m.id} onClick={() => changeMode(m.id)}>
            {m.label}
          </ModeBtn>
        ))}
      </ModeRow>

      <Screen>
        <Board>
          {board.map((val, i) => (
            <Cell
              key={i}
              $value={val}
              $gameOver={gameOver || isReplaying || aiTurn}
              $win={Boolean(result && result.line.includes(i))}
              onClick={() => handleClick(i)}
              aria-label={`cell-${i}`}
            >
              {val}
            </Cell>
          ))}
        </Board>
        <StatusBar>{statusNode}</StatusBar>
      </Screen>

      <Controls>
        <GhostButton onClick={undo} disabled={currentMove === 0}>◀ UNDO</GhostButton>
        <GhostButton onClick={redo} disabled={currentMove === history.length - 1}>REDO ▶</GhostButton>
      </Controls>
      <Controls>
        <GhostButton onClick={resetRound}>NEW ROUND</GhostButton>
        <GhostButton onClick={resetAll}>RESET SCORE</GhostButton>
      </Controls>

      {history.length > 1 && (
        <HistoryList>
          {history.map((_, move) => (
            <HistoryBtn key={move} $active={move === currentMove} onClick={() => jumpTo(move)}>
              {move === 0 ? "START" : `#${move}`}
            </HistoryBtn>
          ))}
        </HistoryList>
      )}

      <MusicPlayer />
    </Cabinet>
  );
}

function ThemeSwitchButton() {
  const { themeName, toggleTheme } = useContext(ThemeSwitchContext);
  return (
    <ThemeSwitch onClick={toggleTheme} aria-label="toggle theme">
      {themeName === "dark" ? "☾" : "☀"}
    </ThemeSwitch>
  );
}

function MusicPlayer() {
  const sound = useSound();
  const track = sound.track;

  return (
    <Mixtape>
      <TapeWindow>
        <Reel $spin={sound.playing} />
        <div style={{ textAlign: "center" }}>
          <TrackName>{track.name}</TrackName>
          <TrackSub>{track.bpm} BPM · {sound.playing ? "PLAYING" : "PAUSED"}</TrackSub>
        </div>
        <Reel $spin={sound.playing} />
      </TapeWindow>
      <TapeButtons>
        <TapeBtn onClick={sound.prevTrack} aria-label="previous track">⏮</TapeBtn>
        <TapeBtn $active={sound.playing} onClick={sound.toggleMusic} aria-label="play/pause">
          {sound.playing ? "⏸" : "▶"}
        </TapeBtn>
        <TapeBtn onClick={sound.nextTrack} aria-label="next track">⏭</TapeBtn>
        <TapeBtn $active={sound.muted} onClick={() => sound.setMuted((m) => !m)} aria-label="mute">
          {sound.muted ? "🔇" : "🔊"}
        </TapeBtn>
        <VolumeRow>
          <Range
            type="range"
            min={-30}
            max={0}
            value={sound.volume}
            onChange={(e) => sound.setVolume(Number(e.target.value))}
          />
        </VolumeRow>
      </TapeButtons>
    </Mixtape>
  );
}

/* ============================================================
   ROOT — providers (Theme + Sound) live here, wiring Context
   ============================================================ */
const ThemeSwitchContext = createContext(null);

export default function App() {
  const [themeName, setThemeName] = useState("dark");
  const toggleTheme = () => setThemeName((t) => (t === "dark" ? "light" : "dark"));
  const theme = themes[themeName];

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeSwitchContext.Provider value={{ themeName, toggleTheme }}>
        <SoundProvider>
          <div
            style={{
              minHeight: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 12px",
              background: theme.bg,
              transition: "background 0.35s ease",
            }}
          >
            <Game />
          </div>
        </SoundProvider>
      </ThemeSwitchContext.Provider>
    </ThemeContext.Provider>
  );
}