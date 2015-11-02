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
		commutesScreen.show()
	}
}

/**
 * @var {Screen}
 */
var routesScreen = new Screen('screen-routes')

/**
 * @var {Screen}
 */
var routeScreen = new Screen('screen-route')

/**
 * @var {Screen}
 */
var timerScreen = new Screen('screen-timer')