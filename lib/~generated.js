if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    'use strict';

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function () {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());// basic functions non-specific to websites 

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
}function openSMSurvey() {
  $('#sm-survey-wrapper').fadeIn(100);
  $('.survey-teaser').fadeOut(100);
  setCookie('survey_completed', true, { expiry_days: 365 });
}
function closeSMSurvey() {
  $('#sm-survey-wrapper').fadeOut(100);
}
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
		return jq_exclusive_switch($(this), 100, 'slide');
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
// !!! for logic / server errors that the dev needs to know about, and probably report something to user too
function reportError(text){
  alert(text);
}

function alert_return(e){
	alert(obj2str(e));
}

var listeners = new Array;
function addListener(tCall, tFunc, tLocalEle){
	if (listeners[tCall] == undefined)
		listeners[tCall] = new Array;
	listeners[tCall].push({func:tFunc, data:tLocalEle});
}

/*
 * Triggers listening
 *  tCall = the call name; what is changing
 *  tInfo = object of the element that changed
 *         {
 *            ele: identifier, ie: 't2e1'
 *            name: inputs name, ie: 'longCall'
 *         }
 */
function triggerListener(tCall, tInfo){
  if (typeof debugEvents !== 'undefined' && debugEvents) {
    console.log('Event', tCall, tInfo);
  }
	if (listeners[tCall] != undefined){
		for (i in listeners[tCall]){
      if (tInfo['tab_num'] == listeners[tCall][i]['data']['tab_num']){
        listeners[tCall][i]['func'](tCall, tInfo, listeners[tCall][i]['data']);
      }
    }
	}
  return true;
}

function newTab(strat, rqIdDontRequest){
  if (window['viewStyle'] !== undefined && viewStyle !== 'full') {
    $('#top_but-calculator').hide();
  }

  var rqId = (rqIdDontRequest == undefined) ?
        ajaxRequest('creating new tab: '+strat, 'newTab', {strat:strat}, newTab_return, {strat:strat}) :
        rqIdDontRequest;

  $('.popup').dialog('close');

	$("[name='strat_tabs']").hide();
  $('#calcs_holder').append("<div class=\"jq_exclusive_target\" id=\"newTab_req"+rqId+"\" name=\"strat_tabs\"><span class=\"loading\">Loading</span></div>");

  return false;
}
function newTab_return(reqData, data, cfg){
  cfg = Object.assign({ show: true }, cfg || {});

  if (data['strat-info'] != undefined && data['strat-info']['text'] != undefined){
    // ** track ajax load **
    _opcGaq.push(['_trackPageview', '/calculator/'+data['strat-info']['name']+'.html']);
    var code = "<li class=\"stratTab dialog_tab\"name=\"strat_tabs:strat_"+data['tabId']+"\" id=\"strat_"+data['tabId']+"_button\">"+
        "<div><a href=\"#\" name=\"strat_tabs:strat_"+data['tabId']+"\" class=\"jq_exclusive_switch_flash name\" onclick=\"showTab(this); return false;\">New "+data['strat-info']['text']+"</a> "+
        "<a href='#' class='close_x' onclick=\"return closeTab(this);\" title='close'>&times;</a>"+
        "<img src='"+WEB_PATH_STATIC+"images/tab-fade-top.gif' class='tab_fade_top'/>"+
        "<img src='"+WEB_PATH_STATIC+"images/tab-fade-bot.gif' class='tab_fade_bot'/></div></li>"

    $('#tab_holder_tabs .stratTab').first().before(code);
  }
  $('#newTab_req'+data['reqId']).remove();
  
  var hideClass = cfg.show === false ? ' jq_start_hidden' : '';

	$('#calcs_holder').append("<div class=\"jq_exclusive_target stratContent"+hideClass+"\" id=\"strat_"+data['tabId']+"\" name=\"strat_tabs\">"+data['code']+"</div>");
  $("#strat_"+data['tabId']+"_form").append(
    "<div class='results jq_start_hidden' id='t"+data['tabId']+"_results'>\r\n"+
    " <div id='t"+data['tabId']+"_summary' class='summary'></div>\r\n"+
    " <div id='t"+data['tabId']+"_ads' class='ads'></div>\r\n"+
    " <div id='t"+data['tabId']+"_graph' class='graph'></div>"+
    "</div>"
  );

	$("[name='strat_tabs:strat_"+data['tabId']+"']").click(function() {
		return jq_exclusive_switch($(this), 0);
	});
  if (data['script'] != undefined && data['script'] != '')
    eval(data['script']);

  if (data['js_files'] != undefined && data['js_files'] != ''){
    /*for(var i in data['js_files']){
      var fileref=document.createElement('script')
      fileref.setAttribute("type","text/javascript")
      fileref.setAttribute("src", filename)
    }*/

  }
  if (data['css_files'] != undefined && data['css_files'] != ''){
    /*var fileref=document.createElement("link")
    fileref.setAttribute("rel", "stylesheet")
    fileref.setAttribute("type", "text/css")
    fileref.setAttribute("href", filename)*/
  }

  if (cfg.show) {
    $("[name='strat_tabs:strat_"+data['tabId']+"']").click();
    refreshIntraStratAd(data['tabId']);
  }
  updateStratAdStickiness();
}

