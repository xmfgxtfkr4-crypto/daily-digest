const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const router = express.Router();

// Initialize OpenAI client
let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Helper function to get current season
function getSeason(date) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// Get location from zip code using OpenWeatherMap Geocoding API
async function getLocation(zip) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  const response = await axios.get(
    `https://api.openweathermap.org/geo/1.0/zip?zip=${zip},US&appid=${apiKey}`
  );

  // Try to get state from reverse geocoding
  let state = '';
  try {
    const reverseResponse = await axios.get(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${response.data.lat}&lon=${response.data.lon}&limit=1&appid=${apiKey}`
    );
    if (reverseResponse.data && reverseResponse.data[0]) {
      state = reverseResponse.data[0].state || '';
    }
  } catch (e) {
    console.error('Reverse geocoding failed:', e.message);
  }

  return {
    city: response.data.name,
    state: state,
    lat: response.data.lat,
    lon: response.data.lon,
    country: response.data.country
  };
}

// Get weather forecast with more detail
async function getWeather(lat, lon) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
  );

  const forecasts = response.data.list;
  const daily = [];
  const seenDates = new Set();

  // Group forecasts by date to get high/low temps
  const dateGroups = {};
  for (const forecast of forecasts) {
    const date = forecast.dt_txt.split(' ')[0];
    if (!dateGroups[date]) {
      dateGroups[date] = [];
    }
    dateGroups[date].push(forecast);
  }

  // Process each day
  for (const date of Object.keys(dateGroups).slice(0, 5)) {
    const dayForecasts = dateGroups[date];
    const temps = dayForecasts.map(f => f.main.temp);
    const humidity = dayForecasts.map(f => f.main.humidity);

    // Get midday forecast for description, or first available
    const middayForecast = dayForecasts.find(f => f.dt_txt.includes('12:00:00')) || dayForecasts[0];

    daily.push({
      date: date,
      temp: Math.round(middayForecast.main.temp),
      tempHigh: Math.round(Math.max(...temps)),
      tempLow: Math.round(Math.min(...temps)),
      description: middayForecast.weather[0].description,
      icon: middayForecast.weather[0].main.toLowerCase(),
      humidity: Math.round(humidity.reduce((a, b) => a + b, 0) / humidity.length),
      windSpeed: Math.round(middayForecast.wind.speed),
      feelsLike: Math.round(middayForecast.main.feels_like)
    });
  }

  return {
    current: daily[0],
    forecast: daily.slice(1, 4)
  };
}

// Generate location-specific positive news using GPT (no source needed)
async function getLocalNews(city, state, weather) {
  const client = getOpenAI();
  if (!client) {
    return getPlaceholderNews(city);
  }

  const today = new Date();
  const season = getSeason(today);
  const locationName = state ? `${city}, ${state}` : city;
  const weatherDesc = weather?.current?.description || 'nice weather';

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly local news writer for a daily digest aimed at elderly readers in nursing homes. Write heartwarming, positive, and uplifting news stories. Focus on community events, local achievements, feel-good stories, and things that bring joy. Keep headlines short and descriptions brief (1-2 sentences). Never include negative, scary, or distressing content.`
        },
        {
          role: 'user',
          content: `Generate 5 positive, heartwarming local news headlines and brief descriptions for ${locationName}.

Today is ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
The season is ${season} and the weather is ${weatherDesc}.

Make the news feel local and specific to ${locationName} - mention local landmarks, neighborhoods, parks, traditions, or cultural elements that would be familiar to residents. Include things like:
- Community events and gatherings
- Local volunteers and heroes
- School or youth achievements
- Senior center activities
- Local business milestones
- Nature and wildlife sightings
- Arts and cultural events

Return as JSON: {"news": [{"title": "...", "description": "..."}]}
Do NOT include a "source" field.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.8
    });

    const content = JSON.parse(response.choices[0].message.content);
    const news = content.news || content.articles || content;
    // Strip any source field if GPT added it
    return news.map(item => ({ title: item.title, description: item.description }));
  } catch (error) {
    console.error('OpenAI news error:', error.message);
    return getPlaceholderNews(city);
  }
}

function getPlaceholderNews(city) {
  return [
    { title: `${city} Community Garden Blooms`, description: 'Local volunteers have created a beautiful new garden space for residents to enjoy.' },
    { title: 'Library Announces Free Programs', description: 'The public library expands offerings with new classes and activities for all ages.' },
    { title: 'Local Students Shine at Science Fair', description: 'Young scientists impress judges with innovative projects at the regional competition.' },
    { title: 'New Walking Trail Opens', description: 'Nature lovers can now explore scenic paths through the local park.' },
    { title: 'Food Drive Exceeds Goals', description: 'Generous donors help the local food bank reach record donation levels.' }
  ];
}

// Get "This Day in History" facts using GPT
async function getThisDayInHistory(city, state) {
  const client = getOpenAI();
  const today = new Date();
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const locationName = state ? `${city}, ${state}` : city;

  if (!client) {
    return [
      { year: '1920', event: 'A historic event happened on this day.' },
      { year: '1955', event: 'Something wonderful occurred in history.' },
      { year: '1985', event: 'A memorable moment from the past.' }
    ];
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a historian providing interesting "This Day in History" facts. Focus on positive, interesting, or culturally significant events. Avoid wars, deaths, disasters, or negative events. Include a mix of local (if relevant to the location), national, and world events.`
        },
        {
          role: 'user',
          content: `Generate 4 interesting "This Day in History" facts for ${monthDay}.

If possible, include 1-2 events related to ${locationName} or the surrounding region.
Focus on positive events like:
- Scientific discoveries and inventions
- Cultural milestones (music, art, film)
- Sports achievements
- Notable births of beloved figures
- Community achievements
- Technological breakthroughs

Return as JSON: {"events": [{"year": "1952", "event": "Brief description of what happened"}]}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7
    });

    const content = JSON.parse(response.choices[0].message.content);
    return content.events || [];
  } catch (error) {
    console.error('OpenAI history error:', error.message);
    return [];
  }
}

// Get upcoming holidays AND observances/events
async function getHolidaysAndEvents() {
  const today = new Date();
  const year = today.getFullYear();
  const results = [];

  // Get national holidays from Nager.Date API
  try {
    const response = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/US`
    );

    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const holidays = response.data
      .filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= today && holidayDate <= sixtyDaysFromNow;
      })
      .map(holiday => ({
        name: holiday.localName,
        date: holiday.date,
        type: 'holiday'
      }));

    results.push(...holidays);
  } catch (error) {
    console.error('Holiday API error:', error.message);
  }

  // Add more events using GPT
  const client = getOpenAI();
  if (client) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You provide information about upcoming observances, awareness days, and cultural events. Focus on positive, family-friendly observances that elderly people would find interesting or meaningful.`
          },
          {
            role: 'user',
            content: `List 5-6 upcoming observances, awareness days, or cultural events in the next 30 days from ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

