
/**
 * Make an asynchronous request to the API
 * 
 * Avoid duplicate requests within 1sec of each other
 */
 function ajaxRequest(desc, cmd, postData, callbackFn, localData){
  for (var i in requests) if (requests.hasOwnProperty(i)) {
    var tRq = requests[i];
    delete(tRq['data']['reqId']);
    if (requests[i]['status'] == REQ_PENDING &&
          requests[i]['desc'] == desc &&
          requests[i]['cmd'] == cmd &&
          requests[i]['data'] == serialize1D(postData) &&
          requests[i]['time'] > (new Date().getTime() - 1000)
       ){
			return false;
		}
  }
	postData['reqId'] = nextRequest(desc, cmd, postData, localData);
	ajaxCall(cmd, postData, function(data){
		requests[postData['reqId']]['status'] = data['status'];
		callbackFn(requests[postData['reqId']]['localData'], data);
	});
	return postData['reqId'];
}
function ajaxCall(cmd, data, callback){
	$.getJSON(BASE_URL+WEB_PATH+'ajax/'+cmd, data, callback);
}

// * keep track of ajax requests and create entry in array to store data clientside about that request
var requests = new Array();
var numRequests = 0;
function nextRequest(desc, cmd, data, localData){
	requests[numRequests] = new Array();
	requests[numRequests]['time'] = new Date().getTime();
	requests[numRequests]['checker'] = setInterval("checkRequest("+numRequests+")", 1000);
	requests[numRequests]['desc'] = desc;
  requests[numRequests]['cmd'] = cmd;
  requests[numRequests]['localData'] = localData;
  requests[numRequests]['data'] = serialize1D(data);
	requests[numRequests]['status'] = REQ_PENDING;
	// 1 = not received
	// 2 = received with error
	// 0 = received no error
	
	numRequests++;
	return numRequests-1;
}

/**
 * Watch a known list of requests and show warnings for slow times
 */
function checkRequest(rqId){
  var timePast = new Date().getTime() - requests[rqId]['time'];
  var cmd = requests[rqId]['cmd'];
  if (requests[rqId]['status'] == REQ_OK || requests[rqId]['status'] == REQ_ERROR)
    clearInterval(requests[rqId]['checker']);
  else if (cmd=='activateTab' || cmd=='closeTab')
    clearInterval(requests[rqId]['checker']);
  else if ((timePast >= 5000 && (cmd=='newTab')) ||
        (timePast >= 15000 && cmd=='getStockPrice') ||
        (timePast >= 30000 && (cmd=='getOptions' || cmd=='calculate'))){
    addMsg("It's taking a while "+requests[rqId]['desc']+", please refresh the page and try again");
    clearInterval(requests[rqId]['checker']);
  }
}

/**
 * Convert a flat object into a querystring
 */
function serialize1D(o)
{
    var s='';
    for (var i in o)
      s+=i+"="+o[i]+"&";

    return s;
};
