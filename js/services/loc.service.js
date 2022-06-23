'use strict'

import { utilService } from './util.service.js'
import { storageService } from './storage.service.js'

export const locService = {
  getLocs,
  addLoc,
  saveLoc,
  deleteLoc,
}

const STORAGE_KEY = 'locDB'

const locs = storageService.load(STORAGE_KEY) || []

let isInitialLoad = true

function getLocs() {
  const delay = isInitialLoad ? 2500 : 200
  isInitialLoad = false
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(locs)
    }, delay)
  })
}

function addLoc(addrs, city, lat, lng, customTitle) {
  locs.push({
    id: utilService.makeId(),
    customTitle,
    addrs,
    city,
    lat,
    lng,
    createdAt: Date.now(),
    updatedAt: null,
  })
  storageService.save(STORAGE_KEY, locs)
}

function deleteLoc(id) {
  const idx = locs.findIndex((loc) => loc.id === id)
  locs.splice(idx, 1)
  storageService.save(STORAGE_KEY, locs)
}

function saveLoc(customTitle, id) {
  const loc = locs.find((loc) => loc.id === id)
  loc.customTitle = customTitle
  loc.updatedAt = Date.now()
  storageService.save(STORAGE_KEY, locs)
}
