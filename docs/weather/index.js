// Default Coordinates (Fargo, ND)
const DEFAULT_LAT = 46.8772
const DEFAULT_LON = -96.7898

// Load from LocalStorage or fallback to default
let weather_lat = parseFloat(localStorage.getItem('weather_lat')) || DEFAULT_LAT
let weather_lon = parseFloat(localStorage.getItem('weather_lon')) || DEFAULT_LON

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons()
  update_date()
  setup_settings()
  fetch_weather_data()
})

function update_date() {
  const date_options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  document.getElementById('current-date').textContent = new Date().toLocaleDateString(
    'en-US',
    date_options
  )
}

function setup_settings() {
  const modal = document.getElementById('settings-modal')
  const btn = document.getElementById('settings-btn')
  const cancel_btn = document.getElementById('cancel-settings')
  const save_btn = document.getElementById('save-settings')
  const lat_input = document.getElementById('input-lat')
  const lon_input = document.getElementById('input-lon')
  const error_msg = document.getElementById('settings-error')
  const detect_btn = document.getElementById('detect-location')

  btn.addEventListener('click', () => {
    lat_input.value = weather_lat
    lon_input.value = weather_lon
    error_msg.classList.add('hidden')
    modal.classList.remove('hidden')
  })

  cancel_btn.addEventListener('click', () => {
    modal.classList.add('hidden')
  })

  save_btn.addEventListener('click', () => {
    const new_lat = parseFloat(lat_input.value)
    const new_lon = parseFloat(lon_input.value)

    if (!isNaN(new_lat) && !isNaN(new_lon)) {
      weather_lat = new_lat
      weather_lon = new_lon
      localStorage.setItem('weather_lat', weather_lat)
      localStorage.setItem('weather_lon', weather_lon)
      modal.classList.add('hidden')
      fetch_weather_data() // Refetch with new coordinates
    } else {
      error_msg.textContent = 'Please enter valid numerical coordinates.'
      error_msg.classList.remove('hidden')
    }
  })

  detect_btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      error_msg.textContent = 'Geolocation is not supported by your browser.'
      error_msg.classList.remove('hidden')
      return
    }

    const original_text = detect_btn.innerHTML
    detect_btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Locating...'
    lucide.createIcons()
    detect_btn.disabled = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const new_lat = position.coords.latitude
        const new_lon = position.coords.longitude

        lat_input.value = new_lat.toFixed(4)
        lon_input.value = new_lon.toFixed(4)

        // Auto-save and fetch
        weather_lat = new_lat
        weather_lon = new_lon
        localStorage.setItem('weather_lat', weather_lat)
        localStorage.setItem('weather_lon', weather_lon)

        modal.classList.add('hidden')
        fetch_weather_data()

        // Reset button state silently in background
        detect_btn.innerHTML = original_text
        lucide.createIcons()
        detect_btn.disabled = false
        error_msg.classList.add('hidden')
      },
      (error) => {
        error_msg.textContent = 'Unable to retrieve location. Please check browser permissions.'
        error_msg.classList.remove('hidden')
        detect_btn.innerHTML = original_text
        lucide.createIcons()
        detect_btn.disabled = false
      }
    )
  })
}

async function fetch_weather_data() {
  try {
    // Show loading state when refetching
    document.getElementById('app').classList.add('hidden')
    document.getElementById('error-state').classList.add('hidden')
    document.getElementById('loading').classList.remove('hidden')

    // 1. Get the local grid points from NOAA using the coordinates
    const points_res = await fetch(`https://api.weather.gov/points/${weather_lat},${weather_lon}`)
    if (!points_res.ok) throw new Error('Failed to fetch grid points')
    const points_data = await points_res.json()

    // Extract City and State and update UI
    const city = points_data.properties.relativeLocation.properties.city
    const state = points_data.properties.relativeLocation.properties.state
    document.getElementById('location-name').textContent = `${city}, ${state}`
    document.title = `${city}, ${state} | NOAA Forecast`

    const forecast_url = points_data.properties.forecast
    const hourly_url = points_data.properties.forecastHourly

    // 2. Fetch Daily, Hourly forecasts and Stations list simultaneously
    const [daily_forecast_res, hourly_forecast_res, stations_res] = await Promise.all([
      fetch(forecast_url),
      fetch(hourly_url),
      fetch(points_data.properties.observationStations),
    ])

    if (!daily_forecast_res.ok || !hourly_forecast_res.ok)
      throw new Error('Failed to fetch forecasts')

    const daily_forecast = await daily_forecast_res.json()
    const hourly_forecast = await hourly_forecast_res.json()

    // Try to fetch latest physical station observation
    let observation_data = null
    let observation_time = null
    if (stations_res && stations_res.ok) {
      try {
        const stations_data = await stations_res.json()
        const nearest_station_url = stations_data.features[0]?.id

        if (nearest_station_url) {
          const observation_res = await fetch(`${nearest_station_url}/observations/latest`)
          if (observation_res.ok) {
            observation_data = await observation_res.json()
            observation_time = observation_data.properties.timestamp
          }
        }
      } catch (station_error) {
        console.warn('Failed to fetch nearest station observation:', station_error)
      }
    }

    // 3. Render Data
    render_current_conditions(
      hourly_forecast.properties.periods[0],
      daily_forecast.properties.periods[0],
      observation_data
    )
    render_hourly_forecast(hourly_forecast.properties.periods)
    render_daily_forecast(daily_forecast.properties.periods)
    update_radar(weather_lat, weather_lon)
    update_last_updated(
      observation_time || daily_forecast.properties.updateTime,
      Boolean(observation_time)
    )

    // Show app, hide loading
    document.getElementById('loading').classList.add('hidden')
    document.getElementById('app').classList.remove('hidden')
  } catch (error) {
    console.error('Weather App Error:', error)
    document.getElementById('loading').classList.add('hidden')
    document.getElementById('error-state').classList.remove('hidden')
  }
}

