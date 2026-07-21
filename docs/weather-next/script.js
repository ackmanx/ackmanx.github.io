const LATITUDE = 45.0655;
const LONGITUDE = -93.2019;

const weatherNames = {
  0: "Clear skies", 1: "Mostly sunny", 2: "Partly sunny", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Rain showers", 82: "Heavy showers", 85: "Snow showers",
  86: "Heavy snow showers", 95: "Thunderstorms", 96: "Thunderstorms",
  99: "Severe thunderstorms"
};

const $ = (id) => document.getElementById(id);
const round = Math.round;
const compass = (degrees) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][round(degrees / 45) % 8];
const iconFor = (code) => code === 0 ? "☀" : code <= 2 ? "🌤" : code === 3 ? "☁" : code === 45 || code === 48 ? "≋" : code >= 71 && code <= 86 ? "❄" : code >= 95 ? "ϟ" : "☂";
const asDate = (value) => new Date(typeof value === "number" ? value * 1000 : value);
const formatTime = (value) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric", minute: "2-digit", timeZone: "America/Chicago"
}).format(asDate(value));

function render(data) {
  const current = data.current;
  $("temperature").textContent = `${round(current.temperature_2m)}°`;
  $("conditions").textContent = weatherNames[current.weather_code] ?? "Current conditions";
  $("feels-like").textContent = `Feels like ${round(current.apparent_temperature)}°`;
  $("high").textContent = `H ${round(data.daily.temperature_2m_max[0])}°`;
  $("low").textContent = `L ${round(data.daily.temperature_2m_min[0])}°`;
  $("humidity").textContent = `${round(current.relative_humidity_2m)}%`;
  $("wind").textContent = `${compass(current.wind_direction_10m)} ${round(current.wind_speed_10m)} mph`;
  $("rain").textContent = `${round(current.precipitation_probability)}%`;
  $("sunrise").textContent = formatTime(data.daily.sunrise[0]);
  $("sunset").textContent = formatTime(data.daily.sunset[0]);

  const start = Math.max(0, data.hourly.time.findIndex((value) => asDate(value) >= new Date()));
  $("hourly").replaceChildren(...data.hourly.time.slice(start, start + 7).map((value, index) => {
    const position = start + index;
    const article = document.createElement("article");
    const heading = document.createElement("h2");
    const icon = document.createElement("span");
    const temperature = document.createElement("strong");
    const rain = document.createElement("small");
    heading.textContent = index === 0 ? "NOW" : formatTime(value);
    icon.className = "hour-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconFor(data.hourly.weather_code[position]);
    temperature.textContent = `${round(data.hourly.temperature_2m[position])}°`;
    rain.textContent = `${data.hourly.precipitation_probability[position]}% rain`;
    article.append(heading, icon, temperature, rain);
    return article;
  }));
}

async function loadWeather() {
  const button = $("refresh");
  button.disabled = true;
  $("notice").hidden = true;

  const params = new URLSearchParams({
    latitude: LATITUDE, longitude: LONGITUDE, timezone: "America/Chicago",
    temperature_unit: "fahrenheit", wind_speed_unit: "mph", precipitation_unit: "inch",
    forecast_days: 2, timeformat: "unixtime",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset"
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
    render(await response.json());
    $("updated").textContent = `Updated ${formatTime(new Date())}`;
  } catch (error) {
    console.error(error);
    $("notice").hidden = false;
  } finally {
    button.disabled = false;
  }
}

$("refresh").addEventListener("click", loadWeather);
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);
