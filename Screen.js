'use strict'

/**
 * @param {string} id
 * @class
 */
function Screen(id) {
	/** @member {string} */
	this.id = id

	/** @member {HTMLElement} */
	this.el = document.getElementById(id)

	/** @member {function(Object)} */
	this.onshow = null

	/** @member {function()} */
	this.onhide = null

	/** @member {?*} */
	this.data = null

	this.el.style.display = 'none'
	Screen.screens[id] = this
}

/**
 * Map from screen id to screen instance
 * @property {Object<Screen>}
 */
Screen.screens = Object.create(null)

/**
 * @property {Screen}
 */
Screen.current = null

/**
 * Display a screen
 * @param {string} id
 * @param {?*} data
 * @param {boolean} [replaceState=false]
 */
Screen.display = function (id, data, replaceState) {
	var screen = Screen.screens[id],
		state = {
			id: id,
			data: data
		}
	if (replaceState) {
		window.history.replaceState(state, '', '')
	} else {
		window.history.pushState(state, '', '')
	}
	if (Screen.current) {
		Screen.current.hide()
	}
	screen.show(data)
	Screen.current = screen
}

/**
 * @param {?*} data
 */
Screen.prototype.show = function (data) {
	this.el.style.display = ''
	this.data = data
	if (this.onshow) {
		this.onshow(data)
	}
}

/**
 */
Screen.prototype.hide = function () {
	this.el.style.display = 'none'
	if (this.onhide) {
		this.onhide()
	}
	this.data = null
}

/**
 */
Screen.prototype.refresh = function () {
	if (this.onshow) {
		this.onshow(this.data)
	}
}

/**
 * @param {string} selector
 * @returns {?HTMLElement}
 */
Screen.prototype.$ = function (selector) {
	return this.el.querySelector(selector)
}