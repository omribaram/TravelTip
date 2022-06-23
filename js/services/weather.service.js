'use strict'

import { storageService } from './storage.service.js'

export const weatherService = {
  getWeather,
}

const WEA_API_KEY = 'b5e78c9f09fa8c4b7193842e2da92d69'
const STORAGE_KEY = 'weatherDB'

const cities = storageService.load(STORAGE_KEY) || {}

function getWeather(lat, lng, city) {
  const isOneHourAgo = Date.now() - cities[city]?.updatedAt > 60 * 60 * 1000

  return cities[city] && !isOneHourAgo
    ? Promise.resolve(cities[city])
    : axios
        .get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEA_API_KEY}`)
        .then(
          ({
            data: {
              name,
              main: { temp },
              weather: {
                0: { icon, description },
              },
            },
          }) => {
            if (!cities[city]) cities[city] = {}
            cities[city] = { name, temp, icon, description, updatedAt: Date.now() }
            storageService.save(STORAGE_KEY, cities)
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(cities[city])
              }, 1500)
            })
          }
        )
        .catch((err) => err)
}
