'use strict'

import { locService } from './services/loc.service.js'
import { weatherService } from './services/weather.service.js'
import { mapService } from './services/map.service.js'
import { utilService } from './services/util.service.js'

window.onload = onInit
window.onAddLoc = onAddLoc
window.onEditLocTitle = onEditLocTitle
window.onDeleteLoc = onDeleteLoc
window.onPanTo = onPanTo
window.onShowUserPos = onShowUserPos
window.onSearchLoc = onSearchLoc
window.onCopyLoc = onCopyLoc

function onInit() {
  new Promise((resolve) => {
    let pos = {}
    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search)
      pos.lat = +urlParams.get('lat')
      pos.lng = +urlParams.get('lng')
      resolve(pos)
    } else
      getUserPos()
        .then(({ coords }) => {
          pos.lat = coords.latitude
          pos.lng = coords.longitude
        })
        .catch((err) => {
          console.log(`Couldn't get user position. Defaulting to MisterBit HDQ.`)
          _alertMsg(err.message + '. Please allow GeoLocation in your browser and try again.')
          pos.lat = 32.08789
          pos.lng = 34.80305
        })
        .finally(() => resolve(pos))
  }).then((pos) => {
    mapService
      .initMap(pos)
      .then(() => {
        mapService.subscribeToTap(renderMarker, pos)
        renderLocs()
      })
      .catch((err) => _alertMsg(`Google Maps couldn't initialize, please try again.`))
  })
}

function renderLocs() {
  _toggleClass('.loc-container', 'loader')
  locService
    .getLocs()
    .then((locs) => {
      const strHtml = !locs.length
        ? `<span class="no-loc">You haven't any saved locations.</span>`
        : locs
            .map((loc) => {
              const title = utilService.escapeHTML(loc.customTitle) || loc.addrs
              return `<article class="loc-preview">
                        <h2 class="title">
                          <span data-id="${loc.id}" class="custom-title ${utilService.isRTL(loc.customTitle) ? 'rtl' : ''}" onclick="onEditLocTitle(this)">${title}</span>
                          ${loc.customTitle ? `<span class="addrs">${loc.addrs}</span>` : ''}
                        </h2>
                        <span class="date">Saved: ${utilService.getDateStr('il', loc.createdAt, 'day', 'month', 'year', 'hour', 'minute')}
                        ${loc.updatedAt ? ` | Updated: ${utilService.getDateStr('il', loc.updatedAt, 'day', 'month', 'year', 'hour', 'minute')}` : ''}</span>
                        <button class="delete-loc" onclick="onDeleteLoc('${loc.id}')">🗑️</button>
                        <button class="show-loc" onclick="onPanTo('${loc.id}')">🌐</button>
                      </article>`
            })
            .join('')
      document.querySelector('.loc-list').innerHTML = strHtml
      _toggleClass('.loc-container', 'loader')
      mapService.placeMarkers(locs)
    })
    .catch((err) => _alertMsg(`Couldn't fetch your locations. Please try again.`))
}

function renderWeather({ lat, lng }, city) {
  _toggleClass('.weather-container', 'loader')
  weatherService
    .getWeather(lat, lng, city)
    .then(({ name, updatedAt, icon, temp, description }) => {
      const strHtml = `
            <h2>${name}<span> (Updated: ${utilService.getDateStr('il', updatedAt, 'hour', 'minute')})</span></h2>
            <img src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="weather.description" class="weather-icon"/>
            <span class="temp">${temp.toFixed(1)}℃</span>
            <span class="desc">${description}</span>
            `
      document.querySelector('.weather-preview').innerHTML = strHtml
      _toggleClass('.weather-container', 'loader')
    })
    .catch((err) => _alertMsg(`Weather service is not available. Please try again later.`))
}

function renderCurrLoc(loc) {
  const elLoc = document.querySelector('.curr-loc .addrs')
  elLoc.textContent = loc
}