var curTab;
// ** any extra functionality when clicking on an existing tab
function showTab(tab, fromClose, dontPushRoute) {
  if (closeCurrentTabs) closeCurrentTabs();
  if (typeof fromClose === 'undefined'){
    _opcGaq.push(['_trackEvent', 'Tabs', 'Show']);
  }
  var stratNo = (typeof tab == 'number') ?
    tab :
    $(tab).attr('name').substring(17);
  $('.popup').dialog('close');

  if (stratNo !== 'F') {
    $('#strat_F_button').removeClass('dialog_tab_selected');
  }
  refreshIntraStratAd(stratNo);

  if (tabsFromFinder && tabsFromFinder[stratNo]) {
    $('#strat_'+stratNo+' .breadcrumb').html(
      '<a href="/option-finder.html" onclick="switchToTabVisually(\'F\'); return false;">Option Finder Results</a> &gt;'
    );
  }

  if (dontPushRoute !== true && safeSelect(window, function(w) { return w.history.state.tabNo; }) !== stratNo) {
    openTabHandleRoutes(stratNo);
  }

  curTab = stratNo;
  ajaxRequest('activating tab', 'activateTab', {stratNo:stratNo}, general_return);
  
  updateStratAdStickiness();

  // if (viewStyle === 'mobile') {
  //   $('#ad_intrapage').appendTo($('#strat_'+stratNo+' .ad_intrapage-target'));
  //   refreshIntraStratAd();
  // }
  // !!! use cookies instead
	return false;
}

function getRouteData(tabId) {
  if (tabId === 'F') {
    return {
      title: 'Option finder - by Options Profit Calculator',
      url: '/option-finder.html'
    }
  } else {
    var stratKey = $('#t'+tabId+'_stratKey').val();
    var stratDesc = $('#strat_'+tabId+'_button div a .minor').eq(0).text();
    var cmplStratDesc = $('#strat_'+tabId+'_button div a').eq(0).text();
    var fullTitle = cmplStratDesc.slice(0, cmplStratDesc.length - stratDesc.length)+ ' ' +stratDesc;
    return {
      title: fullTitle,
      url: '/calculator/' + stratKey + '.html'
    }
  }
}

function openTabHandleRoutes(newTabId) {
  if (window.history && window.history.pushState) {
    var routeData = getRouteData(newTabId);
    window.history.pushState({ tabNo: newTabId }, routeData.title, BASE_URL+routeData.url);
    $('head title').text(routeData.title)
  } else {
    document.location.hash = 'tab=' + newTabId;
  }
}

// window.addEventListener("hashchange", function(){
//   alert('hashch');
//   if (window.location.pathname === '/option-finder.html' && window.location.hash === '') {
//     $('#calcs_holder .jq_exclusive_target').hide();
//     $('#strat_F').show();
//   }
// });

function switchToTabVisually(tabNo) {
  if ($('#strat_'+tabNo).length > 0) {
    $('.stratTab.dialog_tab').removeClass('dialog_tab_selected');
    $('.stratContent').hide();
    $('#strat_'+tabNo+'_button').addClass('dialog_tab_selected');
    $('#strat_'+tabNo).show();
  }
}

window.addEventListener("popstate", function(s){
  var tabNo = safeSelect(s, function(_s) { return _s.state.tabNo; }, false);
  if (tabNo !== false) {
    // showTab($('#strat_'+tabNo+'_button > div > a')[0], undefined, true);
    switchToTabVisually(tabNo);
  }
});

function refreshIntraStratAd(tabNo) {
  if (window.fusetag && window.fusetag.loadSlotById) {
    if (!$('#fuse-21977025922-'+tabNo).attr('data-fuse')) {
      $('#fuse-21977025922-'+tabNo).attr('data-fuse', '21977025922');
      window.fusetag.loadSlotById(21977025922, 'fuse-21977025922-'+tabNo);
    }
  }
}

