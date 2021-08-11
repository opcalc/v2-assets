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

function getInternetExplorerVersion()
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
{
  var rv = false; // Return value assumes failure.
  if (navigator.appName == 'Microsoft Internet Explorer')
  {
    var ua = navigator.userAgent;
    var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
    if (re.exec(ua) != null)
      rv = parseFloat( RegExp.$1 );
  }
  return rv;
}
var ieVer = getInternetExplorerVersion();


function openInNew(linkEleOrUrl, opts){
  if (opts == undefined) opts = {};
  var dfOpts = {directories: 'no', 
      fullscreen: 'no', 
      height: parseInt(.80 * $(window).height(), 10),
      top: parseInt(.1 * $(window).height(), 10),
      width: parseInt(.80 * $(window).width(), 10),
      left: parseInt(.1 * $(window).width(), 10),
      location: 'no',
      menubar: 'no',
      status: 'no',
      toolbar: 'no'
  }
  for (var i in dfOpts)
    if (opts[i] == undefined) opts[i] = dfOpts[i];
  
  var optStr = '';
  for (i in opts){
    optStr += i+'='+opts[i]+',';
  }
  window.open(linkEleOrUrl.href, 'opc_popup', optStr);
  return false;
}
function obj2str(obj, num){
	if (num = undefined) num = 0;
	var t='';
	var j=0;
	if (typeof(obj) == 'object')
		for (var i in obj){
			for(j = 0; j < num; j++)
				t+= ' ';
			t+= i +"=>"+obj[i]+"\r\n";
			if (typeof(obj[i]) == 'object')
				t+= obj2str(obj[i], num+1);
		}
	else
		t += obj;
	return t;
}

function removeArrayDupes(arr) {
  return Object.keys(Object.keys(arr).reduce(
    function(acc, i) {
      acc[arr[i]] = true;
      return acc;
    },
    {}
  ));
}

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
function roundTo(v,d,zeroPad,whole){
  if (d == undefined) d = 0;
  if (zeroPad == undefined) zeroPad = false;
  if (whole == undefined) whole = true;
  var r = ""+Math.round(parseFloat(v) * Math.pow(10, d)) / Math.pow(10, d);
  if (zeroPad){
    if (r.indexOf('.') == -1) r += ".";
    var diff = r.length - r.indexOf('.');
    for (var i = 0; i < d + 1 - diff; i++)
      r+='0';
    if (whole && r.substr(r.length-3) == ".00") r = r.substring(0,r.length-3);
  }
  return r
}

function build_url_query(array, first_is_qm, preceeding) {
  var qs = '';
  var query_array = [];
  var v;
  for(k in array){
	v = array[k];
	if (preceeding == undefined)
      query_array.push(typeof(v) == 'array' ?
        build_url_query(v, false, preceeding+k) :
        k+"="+urlencode(v));
    else{
      query_array.push(typeof(v) == 'array' ?
        build_url_query(v, false, preceeding+"["+k+"]"):
        preceeding+"["+k+"]="+urlencode(v));
    }
  }
  return implode('&',query_array);
} 

function urlencode (str) {

    str = (str+'').toString();
    
    // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
    // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
              replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}
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

