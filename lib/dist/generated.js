// basic functions non-specific to websites 

window.onerror = function(errorMsg, url, lineNumber, colNum, errorObj) {
  var stackTrace = !!errorObj ? errorObj.stack : 'N/A';
  
  var data = {
    reqId: -1,
    message: errorMsg,
    fileName: url,
    lineNumber: lineNumber,
    url: window.location.protocol + "//" + window.location.host + "/" + window.location.pathname,
    callstack: stackTrace
  };

  $.ajax('/ajax/reportError', {
    type: "POST",
    data: data
  });
};

var tzOffset = -5;
var tzOffsetStr = '-0500';

/**
 * Filter out duplicate elements from array
 */
function removeArrayDupes(arr) {
  return Object.keys(Object.keys(arr).reduce(
    function(acc, i) {
      acc[arr[i]] = true;
      return acc;
    },
    {}
  ));
}

/**
 * Convert a list of numbers to human readable list
 */
function descNumList(smt){
  var str = '';
  for (var i = 0; i < smt.length; i++){
    if (i==0) str += smt[i];
    else if (smt[i] - smt[i-1] > 1)
      str += ''+(str.slice(-1) == '-' ? smt[i-1]+', ' : ', ')+
        smt[i];

    else if (smt[i] - smt[i-1] == 1) str += (str.slice(-1)=='-' ? ''  : '-') + (i==smt.length-1 ? smt[i] : '');

  }
  return str;
}

/**
 * Format a number with comma separators
 */
