var listeners = new Array;
/**
 * Add a listener to event bus
 * @param {string} eventName      The call name
 * @param {function} callbackFn   Callback function - should accept params (eventName, payload, listenerData)
 * @param {object} listenerData      Data to call with each trigger passed from the initaliser
 */
function addListener(eventName, callbackFn, listenerData){
	if (listeners[eventName] == undefined) {
		listeners[eventName] = new Array;
	}
  listeners[eventName].push({ func: callbackFn, data: listenerData});
}

/**
 * Triggers listening
 *
 * @param {string} eventName  The call name; what is changing
 * @param {object} payload    Object of the element that changed
 *         {
 *            ele: identifier, ie: 't2e1'
 *            name: inputs name, ie: 'longCall'
 *         }
 */
function triggerListener(eventName, payload){
  if (typeof debugEvents !== 'undefined' && debugEvents) {
    console.log('Event', eventName, payload);
  }
	if (listeners[eventName] != undefined){
		for (i in listeners[eventName]){
      if (payload['tab_num'] == listeners[eventName][i]['data']['tab_num']){
        listeners[eventName][i]['func'](eventName, payload, listeners[eventName][i]['data']);
      }
    }
	}
  return true;
}