Include things like:
- National observance days (National Grandparents Day, National Pie Day, etc.)
- Awareness months/weeks (Heart Health Month, etc.)
- Cultural celebrations
- Seasonal events

Return as JSON: {"events": [{"name": "National Pizza Day", "date": "2024-02-09", "type": "observance"}]}`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 400,
        temperature: 0.7
      });

      const content = JSON.parse(response.choices[0].message.content);
      if (content.events) {
        results.push(...content.events);
      }
    } catch (error) {
      console.error('OpenAI events error:', error.message);
    }
  }

  // Sort by date and remove duplicates
  results.sort((a, b) => new Date(a.date) - new Date(b.date));
  const seen = new Set();
  return results.filter(item => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

// Generate location-specific crossword words using GPT - MORE words for bigger puzzle
async function getLocalCrosswordWords(city, state, holidays) {
  const client = getOpenAI();
  const today = new Date();
  const season = getSeason(today);
  const locationName = state ? `${city}, ${state}` : city;

  // Base words that always work
  const baseWords = ['HAPPY', 'JOY', 'SMILE', 'HOPE', 'PEACE', 'FRIEND', 'LOVE', 'WARM', 'KIND', 'CHEER'];

  if (!client) {
    return [...baseWords, city.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10)].filter(w => w.length >= 3 && w.length <= 12);
  }

  const holidayNames = holidays.map(h => h.name).join(', ') || 'none upcoming';

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You generate crossword puzzle words. Return simple, positive words that elderly people would enjoy and recognize. Words must be 3-12 letters, all caps, letters only (no spaces, hyphens, or special characters). Include a good mix of easy (3-5 letters) and medium (6-8 letters) words, with a few longer challenging words (9-12 letters).`
        },
        {
          role: 'user',
          content: `Generate 25 crossword words for ${locationName}.

Include a good variety:
- 8-10 easy words (3-5 letters): simple positive words, common nouns
- 8-10 medium words (6-8 letters): local landmarks, seasonal words, activities
- 5-6 harder words (9-12 letters): longer local place names, descriptive words

Categories to include:
- Local landmarks, neighborhoods, famous streets
- Local foods, restaurants, or cuisine types
- Regional traditions or cultural words
- Seasonal words for ${season}
- Words related to upcoming holidays: ${holidayNames}
- The city/state name if they fit
- Positive, feel-good words
- Nature words (trees, birds, flowers local to the area)

Return as JSON: {"words": [{"word": "WORD", "clue": "Brief clue"}]}

Words must be 3-12 letters, uppercase, only A-Z characters. Make clues short and clear.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = JSON.parse(response.choices[0].message.content);
    const words = content.words || [];

    // Store clues for later use and return just words
    const validWords = words
      .filter(w => /^[A-Z]{3,12}$/.test(w.word))
      .slice(0, 25);

    // Store clues globally for the crossword generator
    global.customClues = {};
    validWords.forEach(w => {
      global.customClues[w.word] = w.clue;
    });

    return validWords.map(w => w.word);
  } catch (error) {
    console.error('OpenAI crossword error:', error.message);
    return baseWords;
  }
}

// Main digest endpoint
router.get('/digest', async (req, res, next) => {
  try {
    const { zip } = req.query;

    if (!zip || !/^\d{5}$/.test(zip)) {
      return res.status(400).json({ error: 'Valid 5-digit zip code required' });
    }

    // Get location from zip code
    let location;
    try {
      location = await getLocation(zip);
    } catch (error) {
      return res.status(400).json({ error: 'Could not find location for this zip code' });
    }

    // Get weather first (needed for news context)
    const weather = await getWeather(location.lat, location.lon);

    // Fetch remaining data in parallel
    const [news, holidaysAndEvents, history] = await Promise.all([
      getLocalNews(location.city, location.state, weather),
      getHolidaysAndEvents(),
      getThisDayInHistory(location.city, location.state)
    ]);

    // Generate location-specific crossword words
    const crosswordWords = await getLocalCrosswordWords(location.city, location.state, holidaysAndEvents);

    // Build response
    const digest = {
      location: {
        city: location.city,
        state: location.state,
        zip: zip
      },
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      weather: weather,
      news: news,
      holidays: holidaysAndEvents,
      history: history,
      crosswordWords: crosswordWords,
      customClues: global.customClues || {}
    };

    res.json(digest);
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
