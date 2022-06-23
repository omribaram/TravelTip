'use strict'

export const utilService = {
  makeId,
  getDateStr,
  isRTL,
  debounce,
  escapeHTML,
}

function makeId(length = 5) {
  var txt = ''
  var possible = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++) {
    txt += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return txt
}

function debounce(func, wait = 1000) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function getDateStr(locale, timestamp, ...opts) {
  opts = opts.reduce((acc, opt) => ((acc[opt] = '2-digit'), acc), {})
  return new Intl.DateTimeFormat(`en-${locale}`, {
    hour12: false,
    ...opts,
  }).format(timestamp)
}

function isRTL(str) {
  var ltrChars = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' + '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
    rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
    rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']')
  return rtlDirCheck.test(str)
}

function escapeHTML(str) {
  const chars = new Map([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
    ['/', '&#x2F;'],
    ['`', '&#x60;'],
    ['=', '&#x3D;'],
  ])
  return str.replace(/[&<>"'`=\/]/g, (char) => chars.get(char))
}
