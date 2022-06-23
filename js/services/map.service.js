'use strict'

export const mapService = {
  initMap,
  getAddress,
  getCoords,
  getCurrMarker,
  placeMarkers,
  addMarker,
  hideMarker,
  panTo,
  subscribeToTap,
}

import { utilService } from './util.service.js'

const MAP_API_KEY = 'AIzaSyCEvUoWUJECBI1aVE0kq07ZS0G9ZGFoOyw'
const ICON_BASE = './img/marker.png'

let map
let marker
let infoWindow
let markers = []

function initMap({ lat = 32, lng = 35 }) {
  return _connectGoogleApi()
    .then(() => {
      map = new google.maps.Map(document.querySelector('.map-container'), {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        scaleControl: true,
      })

      infoWindow = new google.maps.InfoWindow()
      infoWindow.addListener('closeclick', () => {
        hideMarker()
      })

      marker = new google.maps.Marker({
        map,
        icon: ICON_BASE,
      })
    })
    .catch((err) => err)
}

function subscribeToTap(listener, initPos) {
  map.addListener('click', ({ latLng: { lat, lng } }) => {
    const pos = {
      lat: lat(),
      lng: lng(),
    }

    getAddress(pos)
      .then((loc) => {
        addMarker(pos, loc)
        listener(pos, loc)
      })
      .catch((err) => err)
  })

  google.maps.event.trigger(map, 'click', {
    latLng: new google.maps.LatLng(initPos),
  })
}

function addMarker(pos, { addrs, city }) {
  marker.setOptions({
    position: pos,
    title: addrs,
    visible: true,
  })

  marker.city = city

  map.setCenter(pos)

  const contentString = `
            <form onsubmit="onAddLoc(event)" class="add-loc">
              <h3>${addrs}</h3>
              <input type="text" style="display: none"/>
              <input class="custom-title" name="custom-title" type="text" maxlength="30" placeholder="Custom title?" autocomplete="off"/>
              <h4>Do you want to keep this location?</h4>
              <button class="save-loc">Keep</button>
            </form>
            `

  infoWindow.setContent(contentString)

  infoWindow.open(map, marker)
}

function placeMarkers(locs) {
  _deleteMarkers()
  locs.forEach((loc) => {
    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      title: loc.addrs,
      icon: ICON_BASE,
      id: loc.id,
    })

    marker.city = loc.city

    const contentString = `<h3 ${
      utilService.isRTL(loc.customTitle) ? 'class="rtl"' : ''
    }>${utilService.escapeHTML(loc.customTitle) || loc.addrs}</h3>`

    const tooltip = new google.maps.InfoWindow({
      content: contentString,
    })

    marker.addListener('click', () => {
      tooltip.open(map, marker)
    })

    markers.push(marker)
  })
  _setMapOnAllMarkers(map)
}

function panTo(id) {
  const idx = markers.findIndex((marker) => marker.id === id)
  const { city, title: loc, position: pos } = markers[idx]
  map.panTo(pos)
  map.setZoom(19)
  google.maps.event.trigger(markers[idx], 'click')
  return { pos: { lat: pos.lat(), lng: pos.lng() }, loc, city }
}

function getAddress({ lat, lng }) {
  return axios
    .get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAP_API_KEY}`
    )
    .then(
      ({
        data: {
          results: {
            0: { formatted_address: addrs, address_components: addrsCmps },
          },
        },
      }) => {
        if (!addrs || !addrsCmps?.length)
          return Promise.reject('No resulsts were found.')
        const city = _getCity(addrsCmps)
        return { addrs, city }
      }
    )
}

function getCoords(str) {
  return axios
    .get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${str}&key=${MAP_API_KEY}`
    )
    .then(
      ({
        data: {
          results: {
            0: {
              formatted_address: addrs,
              address_components: addrsCmps,
              geometry: { location: pos },
            },
          },
        },
      }) => {
        if (!addrs || !pos?.lat || !pos?.lng || !addrsCmps?.length)
          return Promise.reject('No resulsts were found.')
        const city = _getCity(addrsCmps)
        return { pos, loc: { addrs, city } }
      }
    )
}

function getCurrMarker() {
  return marker
}

function hideMarker() {
  marker.setVisible(false)
  infoWindow.close()
}

function _connectGoogleApi() {
  if (window.google) return Promise.resolve()
  const elGoogleApi = document.createElement('script')
  elGoogleApi.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_API_KEY}&language=en&region=IL`
  elGoogleApi.async = true
  document.body.append(elGoogleApi)

  return new Promise((resolve, reject) => {
    elGoogleApi.onload = resolve
    elGoogleApi.onerror = () => reject('Google script failed to load')
  })
}

function _getCity(addrsCmps) {
  const typesRegex = new RegExp(
    '\\badministrative_area_level_1\\b|\\blocality\\b|\\bpostal_town\\b',
    'i'
  )
  return addrsCmps?.reduce((cities, cmp) => {
    typesRegex.test(cmp.types) && cities.push(cmp.long_name)
    return cities
  }, [])[0]
}

function _setMapOnAllMarkers(map) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map)
  }
}

function _clearMarkers() {
  _setMapOnAllMarkers(null)
}

function _deleteMarkers() {
  _clearMarkers()
  markers = []
}