function commaVal(nStr){
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

/**
 * Round to a number of decimal places
 */
function roundTo(value,decimals,zeroPad,whole){
  if (decimals == undefined) decimals = 0;
  if (zeroPad == undefined) zeroPad = false;
  if (whole == undefined) whole = true;
  var r = ""+Math.round(parseFloat(value) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  if (zeroPad){
    if (r.indexOf('.') == -1) r += ".";
    var diff = r.length - r.indexOf('.');
    for (var i = 0; i < decimals + 1 - diff; i++)
      r+='0';
    if (whole && r.substr(r.length-3) == ".00") r = r.substring(0,r.length-3);
  }
  return r;
}

/**
 * Recursively implode a nested array
 */
function implode (glue, pieces) {
  var i = '', retVal='', tGlue='';
  if (arguments.length === 1) {
    pieces = glue;
    glue = '';
  }
  if (typeof(pieces) === 'object') {
    if (pieces instanceof Array) {
      return pieces.join(glue);
    }
    else {
      for (i in pieces) {
        retVal += tGlue + pieces[i];
        tGlue = glue;
      }
      return retVal;
    }
  }
  else {
    return pieces;
  }
}

function in_array (needle, haystack, argStrict) {
  var key = '', strict = !!argStrict;

  if (strict) {
    for (key in haystack) {
      if (haystack[key] === needle) {
        return true;
      }
    }
  } else {
    for (key in haystack) {
      if (haystack[key] == needle) {
        return true;
      }
    }
  }

  return false;
}

function array_includes(arr, val) {
  if(!Array.prototype.includes) {
    return !!~arr.indexOf(val);
  }
  return arr.includes(val);
}

// ! Used once
function index_assoc_array(a){
    var vArr = [];
    for (var i in a) if (a.hasOwnProperty(i)){
      vArr.push(i);
    }
    vArr.sort(function(a,b){return a-b});
    return vArr;
}

function ucFirst(str) {
  if (str === undefined) str = '';
  return str.length ? str[0].toUpperCase() + str.substr(1) : str;
}

/**
 * Format a number as a price string
 */
function formatPrice(num, hideDollar) {
  var S = hideDollar ? '' : '$';
  if (num === undefined) num = 0;
  const absNum = Math.abs(num);
  const neg = num < 0 ? '-' : '';
  if (Number(absNum).toLocaleString) {
    return neg + S + Number(absNum).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }
  return neg + S + roundTo(absNum, 2, true, false);
}

/**
 * Format an expiry date for any readability
 * 
 * @param {string} format Format as per date() function
 * @param {string} ymd    The expiry date YYYYMMDD
 * @param {number} H      Optional hours
 * @param {number} i      Optional minutes
 * @returns string
 */
function dateFromYMD(format, ymd, H, i){ // ymd in tzOffset timezone
  if (undefined == H) H = 0;
  if (undefined == i) i = 0;
  var tz = tzOffset;
  return date(format, mktime(H,i,0,ymd.substr(5,2),ymd.substr(8,2),ymd.substr(0,4)), tz)
}

/**
 * Format an expiry for human readability, standardised
 */
function expDescFromYMD(exp) {
  var expDashed = exp.length === 8 ? exp.substr(0,4) + '-' + exp.substr(4,2) + '-' + exp.substr(6,4) : exp;
  var y = dateFromYMD('Y',expDashed) == date('Y') ? '' : ' '+dateFromYMD('Y',expDashed); // only show year if not this year
  return dateFromYMD('j<\\s\\up>S</\\s\\up> M'+y,expDashed);
}

/**
 * Get a timestamp from expiry code and optional hours, minutes
 */
function timeFromYMD(ymd, H, i){
  if (undefined == H) H = 0;
  if (undefined == i) i = 0;
  return mktime(H,i,0,ymd.substr(5,2),ymd.substr(8,2),ymd.substr(0,4))
}

/**
 * Get a timestamp based on date parts
 */
function mktime (H,i,s,m,d,Y) {
  var months = [0,'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  var st = d+" "+months[parseInt(m,10)]+" "+Y+" "+H+":"+(i<10?"0":"")+parseInt(i,10)+":"+(s<10?"0":"")+parseInt(s,10)+" "+tzOffsetStr;
  var D = new Date(st);
  return D.getTime()/1000;
}

/**
 * Try to access a property within the given obj, or fallback to defaultVal
 */
 function safeSelect(obj, selectorFn, defaultVal) {
  try {
    var val = selectorFn(obj);
    if (val === undefined) {
      return defaultVal;
    }
    return val;
  } catch(e) {
    return defaultVal; // can be undefined
  }
}

/**
 * Pseudo-media query based on fixed width
 */
function isMobile() {
  var ww = $(window).width();
  return ww < 768;
}

/**
 * Sanitise a string to retain only numeric characters
 */
function stripNonNumeric(numIsh) {
  return (""+numIsh).replace(/\D\./g, "");
}

function reportError(text){
  console.error(text);
  // todo: Add error service
}

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

/**
 * Date formatter, with timestamp
 */
function date (format, timestamp, tz) {
  if (tz == undefined) tz = tzOffset;

    var that = this,
        jsdate, f, formatChr = /\\?([a-z])/gi,
        formatChrCb,
        // Keep this here (works, but for code commented-out
        // below for file size reasons)
        //, tal= [],
        _pad = function (n, c) {
            if ((n = n + "").length < c) {
                return new Array((++c) - n.length).join("0") + n;
            } else {
                return n;
            }
        },
        txt_words = ["Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        txt_ordin = {
            1: "st",
            2: "nd",
            3: "rd",
            21: "st",
            22: "nd",
            23: "rd",
            31: "st"
        };
    formatChrCb = function (t, s) {
        return f[t] ? f[t]() : s;
    };
    f = {
        // Day
        d: function () { // Day of month w/leading 0; 01..31
            return _pad(f.j(), 2);
        },
        D: function () { // Shorthand day name; Mon...Sun
            return f.l().slice(0, 3);
        },
        j: function () { // Day of month; 1..31
            return jsdate.getDate();
        },
        l: function () { // Full day name; Monday...Sunday
            return txt_words[f.w()] + 'day';
        },
        N: function () { // ISO-8601 day of week; 1[Mon]..7[Sun]
            return f.w() || 7;
        },
        S: function () { // Ordinal suffix for day of month; st, nd, rd, th
            return txt_ordin[f.j()] || 'th';
        },
        w: function () { // Day of week; 0[Sun]..6[Sat]
            return jsdate.getDay();
        },
        z: function () { // Day of year; 0..365
            var a = new Date(f.Y(), f.n() - 1, f.j()),
                b = new Date(f.Y(), 0, 1);
            return Math.round((a - b) / 864e5) + 1;
        },

        // Week
        W: function () { // ISO-8601 week number
            var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3),
                b = new Date(a.getFullYear(), 0, 4);
            return 1 + Math.round((a - b) / 864e5 / 7);
        },

        // Month
        F: function () { // Full month name; January...December
            return txt_words[6 + f.n()];
        },
        m: function () { // Month w/leading 0; 01...12
            return _pad(f.n(), 2);
        },
        M: function () { // Shorthand month name; Jan...Dec
            return f.F().slice(0, 3);
        },
        n: function () { // Month; 1...12
            return jsdate.getMonth() + 1;
        },
        t: function () { // Days in month; 28...31
            return (new Date(f.Y(), f.n(), 0)).getDate();
        },

        // Year
        L: function () { // Is leap year?; 0 or 1
            return new Date(f.Y(), 1, 29).getMonth() === 1 | 0;
        },
        o: function () { // ISO-8601 year
            var n = f.n(),
                W = f.W(),
                Y = f.Y();
            return Y + (n === 12 && W < 9 ? -1 : n === 1 && W > 9);
        },
        Y: function () { // Full year; e.g. 1980...2010
            return jsdate.getFullYear();
        },
        y: function () { // Last two digits of year; 00...99
            return (f.Y() + "").slice(-2);
        },

        // Time
        a: function () { // am or pm
            return jsdate.getHours() > 11 ? "pm" : "am";
        },
        A: function () { // AM or PM
            return f.a().toUpperCase();
        },
        B: function () { // Swatch Internet time; 000..999
            var H = jsdate.getUTCHours() * 36e2,
                // Hours
                i = jsdate.getUTCMinutes() * 60,
                // Minutes
                s = jsdate.getUTCSeconds(); // Seconds
            return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
        },
        g: function () { // 12-Hours; 1..12
            return f.G() % 12 || 12;
        },
        G: function () { // 24-Hours; 0..23
            return jsdate.getHours();
        },
        h: function () { // 12-Hours w/leading 0; 01..12
            return _pad(f.g(), 2);
        },
        H: function () { // 24-Hours w/leading 0; 00..23
            return _pad(f.G(), 2);
        },
        i: function () { // Minutes w/leading 0; 00..59
            return _pad(jsdate.getMinutes(), 2);
        },
        s: function () { // Seconds w/leading 0; 00..59
            return _pad(jsdate.getSeconds(), 2);
        },
        u: function () { // Microseconds; 000000-999000
            return _pad(jsdate.getMilliseconds() * 1000, 6);
        },

        // Timezone
        e: function () { // Timezone identifier; e.g. Atlantic/Azores, ...
            // The following works, but requires inclusion of the very large
            // timezone_abbreviations_list() function.
/*              return this.date_default_timezone_get();
*/
            throw 'Not supported (see source code of date() for timezone on how to add support)';
        },
        I: function () { // DST observed?; 0 or 1
            // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
            // If they are not equal, then DST is observed.
            var a = new Date(f.Y(), 0),
                // Jan 1
                c = Date.UTC(f.Y(), 0),
                // Jan 1 UTC
                b = new Date(f.Y(), 6),
                // Jul 1
                d = Date.UTC(f.Y(), 6); // Jul 1 UTC
            return 0 + ((a - c) !== (b - d));
        },
        O: function () { // Difference to GMT in hour format; e.g. +0200
            var a = jsdate.getTimezoneOffset();
            return (a > 0 ? "-" : "+") + _pad(Math.abs(a / 60 * 100), 4);
        },
        P: function () { // Difference to GMT w/colon; e.g. +02:00
            var O = f.O();
            return (O.substr(0, 3) + ":" + O.substr(3, 2));
        },
        T: function () { // Timezone abbreviation; e.g. EST, MDT, ...
            // The following works, but requires inclusion of the very
            // large timezone_abbreviations_list() function.

            return 'UTC';
        },
        Z: function () { // Timezone offset in seconds (-43200...50400)
            return -jsdate.getTimezoneOffset() * 60;
        },

        // Full Date/Time
        c: function () { // ISO-8601 date.
            return 'Y-m-d\\Th:i:sP'.replace(formatChr, formatChrCb);
        },
        r: function () { // RFC 2822
            return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
        },
        U: function () { // Seconds since UNIX epoch
            return jsdate.getTime() / 1000 | 0;
        }
    };
    this.date = function (format, timestamp) {
        that = this;
        jsdate = ((typeof timestamp === 'undefined') ? new Date() : // Not provided
        (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
        new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
        );
        jsdate.setTime(jsdate.getTime()+ (jsdate.getTimezoneOffset()*60000) + (tz * 3600000));//
        return format.replace(formatChr, formatChrCb);
    };
    return this.date(format, timestamp);
}
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
function addMsg(text, level){
  if (level == undefined) level = 'error';

  if (level == 'verbose'){ alert(text); return false; }

  $("#status_messages").append("<div class='msg txt_"+level+" __showing'>"+text+" <a href='#close' class='close_x' title='close' onclick='return closeMsg(this);'>&times;</a></div>");
  var msg = $("#status_messages .msg:last").eq(0)
  setTimeout(function() {
    $(msg).removeClass('__showing')
  }, 400);
  setTimeout(function() {
    closeMsg(undefined, msg);
  }, 3000);
}

function closeMsg(closeX, msg) {
  var msg = msg || $(closeX).parent();
  $(msg).addClass('__hiding');
  setTimeout(function() {
    $(msg).remove();
  }, 400);
}
function setCookie(c_name,value,opts) {
  if (opts.expiry_days == undefined) opts.expiry_days = 30;
  if (opts.path == undefined) opts.path = '/'
  var exdate=new Date();
  exdate.setDate(exdate.getDate() + opts.expiry_days);
  var c_value=escape(value) + ";path="+escape(opts.path)
    +";expires="+exdate.toUTCString()
    +";max-age="+(opts.expiry_days * 60*60*24)
    +";domain="+(COOKIE_DOMAIN || '');
  document.cookie=c_name + "=" + c_value;

  var wc_value=";path="+escape(opts.path)
    +";expires=Thu, 01 Jan 1970 00:00:01 GMT"+
    +";domain="+(BASE_URL || '').replace(/(http)?s?:?\/?\/?/, '');
  document.cookie=c_name + "=" + wc_value;
}

function getCookie(c_name) {
  var i,x,y,ARRcookies=document.cookie.split(";");
  for (i=0;i<ARRcookies.length;i++) {
    x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
    y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
    x=x.replace(/^\s+|\s+$/g,"");
    if (x==c_name) {
      return unescape(y);
    }
  }
}

function isTransitionalTheme() {
  return $('body').hasClass('transitional');
}

$(document).click(function closeMenusOnClickOutside(e) {
  if (isTransitionalTheme() && $('#top_menu .id-calculator').hasClass('dialog_tab_selected') && $(e.target).attr('data-special') !== 'calc-menu-toggler') {
    setTimeout(
      function() {
        if (
          $(e.target).closest('#top_but-calculator').length === 0 ||
          $(e.target).closest('#options_menu a').length > 0
        ){
          $('#top_but-calculator').hide();
          $('#top_menu .id-calculator').removeClass('dialog_tab_selected');
        }
      }, 100
    );
  }
});

(function pageCookieInitialisations(){
  var firstUseCookie = getCookie('first_use');
  setCookie(
    'first_use',
    (firstUseCookie == undefined)
      ? parseInt(new Date().getTime()/1000, 10)
      : firstUseCookie,
    {expiry_days: 365*100}
  ); // set timestamps cookie for 100 years

  var thisId = getCookie('PHPSESSID');
  var numVisits = getCookie('num_visits');
  if (numVisits == undefined){
    numVisits = 0;
  }
  setCookie('num_visits', parseInt(numVisits)+1, {expiry_days: 365*100});
  setCookie('last_session_id', thisId, {expiry_days: 365*100});
})();
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
				if (typeof updateStratAdStickiness !== 'undefined') updateStratAdStickiness();
			},
			flash ? 100 : 0
		);
	} else {
		setTimeout(
			function() {
				target.show(time);
				if (typeof updateStratAdStickiness !== 'undefined') updateStratAdStickiness();
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

function init_funcs(cfg){
	$('.jq_exclusive_switch').click(function() {
		return jq_exclusive_switch($(this), 0);
	});
	$('.jq_exclusive_switch_flash').click(function() {
		return jq_exclusive_switch($(this), 0, undefined, true);
	});
	// ** .jq_exclusive_slide_switch = 200ms hide/show
	$('.jq_exclusive_slide_switch').click(function() {
		return jq_exclusive_switch($(this), 100, 'slide');
	});
	$("#msg").ajaxError(function(event, request, settings, thrownError){
	});
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

function viewMore(t){
  $(".more", $(t.currentTarget).parent()).slideToggle(100);
  if ($(this).hasClass("expanded"))
    $(t.currentTarget).removeClass("expanded");
  else
    $(t.currentTarget).addClass("expanded");
  return false;
}

function expandFollowElement(ele) {
  var nextEle = $(ele).next();
  var expandedIndicator = $('span', ele);
  if (nextEle.css('display') === 'block') {
    nextEle.slideUp(100);
    expandedIndicator.text('+ ');
  } else {
    nextEle.slideDown(100);
    expandedIndicator.text('– ');
  }
}
/**
 * jQuery.ScrollTo - Easy element scrolling using jQuery.
 * Copyright (c) 2007-2009 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 5/25/2009
 * @author Ariel Flesler
 * @version 1.4.2
 *
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 */
(function($){
  $.scrollTo = function(s, t) {
    var curScrollY = $('html').scrollTop();
    var elePosY = $(s).offset().top;
    var winHeight = $(window).innerHeight();

    var scrollToY
    if (elePosY < curScrollY) {
      scrollToY = elePosY;
    } else if (elePosY < curScrollY + (winHeight * 2/3)) {
      scrollToY = false;
    } else {
      scrollToY = elePosY - (winHeight * (1/3));
    }
    if (scrollToY !== false) {
      $('html, body').animate({
        scrollTop: scrollToY
      }, t === undefined ? 500 : t);
    }
  }
})(jQuery);
