/*globals Screen*/
'use strict'

/**
 * @typedef {Object} Data
 * @property {number} version - 1
 * @property {Array<Data~Commute>} commutes
 */

/**
 * @typedef {Object} Data~Commute
 * @property {string} name
 * @property {Array<Data~Route>} routes
 */

/**
 * @typedef {Object} Data~Route
 * @property {string} name
 * @property {number} medianTime
 * @property {Array<Data~Sample>} samples
 */

/**
 * @typedef {Object} Data~Sample
 * @property {string} startDate - ISO string
 * @property {string} endDate - ISO string
 * @property {number} time
 */

/** @var {Data} */
var data

// Load stored data
try {
	data = JSON.parse(window.localStorage.getItem('time-travel-data'))
} catch (e) {
	console.error(e)
}
if (!data) {
	data = {
		version: 1,
		commutes: []
	}
}

/**
 * Call this every time something important is recorded
 */
function saveData() {
	window.localStorage.setItem('time-travel-data', JSON.stringify(data))
}

// Save right before unload
window.onbeforeunload = function () {
	saveData()
}

/**
 * @param {string} name
 * @param {Object<string|number|Node|NodeList>} [data]
 * @returns {DocumentFragment}
 */
function fillTemplate(name, data) {
	data = data || {}

	var el = document.getElementById('template-' + name).content.cloneNode(true)
	for (var key in data) {
		var dataAttr = toDataAttr(key[0] === '$' ? key.substr(1) : key),
			subEl = el.querySelector('[' + dataAttr + ']'),
			subData = data[key]
		if (key[0] === '$') {
			// Attributes
			for (var attrName in subData) {
				subEl.setAttribute(attrName, subData[attrName])
			}
		} else {
			// Content
			if (typeof subData === 'string' || typeof subData === 'number') {
				// String or number
				subEl.textContent = subData
			} else if (subData.length) {
				// NodeList
				for (var i = 0; i < subData.length; i++) {
					subEl.appendChild(subData[i])
				}
			} else {
				// Node
				subEl.appendChild(subData)
			}
		}
	}

	// 'camelCase' -> 'data-camel-case'
	function toDataAttr(camelCase) {
		return 'data-' + camelCase.replace(/[A-Z]/g, function (letter) {
			return '-' + letter.toLowerCase()
		})
	}

	return el
}

/**
 * @var {Screen}
 */
var commutesScreen = new Screen('screen-commutes')
commutesScreen.onshow = function () {
	var commutesEl = this.$('#commutes')
	commutesEl.innerHTML = ''
	data.commutes.sort(function (a, b) {
		return a.name > b.name ? 1 : (a.name === b.name ? 0 : -1)
	}).forEach(function (commute) {
		var commuteEl = fillTemplate('commute', {
			name: commute.name
		})
		commuteEl.querySelector('div').onclick = function () {
			Screen.display('screen-routes', commute)
		}
		commutesEl.appendChild(commuteEl)
	})
}
Screen.display('screen-commutes')
commutesScreen.$('.commute-add').onclick = function () {
	var name = window.prompt('Commute name')
	if (name) {
		data.commutes.push({
			name: name,
			routes: []
		})
		saveData()
		commutesScreen.refresh()
	}
}

/**
 * @var {Screen}
 */
var routesScreen = new Screen('screen-routes')

/**
 * @param {Data~Commute} commute
 */
routesScreen.onshow = function (commute) {
	var routesEl = this.$('#routes')
	routesEl.innerHTML = ''
	commute.routes.sort(function (a, b) {
		return a.medianTime - b.medianTime
	}).forEach(function (route) {
		var routeEl = fillTemplate('route', {
			name: route.name,
			time: formatTime(route.medianTime)
		})
		routeEl.querySelector('div').onclick = function () {
			Screen.display('screen-route', {
				commute: commute,
				route: route
			})
		}
		routesEl.appendChild(routeEl)
	})

	this.$('.commute-name').textContent = commute.name
}
routesScreen.$('.route-add').onclick = function () {
	var name = window.prompt('Route name')
	if (name) {
		routesScreen.data.routes.push({
			name: name,
			medianTime: 0,
			samples: []
		})
		saveData()
		routesScreen.refresh()
	}
}

/**
 * @var {Screen}
 */
var routeScreen = new Screen('screen-route')

/**
 * @param {Object} data
 * @param {Data~Commute} data.commute
 * @param {Data~Route} data.route
 */
routeScreen.onshow = function (data) {
	this.$('.commute-name').textContent = data.commute.name
	this.$('.route-name').textContent = data.route.name
}
routeScreen.$('.start-timer').onclick = function () {
	Screen.display('screen-timer', routeScreen.data, 'replace')
}

/**
 * @var {Screen}
 */
var timerScreen = new Screen('screen-timer')

/**
 * @param {Object} data
 * @param {Data~Commute} data.commute
 * @param {Data~Route} data.route
 */
timerScreen.onshow = function () {
	this.startDate = new Date
	clearInterval(this.interval)
	this.interval = setInterval(this.update.bind(this), 900)
	this.update()
}

timerScreen.onhide = function () {
	clearInterval(this.interval)
}

timerScreen.update = function () {
	var dt = Date.now() - this.startDate.getTime(),
		s = Math.floor(dt / 1e3),
		min = Math.floor(dt / 60e3)
	s %= 60
	this.$('.time-minutes').textContent = min < 10 ? '0' + min : min
	this.$('.time-seconds').textContent = s < 10 ? '0' + s : s
}

timerScreen.$('.stop-timer').onclick = function () {
	var endDate = new Date
	timerScreen.data.route.samples.push({
		startDate: timerScreen.startDate.toISOString(),
		endDate: endDate.toISOString(),
		time: endDate.getTime() - timerScreen.startDate.getTime()
	})

	var times = timerScreen.data.route.samples.map(function (s) {
		return s.time
	}).sort(function (a, b) {
		return a - b
	})
	timerScreen.data.route.medianTime = times[times.length >> 1]
	saveData()
	Screen.display('screen-route', timerScreen.data, 'replace')
}

timerScreen.$('.cancel-timer').onclick = function () {
	Screen.display('screen-route', timerScreen.data, 'replace')
}

/**
 * @param {number} time
 * @returns {string}
 */
function formatTime(time) {
	var s = Math.floor(time / 1e3),
		min = Math.floor(time / 60e3),
		h = Math.floor(time / 3600e3)
	s %= 60
	min %= 60
	s = s < 10 ? '0' + s : String(s)
	min = min < 10 ? '0' + min : String(min)
	return (h ? h + ':' : '') + min + ':' + s
}