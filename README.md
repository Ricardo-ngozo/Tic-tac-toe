# 🎮 TIC·TAC·TOE - Premium Gaming Experience

A fully branded, visually stunning Tic-Tac-Toe game with seamless transitions, advanced features, and multiple game modes.

![Game Preview](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-8.1.1-646CFF?style=for-the-badge&logo=vite)

## ✨ Features

### 🎯 Game Modes
- **Classic Mode** - Traditional turn-based gameplay for casual matches
- **Timed Blitz** - 30 seconds per move! Think fast or lose your turn
- **VS AI** - Challenge the computer with three difficulty levels:
  - 🟢 Easy - 50% random, 50% strategic
  - 🟡 Medium - 80% strategic, 20% random
  - 🔴 Hard - Always plays optimal moves

### 🎨 Visual Features
- **Dynamic Themes** - Toggle between stunning dark and light modes
- **Particle Effects** - Animated background grid
- **Neon Glows** - Cyberpunk-inspired visual effects
- **Smooth Animations** - Every interaction feels premium
- **Responsive Design** - Perfect on all screen sizes
- **Chase Lights** - Retro arcade cabinet aesthetic
- **Victory Overlays** - Celebratory screens with stats

### 🔊 Audio System
- **Multiple Sound Effects**:
  - Click sounds for moves
  - Hover sounds for UI feedback
  - Victory fanfares
  - Draw game sounds
  - Combo multiplier sounds
- **Dynamic Music Player** (Powered by Tone.js):
  - 3 unique 8-bit tracks
  - Adjustable volume
  - Play/pause controls
  - Track navigation
  - Mute option

### 🏆 Game Features
- **Player Profiles** - Customize player names
- **Score Tracking** - Persistent scoreboard across rounds
- **Combo System** - Track consecutive wins
- **Move History** - Complete game statistics
- **Timer System** - For timed blitz mode
- **AI Opponent** - Three difficulty levels
- **Smooth Transitions** - Between all game screens

### 🎪 UI/UX Excellence
- **Welcome Screen** - Professional game setup flow
- **Mode Selection** - Visual cards for each game mode
- **Victory Screen** - Detailed statistics and replay options
- **Status Display** - Real-time game state information
- **Accessibility** - ARIA labels and keyboard support
- **Loading Screen** - Branded splash screen
- **Decorative Elements** - Screws, borders, and retro styling

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 How to Play

1. **Setup**
   - Enter player names
   - Choose your game mode
   - Select AI difficulty (if playing VS AI)
   - Click "START GAME"

2. **Gameplay**
   - Click any empty cell to place your mark (X or O)
   - In Timed mode, make your move within 30 seconds
   - First player to get 3 in a row wins!
   - Watch your combo multiplier grow with consecutive wins

3. **Controls**
   - 🎵 Music Player - Control background music
   - 🌓 Theme Toggle - Switch between dark/light modes
   - ⬅️ Main Menu - Return to game setup
   - 🔄 New Round - Play again with same settings
   - 🔁 Reset Score - Clear scoreboard

## 🏗️ Technology Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool
- **Tone.js** - Professional web audio framework
- **Styled Components Pattern** - Component-scoped styling
- **CSS Animations** - Smooth transitions and effects
- **Modern JavaScript** - ES6+ features throughout

## 🎨 Design System

### Color Palette (Dark Mode)
- Primary: `#33e6ff` (Cyan)
- Secondary: `#ff4fc3` (Magenta)
- Accent: `#ffce3d` (Amber)
- Background: `#0a0e1a` (Deep Space)
- Surface: `#121a30` (Dark Surface)

### Typography
- Display: **Press Start 2P** (Retro pixel font)
- Body: **Space Mono** (Monospace)

### Design Principles
- Retro arcade cabinet aesthetic
- Cyberpunk neon accents
- Smooth, premium animations
- Clear visual hierarchy
- High contrast for readability

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

## ♿ Accessibility

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Reduced motion support
- High contrast mode support

## 🎯 Game Logic

The AI uses a minimax-inspired algorithm with difficulty scaling:
1. Check for winning move
2. Block opponent's winning move
3. Take center if available
4. Take corners
5. Take any remaining space

Randomization is added based on difficulty level to create varied gameplay experiences.

## 🔧 Configuration

### Audio Settings
- Adjustable volume slider (-30dB to 0dB)
- Mute toggle
- Track selection
- 3 unique music tracks with different BPM and waveforms

### Game Settings
- Configurable timer (default: 30s)
- Adjustable AI difficulty
- Score persistence across rounds

## 📦 Project Structure

```
Tic-tac-toe/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx          # Main game component
│   ├── main.jsx         # React entry point
│   ├── index.css        # Global styles
│   └── assets/          # Images and media
├── index.html           # HTML template with loading screen
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── README.md           # This file
```

## 🎭 Components Architecture

- **App** - Root component with theme and sound providers
- **Game** - Main game logic and state management
- **Cabinet** - Retro arcade cabinet container
- **Board** - 3x3 game grid
- **MusicPlayer** - Tape-style music controls
- **WelcomeScreen** - Game setup interface
- **VictoryOverlay** - Win/draw celebration screen

## 🎵 Music Tracks

1. **8-BIT BOP** (128 BPM) - Energetic square wave
2. **CHILL BYTE** (84 BPM) - Relaxed triangle wave
3. **NEON RUSH** (160 BPM) - Fast-paced sawtooth wave

## 🐛 Known Limitations

- Music requires user interaction to start (browser autoplay policy)
- Best experienced in modern browsers (Chrome, Firefox, Safari, Edge)
- Sound effects require Tone.js library

## 🚀 Future Enhancements

- [ ] Online multiplayer
- [ ] Larger grid sizes (4x4, 5x5)
- [ ] Tournament mode
- [ ] Achievement system
- [ ] Player avatars
- [ ] Replay system
- [ ] Game history persistence
- [ ] More music tracks
- [ ] Power-ups and special abilities
- [ ] Global leaderboard

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Font: **Press Start 2P** by CodeMan38
- Font: **Space Mono** by Colophon Foundry
- Audio: **Tone.js** by Yotam Mann
- Build Tool: **Vite** by Evan You
- Framework: **React** by Meta

## 💎 Premium Features Checklist

✅ Multiple game modes with unique mechanics  
✅ AI opponent with scalable difficulty  
✅ Professional welcome and setup flow  
✅ Dynamic music system with track selection  
✅ Comprehensive sound effects  
✅ Smooth animations and transitions  
✅ Victory celebrations with statistics  
✅ Theme switching (dark/light)  
✅ Score tracking and combo system  
✅ Timer-based challenge mode  
✅ Responsive design for all devices  
✅ Accessibility features  
✅ Retro arcade aesthetic  
✅ Particle effects and visual polish  
✅ Loading screen  
✅ Professional branding throughout  

## 🎮 Play Now!

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start playing!

---

**Made with 💙 for gamers who appreciate premium experiences**
