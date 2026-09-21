import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Tone from "tone";

/* ============================================================
   MINI STYLED-COMPONENTS ENGINE
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
    bg: "linear-gradient(135deg, #0a0e1a 0%, #1a0a2e 50%, #0f0e1a 100%)",
    surface: "#121a30",
    surface2: "#1b2547",
    border: "#2c3768",
    text: "#e9edfb",
    textDim: "#8b93c4",
    cyan: "#33e6ff",
    magenta: "#ff4fc3",
    amber: "#ffce3d",
    green: "#00ff88",
    red: "#ff3366",
    shadow: "0 20px 60px rgba(0,0,0,0.55)",
    screenGlow: "0 0 24px rgba(51,230,255,0.15)",
    gradient: "linear-gradient(135deg, #33e6ff22, #ff4fc322)",
  },
  light: {
    name: "light",
    bg: "linear-gradient(135deg, #e6eaf4 0%, #f0e6ff 50%, #e6f0ff 100%)",
    surface: "#fbfcff",
    surface2: "#eef1fa",
    border: "#c7cfe6",
    text: "#141a33",
    textDim: "#5c6690",
    cyan: "#0091a8",
    magenta: "#c21f85",
    amber: "#a5760a",
    green: "#00a855",
    red: "#c21f55",
    shadow: "0 20px 50px rgba(30,40,80,0.18)",
    screenGlow: "0 0 0 rgba(0,0,0,0)",
    gradient: "linear-gradient(135deg, #00a8ff22, #ff4fc322)",
  },
};
const ThemeContext = createContext(themes.dark);

/* ============================================================
   SOUND ENGINE
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
  const hoverSynth = useRef(null);
  const comboSynth = useRef(null);
  const musicSynth = useRef(null);
  const seq = useRef(null);
  const started = useRef(false);

  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(-10);

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

    hoverSynth.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -20,
    }).toDestination();

    comboSynth.current = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 },
      volume: -8,
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
      hoverSynth.current?.dispose();
      comboSynth.current?.dispose();
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
    seq.current = new Tone.Sequence(
      (time, note) => {
        musicSynth.current.triggerAttackRelease(note, "16n", time);
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

  const playHover = useCallback(async () => {
    await ensureStarted();
    if (muted) return;
    hoverSynth.current.triggerAttackRelease("E5", "64n");
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

  const playCombo = useCallback(async (level) => {
    await ensureStarted();
    if (muted) return;
    const pitch = ["C4", "D4", "E4", "G4", "A4"][Math.min(level, 4)];
    comboSynth.current.triggerAttackRelease(pitch, "16n");
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
    playHover,
    playWin,
    playDraw,
    playCombo,
    toggleMusic,
    nextTrack,
    prevTrack,
    playing,
    muted,
    setMuted,
    volume,
    setVolume,
    trackIndex,
    track: TRACKS[trackIndex],
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
const useSound = () => useContext(SoundContext);

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

function getBestMove(board, player) {
  const opponent = player === "X" ? "O" : "X";
  
  // Check for winning move
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const testBoard = [...board];
      testBoard[i] = player;
      if (calculateWinner(testBoard)) return i;
    }
  }
  
  // Block opponent's winning move
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const testBoard = [...board];
      testBoard[i] = opponent;
      if (calculateWinner(testBoard)) return i;
    }
  }
  
  // Take center if available
  if (!board[4]) return 4;
  
  // Take corners
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(i => !board[i]);
  if (availableCorners.length) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }
  
  // Take any available
  const available = board.map((v, i) => v ? null : i).filter(v => v !== null);
  return available[Math.floor(Math.random() * available.length)];
}

/* ============================================================
   STYLED COMPONENTS
   ============================================================ */
const AppContainer = styled.div`
  min-height: 100vh;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  background: ${(p) => p.theme.bg};
  transition: background 0.5s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${(p) => p.theme.cyan}08 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridMove 20s linear infinite;
  }
  
  @keyframes gridMove {
    0% { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }
  
  @media (min-height: 800px) {
    padding: 24px 12px;
  }
`;

