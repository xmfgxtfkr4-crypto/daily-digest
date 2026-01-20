# Daily Digest PDF Generator

A simple website that generates printable "newspaper-style" PDFs for elderly readers in nursing homes. Enter a zip code and receive a personalized daily digest with weather, positive news, upcoming holidays, and a crossword puzzle.

## Features

- **Weather Forecast**: Current conditions and 3-day forecast
- **Positive News**: Filtered local news headlines (negative stories removed)
- **Upcoming Holidays**: Calendar of holidays in the next 30 days
- **Crossword Puzzle**: Daily puzzle with seasonal and location-based words
- **Large Print Design**: High contrast, easy-to-read formatting optimized for elderly readers

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure API Keys

Copy the example environment file and add your API keys:

```bash
cp .env.example server/.env
```

Edit `server/.env` with your API keys:

```env
OPENWEATHERMAP_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here  # Optional
```

### 3. Get API Keys

| Service | URL | Purpose | Free Tier |
|---------|-----|---------|-----------|
| OpenWeatherMap | https://openweathermap.org/api | Weather + Geocoding | 1,000 calls/day |
| NewsAPI | https://newsapi.org/ | News headlines | 100 requests/day |

**Note**: The holidays feature uses the free Nager.Date API (no key required).

### 4. Run the Server

```bash
cd server
npm start
```

The app will be available at http://localhost:3000

### 5. Use the App

1. Open http://localhost:3000 in your browser
2. Enter a 5-digit US zip code
3. Review the preview of your daily digest
4. Click "Generate Printable PDF" to download

## Project Structure

```
daily-digest/
├── server/
│   ├── index.js          # Express server
│   ├── routes/
│   │   └── api.js        # API endpoints
│   └── package.json      # Server dependencies
├── public/
│   ├── index.html        # Main page
│   ├── styles.css        # Large-print friendly styles
│   ├── app.js            # Frontend logic
│   ├── pdf-generator.js  # jsPDF code
│   └── crossword.js      # Crossword generator
├── .env.example          # Environment template
└── README.md             # This file
```

## API Endpoints

### GET /api/digest?zip=XXXXX

Returns aggregated data for a zip code:

```json
{
  "location": { "city": "New York", "state": "", "zip": "10001" },
  "date": "Monday, January 20, 2025",
  "weather": {
    "current": { "temp": 45, "description": "cloudy", "icon": "clouds" },
    "forecast": [...]
  },
  "news": [
    { "title": "...", "description": "...", "source": "..." }
  ],
  "holidays": [
    { "name": "Martin Luther King Jr. Day", "date": "2025-01-20" }
  ],
  "crosswordWords": ["JANUARY", "MONDAY", "SNOW", ...]
}
```

### GET /api/health

Health check endpoint.

## Design Considerations

This app is designed specifically for elderly users:

- **Large Fonts**: Minimum 16pt body text, 24pt+ headers
- **High Contrast**: Black text on white background
- **Simple Layout**: Clear sections, no clutter
- **Large Input Fields**: Easy to type zip codes
- **Clear Buttons**: Obvious actions

## Deployment

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root
3. Set environment variables in Vercel dashboard

### Netlify

1. Create `netlify.toml`:
```toml
[build]
  command = "cd server && npm install"
  functions = "server"

[functions]
  node_bundler = "esbuild"
```

2. Deploy via Netlify CLI or Git

### Traditional Hosting

1. Upload files to your server
2. Install Node.js 18+
3. Run `npm install` in server directory
4. Use PM2 or similar to run: `pm2 start server/index.js`
5. Configure nginx/Apache as reverse proxy

## Development

Run with auto-reload:

```bash
cd server
npm run dev
```

## Troubleshooting

### "Could not find location for this zip code"
- Verify the zip code is a valid 5-digit US zip code
- Check that your OpenWeatherMap API key is correct
- Ensure you haven't exceeded the API rate limit

### News not loading
- NewsAPI is optional; placeholder news is shown without a key
- Free NewsAPI keys only work on localhost
- Check the browser console for errors

### PDF not generating
- Ensure JavaScript is enabled
- Check browser console for errors
- Try a different browser (Chrome/Firefox recommended)

## License

MIT License - Feel free to use and modify for your community!
