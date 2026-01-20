// Daily Digest - Frontend Application

// Store the current digest data
let currentDigest = null;

// DOM Elements
const zipForm = document.getElementById('zip-form');
const zipInput = document.getElementById('zip-input');
const fetchBtn = document.getElementById('fetch-btn');
const errorMessage = document.getElementById('error-message');
const inputSection = document.getElementById('input-section');
const loadingSection = document.getElementById('loading-section');
const previewSection = document.getElementById('preview-section');
const generatePdfBtn = document.getElementById('generate-pdf-btn');
const startOverBtn = document.getElementById('start-over-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  zipForm.addEventListener('submit', handleSubmit);
  generatePdfBtn.addEventListener('click', handleGeneratePdf);
  startOverBtn.addEventListener('click', handleStartOver);

  // Only allow numeric input
  zipInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });
});

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  const zip = zipInput.value.trim();

  if (!/^\d{5}$/.test(zip)) {
    showError('Please enter a valid 5-digit zip code.');
    return;
  }

  hideError();
  showLoading();

  try {
    const response = await fetch(`/api/digest?zip=${zip}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch digest');
    }

    currentDigest = data;
    renderPreview(data);
    showPreview();
  } catch (error) {
    console.error('Error fetching digest:', error);
    showError(error.message || 'Unable to fetch your daily digest. Please try again.');
    showInput();
  }
}

// Show/hide sections
function showLoading() {
  inputSection.hidden = true;
  loadingSection.hidden = false;
  previewSection.hidden = true;
}

function showPreview() {
  inputSection.hidden = true;
  loadingSection.hidden = true;
  previewSection.hidden = false;
}

function showInput() {
  inputSection.hidden = false;
  loadingSection.hidden = true;
  previewSection.hidden = true;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.hidden = true;
}

// Render the preview
function renderPreview(data) {
  // Greeting based on time of day
  const hour = new Date().getHours();
  let greeting = 'Good Morning!';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon!';
  if (hour >= 17) greeting = 'Good Evening!';

  document.getElementById('greeting').textContent = greeting;
  document.getElementById('date-display').textContent = data.date;
  document.getElementById('location-display').textContent =
    data.location.state
      ? `${data.location.city}, ${data.location.state}`
      : data.location.city;

  // Render weather
  renderWeather(data.weather);

  // Render news
  renderNews(data.news);

  // Render holidays
  renderHolidays(data.holidays);

  // Show crossword words preview
  const wordsPreview = document.getElementById('crossword-words');
  wordsPreview.textContent = `Words included: ${data.crosswordWords.slice(0, 8).join(', ')}...`;
}

// Render weather section
function renderWeather(weather) {
  const container = document.getElementById('weather-content');
  container.innerHTML = '';

  // Current weather
  if (weather.current) {
    const today = createWeatherCard(weather.current, 'Today', true);
    container.appendChild(today);
  }

  // Forecast
  weather.forecast.forEach((day, index) => {
    const dayName = formatDayName(day.date);
    const card = createWeatherCard(day, dayName, false);
    container.appendChild(card);
  });
}

function createWeatherCard(data, label, isToday) {
  const div = document.createElement('div');
  div.className = `weather-day${isToday ? ' today' : ''}`;

  const icon = getWeatherIcon(data.icon);

  div.innerHTML = `
    <div class="day-name">${label}</div>
    <div class="weather-icon">${icon}</div>
    <div class="temp">${data.temp}°F</div>
    <div class="description">${data.description}</div>
  `;

  return div;
}

function getWeatherIcon(condition) {
  const icons = {
    'clear': '☀️',
    'clouds': '☁️',
    'rain': '🌧️',
    'drizzle': '🌦️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'fog': '🌫️',
    'haze': '🌫️'
  };
  return icons[condition] || '🌤️';
}

function formatDayName(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Render news section
function renderNews(news) {
  const container = document.getElementById('news-content');
  container.innerHTML = '';

  if (!news || news.length === 0) {
    container.innerHTML = '<p class="no-news">No news available at this time.</p>';
    return;
  }

  news.forEach(item => {
    const article = document.createElement('article');
    article.className = 'news-item';
    article.innerHTML = `
      <h3>${escapeHtml(item.title)}</h3>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
    `;
    container.appendChild(article);
  });
}

// Render holidays section
function renderHolidays(holidays) {
  const container = document.getElementById('holidays-content');
  container.innerHTML = '';

  if (!holidays || holidays.length === 0) {
    container.innerHTML = '<p class="no-holidays">No upcoming holidays in the next 30 days.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'holidays-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Holiday</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${holidays.map(h => `
        <tr>
          <td>${escapeHtml(h.name)}</td>
          <td>${formatHolidayDate(h.date)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.appendChild(table);
}

function formatHolidayDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

// Handle PDF generation
function handleGeneratePdf() {
  if (!currentDigest) {
    showError('No digest data available. Please try again.');
    return;
  }

  generatePdfBtn.disabled = true;
  generatePdfBtn.textContent = 'Generating PDF...';

  try {
    generateDigestPdf(currentDigest);
  } catch (error) {
    console.error('Error generating PDF:', error);
    showError('Failed to generate PDF. Please try again.');
  } finally {
    generatePdfBtn.disabled = false;
    generatePdfBtn.textContent = 'Generate Printable PDF';
  }
}

// Handle start over
function handleStartOver() {
  currentDigest = null;
  zipInput.value = '';
  hideError();
  showInput();
  zipInput.focus();
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