function render_current_conditions(current_hourly, current_daily, observation_data = null) {
  // Update warning icon if forecast data is used instead of live observations
  const warning_element = document.getElementById('forecast-warning')
  if (warning_element) {
    if (observation_data) {
      warning_element.classList.add('hidden')
    } else {
      warning_element.classList.remove('hidden')
    }
  }

  // Temperature & Description
  let temperature = current_hourly.temperature
  if (observation_data && observation_data.properties.temperature.value !== null) {
    temperature = Math.round((observation_data.properties.temperature.value * 9) / 5 + 32)
  }

  document.getElementById('current-temp').textContent = `${temperature}°`

  let description = current_hourly.shortForecast
  if (observation_data && observation_data.properties.textDescription) {
    description = observation_data.properties.textDescription
  }

  document.getElementById('current-desc').textContent = description

  // Icon update on the top right
  const icon_name = get_weather_icon(description, current_hourly.isDaytime)
  document.getElementById('bg-weather-icon').setAttribute('data-lucide', icon_name)

  // Details
  let wind_text = `${current_hourly.windSpeed} ${current_hourly.windDirection}`
  if (observation_data && observation_data.properties.windSpeed.value !== null) {
    const miles_per_hour = Math.round(observation_data.properties.windSpeed.value * 0.621371)
    let direction_text = ''

    if (observation_data.properties.windDirection.value !== null) {
      const wind_degrees = observation_data.properties.windDirection.value
      const directions_list = [
        'N',
        'NNE',
        'NE',
        'ENE',
        'E',
        'ESE',
        'SE',
        'SSE',
        'S',
        'SSW',
        'SW',
        'WSW',
        'W',
        'WNW',
        'NW',
        'NNW',
      ]
      const direction_index = Math.round(wind_degrees / 22.5) % 16
      direction_text = directions_list[direction_index]
    }

    wind_text = `${miles_per_hour} mph ${direction_text}`.trim()
  }

  document.getElementById('current-wind').textContent = wind_text

  let relative_humidity =
    current_hourly.relativeHumidity?.value || current_daily.relativeHumidity?.value || '--'
  if (observation_data && observation_data.properties.relativeHumidity.value !== null) {
    relative_humidity = Math.round(observation_data.properties.relativeHumidity.value)
  }

  document.getElementById('current-humidity').textContent = `${relative_humidity}%`

  const precipitation_chance =
    current_hourly.probabilityOfPrecipitation?.value ||
    current_daily.probabilityOfPrecipitation?.value ||
    '0'
  document.getElementById('current-precip').textContent = `${precipitation_chance}%`

  // Feels like temperature calculation
  let feels_like_temp = current_hourly.temperature
  if (observation_data) {
    const heat_index_celsius = observation_data.properties.heatIndex.value
    const wind_chill_celsius = observation_data.properties.windChill.value

    if (heat_index_celsius !== null) {
      feels_like_temp = Math.round((heat_index_celsius * 9) / 5 + 32)
    } else if (wind_chill_celsius !== null) {
      feels_like_temp = Math.round((wind_chill_celsius * 9) / 5 + 32)
    } else if (observation_data.properties.temperature.value !== null) {
      feels_like_temp = Math.round((observation_data.properties.temperature.value * 9) / 5 + 32)
    }
  }

  document.getElementById('current-feels').textContent = feels_like_temp

  // Visibility
  let visibility_text = 'Good'
  if (observation_data && observation_data.properties.visibility.value !== null) {
    const visibility_miles = Math.round(observation_data.properties.visibility.value / 1609.34)
    visibility_text = `${visibility_miles} miles`
  }

  document.getElementById('current-vis').textContent = visibility_text

  // Re-render lucide icons for dynamically added content
  lucide.createIcons()
}