function onCopyLoc() {
  const {
    position: { lat, lng },
  } = mapService.getCurrMarker()
  const url = window.location.href.split('?')[0] + `?lat=${lat().toFixed(5)}&lng=${lng().toFixed(5)}`
  navigator.clipboard.writeText(url)
}

function onSearchLoc(ev) {
  ev.preventDefault()
  const locName = ev.target.elements['search-term'].value.trim()
  if (!locName) return _alertMsg('Please enter an address / location and try again.')
  mapService
    .getCoords(locName)
    .then(({ pos, loc }) => {
      mapService.addMarker(pos, loc)
      renderMarker(pos, loc)
    })
    .catch((err) => _alertMsg(`No results. Please refine your query and try again.`))
}

function onAddLoc(ev) {
  ev.preventDefault()
  const customTitle = ev.target.elements['custom-title'].value.trim()
  const {
    title: addrs = title.replaceAll("'", ''),
    position: { lat, lng },
    city,
  } = mapService.getCurrMarker()
  locService.addLoc(addrs, city, lat(), lng(), customTitle)
  mapService.hideMarker()
  renderLocs()
}

function onEditLocTitle(elCustomTitle) {
  const prevTitle = elCustomTitle.textContent
  const { id } = elCustomTitle.dataset
  elCustomTitle.contentEditable = true
  elCustomTitle.onclick = null
  _toggleClass(`[data-id="${id}"]`, 'edit')
  elCustomTitle.onblur = ({ target: { textContent: newTitle } }) => {
    if (prevTitle !== newTitle) {
      onSaveLoc(newTitle, id)
    }
    elCustomTitle.contentEditable = false
    elCustomTitle.onblur = null
    elCustomTitle.onclick = () => onEditLocTitle(elCustomTitle)
    _toggleClass(`[data-id="${id}"]`, 'edit')
  }
  _focusEndOfContent(elCustomTitle)
}

function onSaveLoc(title, id) {
  locService.saveLoc(title, id)
  renderLocs()
}

function onDeleteLoc(id) {
  locService.deleteLoc(id)
  renderLocs()
}

function renderMarker(pos, { addrs, city }) {
  renderCurrLoc(addrs)
  renderWeather(pos, city)
}

function onShowUserPos() {
  getUserPos()
    .then((pos) => {
      pos = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }
      return mapService
        .getAddress(pos)
        .then((loc) => {
          mapService.addMarker(pos, loc)
          renderMarker(pos, loc)
        })
        .catch((err) => _alertMsg(`Your location was not found.`))
    })
    .catch((err) => _alertMsg('Please allow GeoLocation in your browser and try again.'))
}

function onPanTo(locId) {
  const { pos, loc, city } = mapService.panTo(locId)
  renderCurrLoc(loc)
  renderWeather(pos, city)
}

function getUserPos() {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
}

function _focusEndOfContent(el) {
  const range = document.createRange()
  const selection = window.getSelection()
  selection.removeAllRanges()
  range.selectNodeContents(el)
  range.collapse(false)
  selection.addRange(range)
  el.focus()
}

function _alertMsg(msg) {
  const elModalContainer = document.querySelector('.modal-container')
  const { length: currModalsCount } = elModalContainer.children
  const elModal = document.createElement('div')
  elModal.classList.add(`modal`)
  elModal.insertAdjacentHTML('afterbegin', `<div class="msg">${msg}</div>`)
  elModalContainer.append(elModal)
  const animationKeyframes = [
    { transform: `translateX(-50%)` },
    ...[...Array(4)].map(() => ({ transform: `translateX(-50%) translateY(calc(${currModalsCount + 1} * -80px))` })),
    { transform: `translateX(-50%)` },
  ]
  elModal.animate(animationKeyframes, 2500).onfinish = () => elModal.remove()
}

function _toggleClass(el, className) {
  document.querySelector(el).classList.toggle(className)
}
