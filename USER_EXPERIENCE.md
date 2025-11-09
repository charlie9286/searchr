# Word Search Generator App - Current User Experience

## App Overview
A mobile word search puzzle generator app built with React Native/Expo for iOS. Users can generate custom word search puzzles on any topic using AI-powered word generation, then solve them through touch-based word selection.

## User Journey & Flow

### 1. App Launch - Splash Screen
**Screen:** SplashScreen
**Duration:** ~2 seconds (or skippable by tap)
**Visual Experience:**
- Animated falling letters spelling "WORDSEARCH" cascade down the screen
- Title "Word Search Generator" fades in at 40% from top
- Respects accessibility settings (reduced motion shows static pattern)
- White background with black text
- User can tap anywhere to skip animation

**User Action:** Wait or tap to proceed
**Transition:** Automatic or manual to Search Screen

---

### 2. Topic Input - Search Screen
**Screen:** SearchScreen
**Layout:** Centered vertical layout
**Key Elements:**
- Large title: "Create Your Word Search" (32px, bold, centered)
- Text input field:
  - Placeholder: "Enter a topic (e.g., 'Coral Reefs')"
  - Border: 2px light gray (#E0E0E0)
  - Rounded corners (12px)
  - Auto-focus enabled
  - Minimum 3 characters required
- "Generate Word Search" button:
  - Black background (#000000)
  - Disabled state: Gray (#CCCCCC) when input < 3 characters
  - White text, 18px, semi-bold
  - 56px height
- Error handling:
  - Red error card appears if generation fails
  - Message: "Couldn't generate that. Try again."
  - "Edit Topic" button to retry

**User Actions:**
- Type topic (minimum 3 characters)
- Tap "Generate Word Search" button
- If error: Tap "Edit Topic" to modify input

**Validation:** 
- Button disabled until 3+ characters entered
- Alert shown if user tries to submit invalid input

**Transition:** To Loading Screen when valid topic submitted

---

### 3. Puzzle Generation - Loading Screen
**Screen:** LoadingScreen
**Duration:** Variable (depends on API response time, typically 2-5 seconds)
**Visual Elements:**
- Centered layout
- Large black activity indicator (spinner)
- Text: "Creating your word search…"
- "Edit Topic" button (gray text, allows cancellation)

**User Actions:**
- Wait for generation
- Tap "Edit Topic" to cancel and return to Search Screen

**Backend Process:**
- POST request to `/api/wordsearch/generate` with topic
- Google Gemini AI generates 7-10 relevant words
- WordSearchGenerator creates 15x15 grid
- Words placed in 8 directions (N, NE, E, SE, S, SW, W, NW)
- Remaining cells filled with random letters

**Transition:** To WordSearchScreen on success, or back to SearchScreen on error

---

### 4. Puzzle Solving - Word Search Screen
**Screen:** WordSearchScreen
**Layout:** Header + Scrollable content area

#### Header Section
- **Left:** "← Back" button (returns to Search Screen)
- **Center:** 
  - Topic name (18px, bold)
  - Progress indicator: "X/Y words found" (12px, gray)
- **Right:** "New Topic" button (returns to Search Screen with cleared state)

#### Completion Banner
- Green banner appears when all words found
- Text: "All words found! 🎉"
- Green background (#E8F5E9), dark green text (#1B5E20)

#### Scrollable Content Area
Contains two main components:

**A. Word Search Grid (WordSearchGrid)**
- **Size:** 15x15 grid
- **Cell Size:** Dynamically calculated (20-32px) based on screen width
- **Padding:** 32px horizontal padding on each side
- **Visual States:**
  - Default: White cells with light gray borders (#E0E0E0), black letters
  - Selected (while dragging): Yellow highlight (#FFF9C4), orange border (#FFC107), orange text (#F57C00)
  - Found (after correct selection): Blue highlight (#E3F2FD), blue border (#90CAF9), dark blue text (#0D47A1)

**Word Selection Interaction:**
- **Touch Start:** User taps a cell
  - Scrolling disabled during selection
  - Cell highlighted in yellow
  - Start cell recorded
- **Touch Move:** User drags finger across grid
  - Path builds as straight line in 8 directions
  - Direction locked on first movement
  - All cells in path highlighted in yellow
  - Visual feedback shows selected path
- **Touch End:** User lifts finger
  - Path validated against puzzle words
  - If match found:
    - Success haptic feedback (brief vibration)
    - Word added to found words set
    - Path cells change to blue (found state)
    - Word in word list gets strikethrough
    - Progress counter updates
  - If no match:
    - Error haptic feedback (vibration)
    - Path clears after 300ms
  - Scrolling re-enabled

**Word Matching Logic:**
- Checks if selected path matches any word placement
- Works in both forward and reverse directions
- Minimum 3 characters required
- Only matches words not already found
- Validates exact cell-by-cell match

**B. Word List (WordList)**
- **Title:** "Find these words" (18px, semi-bold, centered)
- **Layout:** Horizontal wrap, centered
- **Word Pills:**
  - Unfound: White background, light gray border, black text
  - Found: Green background (#E8F5E9), green border (#A5D6A7), dark green text (#1B5E20) with strikethrough
- **Spacing:** 8px gap between pills

**User Actions:**
- Drag to select words on grid
- Scroll to view word list below grid
- Tap "← Back" to return to Search Screen
- Tap "New Topic" to start over with new topic

**Haptic Feedback:**
- **Success:** Brief vibration when correct word found (NotificationFeedbackType.Success)
- **Error:** Vibration when incorrect selection made (NotificationFeedbackType.Error)

**Progress Tracking:**
- Real-time counter in header: "X/Y words found"
- Visual feedback in word list (strikethrough on found words)
- Completion banner when all words found

---

## Technical Implementation Details

### Backend API
- **Endpoint:** `POST /api/wordsearch/generate`
- **Request:** `{ "topic": "string" }`
- **Response:** 
  ```json
  {
    "grid": ["ROW1", "ROW2", ...],
    "words": ["WORD1", "WORD2", ...],
    "placements": [
      {
        "word": "WORD",
        "row": 0,
        "col": 0,
        "dr": 1,
        "dc": 1
      }
    ]
  }
  ```
- **Deployment:** Vercel serverless functions
- **AI:** Google Gemini API for word generation

### Frontend Architecture
- **Framework:** React Native with Expo
- **State Management:** React hooks (useState, useRef, useEffect)
- **Navigation:** Screen-based state management (no router)
- **Styling:** StyleSheet with responsive calculations
- **Haptics:** expo-haptics library

### Responsive Design
- Grid cell size calculated dynamically: `(SCREEN_WIDTH - 64) / numCols`
- Constrained between 20px (minimum) and 32px (maximum)
- Horizontal padding: 32px on each side
- Vertical spacing: 16px padding

### Accessibility
- Accessibility labels on interactive elements
- Reduced motion support in splash screen
- Semantic roles (accessibilityRole="image" for grid)

---

## Current Limitations & Pain Points

1. **No Shuffle/Regenerate:** Once puzzle is generated, user must go back and enter topic again to get different puzzle
2. **No Difficulty Levels:** All puzzles are 15x15 with 7-10 words
3. **No Timer/Score:** No time tracking or scoring system
4. **No Hints:** No hint system for stuck users
5. **No Save/Resume:** Puzzles cannot be saved or resumed later
6. **No History:** No record of previously solved puzzles
7. **No Customization:** Cannot adjust grid size, word count, or difficulty
8. **Single Player Only:** No multiplayer or sharing features
9. **No Offline Mode:** Requires internet connection for puzzle generation
10. **Limited Feedback:** Only haptic feedback, no sound effects or animations
11. **No Tutorial:** First-time users must discover interaction model
12. **Error Recovery:** Limited error handling - just shows error message and retry

---

## Visual Design Language

**Color Palette:**
- Primary: Black (#000000) for text and buttons
- Background: White (#FFFFFF)
- Borders: Light Gray (#E0E0E0)
- Selection: Yellow (#FFF9C4) with Orange accent (#FFC107)
- Found: Blue (#E3F2FD) with Dark Blue text (#0D47A1)
- Success: Green (#E8F5E9) with Dark Green text (#1B5E20)
- Error: Red (#FFEBEE) with Dark Red text (#D32F2F)

**Typography:**
- Titles: 18-32px, bold (700)
- Body: 14-18px, semi-bold (600)
- Progress: 12px, regular
- Letters in grid: 14px, semi-bold (600)

**Spacing:**
- Padding: 8px, 16px, 24px, 32px
- Gaps: 8px between elements
- Border radius: 12px for inputs/buttons, 999px for pills

---

## User Experience Highlights

**Strengths:**
- Simple, intuitive interface
- Fast puzzle generation (2-5 seconds)
- Smooth touch interaction for word selection
- Clear visual feedback (colors, strikethrough, progress)
- Haptic feedback enhances tactile experience
- Responsive grid sizing works on different screen sizes
- Clean, minimal design

**Areas for Enhancement:**
- Add shuffle button to regenerate puzzle without re-entering topic
- Implement difficulty levels (easy: 10x10, medium: 15x15, hard: 20x20)
- Add timer and scoring system
- Create hint system (reveal first letter, highlight direction, etc.)
- Add save/resume functionality
- Implement puzzle history
- Add sound effects for success/error
- Create onboarding tutorial
- Add share functionality (share puzzle, share completion)
- Implement offline mode with cached puzzles
- Add achievements/badges system
- Create daily puzzle challenge

---

## Interaction Patterns

**Touch Gestures:**
- Single tap: Selects starting cell
- Drag: Builds selection path
- Lift: Validates and processes selection
- Scroll: Vertical scrolling when not selecting

**State Transitions:**
- Splash → Search (automatic or manual)
- Search → Loading (on submit)
- Loading → WordSearch (on success)
- Loading → Search (on error or cancel)
- WordSearch → Search (on back or new topic)

**Feedback Mechanisms:**
- Visual: Color changes, strikethrough, progress counter
- Haptic: Vibration on success/error
- Text: Error messages, completion banner

---

## Data Flow

1. User enters topic → Frontend validates
2. Frontend sends POST request → Backend receives
3. Backend calls Gemini AI → Generates word list
4. Backend generates grid → Places words, fills random letters
5. Backend returns puzzle → Frontend receives
6. Frontend renders grid → User interacts
7. User selects path → Frontend validates against placements
8. Match found → Haptic feedback, state update, visual update
9. All words found → Completion banner shown

---

This document serves as a comprehensive input for GPT to help evolve the user story, identify new features, improve UX, and plan future enhancements.

