// @ts-nocheck

async function getWeatherData({ openWeatherMapApi }) {
  const response = UrlFetchApp.fetch(`https://api.openweathermap.org/data/2.5/forecast?q=okinawa&appid=${openWeatherMapApi}`)
  const json = JSON.parse(response.getContentText())
  return json
}

function weatherToEmoji({ weather }) {
  switch (weather) {
    case 'Clear':
      return '🌞'
    case 'Clouds':
      return '🌥️'
    case 'Rain':
      return '🌧'
    case 'Snow':
      return '⛄️'
    case 'Thunderstorm':
      return '⚡️'
    default:
      return '?'
  }
}

function getWeather({ weatherData, date }) {
  const result = Array(8).fill(null)
  let included = false
  weatherData.list.forEach((item) => {
    const givenDate = new Date(date)
    const _date = new Date(item.dt_txt)
    if (givenDate.getDate() !== _date.getDate()) {
      return null
    }
    const weather = weatherToEmoji({ weather: item.weather[0].main })
    const time = _date.getHours()
    const index = Math.floor(time / 3)
    result[index] = weather
    included = true
  })
  if (included === false) return null
  return result
}

async function main() {
  const properties = PropertiesService.getScriptProperties()
  const openWeatherMapApi = properties.getProperty('OPEN_WEATHER_MAP_API')
  const slackWebhookUrl = properties.getProperty('SLACK_WEBHOOK_URL')

  Logger.log(`openWeatherMapApi: ${openWeatherMapApi}`)

  const date = new Date()

  const weatherData = await getWeatherData({ openWeatherMapApi })
  const weather = getWeather({ weatherData, date })
  Logger.log(JSON.stringify(weather))
  date.setDate(date.getDate() + 1)

  const message = weather
    .map((item, index) => {
      const time = index * 3
      return `${time.toString().padStart(2, '0')}:00 - ${(item ?? '🌱')} ${item === '🌧' ? '*(雨降るよ！！！)*' : ''}`
    })
    .filter((item) => item !== null)
    .join('\n')

  const willRain = message.includes('🌧')

  const payload = {
    blocks: [
      willRain ? {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<!channel> ☔️☔️☔️☔️☔️'
        }
      } : null,
      willRain ? {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '今日雨降るよ〜〜〜\n傘持っていこうね！！！'
        }
      } : null,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:sunny::sunny::sunny: *今日の天気* :sunny::sunny::sunny:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ].filter((item) => item !== null)
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  }

  UrlFetchApp.fetch(slackWebhookUrl, options)
}
