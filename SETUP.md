# Setup Guide

Follow these steps to get your Crossword Generator app running.

## Step 1: Prerequisites

Make sure you have installed:
- **Node.js** (version 16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo CLI** - Run `npm install -g expo-cli`
- **Google Gemini API Key** - [Get one here](https://makersuite.google.com/app/apikey)

## Step 2: Install Dependencies

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

## Step 3: Configure Backend

1. **Create environment file:**
   ```bash
   cd ../backend
   cp .env.example .env
   ```

2. **Edit `.env` file and add your Gemini API key:**
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   ```

## Step 4: Create Placeholder Assets

The app needs some image assets. Create these placeholder files:

### For iOS/Android:
1. Create `frontend/assets/icon.png` (1024x1024px)
2. Create `frontend/assets/splash.png` (1242x2436px recommended)
3. Create `frontend/assets/adaptive-icon.png` (1024x1024px with transparency)

You can use any image or create simple colored squares for testing. For production, design proper app icons.

### For Web (optional):
Create `frontend/assets/favicon.png` (48x48px)

## Step 5: Start the Backend

Open a terminal and run:
```bash
cd backend
npm run dev
```

You should see: `Server running on port 3000`

## Step 6: Start the Frontend

Open a **new terminal** and run:
```bash
cd frontend
npm start
```

## Step 7: Run the App

Choose one of these options:

### Option A: Physical Device (Recommended)
1. Install **Expo Go** app on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Open the Expo Go app
3. Scan the QR code from the terminal
4. The app will load on your device

### Option B: iOS Simulator
- Press `i` in the Expo terminal
- Requires Xcode installed on Mac

### Option C: Android Emulator
- Press `a` in the Expo terminal
- Requires Android Studio and an emulator set up

### Option D: Web Browser
- Press `w` in the Expo terminal
- Opens in your default browser

## Troubleshooting

### Backend not connecting?
- Make sure backend is running on port 3000
- Check that your `.env` file has a valid API key
- Try accessing `http://localhost:3000/api/crossword/generate` in your browser

### Frontend won't start?
- Clear cache: `expo start -c`
- Delete `node_modules` and run `npm install` again
- Make sure you're using Node.js 16+

### Gemini API errors?
- Verify your API key is correct in `.env`
- Check that you have API quota available
- Review the console for detailed error messages

### Network connection issues on device?
- Make sure your phone and computer are on the same WiFi network
- Try using your computer's local IP address instead of `localhost`
  - Update `App.js` to use: `http://192.168.x.x:3000`
  - Replace `x.x` with your computer's local IP address

## Testing the App

1. **Landing Screen**: Should show letter rain animation
2. **Search Screen**: Enter any topic (e.g., "Animals", "Movies", "Coral Reefs")
3. **Loading**: Wait for AI to generate the crossword
4. **Crossword**: Interact with the grid, view clues, try shuffle feature

## Next Steps

- Customize the UI colors and styling
- Add more crossword features
- Implement user authentication
- Add puzzle saving/loading
- Create custom animations

Happy coding! 🎉


