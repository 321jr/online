/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */

L.Map.mergeOptions({
	tap: true,
	tapTolerance: 15
});

L.Map.Tap = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onDown, this);
	},

	_onDown: function (e) {
		if (!e.touches) { return; }

		// console.log('=========> _onDown, e.touches.length=' + e.touches.length);

		// The start of a two-finger gesture comes in as first _onDown with e.touches.length
		// == 1, then _onDown with e.touches.length == 2.

		// The _wasSingleTap flag is supposed to mean "we got a single-finger quick tap with
		// no movement".

		// FIXME: Is there some saner place to store this _wasSingleTap flag than in
		// this._map._container? It needs to be readily available over in _handleDOMEvent in
		// Map.js.
		this._map._container._wasSingleTap = (e.touches.length === 1);

		L.DomEvent.preventDefault(e);

		// don't simulate click or track longpress if more than 1 touch
		if (e.touches.length > 1) {
			clearTimeout(this._holdTimeout);
			return;
		}

		var first = e.touches[0];

		this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);

		// simulate long hold but setting a timeout
		this._holdTimeout = setTimeout(L.bind(function () {
			if (this._isTapValid()) {
				this._fireDblClick = true;
				this._onUp(e);
			}
		}, this), 1000);

		this._simulateEvent('mousedown', first);

		L.DomEvent.on(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);
	},

	_onUp: function (e) {
		// console.log('=========> _onUp, e.touches.length=' + e.touches.length + ', e.changedTouches.length=' + e.changedTouches.length);
		clearTimeout(this._holdTimeout);

		L.DomEvent.off(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);

		var first = e.changedTouches[0];
		this._simulateEvent('mouseup', first);

		if (this._fireDblClick) {
			this._simulateEvent('dblclick', first);
			this._fireDblClick = false;
		}
	},

	_isTapValid: function () {
		return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
	},

	_onMove: function (e) {
		var first = e.touches[0];
		var newPos = new L.Point(first.clientX, first.clientY);
		if (newPos.distanceTo(this._startPos) > this._map.options.tapTolerance) {
			this._newPos = newPos;
			this._map._container._wasSingleTap = false;
			this._simulateEvent('mousemove', first);
		}
	},

	_simulateEvent: function (type, e) {
		var simulatedEvent = {
			type: type,
			canBubble: false,
			cancelable: true,
			screenX: e.screenX,
			screenY: e.screenY,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			button: 0,
			target: e.target,
			preventDefault: function () {}
		};
		this._map._handleDOMEvent(simulatedEvent);
	}
});

if (L.Browser.touch && !L.Browser.pointer) {
	L.Map.addInitHook('addHandler', 'tap', L.Map.Tap);
}