const Cabinet = styled.div`
  width: min(94vw, 520px);
  max-height: 95vh;
  overflow-y: auto;
  background: ${(p) => p.theme.surface};
  border: 3px solid ${(p) => p.theme.border};
  border-radius: 24px;
  padding: 24px;
  box-shadow: ${(p) => p.theme.shadow}, 0 0 0 1px ${(p) => p.theme.border}33;
  position: relative;
  transition: all 0.35s ease;
  font-family: "Space Mono", ui-monospace, monospace;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 24px;
    padding: 2px;
    background: ${(p) => p.theme.gradient};
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    pointer-events: none;
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(p) => p.theme.surface2};
    border-radius: 0 20px 20px 0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(p) => p.theme.border};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${(p) => p.theme.cyan};
  }
  
  @media (max-height: 700px) {
    padding: 16px;
  }
`;

const Screw = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) => p.theme.border};
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1);
  
  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${(p) => p.theme.surface2}, ${(p) => p.theme.border});
  }
`;

const Marquee = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: clamp(12px, 3.5vw, 18px);
  letter-spacing: 3px;
  text-align: center;
  color: ${(p) => p.theme.text};
  padding: 12px 8px 16px;
  text-shadow: ${(p) => (p.theme.name === "dark" ? `0 0 10px ${p.theme.cyan}88, 0 0 20px ${p.theme.magenta}44` : "none")};
  background: ${(p) => p.theme.gradient};
  border-radius: 12px;
  margin-bottom: 12px;
  
  @media (max-height: 700px) {
    padding: 8px 8px 10px;
    margin-bottom: 8px;
    font-size: clamp(10px, 3vw, 14px);
  }
`;

const ChaseLights = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 18px;
  
  @media (max-height: 700px) {
    margin-bottom: 10px;
    gap: 6px;
  }
`;

const Light = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$on ? p.theme.amber : p.theme.border)};
  box-shadow: ${(p) => (p.$on ? `0 0 12px ${p.theme.amber}, 0 0 4px ${p.theme.amber}` : "none")};
  transition: all 0.15s;
  animation: ${(p) => (p.$on ? "pulse 1s ease-in-out infinite" : "none")};
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
`;

const ScoreStrip = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: ${(p) => p.theme.textDim};
  flex-wrap: wrap;
