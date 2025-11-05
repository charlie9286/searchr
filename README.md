# Crossword Generator App

A React Native cross-platform crossword puzzle generator app built with Expo, featuring an intelligent backend powered by Google's Gemini AI.

## Features

- 🎨 **Beautiful Landing Animation**: Black/white letter rain with reduced motion support
- 🔍 **Topic-Based Generation**: Create crosswords on any topic using AI
- 🎯 **Interactive Grid**: Tap to focus cells, highlight words, and view clues
- ♿ **Accessible**: Full screen reader support and reduced motion preferences
- ⚡ **Performance Optimized**: Fast loading and smooth animations
- 🎲 **Shuffle Layout**: Generate new grid layouts with the same words
- 📤 **Share**: Export crosswords via native sharing

## Tech Stack

### Frontend
- React Native with Expo
- React Hooks for state management
- Native animations and gestures
- Accessibility API integration

### Backend
- Node.js with Express
- Google Gemini AI for intelligent crossword generation
- Database-free algorithmic approach

## Architecture Decisions

1. **No Database**: Uses algorithmic grid generation instead of stored puzzles
2. **Mobile-First**: React Native for true native performance
3. **Microservice Backend**: Single-purpose API server
4. **Stateless Design**: No session management required

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crossword
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Setup backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Setup frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the App

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   cd frontend
   npm start
   ```

3. **Open on device/simulator**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## API Endpoints

### POST `/api/crossword/generate`
Generates a new crossword puzzle from a topic.

**Request:**
```json
{
  "topic": "Coral Reefs"
}
```

**Response:**
```json
{
  "grid": [["#", "#", "C", "R", "#", ...], ...],
  "clues": {
    "across": [
      {
        "number": 1,
        "position": "7,5",
        "answer": "REEF",
        "clue": "Underwater ecosystem"
      }
    ],
    "down": [...]
  },
  "topic": "Coral Reefs"
}
```

### POST `/api/crossword/shuffle`
Creates a new grid layout with the same words and clues.

**Request:**
```json
{
  "topic": "Coral Reefs",
  "grid": [...],
  "clues": {...}
}
```

**Response:** Same format as generate endpoint.

## Project Structure

```
crossword/
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── SplashScreen.js
│   │   │   ├── SearchScreen.js
│   │   │   ├── LoadingScreen.js
│   │   │   └── CrosswordScreen.js
│   │   └── components/
│   │       ├── CrosswordGrid.js
│   │       └── CluePanel.js
│   ├── App.js
│   ├── app.json
│   └── package.json
├── backend/
│   ├── server.js
│   ├── .env
│   └── package.json
├── package.json
└── README.md
```

## Accessibility

- Respects system reduced motion preferences
- Full screen reader support with descriptive labels
- Keyboard navigation support (web)
- High contrast visual indicators

## Performance Targets

- Time-to-first-interaction (TTFI) < 1.5s
- Crossword generation progress shown within 300ms
- Smooth 60fps animations (16ms per frame)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Future Enhancements

- [ ] Offline mode with cached puzzles
- [ ] Multiplayer support
- [ ] Puzzle difficulty levels
- [ ] Export to PDF/image
- [ ] Daily puzzle challenges
- [ ] Social features and sharing