function closeTab(tabCloseBut){
  var tab = $(tabCloseBut).parent().parent();
  var nextTabBtn = $(tab).next();
  var prevTabBtn = $(tab).prev();
  var switchName= $('a:first', tab).attr('name');
	var colonLocation = switchName.indexOf(":");
	var targetNames = switchName.substring(0, colonLocation);
	var targetId = switchName.substring(colonLocation+1);
  var stratNo = targetId.substring(6);
	//$("[name='"+targetNames+"'].jq_exclusive_target").hide();
  $("#"+targetId+".jq_exclusive_target").remove();
  $(tab).remove();
  rq = ajaxRequest('closing tab', 'closeTab', {stratNo:stratNo}, general_return);

  if (stratNo == curTab){
    var nextTab = stratNo;
    if (nextTabBtn.length) {
      nextTab = nextTabBtn[0].id.substr(6, nextTabBtn[0].id.length - 13);
    } else if (prevTabBtn.length) {
      nextTab = prevTabBtn[0].id.substr(6, prevTabBtn[0].id.length - 13);
    }
    jq_exclusive_switch($('a[name="strat_tabs:strat_'+nextTab+'"]'), 0);

    _opcGaq.push(['_trackEvent', 'Tabs', 'Close']);

    showTab(parseInt(nextTab), true);
  }

  return false;
}

// * sometimes you just gotta tell the server that something happend client-side.  And sometimes
// * the client doesn't need to hear anything.  Here's the callback
function general_return(r){
  // boo
}

function viewMore(t){
  $(".more", $(t.currentTarget).parent()).slideToggle(100);
  if ($(this).hasClass("expanded"))
    $(t.currentTarget).removeClass("expanded");
  else
    $(t.currentTarget).addClass("expanded");
  return false;
}

function addMsg(text, level){
  inputError(text, level);
}
function inputError(text, level){
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
function closeMsg(closeX, msg){
  var msg = msg || $(closeX).parent();
  $(msg).addClass('__hiding');
  setTimeout(function() {
    $(msg).remove();
  }, 400);
}

function setCookie(c_name,value,opts)
{
if (opts.expiry_days == undefined) opts.expiry_days = 30;
if (opts.path == undefined) opts.path = '/'
var exdate=new Date();
exdate.setDate(exdate.getDate() + opts.expiry_days);
var c_value=escape(value) + ";path="+escape(opts.path)
  +";expires="+exdate.toUTCString()
  +";max-age="+(opts.expiry_days * 60*60*24)
  +";domain="+(COOKIE_DOMAIN || '');
document.cookie=c_name + "=" + c_value;

// delete www cookie
var wc_value=";path="+escape(opts.path)
  +";expires=Thu, 01 Jan 1970 00:00:01 GMT"+
  +";domain="+(BASE_URL || '').replace(/(http)?s?:?\/?\/?/, '');
document.cookie=c_name + "=" + wc_value;
}
function getCookie(c_name)
{
var i,x,y,ARRcookies=document.cookie.split(";");
for (i=0;i<ARRcookies.length;i++)
{
  x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
  y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
  x=x.replace(/^\s+|\s+$/g,"");
  if (x==c_name)
    {
    return unescape(y);
    }
  }
}

// *** Run every page - init ***

(function(){
  var firstUseCookie = getCookie('first_use');
  // if (firstUseCookie == undefined){
  setCookie(
    'first_use',
    (firstUseCookie == undefined)
      ? parseInt(new Date().getTime()/1000, 10)
      : firstUseCookie,
    {expiry_days: 365*100}
  ); // set timestamps cookie for 100 years
  // }

  // var lastId = getCookie('last_session_id');
  var thisId = getCookie('PHPSESSID');
  // if (lastId != thisId){
    var numVisits = getCookie('num_visits');
    if (numVisits == undefined){
      numVisits = 0;
    }
    setCookie('num_visits', parseInt(numVisits)+1, {expiry_days: 365*100});
    setCookie('last_session_id', thisId, {expiry_days: 365*100});
  // }
})();

// This is targetted towards ad-strat-top
function onAdChange(mutations, force) {
  var nodesWereAdded = force ? true : (mutations || []).filter(function(mut) {
    return mut.addedNodes.length > 0;
  }).length > 0;
  if (nodesWereAdded) {
    var ad = $(mutations[0].target).closest('.ad');
    if (!ad.css('minHeight') || ad.height() > parseFloat(ad.css('minHeight'))) {
      ad.css('minHeight', ad.height()+'px')
    }
  }
}

function isTransitionalTheme() {
  return $('body').hasClass('transitional');
}

$(document).click(function(e) {
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

$(document).ready(function() {
  if (typeof __ez !== 'undefined' && (__ez.template || {}).isOrig !== true) {
    $('[data-fuse]').remove();
  }
  var observer = typeof MutationObserver !== 'undefined' && new MutationObserver(onAdChange);
  observer.observe && $('.ad').each(function() {
    observer.observe(this, {subtree: true, childList: true});
    onAdChange([ { target: this }], true)
  });
});