`;

const ScoreChip = styled.span`
  padding: 6px 12px;
  border-radius: 10px;
  background: ${(p) => p.theme.surface2};
  border: 1px solid ${(p) => p.theme.border};
  color: ${(p) => p.$color || p.theme.text};
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const IconButton = styled.button`
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.surface2};
  color: ${(p) => p.theme.text};
  border-radius: 12px;
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  font-family: inherit;
  font-weight: bold;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${(p) => p.theme.cyan}44;
    border-color: ${(p) => p.theme.cyan};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const Screen = styled.div`
  background: ${(p) => (p.theme.name === "dark" ? "#060a14" : "#f4f6fc")};
  border: 2px solid ${(p) => p.theme.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.2), ${(p) => p.theme.screenGlow};
  position: relative;
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  position: relative;
`;

const Cell = styled.button`
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$win ? `${p.theme.amber}22` : p.theme.surface2)};
  color: ${(p) => (p.$value === "X" ? p.theme.cyan : p.theme.magenta)};
  font-family: "Press Start 2P", monospace;
  font-size: clamp(20px, 6vw, 32px);
  cursor: ${(p) => (p.$value || p.$gameOver ? "default" : "pointer")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: ${(p) => (p.$win ? `0 0 20px ${p.theme.amber}88, inset 0 0 20px ${p.theme.amber}33` : "0 2px 8px rgba(0,0,0,0.15)")};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${(p) => p.theme.gradient};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: ${(p) => (!p.$value && !p.$gameOver ? 0.3 : 0)};
  }
  
  &:hover {
    transform: ${(p) => (!p.$value && !p.$gameOver ? "scale(1.05)" : "none")};
    border-color: ${(p) => (!p.$value && !p.$gameOver ? p.theme.cyan : p.theme.border)};
  }
  
  &:active {
    transform: ${(p) => (!p.$value && !p.$gameOver ? "scale(0.95)" : "none")};
  }
  
  ${(p) => p.$value && `
    animation: cellPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-shadow: 0 0 10px ${p.$value === "X" ? p.theme.cyan : p.theme.magenta}aa;
  `}
  
  @keyframes cellPop {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const StatusBar = styled.div`
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.5px;
  color: ${(p) => p.theme.textDim};
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Highlight = styled.span`
  color: ${(p) => (p.$who === "X" ? p.theme.cyan : p.$who === "O" ? p.theme.magenta : p.theme.amber)};
  font-weight: bold;
  text-shadow: 0 0 8px ${(p) => (p.$who === "X" ? p.theme.cyan : p.$who === "O" ? p.theme.magenta : p.theme.amber)}66;
`;

const Controls = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 16px;
`;

const GhostButton = styled.button`
  padding: 12px 14px;
  border-radius: 12px;
  border: 2px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$primary ? p.theme.gradient : "transparent")};
  color: ${(p) => p.theme.text};
  font-family: "Space Mono", monospace;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${(p) => p.theme.cyan}22;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover::before {
    opacity: 1;
  }
  
  &:hover {
    border-color: ${(p) => p.theme.cyan};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${(p) => p.theme.cyan}44;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Mixtape = styled.div`
  margin-top: 20px;
  border-radius: 14px;
  border: 2px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.surface2};
  padding: 14px 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  
  @media (max-height: 700px) {
    margin-top: 12px;
    padding: 10px 12px;
  }
`;

const TapeWindow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${(p) => (p.theme.name === "dark" ? "#060a14" : "#eef1fb")};
  border: 1px solid ${(p) => p.theme.border};
  border-radius: 10px;
  padding: 12px 16px;
`;

const Reel = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid ${(p) => p.theme.textDim};
  border-top-color: ${(p) => p.theme.cyan};
  animation: ${(p) => (p.$spin ? "spin 0.9s linear infinite" : "none")};
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const TrackName = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: 10px;
  color: ${(p) => p.theme.text};
  letter-spacing: 1px;
`;

const TrackSub = styled.div`
  font-size: 9px;
  color: ${(p) => p.theme.textDim};
  margin-top: 4px;
`;

const TapeButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const TapeBtn = styled.button`
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => (p.$active ? p.theme.cyan : p.theme.surface)};
  color: ${(p) => (p.$active ? (p.theme.name === "dark" ? "#06121a" : "#fff") : p.theme.text)};
  border-radius: 10px;
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px ${(p) => p.theme.cyan}44;
  }
  
  &:active {
    transform: scale(0.92);
  }
`;

const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const Range = styled.input`
  width: 80px;
  accent-color: ${(p) => p.theme.cyan};
`;

/* Welcome Screen */
const WelcomeScreen = styled.div`
  text-align: center;
  padding: 20px;
`;

const Logo = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: clamp(24px, 6vw, 42px);
  color: ${(p) => p.theme.text};
  margin-bottom: 30px;
  text-shadow: 0 0 20px ${(p) => p.theme.cyan}aa, 0 0 40px ${(p) => p.theme.magenta}66;
  animation: glow 2s ease-in-out infinite;
  
  @keyframes glow {
    0%, 100% { text-shadow: 0 0 20px ${(p) => p.theme.cyan}aa, 0 0 40px ${(p) => p.theme.magenta}66; }
    50% { text-shadow: 0 0 30px ${(p) => p.theme.cyan}ff, 0 0 60px ${(p) => p.theme.magenta}99; }
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.surface2};
  color: ${(p) => p.theme.text};
  font-family: "Space Mono", monospace;
  font-size: 14px;
  margin-bottom: 20px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.cyan};
    box-shadow: 0 0 0 3px ${(p) => p.theme.cyan}22;
  }
  
  &::placeholder {
    color: ${(p) => p.theme.textDim};
  }
`;