function explode (delimiter, string, limit) {
    var emptyArray = {
        0: ''
    };

    // third argument is not required
    if (arguments.length < 2 || typeof arguments[0] == 'undefined' || typeof arguments[1] == 'undefined') {
        return null;
    }

    if (delimiter === '' || delimiter === false || delimiter === null) {
        return false;
    }

    if (typeof delimiter == 'function' || typeof delimiter == 'object' || typeof string == 'function' || typeof string == 'object') {
        return emptyArray;
    }

    if (delimiter === true) {
        delimiter = '1';
    }

    if (!limit) {
        return string.toString().split(delimiter.toString());
    } else {
        // support for limit argument
        var splitted = string.toString().split(delimiter.toString());
        var partA = splitted.splice(0, limit - 1);
        var partB = splitted.join(delimiter.toString());
        partA.push(partB);
        return partA;
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

function index_assoc_array(a){
    var vArr = [];
    for (var i in a) if (a.hasOwnProperty(i)){
      vArr.push(i);
    }
    vArr.sort(function(a,b){return a-b});
    return vArr;
}

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

function ucFirst(str) {
  if (str === undefined) str = '';
  return str.length ? str[0].toUpperCase() + str.substr(1) : str;
}
function formatPrice(num) {
  if (num === undefined) num = 0;
  const absNum = Math.abs(num);
  const neg = num < 0 ? '-' : '';
  if (Number(absNum).toLocaleString) {
    return neg + '$' + Number(absNum).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }
  return neg + '$' + roundTo(absNum, 2, true, false);
}

function dateFromYMD(format, ymd, H, i){ // ymd in tzOffset timezone
  if (undefined == H) H = 0;
  if (undefined == i) i = 0;
  //if (tz == undefined)
    var tz = tzOffset;
  return date(format, mktime(H,i,0,ymd.substr(5,2),ymd.substr(8,2),ymd.substr(0,4)), tz)
}

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

function expDescFromYMD(exp) {
  var expDashed = exp.length === 8 ? exp.substr(0,4) + '-' + exp.substr(4,2) + '-' + exp.substr(6,4) : exp;
  var y = dateFromYMD('Y',expDashed) == date('Y') ? '' : ' '+dateFromYMD('Y',expDashed); // only show year if not this year
  return dateFromYMD('j<\\s\\up>S</\\s\\up> M'+y,expDashed);
}

function timeFromYMD(ymd, H, i){
  if (undefined == H) H = 0;
  if (undefined == i) i = 0;
  return mktime(H,i,0,ymd.substr(5,2),ymd.substr(8,2),ymd.substr(0,4))
}
function mktime (H,i,s,m,d,Y) {
  var months = [0,'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec']
    var st = d+" "+months[parseInt(m,10)]+" "+Y+" "+H+":"+(i<10?"0":"")+parseInt(i,10)+":"+(s<10?"0":"")+parseInt(s,10)+" "+tzOffsetStr;
    var D = new Date(st);
      //if (D.toString() == "Invalid Date")
      //  alert('arg');
    return D.getTime()/1000;

    /*
    var d = new Date('1/01/1970 0:00:00 '+tzoffset),
        r = arguments,
        i = 0,
        e = ['Hours', 'Minutes', 'Seconds', 'Month', 'Date', 'FullYear'];

    for (i = 0; i < e.length; i++) {
        if (typeof r[i] === 'undefined') {
            r[i] = d['get' + e[i]]();
            r[i] += (i === 3); // +1 to fix JS months.
        } else {
            r[i] = parseInt(r[i], 10);
            if (isNaN(r[i])) {
                return false;
            }
        }
    }

    // Map years 0-69 to 2000-2069 and years 70-100 to 1970-2000.
    r[5] += (r[5] >= 0 ? (r[5] <= 69 ? 2e3 : (r[5] <= 100 ? 1900 : 0)) : 0);

    // Set year, month (-1 to fix JS months), and date.
    // !This must come before the call to setHours!
    d.setFullYear(r[5], r[3] - 1, r[4]);

    // Set hours, minutes, and seconds.
    d.setHours(r[0], r[1], r[2]);

    return (d.getTime() / 1e3 >> 0) - (d.getTime() < 0);*/
}

function getCallStack() {
  var callstack = [];
  var isCallstackPopulated = false;
  try {
    i.dont.exist+=0; //doesn't exist- that's the point
  } catch(e) {
    if (e.stack) { //Firefox
      var lines = e.stack.split('\n');
      for (var i=0, len=lines.length; i<len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          callstack.push(lines[i]);
        }
      }
      //Remove call to printStackTrace()
      callstack.shift();
      isCallstackPopulated = true;
    }
    else if (window.opera && e.message) { //Opera
      var lines = e.message.split('\n');
      for (var i=0, len=lines.length; i<len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i+1]) {
            entry += ' at ' + lines[i+1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to printStackTrace()
      callstack.shift();
      isCallstackPopulated = true;
    }
  }
  if (!isCallstackPopulated) { //IE and Safari
    var currentFunction = arguments.callee.caller;
    while (currentFunction) {
      var fn = currentFunction.toString();
      var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
      callstack.push(fname);
      currentFunction = currentFunction.caller;
    }
  }
  return(callstack);
}

function isMobile() {
  var ww = $(window).width();
  return ww < 768;
}