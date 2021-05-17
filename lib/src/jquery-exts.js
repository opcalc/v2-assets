function jq_exclusive_switch(switchObj, time, switchType, flash){
	if (switchType == undefined) switchType = '';
	else switchType = switchType+"_";
	var switchName= switchObj.attr('name');
	var colonLocation = switchName.indexOf(":");
	var targetNames = switchName.substring(0, colonLocation);
	var targetId = switchName.substring(colonLocation+1);	
  
  var target = $("#"+targetId+".jq_exclusive_"+switchType+"target");
	var aSwitch = $(switchObj[0]);
  if (array_includes(['tablet', 'mobile'], viewStyle) && target.attr('data-switch-toggle')) {
		setTimeout(
			function() {
				target.toggle(time);
				if (aSwitch.hasClass('_-selected')) {
					aSwitch.removeClass('_-selected');
				} else {
					aSwitch.addClass('_-selected');
				}
			},
			flash ? 100 : 0
		);
	} else {
		setTimeout(
			function() {
				target.show(time);
			},
			flash ? 100 : 0
		);
	}
	$(".jq_exclusive_"+switchType+"target").filter("[name='"+targetNames+"']").not(target).hide(time);

	var parentObj = switchObj.parents('.dialog_tab, .unique_switch');
	if (parentObj.is(".dialog_tab")){ // ** tabs - change tab styles
		parentObj.siblings().removeClass('dialog_tab_selected');
		parentObj.siblings().addClass('dialog_tab');
		parentObj.addClass('dialog_tab_selected');
	}else if (parentObj.is(".unique_switch")){ // ** undefined, generic tab styles.  Left undefined incase page/course specific tabs desired
		parentObj.siblings().removeClass('unique_switch_selected');
		parentObj.siblings().addClass('unique_switch');
		parentObj.addClass('unique_switch_selected');
	}
return false;
}

function loadSliders(){
	/***************** TEMPLATE FUNCS ***********************/
	// ** .jq_exclusive_switch ****
	// elements with this class control the visibility of elements with the class js__exclusive_target
	// the name of the switch element should be constructed by concatenating the name of the targets, a ":", then the id of the target which should be
	// displayed exclusively.
	// e.g:
	// <a href="#" class="jq_exclusive_switch" name="xgroup:xitem1">show 1</a><a href="#" class="jq_exclusive_switch" name="xgroup:xitem2">show 2</a>
	// <div class="jq_exclusive_target" name="xgroup" id="xitem1">item 1</div><div class="jq_exclusive_target" name="xgroup" id="xitem2">item 2</div>
	// also remember to use jq_start_hidden on items which should--- start hidden---

	// ** .jq_exclusive_switch = instant hide/show
	$('.jq_exclusive_switch').click(function() {
		return jq_exclusive_switch($(this), 0);
	});
	$('.jq_exclusive_switch_flash').click(function() {
		return jq_exclusive_switch($(this), 0, undefined, true);
	});
	// ** .jq_exclusive_slide_switch = 200ms hide/show
	$('.jq_exclusive_slide_switch').click(function() {
		return jq_exclusive_switch($(this), 200, 'slide');
	});
	
}

function init_funcs(cfg){
	loadSliders();
	$("#msg").ajaxError(function(event, request, settings, thrownError){
		//inputError('Error sending request');
    
    //$(this).append("Error sending request"); // !!! needs refining for exact feedback on different errors
    //if (thrownError != undefined) $(this).append(": "+thrownError);
	});
}


// *** AJAX rot ***
function ajaxRequest(desc, cmd, postData, cb, localData){
  for (var i in requests) if (requests.hasOwnProperty(i)) {
    var tRq = requests[i];
    delete(tRq['data']['reqId']);
    if (requests[i]['status'] == REQ_PENDING &&
          requests[i]['desc'] == desc &&
          requests[i]['cmd'] == cmd &&
          requests[i]['data'] == serialize1D(postData) &&
          requests[i]['time'] > (new Date().getTime() - 1000)
       )
           return false;
  }
	postData['reqId'] = nextRequest(desc, cmd, postData, localData);
	ajaxCall(cmd, postData, function(data){
		requests[postData['reqId']]['status'] = data['status'];
		cb(requests[postData['reqId']]['localData'], data);
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
    inputError("It's taking a while "+requests[rqId]['desc']+", please refresh the page and try again");
    clearInterval(requests[rqId]['checker']);
  }
}

$.fn.extend({getTH: function(){
  var col = $(this).prevAll().length;
  var headerObj = $(this).parents('table').find('td, th').eq(col);
  
  return headerObj;
}});

$.fn.extend({getRowTH: function(){
  var headerObj = $(this).parents('tr').find('th').eq(0);

  return headerObj;
}});

function serialize1D(o)
{
    var s='';
    for (var i in o)
      s+=i+"="+o[i]+"&";

    return s;
};