const ModeSelector = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
`;

const ModeCard = styled.button`
  padding: 16px;
  border-radius: 14px;
  border: 2px solid ${(p) => (p.$selected ? p.theme.cyan : p.theme.border)};
  background: ${(p) => (p.$selected ? p.theme.gradient : p.theme.surface2)};
  color: ${(p) => p.theme.text};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${(p) => p.theme.cyan};
    transform: translateY(-2px);
    box-shadow: 0 8px 16px ${(p) => p.theme.cyan}33;
  }
  
  .mode-title {
    font-family: "Press Start 2P", monospace;
    font-size: 12px;
    margin-bottom: 8px;
    color: ${(p) => p.theme.cyan};
  }
  
  .mode-desc {
    font-size: 11px;
    color: ${(p) => p.theme.textDim};
    line-height: 1.5;
  }
`;

const DifficultySelector = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: center;
`;

const DifficultyBtn = styled.button`
  padding: 8px 14px;
  border-radius: 10px;
  border: 2px solid ${(p) => (p.$selected ? p.theme.cyan : p.theme.border)};
  background: ${(p) => (p.$selected ? p.theme.cyan : p.theme.surface2)};
  color: ${(p) => (p.$selected ? "#000" : p.theme.text)};
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const BigButton = styled.button`
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: 2px solid ${(p) => p.theme.cyan};
  background: ${(p) => p.theme.gradient};
  color: ${(p) => p.theme.text};
  font-family: "Press Start 2P", monospace;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-shadow: 0 0 8px ${(p) => p.theme.cyan}aa;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px ${(p) => p.theme.cyan}66;
  }
  
  &:active {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TimerDisplay = styled.div`
  font-family: "Press Start 2P", monospace;
  font-size: 16px;
  color: ${(p) => (p.$low ? p.theme.red : p.theme.cyan)};
  text-align: center;
  padding: 8px;
  border-radius: 10px;
  background: ${(p) => p.theme.surface2};
  border: 2px solid ${(p) => (p.$low ? p.theme.red : p.theme.border)};
  animation: ${(p) => (p.$low ? "timerPulse 1s ease-in-out infinite" : "none")};
  
  @keyframes timerPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;

const ComboDisplay = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.amber};
  font-weight: bold;
  animation: comboPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  @keyframes comboPopIn {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const VictoryOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  backdrop-filter: blur(4px);
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const VictoryCard = styled.div`
  background: ${(p) => p.theme.surface};
  border: 3px solid ${(p) => p.theme.border};
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: victorySlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${(p) => p.theme.gradient};
  position: relative;
  
  @keyframes victorySlideIn {
    from { transform: translateY(-100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid ${(p) => p.theme.border};
    background: ${(p) => p.theme.surface2};
    color: ${(p) => p.theme.text};
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${(p) => p.theme.cyan};
      color: ${(p) => p.theme.surface};
      transform: rotate(90deg);
    }
  }
  
  .trophy {
    font-size: 80px;
    margin-bottom: 20px;
    animation: trophyBounce 1s ease-in-out infinite;
  }
  
  @keyframes trophyBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .victory-text {
    font-family: "Press Start 2P", monospace;
    font-size: clamp(18px, 5vw, 24px);
    color: ${(p) => p.theme.cyan};
    margin-bottom: 20px;
    text-shadow: 0 0 20px ${(p) => p.theme.cyan}aa;
  }
  
  .stats {
    margin: 20px 0;
    padding: 20px;
    background: ${(p) => p.theme.surface2};
    border-radius: 12px;
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 14px;
      
      .label {
        color: ${(p) => p.theme.textDim};
      }
      
      .value {
        color: ${(p) => p.theme.text};
        font-weight: bold;
      }
    }
  }
  
  /* Custom scrollbar for victory card */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(p) => p.theme.surface2};
    border-radius: 0 16px 16px 0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(p) => p.theme.border};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${(p) => p.theme.cyan};
  }
  
  @media (max-height: 700px) {
    padding: 24px;
    
    .trophy {
      font-size: 60px;
      margin-bottom: 12px;
    }
    
    .stats {
      margin: 12px 0;
      padding: 12px;
    }
  }