function render_hourly_forecast(hourly_periods) {
  const container = document.getElementById('hourly-container')
  container.innerHTML = '' // Clear skeleton

  // Render next 24 hours
  for (let i = 1; i <= 24; i++) {
    const period = hourly_periods[i]
    const time = new Date(period.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    })
    const icon_name = get_weather_icon(period.shortForecast, period.isDaytime)

    const hourly_element = document.createElement('div')
    hourly_element.className =
      'flex flex-col items-center justify-between min-w-[70px] py-2 px-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors flex-shrink-0'

    hourly_element.innerHTML = `
                    <span class="text-xs text-blue-200 mb-2 font-medium">${time}</span>
                    <i data-lucide="${icon_name}" class="w-6 h-6 mb-2 ${period.isDaytime ? 'text-yellow-200' : 'text-blue-200'}"></i>
                    <span class="text-sm font-bold">${period.temperature}°</span>
                    <span class="text-[10px] text-blue-300 mt-1 flex items-center gap-1">
                        <i data-lucide="droplets" class="w-3 h-3"></i>
                        ${period.probabilityOfPrecipitation?.value || 0}%
                    </span>
                `
    container.appendChild(hourly_element)
  }
  lucide.createIcons()
}

function render_daily_forecast(daily_periods) {
  const container = document.getElementById('daily-container')
  container.innerHTML = ''

  let html = ''

  for (let i = 0; i < daily_periods.length; i++) {
    const period = daily_periods[i]

    // Only create rows for Daytime (or Tonight if it's the very first period and it's night)
    if (period.isDaytime || (i === 0 && !period.isDaytime)) {
      const icon_name = get_weather_icon(period.shortForecast, period.isDaytime)
      const is_today = period.number === 1
      const day_name = is_today ? (period.isDaytime ? 'Today' : 'Tonight') : period.name

      // Try to find the corresponding night for the low temp
      let night_period = null
      if (period.isDaytime && i + 1 < daily_periods.length) {
        night_period = daily_periods[i + 1]
      }

      const high_temp = period.temperature
      const low_temp = night_period ? night_period.temperature : '--'

      const precip = period.probabilityOfPrecipitation?.value || 0

      html += `
                        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div class="w-32 font-medium ${is_today ? 'text-white' : 'text-blue-100'}">${day_name}</div>

                            <div class="flex items-center justify-center flex-1 gap-2">
                                <i data-lucide="${icon_name}" class="w-5 h-5 ${period.isDaytime ? 'text-yellow-200' : 'text-blue-200'}"></i>
                                ${precip > 10 ? `<span class="text-xs text-blue-300 w-8">${precip}%</span>` : `<span class="w-8"></span>`}
                            </div>

                            <div class="w-24 text-right flex justify-end gap-3 text-sm">
                                <span class="font-bold text-white">${high_temp}°</span>
                                <span class="text-blue-300/60">${low_temp}°</span>
                            </div>
                        </div>
                    `
    }
  }
  container.innerHTML = html
  lucide.createIcons()
}

function update_radar(lat, lon) {
  const iframe = document.getElementById('radar-iframe')
  // Uses Windy.com embed with NOAA radar data overlay, dynamically passing our lat/lon
  iframe.src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=%C2%B0F&metricWind=mph&zoom=8&overlay=radar&product=radar&level=surface&lat=${lat}&lon=${lon}`
}

function update_last_updated(update_time, is_observation = false) {
  if (!update_time) {
    return
  }

  const last_updated_date = new Date(update_time)
  const formatted_time = last_updated_date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const formatted_date = last_updated_date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const timestamp_element = document.getElementById('last-updated')
  if (timestamp_element) {
    timestamp_element.textContent = `${formatted_date} at ${formatted_time}`
  }

  const label_element = document.getElementById('last-updated-label')
  if (label_element) {
    label_element.textContent = is_observation ? 'Last observed' : 'Forecast last updated'
  }
}

// Helper function to map NOAA text descriptions to Lucide icons
function get_weather_icon(short_forecast, is_daytime) {
  const forecast = short_forecast.toLowerCase()

  if (forecast.includes('thunder') || forecast.includes('t-storm')) return 'cloud-lightning'
  if (forecast.includes('snow') || forecast.includes('blizzard') || forecast.includes('flurries'))
    return 'snowflake'
  if (forecast.includes('rain') || forecast.includes('showers') || forecast.includes('drizzle'))
    return 'cloud-rain'
  if (forecast.includes('fog')) return 'cloud-fog'
  if (forecast.includes('wind') || forecast.includes('breezy')) return 'wind'

  if (forecast.includes('partly') || forecast.includes('mostly')) {
    return is_daytime ? 'cloud-sun' : 'cloud-moon'
  }
  if (forecast.includes('cloud')) return 'cloud'

  // Default to clear/sunny
  return is_daytime ? 'sun' : 'moon'
}

// Mouse drag scrolling for the hourly container
const slider = document.getElementById('hourly-container')
let is_down = false
let start_x
let scroll_left

slider.addEventListener('mousedown', (e) => {
  is_down = true
  slider.classList.add('active')
  start_x = e.pageX - slider.offsetLeft
  scroll_left = slider.scrollLeft
})
slider.addEventListener('mouseleave', () => {
  is_down = false
  slider.classList.remove('active')
})
slider.addEventListener('mouseup', () => {
  is_down = false
  slider.classList.remove('active')
})
slider.addEventListener('mousemove', (e) => {
  if (!is_down) return
  e.preventDefault()
  const x = e.pageX - slider.offsetLeft
  const walk = (x - start_x) * 2 // Scroll speed multiplier
  slider.scrollLeft = scroll_left - walk
})