`;

/* ============================================================
   GAME COMPONENT
   ============================================================ */
function Game() {
  const theme = useContext(ThemeContext);
  const sound = useSound();
  
  // Game state
  const [screen, setScreen] = useState("welcome"); // welcome, game, victory
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [gameMode, setGameMode] = useState("classic"); // classic, timed, ai
  const [difficulty, setDifficulty] = useState("medium"); // easy, medium, hard
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [chaseIndex, setChaseIndex] = useState(0);
  const [timer, setTimer] = useState(30);
  const [combo, setCombo] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [totalMoves, setTotalMoves] = useState(0);
  
  const result = calculateWinner(board);
  const isDraw = !result && board.every(Boolean);
  const gameOver = Boolean(result) || isDraw;
  
  // Chase lights animation
  useEffect(() => {
    const id = setInterval(() => setChaseIndex((i) => (i + 1) % 6), 260);
    return () => clearInterval(id);
  }, []);
  
  // Timer for timed mode
  useEffect(() => {
    if (gameMode === "timed" && screen === "game" && !gameOver && timer > 0) {
      const id = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            // Time's up, other player wins
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [gameMode, screen, gameOver, timer]);
  
  // Handle time up
  useEffect(() => {
    if (timer === 0 && gameMode === "timed" && !gameOver) {
      const winner = xIsNext ? "O" : "X";
      setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
      sound.playWin();
      setScreen("victory");
    }
    // eslint-disable-next-line
  }, [timer]);
  
  // AI move
  useEffect(() => {
    if (gameMode === "ai" && !xIsNext && !gameOver && screen === "game") {
      const delay = difficulty === "easy" ? 800 : difficulty === "medium" ? 500 : 300;
      const timeoutId = setTimeout(() => {
        let move;
        if (difficulty === "easy") {
          // 50% random, 50% smart
          if (Math.random() < 0.5) {
            const available = board.map((v, i) => v ? null : i).filter(v => v !== null);
            move = available[Math.floor(Math.random() * available.length)];
          } else {
            move = getBestMove(board, "O");
          }
        } else if (difficulty === "medium") {
          // 80% smart, 20% random
          if (Math.random() < 0.8) {
            move = getBestMove(board, "O");
          } else {
            const available = board.map((v, i) => v ? null : i).filter(v => v !== null);
            move = available[Math.floor(Math.random() * available.length)];
          }
        } else {
          // Always best move
          move = getBestMove(board, "O");
        }
        
        if (move !== undefined) {
          handleClick(move);
        }
      }, delay);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line
  }, [board, xIsNext, gameOver, gameMode, difficulty, screen]);
  
  const scoredRef = useRef(false);
  useEffect(() => {
    if (result && !scoredRef.current) {
      scoredRef.current = true;
      setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
      sound.playWin();
      setTimeout(() => setScreen("victory"), 500);
    } else if (isDraw && !scoredRef.current) {
      scoredRef.current = true;
      setScores((s) => ({ ...s, D: s.D + 1 }));
      sound.playDraw();
      setTimeout(() => setScreen("victory"), 500);
    }
    // eslint-disable-next-line
  }, [result, isDraw]);
  
  const handleClick = (i) => {
    if (board[i] || gameOver) return;
    sound.playClick();
    const next = board.slice();
    next[i] = xIsNext ? "X" : "O";
    setBoard(next);
    setXIsNext(!xIsNext);
    setMoveHistory([...moveHistory, { player: xIsNext ? "X" : "O", position: i, time: Date.now() }]);
    setTotalMoves(totalMoves + 1);
    
    // Combo system
    const newCombo = combo + 1;
    setCombo(newCombo);
    if (newCombo > 1) {
      sound.playCombo(newCombo);
    }
    
    // Reset timer in timed mode
    if (gameMode === "timed") {
      setTimer(30);
    }
  };
  
  const handleCellHover = () => {
    sound.playHover();
  };
  
  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    scoredRef.current = false;
    setTimer(30);
    setCombo(0);
    setMoveHistory([]);
    setScreen("game");
  };
  
  const closeVictory = () => {
    setScreen("game");
  };
  
  const resetAll = () => {
    resetRound();
    setScores({ X: 0, O: 0, D: 0 });
    setTotalMoves(0);
  };
  
  const startGame = () => {
    if (!player1.trim()) return;
    if (gameMode !== "ai" && !player2.trim()) return;
    setScreen("game");
    resetRound();
  };
  
  const backToMenu = () => {
    setScreen("welcome");
    resetAll();
  };
  
  let statusNode;
  if (result) {
    statusNode = (
      <>
        WINNER: <Highlight $who={result.winner}>{result.winner}</Highlight>
        {combo > 2 && <ComboDisplay>🔥 {combo}x COMBO!</ComboDisplay>}
      </>
    );
  } else if (isDraw) {
    statusNode = <Highlight $who="D">DRAW GAME</Highlight>;
  } else {
    const currentPlayer = xIsNext ? player1 : (gameMode === "ai" ? "AI" : player2);
    statusNode = (
      <>
        TURN: <Highlight $who={xIsNext ? "X" : "O"}>{currentPlayer} ({xIsNext ? "X" : "O"})</Highlight>
        {combo > 2 && <ComboDisplay>🔥 {combo}x COMBO!</ComboDisplay>}
      </>
    );
  }
  
  if (screen === "welcome") {
    return (
      <Cabinet>
        <Screw style={{ top: 12, left: 12 }} />
        <Screw style={{ top: 12, right: 12 }} />
        <Screw style={{ bottom: 12, left: 12 }} />
        <Screw style={{ bottom: 12, right: 12 }} />
        
        <WelcomeScreen>
          <Logo>TIC·TAC·TOE</Logo>
          
          <Input
            type="text"
            placeholder="Player 1 Name (X)"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            maxLength={15}
          />
          
          {gameMode !== "ai" && (
            <Input
              type="text"
              placeholder="Player 2 Name (O)"
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
              maxLength={15}
            />
          )}
          
          <ModeSelector>
            <ModeCard
              $selected={gameMode === "classic"}
              onClick={() => setGameMode("classic")}
            >
              <div className="mode-title">🎮 CLASSIC</div>
              <div className="mode-desc">Traditional turn-based gameplay. Best for casual matches.</div>
            </ModeCard>
            
            <ModeCard
              $selected={gameMode === "timed"}
              onClick={() => setGameMode("timed")}
            >
              <div className="mode-title">⏱️ TIMED BLITZ</div>
              <div className="mode-desc">30 seconds per move! Think fast or lose your turn.</div>
            </ModeCard>
            
            <ModeCard
              $selected={gameMode === "ai"}
              onClick={() => setGameMode("ai")}
            >
              <div className="mode-title">🤖 VS AI</div>
              <div className="mode-desc">Challenge the computer. Choose your difficulty!</div>
              {gameMode === "ai" && (
                <DifficultySelector>
                  <DifficultyBtn
                    $selected={difficulty === "easy"}
                    onClick={(e) => { e.stopPropagation(); setDifficulty("easy"); }}
                  >
                    EASY
                  </DifficultyBtn>
                  <DifficultyBtn
                    $selected={difficulty === "medium"}
                    onClick={(e) => { e.stopPropagation(); setDifficulty("medium"); }}
                  >
                    MEDIUM
                  </DifficultyBtn>
                  <DifficultyBtn
                    $selected={difficulty === "hard"}
                    onClick={(e) => { e.stopPropagation(); setDifficulty("hard"); }}
                  >
                    HARD
                  </DifficultyBtn>
                </DifficultySelector>
              )}
            </ModeCard>
          </ModeSelector>
          
          <BigButton
            onClick={startGame}
            disabled={!player1.trim() || (gameMode !== "ai" && !player2.trim())}
          >
            START GAME
          </BigButton>
        </WelcomeScreen>
        
        <MusicPlayer />
      </Cabinet>
    );
  }
  
  if (screen === "victory") {
    return (
      <>
        <VictoryOverlay>
          <VictoryCard onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeVictory} aria-label="Back to game">✕</button>
            <div className="trophy">🏆</div>
            <div className="victory-text">
              {result ? `${result.winner === "X" ? player1 : (gameMode === "ai" ? "AI" : player2)} WINS!` : "DRAW!"}
            </div>
            <div className="stats">
              <div className="stat-row">
                <span className="label">Total Moves:</span>
                <span className="value">{moveHistory.length}</span>
              </div>
              <div className="stat-row">
                <span className="label">Combo:</span>
                <span className="value">{combo}x</span>
              </div>
              {gameMode === "timed" && timer > 0 && (
                <div className="stat-row">
                  <span className="label">Time Remaining:</span>
                  <span className="value">{timer}s</span>
                </div>
              )}
            </div>
            <Controls>
              <GhostButton onClick={resetRound} $primary>NEXT ROUND</GhostButton>
              <GhostButton onClick={backToMenu}>MAIN MENU</GhostButton>
            </Controls>
          </VictoryCard>
        </VictoryOverlay>
        
        <Cabinet>
          <Screw style={{ top: 12, left: 12 }} />
          <Screw style={{ top: 12, right: 12 }} />
          <Screw style={{ bottom: 12, left: 12 }} />
          <Screw style={{ bottom: 12, right: 12 }} />
          
          <TopRow>
            <ScoreStrip>
              <ScoreChip $color={theme.cyan}>{player1} {scores.X}</ScoreChip>
              <ScoreChip $color={theme.magenta}>{gameMode === "ai" ? "AI" : player2} {scores.O}</ScoreChip>
              <ScoreChip $color={theme.amber}>= {scores.D}</ScoreChip>
            </ScoreStrip>
            <IconButton onClick={backToMenu}>⬅️</IconButton>
            <ThemeSwitchButton />
          </TopRow>
          
          <Marquee>TIC · TAC · TOE</Marquee>
          <ChaseLights>
            {Array.from({ length: 6 }).map((_, i) => (
              <Light key={i} $on={i === chaseIndex} />
            ))}
          </ChaseLights>
          
          <Screen>
            <Board>
              {board.map((val, i) => (
                <Cell
                  key={i}
                  $value={val}
                  $gameOver={gameOver}
                  $win={Boolean(result && result.line.includes(i))}
                  onClick={() => handleClick(i)}
                  onMouseEnter={handleCellHover}
                  aria-label={`cell-${i}`}
                >
                  {val}
                </Cell>
              ))}
            </Board>
            <StatusBar>{statusNode}</StatusBar>
          </Screen>
          
          <MusicPlayer />
        </Cabinet>
      </>
    );
  }
  
  return (
    <Cabinet>
      <Screw style={{ top: 12, left: 12 }} />
      <Screw style={{ top: 12, right: 12 }} />
      <Screw style={{ bottom: 12, left: 12 }} />
      <Screw style={{ bottom: 12, right: 12 }} />
      
      <TopRow>
        <ScoreStrip>
          <ScoreChip $color={theme.cyan}>{player1} {scores.X}</ScoreChip>
          <ScoreChip $color={theme.magenta}>{gameMode === "ai" ? "AI" : player2} {scores.O}</ScoreChip>
          <ScoreChip $color={theme.amber}>= {scores.D}</ScoreChip>
        </ScoreStrip>
        <IconButton onClick={backToMenu} title="Main Menu">⬅️</IconButton>
        <ThemeSwitchButton />
      </TopRow>
      
      <Marquee>TIC · TAC · TOE</Marquee>
      <ChaseLights>
        {Array.from({ length: 6 }).map((_, i) => (
          <Light key={i} $on={i === chaseIndex} />
        ))}
      </ChaseLights>
      
      {gameMode === "timed" && (
        <TimerDisplay $low={timer <= 10}>
          ⏱️ {timer}s
        </TimerDisplay>
      )}
      
      <Screen>
        <Board>
          {board.map((val, i) => (
            <Cell
              key={i}
              $value={val}
              $gameOver={gameOver}
              $win={Boolean(result && result.line.includes(i))}
              onClick={() => handleClick(i)}
              onMouseEnter={handleCellHover}
              aria-label={`cell-${i}`}
            >
              {val}
            </Cell>
          ))}
        </Board>
        <StatusBar>{statusNode}</StatusBar>
      </Screen>
      
      <Controls>
        <GhostButton onClick={resetRound}>NEW ROUND</GhostButton>
        <GhostButton onClick={resetAll}>RESET SCORE</GhostButton>
      </Controls>
      
      <MusicPlayer />
    </Cabinet>
  );
}

function ThemeSwitchButton() {
  const { themeName, toggleTheme } = useContext(ThemeSwitchContext);
  return (
    <IconButton onClick={toggleTheme} aria-label="toggle theme" title={`Switch to ${themeName === "dark" ? "light" : "dark"} mode`}>
      {themeName === "dark" ? "☾" : "☀"}
    </IconButton>
  );
}

function MusicPlayer() {
  const sound = useSound();
  const track = sound.track;
  
  return (
    <Mixtape>
      <TapeWindow>
        <Reel $spin={sound.playing} />
        <div style={{ textAlign: "center", flex: 1 }}>
          <TrackName>{track.name}</TrackName>
          <TrackSub>{track.bpm} BPM · {sound.playing ? "PLAYING" : "PAUSED"}</TrackSub>
        </div>
        <Reel $spin={sound.playing} />
      </TapeWindow>
      <TapeButtons>
        <TapeBtn onClick={sound.prevTrack} aria-label="previous track" title="Previous track">⏮</TapeBtn>
        <TapeBtn $active={sound.playing} onClick={sound.toggleMusic} aria-label="play/pause" title={sound.playing ? "Pause" : "Play"}>
          {sound.playing ? "⏸" : "▶"}
        </TapeBtn>
        <TapeBtn onClick={sound.nextTrack} aria-label="next track" title="Next track">⏭</TapeBtn>
        <TapeBtn $active={sound.muted} onClick={() => sound.setMuted((m) => !m)} aria-label="mute" title={sound.muted ? "Unmute" : "Mute"}>
          {sound.muted ? "🔇" : "🔊"}
        </TapeBtn>
        <VolumeRow>
          <Range
            type="range"
            min={-30}
            max={0}
            value={sound.volume}
            onChange={(e) => sound.setVolume(Number(e.target.value))}
            title="Volume"
          />
        </VolumeRow>
      </TapeButtons>
    </Mixtape>
  );
}

/* ============================================================
   ROOT
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
          <AppContainer>
            <Game />
          </AppContainer>
        </SoundProvider>
      </ThemeSwitchContext.Provider>
    </ThemeContext.Provider>
  );
}
