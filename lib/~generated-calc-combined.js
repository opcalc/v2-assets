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

function updateInsets(tNo) {
  var article = decodeURIComponent($('#strat_'+tNo+' .stratArticle').attr('data-article'));
  var stats = decodeURIComponent($('#strat_'+tNo+' .stratStats').attr('data-stats'));
  $('#feedback_section').html(stats 
    ? stats + decodeURIComponent(statsCommon)
    : decodeURIComponent(statsDefaultContent)
  );
  $('#stratArticle').html(article);
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
  updateInsets(stratNo);

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
function getLoadingHtml(t){
  return "<span class='loading-wrapper'><em class='loading'>"+t+"</em></span>";
}
var loadingHtml = getLoadingHtml('Loading');

var results = []; // array for tabs, each of which is just the returned data(?)

function getPrice(data){
  var stock = $('#'+data.eleId+'-symbol').val();
  if (stock === ""){
    //inputError("Please enter a stock symbol");
  }else{
    data.button = (typeof(data.button)=='string'?'#'+data.button:data.button);
    $(data.button).addClass("loading").html("Loading");
    var reqData = { button: data.button, uEleId: data.eleId, eleId: data.eleId, stock:stock };
    if (isToStock(stock)) {
      if (data.showSelect) {
        reqData.showSelect = true;
      }
      getV3priceData(stock, reqData, true);
      return;
    } else {
      var rqId = ajaxRequest('getting price: '+stock, 'getStockPrice', {stock:stock}, getPrice_return, {eleId:data.eleId, button:data.button, stock:stock});
      getOptions(reqData);
    }  
  }
}

function isDialogOpen() {
  return $('.ui-widget-overlay').css('display') === 'block';
}

var underlying_symb = [];
var priceCache = {}
function getPrice_return(reqData, returnData){
  $(reqData.button).removeClass("loading").html("");
  if (returnData.status == REQ_ERROR){
    inputError(returnData.desc || "No prices found");
    if (returnData.data_status == 4) _opcGaq.push(['_trackEvent', 'Symbol not found', reqData.stock]);
    // !!! will probably throw error in getOption_return when that ajax req comes back - cancel it

  }else if (returnData.status == REQ_OK){
    var stock = reqData.stock;
    if (returnData.symbol_correction !== undefined) {
      $('#'+reqData.eleId+'-symbol').val(returnData.symbol_correction.toUpperCase());
      stock = returnData.symbol_correction.toUpperCase();
    }
    _opcGaq.push(['_trackEvent', 'Symbol search', (stock || '').toLowerCase()]);
    underlying_symb[curTab] = stock;
    priceCache[stock] = returnData.price;

    var bestPrice = roundTo(parseFloat(returnData.price.last) > 0
      ? returnData.price.last
      : (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2, 2);
    var marketPrice = roundTo(returnData.price.bid > 0 && returnData.price.ask > 0 
      ? (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2
      : returnData.price.last, 2);
    var ivHist = parseFloat(returnData.price.ivHist) > 0
    ? parseFloat(returnData.price.ivHist)
    : null;

    // !!! add bid/ask/last to subtle-links
    if ($('#'+reqData.eleId+'-price').val() === "") {
      $('#'+reqData.eleId+'-price').val(bestPrice);
    }
    $('#'+reqData.eleId+'-curPrice').val(bestPrice);
    $('#'+reqData.eleId+'-lastPrice').val(bestPrice);
    $('#'+reqData.eleId+'-marketPrice').val(marketPrice);
    $('#'+reqData.eleId+'-ivHist').val(ivHist);
    $('#'+reqData.eleId+'-updatePriceTime').val(Math.floor(Date.now() / 1000));
    //$('#'+reqData.eleId+'-curPriceDisp').val(returnData.price.last);
    if ($('#'+reqData.eleId+'-curPrice').length > 0 && $('#'+reqData.eleId+'-curPrice').get(0).onchange){
      $('#'+reqData.eleId+'-curPrice').get(0).onchange(); 
    }

    if (isDialogOpen()) {
      refreshOpenOptionSelector(getTabNo(reqData.eleId));
    }
    //triggerListener('underlying_price', {tab_num: curTab, ele_id:reqData.eleId});
 }
}

function isToStock(stock) {
  return stock.indexOf('.to') === stock.length - 3 && stock.length >= 4;
}

function getOptions(data){
  var stock = $('#'+data.uEleId+"-symbol").val().trim();
  var reqData = {stock:stock, uEleId:data.uEleId, eleId:data.eleId};
  if (stock === ""){
    //inputError("Please enter a stock symbol");
  } else if (isToStock(stock)) {
    if (data.showSelect) {
      reqData.showSelect = true;
    }
    getV3priceData(stock, reqData);
    return;
  }else{
    // ** look through requests and add some data if a get_options data call is already out ***
    if (data.showSelect){
      reqData.defaultType = data.defaultType;
      reqData.showSelect = true;

      for (var i in requests){
        if (requests[i]['status'] == REQ_PENDING &&
            requests[i]['desc'] == 'getting options: '+stock &&
            requests[i]['cmd'] == 'getOptions' &&
            requests[i]['data'] == serialize1D({stock:stock})){
          requests[i]['localData'] = reqData;
        }
      }
    }
    // this request is only sent if an existing, pending request doesn't already match
    var rqId = ajaxRequest('getting options: '+stock, 'getOptions', {stock:stock}, getOptions_return, reqData);
  }
}

function sortChainOptions(options) {
  return Object.keys(options).reduce(
    function (newOptions, opKey) {
      if (opKey === '_data_source') return newOptions;
      var newKey = opKey.length === 8
        ? opKey.substr(0, 4) + '-' + opKey.substr(4, 2) + '-' + opKey.substr(6, 2)
        : opKey;
      newOptions[newKey] = {
        c: padStrikeKeys(options[opKey].c),
        p: padStrikeKeys(options[opKey].p)
      }// options[opKey];
      return newOptions;
    }, {}
  );
}

function padStrikeKeys(chainSide) {
  return Object.keys(chainSide)
    .sort(function(a, b) {
      return parseFloat(a) - parseFloat(b)
    })
    .reduce(
      function(newChainSide, stk) {
        newChainSide[parseFloat(stk).toFixed(2)] = chainSide[stk];
        return newChainSide;
      },
      {}
    );
}

function getV3priceData(stock, reqData, includePriceUpdate) {
  $.getJSON(V3_API_PATH + '/price/' + stock).always(function(d) {
    if (!d || !d.data || !d.data.result === 'SUCCESS') {
      inputError('Prices not found');
      $('#'+reqData.eleId+"-loading").hide();
      return;
    }
    var options = d.data.options;
    // var stock = d.data.stock;
    var newOptions = sortChainOptions(options);
    getOptions_return(
      reqData,
      {
        status: REQ_OK,
        options: newOptions
      }
    );
    if (includePriceUpdate) {
      getPrice_return(
        reqData,
        {
          status: REQ_OK,
          price: d.data.stock
        }
      );
    }
  });
}

var opCache = {}; // * cache for a symbol's options
function getOptions_return(reqData, returnData){
$('#'+reqData.eleId+"-option .panel_button").removeClass('loading');
  var tNo = reqData.eleId.slice(1, reqData.eleId.indexOf('e'));
  if (returnData.status == REQ_ERROR){
    opCache[reqData.stock] = REQ_ERROR;
    inputError(returnData.desc || 'Options not found');
    if (reqData.showSelect){// * they have opened the selector and are seeing the loading symbol
      inputError('Options not found for that symbol.', 'verbose');
      //alert('Options not found for that symbol.');
      _opcGaq.push(['_trackEvent', 'Options not found', reqData.stock]);
      $('#'+reqData.eleId+'-option_selector').dialog('close');

    }
    // * hide the popup?
    // !!! cancel error for getPrice_return
  }else if (returnData.status == REQ_OK){
    var allOpLegs = $('#strat_'+tNo+'_form input[name$="-expiry"]')
    allOpLegs.each(function(_i, e) {
      var opName = $(e).attr('name').substr(0, $(e).attr('name').length - 7);
      var expiry = $(e).val();
      var strike = $('#strat_'+tNo+'_form input[name="'+opName+'-strike"]').val();
      var opType = $('#strat_'+tNo+'_form select[name="'+opName+'-opType"]').val();
    
      var newPricing = (((returnData.options || {})[expiry] || {})[opType] || {})[strike];
      if (newPricing) {
        var $curPrice = $('#strat_'+tNo+'_form input[name="'+opName+'-curPrice"]');
        var oldCurPrice = parseFloat($curPrice.val());
        var newCurPrice = getBestPrice(newPricing);
        $('#strat_'+tNo+'_form input[name="'+opName+'-curPrice"]').val(newCurPrice);
        if (oldCurPrice !== newCurPrice) {
          $('#strat_'+tNo+'_form input[name="'+opName+'-iv"]').val('');
        }
      }
    });

    var stock = reqData.stock;
    if (returnData.symbol_correction !== undefined) {
      $('#'+reqData.eleId+'-symbol').val(returnData.symbol_correction.toUpperCase());
      stock = returnData.symbol_correction.toUpperCase();
    }
    opCache[stock] = sortChainOptions(returnData.options);
    if (reqData.showSelect){
      optionSelect(reqData);
    }
  }
  triggerListener('option_data', { tab_num: tNo, symbol: stock });
}

function getTabNo(eleId) {
  var tNo = null;
  var tNoMatches = eleId.match(/^t(\d*?)e/);
  if (tNoMatches && tNoMatches.length === 2) 
    tNo = parseInt(tNoMatches[1], 10);

  return tNo;
}

function getOpenDialogEleId(tNo) {
  var eleNo = null;
  $('.option_selector[id^=t'+tNo+']').each(
    function(i, selectorEle) {
      if ($(selectorEle).dialog('isOpen')) {
        var eleNoMatches = selectorEle.id.match(/^t\d*?e(.*)-option_selector/);
        if (eleNoMatches && eleNoMatches.length === 2) 
          eleNo = 't'+tNo+'e'+eleNoMatches[1];
      };
    }
  );
  return eleNo;
}

function refreshOpenOptionSelector(tNo) {
  if (!tNo) tNo = curTab;
  var eleId = getOpenDialogEleId(tNo);

  optionSelect({
    uEleId: 't'+tNo+'e0_input_underlying',
    eleId: eleId,
    showSelect: true
  })
}

var dotLoader = '<div class="loaderDotCtnr"><span class="loaderDot loaderDot--white" /><span class="loaderDot loaderDot--white loaderDot--2" /><span class="loaderDot loaderDot--white loaderDot--3" /></div>';

function optionSelect(data){
  var symb = $('#'+data.uEleId+'-symbol').val();
  var uPrice = $('#'+data.uEleId+'-curPrice').val()
    || (priceCache[symb] || {}).last;
  var oLastStrike = $('#'+data.eleId+'-strike').val();
  var oType = $('#'+data.eleId+'-opType').val();
  var oAct = $('#'+data.eleId+'-act').val();
  var oLastExp = $('#'+data.eleId+'-expiry').val();
  var opEle = $('#'+data.eleId+'-option_selector');

  // ** show popup **
  // !!! see below - check if option select panel is already open...???
  if (symb !== ''){
    if (viewStyle !== undefined && viewStyle === 'mobile'){
      var ww = $(window).width(),
          wh = $(window).height();
      $(opEle).dialog('option', {width: ww-5, height:wh-5});
    }
    if (opCache[symb] && opCache[symb] !== REQ_ERROR){

      // $(opEle).html(loadingHtml);
      var code = optionsSelectCode({'eleId':data.eleId, 'underlying_price':uPrice, 'opType':oType, 'opAct':oAct}, opCache[symb]); // 'underlying':symb,

      $(opEle).dialog('open');
      opEle.html('<div class="option_selector__inner">'+code+'</div>');
      initOptionsSelector({'eleId':data.eleId, 'uEleId':data.uEleId, 'stock':symb});
    }else if (opCache[symb] == REQ_ERROR){
      inputError('Options not found for that symbol.', 'verbose');
      //alert('Options not found for that symbol.');

    }else if (!data.showSelect){
      // !!! it might just still be a-comin' back... should we wait, or shoot another request... if we do two then optionSelect could get triggered twice
      getOptions({showSelect:true, eleId:data.eleId, defaultType:data.defaultType, uEleId: data.uEleId});
      $(opEle).dialog('open');
      opEle.html(loadingHtml);
    }

  }else{
    inputError('Enter an underlying symbol in the "Symbol" field above before trying to select options');
  }

  return false;
}

var shownAds = false;
var showAds_intId = false;
var showAds_timeDur = 5;
var min_adShow_time = 2;
var showAds_timeLeft;
var loadCtr = $('#loading-ctnr');
function doCalculation(tNo, sType, cfg){
  var defaultCfg = {
    replaceWithLoader: false
  };
  if (!cfg) cfg = {};
  Object.keys(defaultCfg).forEach(function(defaultCfgKey) {
    if (cfg[defaultCfgKey] === undefined) {
      cfg[defaultCfgKey] = defaultCfg[defaultCfgKey];
    }
  });
  if (loadCtr.length === 0) loadCtr = $('#loading-ctnr');
  if ($('body').hasClass('full')) { showAds_timeDur = 0; min_adShow_time = 0; }
  $('.field_error').removeClass('field_error');

  var values = {};
  $.each($('#strat_'+tNo+' form').serializeArray(), function(i, field) {
      values[field.name] = field.value;
  });
  values.tabId = tNo;

  var errors = validateCalcReq(sType, values);
  if ($('#t'+tNo+'_agree_tc').length > 0 && $('#t'+tNo+'_agree_tc').attr('checked') === undefined){
    if (errors === false) errors = [];
    errors.push('agree_tc_label');
  }
  if (errors){
    inputError("Please complete all required fields");
    highlightValErrors(tNo, errors);

  }else{
    var graphHadContent = ($('#t'+tNo+'_graph').html() || '').length > 0;
    var replaceWithLoader = cfg['replaceWithLoader'] || !graphHadContent
    // ** in new tab
    if ($('#t'+tNo+'_graph-newTab').attr('checked')){

      if (typeof fromClose !== 'undefined'){
        _opcGaq.push(['_trackEvent', 'Tabs', 'Re-calc in new tab']);
      }
      var rqId = ajaxRequest("calculating results", 'calculate', values, doCalculation_return, {tab_num:tNo, noScroll: false });
      newTab(false, rqId);
      $.scrollTo('#top_menu', 500);
      
      // ** in current tab
    }else{
      $('#t'+tNo+'_submit').addClass('button--disabled');
      $('#strat_'+tNo+' .submitInputs').addClass('submitInputs--loading');
      $('#strat_'+tNo+' .results').css('opacity', 0.4);
      if (replaceWithLoader) {
        $('#strat_'+tNo+' .summary .hint').html('<span class="loading">Calculating results</span>');
        $.scrollTo('#load-anchor', 500);
      }
      shownAds = true;

      $('.popup').dialog('close');
      ajaxRequest("calcuating results", 'calculate', values, doCalculation_return, {tab_num:tNo, noScroll: !replaceWithLoader});
    }
  }
}

function updateStratAdStickiness() {
  var tNo = curTab;
  var adWidth = $('.ad.strat').innerWidth();
  var totalRoom = $('#content_holder_inner').innerWidth();
  var graphWidth = $('#t'+tNo+'_graph .graph').innerWidth() || $('#t'+tNo+'_graph .google_chart_holder').innerWidth();
  var summaryWidth = $('#t'+tNo+'_summary').innerWidth();
  var spacer = 15;
  
  var hasRoom = Math.max(graphWidth, summaryWidth) + adWidth + spacer < totalRoom;

  $('#content_right').css('height', $('#strat_'+tNo+'_form').innerHeight() - 
    (hasRoom ? 0 : $('#t'+tNo+'_graph').innerHeight())
  );
}

function validateCalcReq(strat, values){

  var errors = [];
  for(var i in values){
    if (values[i] === ''){
      if (i.indexOf('-num')>0 ||
          i.indexOf('-strike')>0 ||
          i.indexOf('underlying-curPrice')>=0 ||
          i.indexOf('-expiry')>0 ||
          i.indexOf('-opType')>0 ||
          (i.indexOf('-price')>0 && i.indexOf('-priceMin') === -1 && i.indexOf('-priceMax') === -1)
        )
        errors[errors.length] = i;
    }
  }
  return errors.length > 0 ? errors : false;
}

function highlightValErrors(tNo, errors){
   var jqq = '';
    for (var i in errors){
      // ** hidden field for option
      if (errors[i].indexOf('-strike')>0 ||
         errors[i].indexOf('-opType')>0 ||
         errors[i].indexOf('-expiry')>0){
        var opName = errors[i].slice(0, errors[i].lastIndexOf('-'));
        jqq += (i>0?', ':'')+'#strat_'+tNo+' [name="'+opName+'-option"] .panel_button';
      }else
        jqq += (i>0?', ':'')+'#strat_'+tNo+' [name="'+errors[i]+'"]';
    }

    $(jqq).each(function(){
      $(this).addClass('field_error');
    });
}

function hideLoaderShowGraph(tNo) {
  loadCtr.css('visibility', 'hidden');
  $('#t'+tNo+'_submit').text('Calculate');
  $('#t'+tNo+' .results').show();
}

function wrapInParensIfReq(tabNum, returnedVal, minOrMax, rangeAuto) {
  // if required means, if the input was blank (for now)
  if (returnedVal[0] === "(") return returnedVal;

  var MinOrMax = minOrMax[0].toUpperCase() + minOrMax.substr(1);
  var rangeInputVal = $('#t' + tabNum + '_graph-price' + MinOrMax).val();
  if (
    rangeAuto == '1' ||
    rangeInputVal === "" || (
      rangeInputVal.length &&
      rangeInputVal[0] === "("
    )
  ) {
    return "(auto:"+returnedVal+")";
  }
  return returnedVal;
}

function stripNonNumeric(numIsh) {
  return (""+numIsh).replace(/\D\./g, "");
}

function updateCalculation(t_no) {
  getPrice
  // make sure prices are recent
  // get prices if not available
  // 
}

function doCalculation_return(reqData, returnData){
  if ((returnData.results.messages || []).length) {
    returnData.results.messages.forEach(function(m) { inputError(m); });
  }
  $('#strat_'+reqData.tab_num+'_form').addClass('formComplete');
  $('#t'+reqData.tab_num+'_submit').removeClass('button--disabled');
  $('#strat_'+reqData.tab_num+' .submitInputs').removeClass('submitInputs--loading');
  $('#t'+reqData.tab_num+'_graph-newTab_holder').css('display','');
  $('#strat_'+reqData.tab_num+' .results').css('opacity', 1);

  // I think these are acting on the wrong tab_num when thre's a returnData.newTab, or do we swap them out
  $('#'+reqData.tab_num+'_graph-priceMin-quick').val(roundTo(stripNonNumeric(returnData.results.graph_priceMin), 2));
  $('#t'+reqData.tab_num+'_graph-priceMin-val').val(roundTo(stripNonNumeric(returnData.results.graph_priceMin), 2));
  $('#'+reqData.tab_num+'_graph-priceMax-quick').val(roundTo(stripNonNumeric(returnData.results.graph_priceMax), 2));
  $('#t'+reqData.tab_num+'_graph-priceMax-val').val(roundTo(stripNonNumeric(returnData.results.graph_priceMax), 2));
  $('#t'+reqData.tab_num+'_graph-rangeAuto').val(returnData.results.graph_rangeAuto ? '1' : '0');
  updateStratAdStickiness();

	var stillLoading = loadCtr.hasClass('load-timeout');
  if (stillLoading) {
    loadCtr.removeClass('load-timeout');
  } else {
    hideLoaderShowGraph(reqData.tab_num)
  }

  if (returnData.newTab != undefined){
    var oldResultsReference = $('#strat_'+reqData.tab_num+' .results');
    var oldTabReference = $('#strat_'+reqData.tab_num);
    $('#strat_'+reqData.tab_num).attr('id', 'strat_'+reqData.tab_num+"-to-remove");

    // Create a new tab with the original calculation's form values, and correctly initialise scripts
    returnData.oldTab.tabId = reqData.tab_num;
    newTab_return(reqData, returnData.oldTab, { show: false });
    $('#strat_'+reqData.tab_num+' .results').replaceWith(oldResultsReference);
    
    if (stillLoading) {
      $('#t'+returnData.newTab.tabId+'results').hide();
    }
    // Remove the original calculation tab (since it has the form values that should be in the new tab)
    oldTabReference.remove();

    // Create the new calculation tab
    reqData.tab_num = returnData.newTab.tabId; // this doesn't get used in newTab_return, but does below
    newTab_return(reqData, returnData.newTab);

    /* alternative method, didn't work.  for (var varName in returnData.oldTab.vars){
       $("#strat_"+reqData.tab_num+" input[name='"+varName+"']").val(returnData.oldTab.vars[varName]);
     }*/

    /* The below works alright, but leaves out the graph divs.  Best would be to not get rid
    //  of them, that way anything rendered would remain
    $('#strat_'+reqData.tab_num+'').html(returnData.oldTab.code);
    if (returnData.oldTab['script'] != undefined && returnData.oldTab['script'] != '')
      eval(returnData.oldTab['script']);*/
  }

  if (returnData.status == REQ_ERROR){
    inputError(returnData.desc);
    $('#t'+reqData.tab_num+'_summary').html("");

  }else if (returnData.status == REQ_OK){
    results[reqData.tab_num] = returnData.results;

    _opcGaq.push([
      '_trackEvent',
      'Calculation: '+returnData.results.strat,
       returnData.results.underlying_symb,
       returnData.tab_desc_long.desc.substring(returnData.results.underlying_symb.length+1)
    ]);

    $('#strat_'+reqData.tab_num+'_button .name').html(returnData.tab_desc.desc+"<br/><span class='minor'>"+returnData.tab_desc.type+"</span>");

    // if (showAds_timeLeft > 2){
    //   $('#loading-ctnr .loading').replaceWith(
    //     "<a href='#' onclick='hideLoaderShowGraph("+reqData.tab_num+"); renderResults("+reqData.tab_num+"); return false;' class='showResultsBut'>Show results <span class='time-left'>("+showAds_timeLeft+")</span></a>"
    //   );
    // }
    renderResults(reqData.tab_num, { noScroll: reqData.noScroll || false });
  }
  //alert(obj2str(reqData));
}

function renderResults(tab_num, cfg){
  var noScroll = (cfg || {}).noScroll || false;
  $('#t'+tab_num+'_summary').html(
    "<h2>Estimated returns</h2>"+
      getSummary(results[tab_num])+
      getSharingCode(tab_num)+
      "");//returnData.results.summary.desc
  var graphInfo = renderGraph(results[tab_num], tab_num);
  $('#t'+tab_num+'_graph').html(graphInfo[0]);
  graphInfo[1] && graphInfo[1]();
  $('#strat_'+tab_num+' .results').show();

  // * fill modified vars
  for(var i in results[tab_num].vars){
    $('#strat_'+tab_num+' [name="'+i+'"]').val(results[tab_num].vars[i]);
  }
  // !!! ad code;

  initResults(tab_num);

  if (!noScroll) {
    $.scrollTo('#t'+tab_num+'_summary', 500);
  }
}
function getSharingCode(tab_num){
  return "<div class='shareHolder'>\n\
  <span>Share this on:</span>\n\
  <div class='shareMenu'>\n\
    <a href='#' onclick='loadShare({type:\"fb\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Share this calculation on facebook' class='facebook shareIcon'>Facebook</a>\n\
    <a href='#' onclick='loadShare({type:\"tw\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Tweet this calculation on twitter' class='twitter shareIcon'>Tweet this</a>\n\
    or <a href='#' onclick='loadShare({type:\"link\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Short-link' class='link'>Get short-link to share</a>\n\
  </div>\n\
  <div class='sharePanel'></div>\n\
</div>";
}
function loadShare(cfg){
  if (cfg.type == 'link'){
    $(cfg.link_ele).parent().addClass('active').addClass(cfg.type);
    var sharePanel = $('.sharePanel', $(cfg.link_ele).parent().parent());
    sharePanel.show();
  }
  if (results[cfg.tab_num]['link_code'] != undefined){
    cfg.link_code = results[cfg.tab_num]['link_code'];
    //!!! send request to update the saved tab
    showShare(cfg);
  }else{
    if (cfg.type == 'link'){
      sharePanel.html("<P>"+getLoadingHtml('Getting link')+"</P>");
      var rqId = ajaxRequest("getting share link", 'linkCode', {'tab_num':cfg.tab_num}, loadShare_return, cfg);
    }else
      window.open(WEB_PATH+'share.html?m='+cfg.type+'&t='+cfg.tab_num, 'share', "width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes");
  }
}

function loadShare_return(reqData, returnData){
  results[reqData.tab_num]['link_code'] = returnData.link_code;
  $(reqData.addThis_ele).click();
  reqData.link_code = returnData.link_code
  showShare(reqData);
}
function showShare(cfg){
  var strat_text = {
    'covered-call':'Covered Call',
    'long-call':'Long call',
    'short-call':'Naked call',
    'long-put':'Long put',
    'short-put':'Naked put',
    'call-spread':'Call Spread',
    'put-spread':'Put Spread',
    'calendar-spread':'Calendar Spread',
    'straddle':'Straddle',
    'collar':'Collar',
    'iron-condor':'Iron Condor',
    'butterfly':'Butterfly'
  };
  var promoTxt = [['Check out this ',''],['',' is looking good'],['This ',' is worth watching'],['',' worth keeping an eye on'],
    ['Nice ','']]; //,['1. ',', 2. ???, 3. Profit']
  var rnd = Math.floor(Math.random() * promoTxt.length);
  var txt = promoTxt[rnd][0] + results[curTab].underlying_symb+' '+strat_text[results[curTab].strat] +promoTxt[rnd][1];

  var sharePanel = $('.sharePanel', $(cfg.link_ele).parent().parent());
  var shareLink, blockedText;
  if (cfg.type == 'fb'){
    shareLink = 'https://www.facebook.com/sharer.php?u='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code);
    //blockedText = 'Share this calculation on facebook';
  }
  else if (cfg.type == 'tw'){
   shareLink = 'https://twitter.com/intent/tweet?status='+encodeURIComponent(txt)+': '+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code)+'+via+@opcalc&url='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code)+'&via=opcalc';
    //blockedText = 'Tweet this calculation on twitter';
  }
  else if (cfg.type == 'link'){
    sharePanel.html("<P>"+'Copy this link to share via email, forums or other sharing services:</p><p><input type="text" style="font-weight:bold; width:100%;" value="'+BASE_SHORT_URL+WEB_PATH+cfg.link_code+'"/></p>');
  }
  else if (cfg.type == 'gg'){
   shareLink = 'https://plus.google.com/share?url='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code);
  }

  if (shareLink){
    var oWin = window.open(shareLink, 'share', "width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes");
    //sharePanel.html("<P>"+'Popup blocked? Use this link: <a href="'+shareLink+'" target="_blank" onclick="window.open(\''+shareLink+'\', \'share\', \'width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes\'); return false;">'+blockedText+'</a></p>');
  }
}

function avgPrice(ar){
  var i;
  var accum = 0;
  for(i = 0; i < ar.length; i++){
    accum += parseFloat(ar[i]);
  }
  return (Math.round(accum/ar.length*100)/100).toFixed(2);
}

// *** view ***
function optionsSelectCode(sData, oData){
  var data = oData;

  // var monthCode=;
  var monthTabsCode=[];
  var optionsCode="<div class='options_set_holder'>";

  var selectedMonth = $('#'+sData.eleId+'-expiry').val();
  var selectMonth = false;
  if (selectedMonth == '')
    selectedMonth = true; // default to show first

  var dateStr;

  var opDates = [];
  for (var tDate in data)
    opDates.push(tDate);

  opDates.sort(); //function(a,b){ return parseFloat(a) - parseFloat(b); }

  for(var i = 0; i < opDates.length; i++){
    oDate = opDates[i];
    tDate = opDates[i];
    if (tDate[tDate.length -1] === 'W') tDate = tDate.slice(0, tDate.length - 1);
  //for(var tDate in data){
    if (true == selectedMonth || oDate == selectedMonth){
      if (selectMonth = (new Date().getTime()/1000) < timeFromYMD(tDate))
        selectMonth = true
      else{
        selectMonth = false;
        selectedMonth = true; // show next date that is in future
      }
    }else
      selectMonth = false;

    var isWeekly = oDate[oDate.length -1] === 'W';
    dateStr = tDate.length == 10 ? dateFromYMD('jS&\\nb\\sp;M'+(date('y') != dateFromYMD('y',tDate) ? '&\\nb\\sp;Y':''), tDate) :
       tDate.length == 7 ? dateFromYMD('M'+(date('y') != dateFromYMD('y',tDate+"-15") ? '&\\nb\\sp;Y':''), tDate+"-15") : '';

    if (dateStr !== "")
      monthTabsCode.push("<a href='#' class='options_date_link"+
        (selectMonth? ' options_date_link_active':'')+
        (data[oDate] == null ? ' options_date_link_unfilled':'')+
        "' name=\""+oDate+"\">" + dateStr + (isWeekly ? '<span class="weeklyIndicator">(weekly)</span>':'') + "</a>");//[[format date and js actions]];

    if (data[oDate] == null || !selectMonth){
      optionsCode += "<div class='options_set "+(selectMonth?'options_set_active ':'')+oDate+"' name='"+oDate+"'>\r\n</div>";
    }else
      optionsCode += optionsSelectMonthCode(
          {sData:sData, selectMonth:selectMonth, tDate:oDate, tDateData:data[oDate]});


    if (true == selectMonth){selectMonth = false;selectedMonth = false;}
  }
  optionsCode = "<div class='dates'>"+ monthTabsCode.join(" | ")+"</div>"+optionsCode+"</div>";
  optionsCode += "<div style='height: 60px'>&nbsp;</div>";
  return optionsCode;

}

function optionsSelectMonthCode(cfg){
  var optionsMonCode = ''
  var selectMonth = cfg.selectMonth;
  var curStk = null; // todo
  var tDate = cfg.tDate;
  var tDateData = cfg.tDateData;
  var sData = cfg.sData;

  optionsMonCode += "<div class='options_set "+(selectMonth?'options_set_active ':'')+tDate+"' name='"+tDate+"'>\r\n"+
      "<p style='text-align: left; margin-bottom: 0.5em;' class='minor'>Options prices are delayed 15 minutes</p>\r\n"+
      "<table cellspacing='0' cellpadding='0'><tbody>";

  var strikeInfo = {};

  optionsMonCode += '<tr class="type"><th colspan="3" align="center">Calls</th><th>&nbsp;</th><th colspan="3" align="center">Puts</th></tr>'+
      '<tr class="cols"><th>Bid</th><th>Mid</th><th>Ask</th><th class="s">Strike</th><th>Bid</th><th>Mid</th><th>Ask</th></tr>';

  /*var strikes = [];
  for (var strike in tDateData.c)
    strikes.push(strike);
  for (var strike in tDateData.p)
    if (tDateData.c[strike] == undefined)
    strikes.push(strike);

  strikes.sort(function(a,b){return parseFloat(a) - parseFloat(b);} );*/
  var mid;
  function dolFmt(px) {
    return Number(px).toFixed(2);
  }

  for (var strike in tDateData.c){
    mid = (!in_array(tDateData.c[strike].b, ['N',0,'0.00']) || !in_array(tDateData.c[strike].b, ['N',0,'0.00']) ?
        avgPrice([tDateData.c[strike].b,tDateData.c[strike].a]) :
        (!in_array(tDateData.c[strike].l, ['N',0,'0.00']) ?
          tDateData.c[strike].l :
          'N'));
    strikeInfo[strike] = {'c':"<td class='c"+(sData.opAct!='buy' && sData.opType!='p' ?' r':'')+"'>"+
        (!in_array(tDateData.c[strike].b, ['N',0,'0.00']) ? "<a href='#'>"+dolFmt(tDateData.c[strike].b)+"</a>" : "-")+
        "</td><td class='c"+(sData.opType!='p' ?' r m':'')+"'>"+
        (mid != 'N' ? "<a href='#'>"+dolFmt(mid)+"</a>" : "-") +
        "</td><td class='c"+(sData.opAct!='sell' && sData.opType!='p' ?' r':'')+"'>"+
        (!in_array(tDateData.c[strike].a, ['N',0,'0.00']) ? "<a href='#'>"+dolFmt(tDateData.c[strike].a)+"</a>" : "-")+
        "</td>", 'p':""};
  }
  for (strike in tDateData.p){
    if (strikeInfo[strike] == undefined) strikeInfo[strike] = {'p':''};

    mid = (!in_array(tDateData.p[strike].b, ['N',0,'0.00']) || !in_array(tDateData.p[strike].b, ['N',0,'0.00']) ?
        avgPrice([tDateData.p[strike].b,tDateData.p[strike].a]) :
        (!in_array(tDateData.p[strike].l, ['N',0,'0.00']) ?
          tDateData.p[strike].l :
          'N'));


    strikeInfo[strike].p = "<td class='p"+(sData.opAct!='buy' && sData.opType!='c' ?' r':'')+"'>"+
      (!in_array(tDateData.p[strike].b, ['N',0,'0.00']) ? "<a href='#'>"+dolFmt(tDateData.p[strike].b)+"</a>" : "-")+
      "</td><td class='p"+(sData.opType!='c' ?' r m':'')+"'>"+
        (mid != 'N' ? "<a href='#'>"+dolFmt(mid)+"</a>" : "-") +
      "</td><td class='p"+(sData.opAct!='sell' && sData.opType!='c' ?' r':'')+"'>"+
      (!in_array(tDateData.p[strike].a, ['N',0,'0.00']) ? "<a href='#'>"+dolFmt(tDateData.p[strike].a)+"</a>" : "-")+
      "</td>";

    optionsMonCode += '<tr name="'+strike+'" class="'+(parseFloat(strike) < parseFloat(sData.underlying_price) ? 'itm':'otm')+'">'+
        (strikeInfo[strike].c ? strikeInfo[strike].c : "<td class='c'>-</td><td class='c'>-</td><td class='c'>-</td>") +
        "<td class='s'>"+strike+"</td>" +
        (strikeInfo[strike].p ? strikeInfo[strike].p : "<td class='p'>-</td><td class='p'>-</td><td class='p'>-</td>") +
      '</tr>';
  }

  optionsMonCode += "</tbody></table></div>";
  return optionsMonCode;
}

function getBestPrice(pricing) {
  if (parseFloat(pricing.b) && parseFloat(pricing.a)) {
    return (parseFloat(pricing.b) + parseFloat(pricing.a)) / 2;
  } else return parseFloat(pricing.l);
}

function showOptions(tDate, linkEle, data){
  //var holder = $('.options_set_holder', $(linkEle).parent().parent());
  $('.options_set_active').removeClass('options_set_active').html("\n");
  $('.options_date_link_active', $(linkEle).parent()).removeClass('options_date_link_active');
  $(linkEle).addClass('options_date_link_active');
  $('.options_set').hide();

  if (opCache[data.stock][tDate] !== null){
    var uPrice = $('#'+data.uEleId+'-curPrice').val();
    var opAct  = $('#'+data.eleId+'-act').val();
    var opType = $('#'+data.eleId+'-opType').val();

    var opMoCodeCfg = {
      'selectMonth':true,
      'tDate' : tDate, //,
      'tDateData': opCache[data.stock][tDate],
      'sData' : {eleId: data.eleId,
                  opAct: opAct,
                  opType: opType,
                  underlying_price: uPrice
                }
    };

    $('.'+tDate, $(linkEle).parent().parent()).show().replaceWith(optionsSelectMonthCode(opMoCodeCfg));

  }else
    $('.'+tDate, $(linkEle).parent().parent()).show().html(loadingHtml);

  if (opCache[data.stock][tDate] !== null){
    $('#'+data.eleId+"-option_selector .options_set[name='"+tDate+"'] td a").click(function(){
      return initOptionsSet(this, data);
    });
  }
  /*if ($('.'+tDate, $(linkEle).parent().parent()).html() == ""){
    $('.'+tDate, $(linkEle).parent().parent()).html(optionsSelectMonthCode(
      {sData:{'eleId':reqData.eleId, 'underlying_price':uPrice, 'opType':oType, 'opAct':oAct}, 'selectMonth':firstMonth, 'tDate':monthYmd, 'tDateData':returnData['options'][monthYmd]});
          {sData:sData, selectMonth:selectMonth, tDate:tDate, tDateData:data[tDate]}));

  }*/
}

function initOptionsSelector(data){
  var justMonth = (data.month) ? "[name='"+data.month+"']" : "";
  $('#'+data.eleId+'-option_selector .options_date_link'+justMonth).click(function(){
    showOptions($(this).attr('name'), this, data);
    return false;
  });
  $('#'+data.eleId+'-option_selector .options_set'+justMonth+' td a').click(function(){
    return initOptionsSet(this, data);
  });
  $('#'+data.eleId+'-option_selector .options_date_link_unfilled').click(function(){
    var month = $(this).attr('name');
    getOptions({'stock':data.stock, 'eleId':data.eleId, 'month':month, 'uEleId':data.uEleId})
    // var rqId = ajaxRequest('getting options: '+data.stock+' for '+month, 'getOptions', {stock:data.stock, month:month}, getMonthsOptions_return, {'stock':data.stock, 'eleId':data.eleId, 'month':month, 'uEleId':data.uEleId});
    $('#'+data.eleId+'-option_selector .options_set[name="'+month+'"]').html(loadingHtml);
  });
}

function initOptionsSet(self, data){
    var price = $(self).text();
    var exp = $(self).parent().parent().parent().parent().parent().attr('name');
    var strike = $(self).parent().parent().attr('name');
    var opType = ($(self).parent().hasClass('c') ? 'c' :
      ($(self).parent().hasClass('p') ? 'p' : null));

    var pricing = opCache[data.stock][exp][opType][strike];
    var curPrice = getBestPrice(pricing);

    //_opcGaq.push(['_trackEvent', 'Option selected', data.stock, $('#'+data.eleId+'-act').val() + " " + opType, parseFloat(strike)]);

    if (opType == null) reportError('opType not Call (c) or Put (p)');

    $('#'+data.eleId+'-opType').val(opType);
    $('#'+data.eleId+'-price').val(price);
    $('#'+data.eleId+'-price').change();
    $('#'+data.eleId+'-curPrice').val(curPrice || price);
    $('#'+data.eleId+'-strike').val(strike);
    $('#'+data.eleId+'-expiry').val(exp);
    var strikeConcise = parseInt(strike, 10) == strike ? parseInt(strike, 10) : strike;
    $('#'+data.eleId+'-opDesc').html(expDescFromYMD(exp)+' $'+strikeConcise+' '+(opType == 'c'?'Call':'Put'));
    $('#'+data.eleId+'-opDesc').addClass('option-description--has-content');
    $('#'+data.eleId+'-option .select-button--full').addClass('select-button--hidden');
    $('#'+data.eleId+'-option .select-button--compressed').removeClass('select-button--hidden');
    $('#'+data.eleId+'-option_selector').dialog('close');

    triggerListener('option', {tab_num: curTab, ele_id:data.eleId});

    return false;
}


function getMonthsOptions_return(reqData, returnData){
  var monthCode = '';
  var optionsCode = '';

  //var symb = $('#'+data.uEleId+'-symbol').val();
  var uPrice = $('#'+reqData.uEleId+'-curPrice').val();
  //var oLastStrike = $('#'+data.eleId+'-strike').val();
  var oType = $('#'+reqData.eleId+'-opType').val();
  var oAct = $('#'+reqData.eleId+'-act').val();
  //var oLastExp = $('#'+data.eleId+'-expiry').val();
  //var opEle = $('#'+data.eleId+'-option_selector');

  delete(opCache[reqData.stock][reqData.month]);

  var firstMonth = true;
  var dateStr;
  var monthYmd;
  var monthCodeArr = [];

  var opDates = [];
  for (var tDate in returnData['options'])
    opDates.push(tDate);

  opDates.sort(); //function(a,b){ return parseFloat(a) - parseFloat(b); }

  for(var i = 0; i < opDates.length; i++){

  //for(monthYmd in returnData['options']){
    var monthYmd = opDates[i];
    if (returnData['options'][monthYmd] != null && monthYmd.substr(0,1) !== '_'){
      dateStr = dateFromYMD('jS&\\nb\\sp;M'+(date('y') != dateFromYMD('y',monthYmd) ? '&\\nb\\sp;Y':''), monthYmd);

      monthCodeArr.push("<a href='#' class='options_date_link"+
        (firstMonth? ' options_date_link_active':'')+
        "' name=\""+monthYmd+"\">" + dateStr +"</a> ");//[[format date and js actions]];

      optionsCode += optionsSelectMonthCode(
            {sData:{'eleId':reqData.eleId, 'underlying_price':uPrice, 'opType':oType, 'opAct':oAct}, 'selectMonth':firstMonth, 'tDate':monthYmd, 'tDateData':returnData['options'][monthYmd]});

      opCache[reqData.stock][monthYmd] = returnData['options'][monthYmd];
      firstMonth = false;
    }
  }

  $('#'+reqData.eleId+'-option_selector a[name="'+reqData.month+'"]').replaceWith(monthCodeArr.join(" | "));
  $('#'+reqData.eleId+'-option_selector .options_set[name="'+reqData.month+'"]').replaceWith(optionsCode);

  for(monthYmd in returnData['options'])
    if (returnData['options'][monthYmd] != null && monthYmd.substr(0,1) !== '_')
      initOptionsSelector({'eleId':reqData.eleId, 'uEleId':reqData.uEleId, 'month':monthYmd, 'stock':reqData.stock});
}

/** graph rendering **/

function loadCharts() {
  google.charts.load('current', {'packages':['corechart']});
}
$(document).ready(function() {
  var firstCheckTime = Date.now();
  var chartInterval = setInterval(
    function() {
      var timeNow = Date.now();
      var chartsCanBeLoaded = typeof google !== 'undefined' && typeof google.charts !== 'undefined';
      if (chartsCanBeLoaded) {
        loadCharts();
      }
      if (chartsCanBeLoaded || (timeNow - firstCheckTime) > 5000) {
        clearInterval(chartInterval);
      }
    },
    250
  );
})

function renderRiskGraph(graphData, t_no){
  function haveChartsLoaded() {
    return typeof google !== 'undefined' && typeof google.visualization  !== 'undefined' && typeof google.visualization.arrayToDataTable  !== 'undefined' && typeof google.visualization.LineChart !== 'undefined';
  }
  if (haveChartsLoaded()) {
    setTimeout(function() {
      renderRiskGraph_1(graphData, t_no);
    }, 5)
    return;
  }
  var firstCheckTime = Date.now();
  var graphInterval = setInterval(
    function() {
      var timeNow = Date.now();
      var chartsLoaded = haveChartsLoaded();
      if (chartsLoaded || (timeNow - firstCheckTime) > 5000) {
        clearInterval(graphInterval);
      }
      if (chartsLoaded) {
        renderRiskGraph_1(graphData, t_no);
      }
    },
    250
  );
}

function renderRiskGraph_1(graphData, t_no){
    var lineGraphData = ['header_place_holder'];
    var uPrice = results[t_no]['underlying_current_price'];

    var timeCount, x, vMax = -10000000, vMin = 10000000, tVal,
        colorPalette = [
          '#ff8888', '#ffcc00', '#88ff88', '#66ffff', '#8888ff', '#ff66ff',
          '#996666', '#999944', '#669966', '#449999', '#666699', '#994499'
        ];
        tHeader = ['Strike'],
        header = false,
        dataLine = [],
        dataStr = '',
        colors = [],
        tColor = 0, tColor2 = 0,
        tTimeLen = false,
        graphTimeScale = false,
        timeIndex = [],
        dataIdx = index_assoc_array(graphData.data),
        graphPriceMin = false;

    // var stratScale = Object.keys(graphData.initial.O).reduce(
    //   function(min, oName) {
    //     if (parseInt(graphData.initial.O[oName].n, 10) < min)
    //       return parseInt(graphData.initial.O[oName].n, 10);
    //     return min;
    //   },
    //   1000000000
    // ) || 1;
    var isDebit = graphData.initial.g < 0
    if (isDebit) {
      tHeader.push("(Stock comparison)");
      colors.push("#18357F");
    }
    var showYear = false;
    for(var i in dataIdx) if (dataIdx.hasOwnProperty(i)){
      x = dataIdx[i];
      if (graphPriceMin === false) graphPriceMin = parseFloat(x);
      //graphData.data) if (graphData.data.hasOwnProperty(x)){
      dataLine = [parseFloat(x)];
      if (isDebit) {
        dataLine.push(parseFloat(roundTo(getDisValByType(graphData, -graphData.initial.g + ((parseFloat(x) - uPrice) * (-graphData.initial.g / uPrice))),2)));
      }
      timeCount = 0;

      if (false === header){
        var years = {};
        for(var t in graphData.data[x]) if (graphData.data[x].hasOwnProperty(t)){
          years[date('Y', (parseInt(graphData.start_date,10) + (3600*24) * t))] = 1;
        }
        if (Object.keys && (Object.keys(years) || []).length > 1) showYear = true;
      }
      for(var t in graphData.data[x]) if (graphData.data[x].hasOwnProperty(t)){
        if (false === tTimeLen){ // find out the max time
          for(var tt in graphData.data[x]) if (graphData.data[x].hasOwnProperty(tt) &&
            (tTimeLen < parseInt(tt,10) || tTimeLen === false)) tTimeLen = parseInt(tt,10);

          if (tTimeLen / graphData.time_scale > 10){
            // can't show them all
            graphTimeScale = graphData.time_scale * Math.ceil(tTimeLen / (10 * graphData.time_scale));
          }else graphTimeScale = 1;
        }
        if ((tTimeLen - t) % graphTimeScale == 0){
          // if (first time through) put the date as the data header row
          if (false === header){
            tHeader.push(date('j M' + (showYear ? ' y' : ''), (parseInt(graphData.start_date,10) + (3600*24) * t)));
            // tColor = 204-Math.round(204 * t / tTimeLen);
            // tColor = "00"+(tColor.toString(16));
            // tColor = tColor.substr(tColor.length-2, 2);
            // tColor2 = 204+Math.round(51 * t / tTimeLen);
            // tColor2 = "00"+(tColor2.toString(16));
            // tColor2 = tColor2.substr(tColor2.length-2, 2);
            // colors.push("#"+tColor+tColor+tColor2.toString(16));
            colors.push(timeCount == 0 ? '#cccccc' : colorPalette[(timeCount-1) % colorPalette.length]);
            timeIndex.push(t);
          }
          var tVal = parseFloat(roundTo(getDisValByType(graphData, graphData.data[x][t].g),2));
          dataLine.push(tVal);
          if (tVal > vMax) vMax = tVal;
          if (tVal < vMin) vMin = tVal;
              // / (graphData.graph_type == 'riskGraphPrice'? 1 : 100); // if it's in percent, make it decimal
          timeCount++;
        }
      }
      lineGraphData.push(dataLine);
      if (false === header) header = tHeader;
    }
    header.push('Current');
    colors.push('#666666');
    lineGraphData.push([parseFloat(uPrice)]);
    lineGraphData[lineGraphData.length - 1][header.length - 1] = vMin - ((vMax-vMin) * .1);
    lineGraphData.push([parseFloat(uPrice)]);
    lineGraphData[lineGraphData.length - 1][header.length - 1] = vMax + ((vMax-vMin) * .1);
    lineGraphData[0] = header;
    for (i = 1; i < lineGraphData.length - 2; i++)
      lineGraphData[i][lineGraphData[i].length] = null;
    // Don't show data for interim dates for current date line, or for breakeven 0 line
    for (i = 1; i < lineGraphData[0].length - 1; i++){
      lineGraphData[lineGraphData.length-1][i] = null;
      lineGraphData[lineGraphData.length-2][i] = null;
    }
    var seriesData = {};
    seriesData[timeCount-1] = {lineWidth:2};
    if (isDebit) {
      seriesData[0] = { lineDashStyle: [6, 4] };
    }


    var options = {
      colors: colors,
      lineWidth: 1,
      series: seriesData,
      reverseCategories: false,
      chartArea: {width: isMobile() ? '83%' : showYear ? "69%" : "75%", left: isMobile() ? 70 : 90, top:20, height:"85%"},
      vAxis:{
        viewWindow: {
          max: vMax + ((vMax-vMin) * .1),
          min: vMin - ((vMax-vMin) * .1)
        },
        title:(array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? 'Dollars' : 'Percent'),
        format: array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? '$#,###.##' : '#.##\'%\'',
        viewWindowMode: 'maximized'
      },
      hAxis:{ title: graphData.underlying_symb, format: "$#,###.##" },
      legend: isMobile() ? { position: 'bottom', alignment: 'start' } : {}
    };

    if (!array_includes(['price', 'riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type)){
      options.vAxis.minValue = -110;
    }

    var data = google.visualization.arrayToDataTable(lineGraphData);
    for(var i = 0; i < timeIndex.length; i++){
      data.setColumnProperty(i+2, 'time', timeIndex[i]);
    }
    data.setColumnProperty(lineGraphData[0].length-1, 'current', true);
    data.setColumnProperty(1, 'comparison', true);

    results[t_no].riskChartData = data;
    results[t_no].riskChart = new google.visualization.LineChart($("#t"+t_no+"_graph .google_chart_holder")[0]);
    google.visualization.events.addListener(results[t_no].riskChart, "select",
          function(event) {
            //data.sort([{column: event.column, desc: !event.ascending}]);
            //chart.draw(view);
            var selection = results[t_no].riskChart.getSelection();
            if (selection.length > 0 && selection[0].row != undefined){
              var selected = selection[0];
              if (
                results[t_no].riskChartData.getColumnProperty(selected.column, 'current') == true ||
                results[t_no].riskChartData.getColumnProperty(selected.column, 'comparison') == true
              ) {
                return false;
              }

              var dateSelected = results[t_no].riskChartData[0]
              var date = results[t_no].riskChartData.getColumnLabel(selected.column);
              var t = results[t_no].riskChartData.getColumnProperty(selected.column, 'time');
              var strike = roundTo(results[t_no].riskChartData.getValue(selected['row'], 0), 2, true, false);

              $('#t'+t_no+'_graph-detail').html('').dialog('option','title','Detail: $'+strike+ " on " +date);
              if (viewStyle == 'mobile'){
                var ww = $(window).width(),
                    wh = $(window).height();
                // $('#t'+t_no+'_graph-detail').dialog('option',
                //   {width: ww-5,
                //    height:wh-5});
              }
              $('#t'+t_no+'_graph-detail').html('').dialog('open');
              $('#t'+t_no+'_graph-detail').html(getCellSummary(curTab, results[curTab]['data'][strike][t]));
            }
          });
    results[t_no].riskChart.draw(data, options);
}

function ivChangeOnFocus(t_no) {
  // reset inputs to current value
  var savedVal = parseFloat($('#t'+t_no+'_ivChange-val').val());
  $('#t'+t_no+'_ivChange--input').val(savedVal > 0 ? '+' + savedVal : savedVal);
  $("#t"+t_no+"_ivSlider").slider('value', savedVal);
  $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'hidden');

  $("#t"+t_no+"_ivChangeCard").fadeIn(100);
  var clickHandle;
  clickHandle = function(e) {
    if (e.target.id !== "t"+t_no+"_ivChangeCard" && !$(e.target).parents("#t"+t_no+"_ivChangeCard").length) {
      $("#t"+t_no+"_ivChangeCard").fadeOut(100);
      $(document).off('click', clickHandle);
    }
  };
  setTimeout(function() {
    $(document).on('click', clickHandle);
    $('#t'+t_no+'_ivChange--input').focus();
  }, 30);
}
function ivChangeOnKeyup(t_no, val, noUpdateSlider) {
  if (!noUpdateSlider) {
    $("#t"+t_no+"_ivSlider").slider('value', parseFloat(val));
  }
}
function ivSetVal(t_no, val) {
  var fmtVal = val > 0 ? '+' + val : val;
  $("#t"+t_no+"_ivSlider").slider('value', val);
  $("#t"+t_no+"_ivChange--input").val(fmtVal);
  ivChangeChkUpdateNeeded(t_no);
}
function ivChangeChkUpdateNeeded(t_no) {
  var newVal = $('#t'+t_no+'_ivChange--input').val();
  var curVal = $('#t'+t_no+'_ivChange-val').val();
  if (parseFloat(newVal || '0') !== parseFloat(curVal || '0')) {
    $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'visible');
  } else { 
    $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'hidden');
  }
}
function ivChangeUpdate(t_no) {
  $('#t'+t_no+'_ivChange-val').val(
    parseFloat($('#t'+t_no+'_ivChange--input').val()) || '0'
  );
  $('#t'+t_no+'_submit').click();
}

function renderGraph(graphData, t_no){
  graphData.graph_type = checkForceGraphType(graphData.graph_type, graphData);
  var afterNote = '';

  var dispVis = (graphData.graph_type || '').indexOf('riskGraph') === 0 ? 'line' : 'matrix';
  var pre = '';
  var ivChangeCurVal = parseFloat($('#t'+t_no+'_ivChange-val').val()) || 0;
  var initGraph = function() {
    var handle = $( '#t'+t_no+'_ivSlider_custom-handle' );
    // handle.draggable();
    $( '#t'+t_no+'_ivSlider' ).slider({
      value: ivChangeCurVal,
      min: -100,
      max: 100,
      create: function() {
        // handle.text( $( this ).slider( "value" ) );
      },
      slide: function( event, ui ) {
        $('#t'+t_no+'_ivChange--input').val(ui.value > 0 ? '+'+ui.value : ui.value);
        ivChangeChkUpdateNeeded(t_no);
      }
    });
  }
  pre += "<div style='display: flex; margin-bottom: 5px; margin-top: 5px;'>"+
  " <div class='fieldLabel' style='position: relative;'>"+
  "   <span class='inputLabelSmall' style='position: relative; z-index: 10;'>"+
  "     IV change"+
  '     <a href="#" onclick="alert(\'The expected increase or decrease in Implied Volatility.\\n\\nE.g. For stock with IV of 30, entering 10% here will show estimates for if the stock\\\'s IV increases to 33\');return false;" class="help">?</a>'+
  "   </span>"+
  "   <div style='position: relative; flex: 1; display: flex; align-items: center' onclick='ivChangeOnFocus("+t_no+")'>"+
  "     <select class='input noLeftMargin'><option>"+(ivChangeCurVal === 0 ? '±' : ivChangeCurVal > 0 ? '+' : '')+ivChangeCurVal+"%"+"</option></select>"+
  "     <div style='position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 3'></div>"+
  "   </div>"+
  "   <div class='id--ivChangePanel card jq_start_hidden' id='t"+t_no+"_ivChangeCard'"+
  "     style='position: absolute; top: -0.2rem; left: -0.3rem; padding: 1.3em 0.3rem 0.3rem; min-width: 4.2em; z-index: 3'"+
  "   >"+ 
  '   <span>'+
  '    <input class="input inputNumeric noLeftMargin" '+
  '     type="text" inputmode="decimal"'+
  "     style='width: 40px;'"+
  "     name='ivChange' id='t"+t_no+"_ivChange--input' "+
  "     oninput='ivChangeOnKeyup("+t_no+", event.target.value); ivChangeChkUpdateNeeded("+t_no+")'"+
  "    />%"+
  "   </span>"+
  "   <div class='ivSlider__ctnr'>"+
  "     <div class='ivSlider__notch-ctnr'>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -100)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>100"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -75)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>75"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -50)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>50"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -25)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>25"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-percent ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 0)'>"+
  "           ±0%"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 25)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>25"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 50)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>50"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 75)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>75"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 100)'>"+
  "           <span class='ivSlider__notch__plusMinusIndicator'>+</span>100"+
  "         </span>"+
  "       </span>"+
  "     </div>"+
  '     <div id="t'+t_no+'_ivSlider" class="ivSlider__holder" style="width: 12rem">'+
  '       <div id="t'+t_no+'_ivSlider_custom-handle" class="ui-slider-handle">'+
  '         <div class="custSlider-rail" />'+
  '       </div>'+
  '     </div>'+
  "   </div>"+
  "   <a href='javascript:void(0)' "+
  "     id='t"+t_no+"_ivSlider--updateBtn' "+
  "     onclick='ivChangeUpdate("+t_no+")' "+
  "     style='padding: 0.2em 0; text-decoration: none; visibility: hidden'"+
  "   >"+
  "      "+
  "     <span style='text-decoration: underline'>Update Calculation</span>"+
  "     <img src='"+WEB_PATH_STATIC+"images/icon-refresh.svg' width='14' height='14' valign='bottom' />"+
  "   </a>"+
  " </div>"+
  "</div>"+
  "<div class='fieldLabel' style='margin-left: 10px;'>"+
  "  <span class='inputLabelSmall'>Chart style</span>"+
  "  <div class='graphVisTypeIconCtnr'>"+
  "    <span onclick=\"changeOutputType('vis', 'matrix');\" class='graphVisTypeIcon"+(dispVis === 'matrix' ? ' __active' : '')+"' name='graphVisTypeIcon--matrix'>"+
        '<svg width="38" height="38" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
          <path d="M15.5 3V15.5H3" stroke="currentColor" stroke-opacity="0.36"/>\
          <rect opacity="0.7" x="3" width="13" height="3" fill="currentColor"/>\
          <rect opacity="0.7" x="0.5" y="3.5" width="2" height="12" fill="currentColor" stroke="currentColor"/>\
          <rect opacity="0.55" width="4" height="3" transform="matrix(-1 0 0 1 15 3)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 11 3)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 7 3)" fill="currentColor"/>\
          <rect opacity="0.9" width="4" height="3" transform="matrix(-1 0 0 1 15 6)" fill="currentColor"/>\
          <rect opacity="0.4" width="4" height="3" transform="matrix(-1 0 0 1 11 6)" fill="currentColor"/>\
          <rect opacity="0.25" width="4" height="3" transform="matrix(-1 0 0 1 7 6)" fill="currentColor"/>\
          <rect opacity="0.55" width="4" height="3" transform="matrix(-1 0 0 1 15 9)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 11 9)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 7 9)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 15 12)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 11 12)" fill="currentColor"/>\
          <rect opacity="0.4" width="3" height="3" fill="currentColor"/>\
        </svg>'+
  "    </span>"+
  "    <span onclick=\"changeOutputType('vis', 'line');\" class='graphVisTypeIcon"+(dispVis === 'line' ? ' __active' : '')+"' style='padding: 2px' name='graphVisTypeIcon--line'>"+
        '<svg width="33" height="28" viewBox="0 0 33 28" fill="none" xmlns="http://www.w3.org/2000/svg">\
        <path opacity="0.23" d="M31.624 14.484H0.624023" stroke="black"/>\
        <path opacity="0.23" d="M16.124 0.984009L16.124 27.984" stroke="black"/>\
        <path opacity="0.3" d="M32.0125 11C15.7744 11 9.86959 19.1818 1.01245 20" stroke="currentColor"/>\
        <path d="M31.4958 6.5H13.4125L7.21251 24.5H0.495847" stroke="currentColor"/>\
        </svg>'+
  "    </span>"+
    "</div>"+
  "</div>"+
  "</div>";

  var output = '';
  
  output += '<div class="graphToolbar graphToolbar--riskGraph">'+pre+'</div>';
  if (graphData['graph_type'].substr(0, 9) == 'riskGraph'){
    output += '<div class="graphCtnr"><div class="google_chart_holder" style="height:500px;"></div></div>\n\
      <script>\n\
      renderRiskGraph(results['+t_no+'], '+t_no+');\n\
      </script>';

  }else{
    output += '<div class="graphCtnr"><table class="graph" cellpadding="1" cellspacing="0">';
        //output += '<table class="graph" cellpadding="1" cellspacing="0">';
    var c = 0;
    var disCol = '';
    var disVal = '';
    var xCls, thr, thr2='', tdr, colDate, colDateM;
    var thrMonth = date('m', graphData.start_date);
    var thrSpan = 0;
    var xLast;

    var strikes = Object.keys(graphData.data).sort(function(a, b) {
      // descending
      var fa = parseFloat(a);
      var fb = parseFloat(b);
      return fa > fb ? -1 : fa < fb ? 1 : 0;
    });

    // var numDates = graphData.data[strikes[0]].length;
    // output += '<tr><td colspan="'+(numDates + 2)+'">' + pre + '</td></tr>';

    for (var xi = 0; xi < strikes.length; xi++) {
      var x = strikes[xi];

      if (c==0){
        thr = [[graphData.start_date, 0]];
        thr2 = '<tr><th>'+graphData.underlying_symb+'</th>';
      }

      var xRc = (xLast != undefined && xLast > graphData.underlying_current_price && x < graphData.underlying_current_price) ?
        "curPriceAbove" :
        (roundTo(x,2) == roundTo(graphData.underlying_current_price, 2) ? 'curPriceRow':'');


      tdr="<tr name='"+x+"'"+(xRc != '' ? " class='"+xRc+"'":'')+"><th class='x'>"+x+'</th>';

      var lastTs = Object.keys(graphData.data[x]);
      var lastT = lastTs[lastTs.length - 1];

      for (var t in graphData.data[x]){
        if (c==0){
          colDate = parseInt(graphData.start_date,10) + (3600*24) * t;
          colDateM = date('m', colDate);
          if (colDateM == thrMonth){
            thr[thr.length-1][1]++;
          }else{
            thr.push([colDate, 1]);
            thrMonth = colDateM;
          }

          if (t == lastT) {
            thr2 += '<th class="t z'+((thr.length-1)%2 +1)+'" name="'+t+'">Exp</th>';
            thr2 += '<th class="pct">+/-%</th>';
          } else {
            thr2 += '<th class="t z'+((thr.length-1)%2 +1)+'" name="'+t+'">'+date('j', colDate)+'</th>';
          }
        }

        // * round/format text to fit
        disVal = fmtNumToFit(getDisValByType(graphData, graphData.data[x][t].g));
        disCol = colorByDis(disVal, graphData.data[x][t].g, graphData);

        xCls = '';
        // * class/style
        if ((disVal.length ? disVal : disVal.toString()).length >= 4)// >= 1000 || disVal <= -100)
          xCls += ' four_digit';
          
        if ((disVal.length ? disVal : disVal.toString()).length >= 5)// >= 1000 || disVal <= -100)
          xCls += ' five_digit';

        tdr += "<td name='t"+t+"-x"+x+"' class='d"+xCls+" "+disCol+"'>"+(disVal)+'</td>';

        if (t == lastT) {
          tdr += '<td class="pct">' + roundTo(100 * (x - graphData.underlying_current_price) / graphData.underlying_current_price, 2, true) + '%</td>';
        }

        xLast = x;
        // !!! class+='p95t100' etc

      }

      if (c==0){
        output += "<tr><th>&nbsp;</th>"
        for(var i in thr){
          if (thr[i][1] > 0) {
            output += "<th colspan='"+(thr[i][1])+"' align='center' class='z"+((i%2) +1)+"'>"+date("M",thr[i][0])+"</th>";
          }
        }
        output += '<td>&nbsp;</td>';
        output += "</tr>";
        thr2 += '</tr>';

        output += thr2
      }

      tdr += "</tr>";
      output += tdr;

      c++;
    }

    output += "</table></div>";
    afterNote = "<p>Click a cell to view the trade's exit.</p>";

 /* <p>Figures are "+
      (graphData.graph_type == 'price' ? 'in dollar value: <strong>net profit or loss.</strong>' :
      (graphData.graph_type == 'roiRisk' ? ' <strong>percent (%) return</strong> of the maximum risk of the trade (-100 is maximum risk)' :
      (graphData.graph_type == 'roiInit' ? ' <strong>percent (%) return</strong> of the initial outlay of the trade (-100 is initial outlay)' : '')))
      +"</p>";*/

  }
  var stockRangeWidth = Math.min(Math.round(graphData.graph_priceMax || 0).toString().length + 5, 8);
  output += "<div style='display: flex; margin-top: 5px'>"+
    " <div class='fieldLabel'>"+
    "   <span class='inputLabelSmall'>Stock price range</span>"+
    '   <div>'+
    '     $<input data-app-inputset="priceRange" placeholder="auto" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" inputmode="decimal" '+
    "       id=\""+t_no+"_graph-priceMin-quick\" name=\"graph-priceMin-quick\" value=\""+roundTo(graphData.graph_priceMin, 2)+"\" "+
    "       onchange=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       onkeyup=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       class=\"inputWithDollar inputNumeric input\" style=\"width: "+stockRangeWidth+"ch\""+
    "       onblur=\"graphRangeChange('min', "+t_no+", event);\" />" +
    '     &hyphen;<input data-app-inputset="priceRange" placeholder="auto" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" inputmode="decimal" '+
    "       id=\""+t_no+"_graph-priceMax-quick\" name=\"graph-priceMax-quick\" value=\""+roundTo(graphData.graph_priceMax, 2)+"\" "+
    "       onchange=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       onkeyup=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       class=\"inputWithDollar inputNumeric input\" style=\"width: "+stockRangeWidth+"ch\""+
    "       onblur=\"graphRangeChange('max', "+t_no+", event);\" />" +
    // "     <input type=\"hidden\" id=\"t"+t_no+"_graph-rangeAuto\" name=\"graph-rangeAuto\" value=\""+(graphData.graph_rangeAuto ? '1' : '0')+"\" />"+
    "     <input type=\"hidden\" id=\"t"+t_no+"_graph-rangeShouldUpdate\" name=\"graph-rangeShouldUpdate\" value=\"0\" />"+
    "   </div>"+
    "   <div id='t"+t_no+"_graph-rangeUpdate' style='visibility: hidden'>" +
    "     <a href='javascript:void(0)' onClick='updatePriceRange("+t_no+")') style='padding: 0.2em 0; text-decoration: none'><span style='text-decoration: underline'>Update price range</span>"+
    "       <img src='"+WEB_PATH_STATIC+"images/icon-refresh.svg' width='14' height='14' valign='bottom' /></a>" +
    "   </div>"+
    "</div>"+
    "<div class='fieldLabel' style='margin-left: 5px;'>"+
    "  <label class='inputLabelSmall'>Chart values <a href='#' onclick='alert(\"Changes how the trade is represented in the table or graph... \\n\\n% of maximum risk.: Percentage of the maximum risk of the trade, where -100 is the maximum risk, and 100 is 100% return compared to the maximum risk. \\n\\n% of entry: Percentage of the entry cost of the trade, where -100 is no return from your initial investment, and 100 is 100% return compared to the entry cost.  Note: if opening the trade results in a credit, % of maximum risk is used instead.\\n\\nDollar value: Profit or loss in net dollar value.\\n\\nOption/Spread value: shows the value of the purchased option, or the spread, without multiplying x100 for each contract.\");return false;' class='help'>?</a></label>"+
    "  <div>"+
    "    <select name='graph-typeChange' id='t"+t_no+"_graph-typeChange' class='input noLeftMargin' onchange='changeOutputType(\"val\", this);' style='margin-right:5px'>"+
    "       <option value='roiRisk'"+(graphData.graph_type == 'roiRisk' || graphData.graph_type == 'riskGraph' ? ' selected':'')+">% of maximum risk</option>"+
    "       <option value='roiInit'"+(graphData.graph_type == 'roiInit' || graphData.graph_type == 'riskGraphInit' ? ' selected':'')+">% of entry cost</option>"+
    "       <option value='price'"+(graphData.graph_type == 'price' || graphData.graph_type == 'riskGraphPrice' ? ' selected':'')+">$ Profit/loss</option>"+
    "       <option value='rawValue'"+(graphData.graph_type == 'rawValue' || graphData.graph_type == 'riskGraphRawValue' ? ' selected':'')+">Option/spread value</option>"+
    "       </optgroup>"+
    "    </select>"+
    "  </div>"+
    "</div>"+
    "</div>";

  output += afterNote;

  return [output, initGraph];
}

function updatePriceRange(tNo) {
  $('#t'+tNo+'_graph-priceMin-val').val($('#'+tNo+'_graph-priceMin-quick').val());
  $('#t'+tNo+'_graph-priceMax-val').val($('#'+tNo+'_graph-priceMax-quick').val());
  $('#t'+tNo+'_submit').click();
}

function graphRangeChange(minOrMax, tNo, changeEvent) {
  if (changeEvent.relatedTarget && (changeEvent.relatedTarget.attributes['data-app-inputset'] || {}).value !== 'priceRange') {
    $('#t'+tNo+'_graph-rangeShouldUpdate').val('1');
  }
  $('#t'+tNo+'_graph-rangeShouldUpdate').val('0');
}

function changeOutputType(field, selectEleOrVal){
  var chartValue, dispVis;
  if (field === 'vis') {
    chartValue = $('#t'+curTab+'_graph-typeChange').val();
    dispVis = selectEleOrVal;
  } else if (field === 'val') {
    chartValue = initType = $(selectEleOrVal).val();
    dispVis = $('#t'+curTab+'_graph-type').val().indexOf('riskGraph') === 0 
      ? 'line' : 'matrix';
  }
  var type = ({
    matrix: {
      roiRisk: 'roiRisk',
      roiInit: 'roiInit',
      price: 'price',
      rawValue: 'rawValue',
    },
    line: {
      roiRisk: 'riskGraph',
      roiInit: 'riskGraphInit',
      price: 'riskGraphPrice',
      rawValue: 'riskGraphRawValue',
    }
  }[dispVis] || {})[chartValue] || 'roiRisk';

  $('#t'+curTab+'_graph [name=graphVisTypeIcon--'+dispVis+']').addClass('active');

  _opcGaq.push(['_trackEvent', 'Change Output type', type]);

  ajaxRequest('', 'updatePreferredDisplayType', { type: type }, function() {});

  var r = results[curTab];

  type = checkForceGraphType(type, r);

  results[curTab]['graph_type'] = type;
  $('#t'+curTab+'_graph-type').val(type);

  renderResults(curTab, { noScroll: true });
  updateStratAdStickiness();
}

function updatePreferredDisplayType(el) {
  if (el.value) {
    ajaxRequest('', 'updatePreferredDisplayType', { type: el.value }, function() {});
  }
}

function checkForceGraphType(type, r){
  // real graph type...
  if (r.summary.maxrisk.g !== 'u' && r.summary.maxrisk.g + r.initial.g < 0){
    if (
      type == 'roiRisk' || 
      (type == 'roiInit' && r.initial.g >= 0)
    ) {
      if (type == 'roiInit' && r.initial.g >= 0)
        addMsg('Opening trade is a credit – Showing ROI on max risk');
      type = 'roiRisk';

    } else if (
      type == 'riskGraph' ||
      (type == 'riskGraphInit' && r.initial.g >= 0)
    ) {
      if (type == 'riskGraphInit' && r.initial.g >= 0)
        addMsg('Opening trade is a credit – Showing ROI on max risk');
      type = 'riskGraph';
    }

  } else if (r.summary.maxrisk.g === 'u' && r.initial.g < 0){ // Debit entry
    if (type == 'roiInit' || type == 'roiRisk'){
      if (type == 'roiRisk')
        addMsg('Max risk is unlimited – Showing ROI on initial cost')
      type = 'roiInit';
    } else if (type == 'riskGraph' || type == 'riskGraphInit') {
      if (type == 'riskGraph');
        addMsg('Max risk is unlimited – Showing ROI on initial cost')
      type = 'riskGraphInit';
    }

  } else if (r.initial.g >= 0) { // Credit entry
    if (['riskGraph', 'roiRisk'].includes(type)) {
      addMsg('Max risk is unlimited – Showing values as $P/L');
    } else if (['riskGraphInit', 'roiInit'].includes(type)) {
      addMsg('Opening trade is a credit – Showing values as $P/L');
    }
    if (['riskGraph', 'riskGraphInit'].includes(type)) {
      type = 'riskGraphPrice';
    }else if (['roiRisk', 'roiInit'].includes(type)) {
      type = 'price';
    }
  }
  return type;
}

function getDisValByType(graphData, g){
  var retVal;
  if (graphData.graph_type == 'rawValue' || graphData.graph_type == 'riskGraphRawValue')
    retVal = g / 100;
  if (graphData.graph_type == 'price' || graphData.graph_type == 'riskGraphPrice')
    retVal = graphData.initial.g + g;
  else if (graphData.graph_type == 'roiRisk' || graphData.graph_type == 'riskGraph')
    retVal = 100*(graphData.initial.g + g)/(-graphData.initial.g - graphData.summary.maxrisk.g);
  else if (graphData.graph_type == 'roiInit'|| graphData.graph_type == 'riskGraphInit')
    retVal = 100*(graphData.initial.g + g)/-graphData.initial.g;
  return isNaN(retVal) ? "N/A" : retVal;
}
function colorByDis(disVal, g, graphData){
  if ((disVal+"").substr(disVal.length-1) == 'K') disVal = 1000* parseFloat(disVal.substr(0, disVal.length-1));

  if (graphData.graph_type == 'price' || graphData.graph_type == 'rawValue'){ // will be forced to be this if maxrisk == 'u'
    if (graphData.summary.maxrisk.g === 'u')
      return 'p'+Math.max(-100,Math.min(200,Math.round(20*(graphData.initial.g + g)/(graphData.initial.g + graphData.summary.maxprofit.g))*5));
    if (graphData.summary.maxrisk.g + graphData.initial.g >= 0)
      return 'p'+Math.max(-100,Math.min(200,Math.round(20*(graphData.initial.g + g)/(graphData.summary.maxprofit.g + graphData.initial.g))*5));
    if (g == graphData.summary.maxrisk.g)
      return 'maxRisk';
    else return 'p'+Math.max(-100,Math.min(200,Math.round(20*(graphData.initial.g + g)/(-graphData.initial.g - graphData.summary.maxrisk.g))*5));
  }else if (graphData.graph_type == 'roiRisk' ){
    if (g == graphData.summary.maxrisk.g)
      return 'maxRisk';
    else return 'p'+Math.max(-100,Math.min(200,Math.round(disVal/5)*5));
  }else if (graphData.graph_type == 'roiInit'){
    if (g == 0)
      return 'maxRisk';
    else return 'p'+Math.max(-100,Math.min(200,Math.round(disVal/5)*5));
  }
}

function getSummary(results){
  // this is duplicated as server-side-rendered function graph.inc.php:getSummaryHTML()
  var s = results.summary;

  var noDays;
  for (var i in results.risk)
    noDays = i;

  var filteredMaxRiskTime = !(typeof(s.maxrisk.time) == 'object' && s.maxrisk.time instanceof Array) 
    ? s.maxrisk.time 
    : removeArrayDupes(s.maxrisk.time);

  filteredMaxRiskTime = !(typeof(filteredMaxRiskTime) == 'object' && filteredMaxRiskTime instanceof Array) || filteredMaxRiskTime.length > 1
    ? filteredMaxRiskTime 
    : filteredMaxRiskTime[0];

  var filteredMaxProfitTime = !(typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array) 
    ? s.maxrisk.time 
    : removeArrayDupes(s.maxrisk.time);

  filteredMaxProfitTime = !(typeof(filteredMaxProfitTime) == 'object' && filteredMaxProfitTime instanceof Array) || filteredMaxProfitTime.length > 1
    ? filteredMaxProfitTime 
    : filteredMaxProfitTime[0];
  
  // !!! graph display values (roi / dollars)
  if (typeof(filteredMaxRiskTime) == 'object' && filteredMaxRiskTime instanceof Array)
    var maxRiskDays = ' on days '+descNumList(filteredMaxRiskTime);
  else if (filteredMaxRiskTime == noDays)
    var maxRiskDays = '';
  else if (filteredMaxRiskTime !== undefined)
    var maxRiskDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxrisk.time *60*60*24), -5);
  else
    var maxRiskDays = '';
  //nyDateFromTime('jS M Y',$results['start_date']+(($s['maxrisk']['time']) * 60*60*24 ));

  if (typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array)
    var maxProfitDays = ' on days '+descNumList(s.maxprofit.time);
  else if (s.maxprofit.time == noDays)
    var maxProfitDays = '';
  else if (s.maxprofit.time !== undefined)
    var maxProfitDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxprofit.time *60*60*24), -5);//+s.maxprofit.time;
  else 
    var maxProfitDays = '';

  function spanRed($str, $strong) {
    return "<span style='color:#900;"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  function spanGreen($str, $strong) {
    return "<span style='color:#370;"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  function spanBlk($str, $strong) {
    return "<span style='"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  
  var mP = s.maxrisk.g > -results.initial.g;
  var fmtRisk = formatPrice(Math.abs(s.maxrisk.g + results.initial.g));
  var maxRiskString = (s.maxrisk.g === 'u'
    ? spanRed('infinite', true)+' <span class="minor">(on upside)</span>' 
    : (s.maxrisk.p === 'i' 
      ? spanRed(fmtRisk) + ' <span class="minor">(on upside)</span>' 
      : spanRed(
        '<span'+(mP ? ' style="color:#370;font-weight:bold;">+':'>')+
        fmtRisk+"</span>"
      ) + " <span class='minor'>(at "+(results.underlying_symb)+
      formatPrice(s.maxrisk.p)+maxRiskDays + ")</span>"
    )
    + (s.maxrisk.g + results.initial.g >= 0
      ? '<br/><span class="minor">(calculator found no risk.  This can be due to low or high implied volatility, or out of date prices)</span>'
      : ''
    ));
    
  var mPRoi = s.maxprofit.g === 'u' || s.maxprofit.g + results.initial.g <= 0  ? null 
    : s.maxrisk.g === 'u' ? 0
    : (s.maxprofit.g + results.initial.g) / -(s.maxrisk.g + results.initial.g);
  var mPRoiDesc = mPRoi === null ? null
    : roundTo(mPRoi*100, mPRoi*100 >= 10 ? 1 : 2) + '%';
  
  var daysColumns = Object.keys(results.data[Object.keys(results.data)[0]]);
  var timeTilExp = daysColumns[daysColumns.length - 1] / 365;
  var mPRoiAnn = mPRoi === null ? null : mPRoi / timeTilExp;
  var mPRoiAnnDesc = mPRoiAnn === null ? null
    : mPRoiAnn*100 > 100000 ? '+100000%'
    : roundTo(mPRoiAnn*100, mPRoiAnn >= 1 ? 0 : mPRoiAnn >= 0.1 ? 1 : 2) + '%';
  
  mP = s.maxprofit.g < -results.initial.g;
  var fmtProfit = formatPrice(Math.abs(s.maxprofit.g + results.initial.g));
  var maxProfitString = (s.maxprofit.g === 'u'
    ? spanBlk('infinite')+' <span class="minor">(on upside)</span>' 
    : (s.maxprofit.p === 'i' 
      ? spanBlk(fmtProfit) + ' <span class="minor">(on upside)</span>' 
      : spanBlk(
        '<span'+(mP ? ' style="color:#F00;">-':'>')+
          fmtProfit+
        "</span>"
      ) + " <span class='minor'>(at "+(results.underlying_symb)+
        formatPrice(s.maxprofit.p)+maxProfitDays + ")</span>"
    )
    + (s.maxprofit.g + results.initial.g <= 0 
      ? '<br/><span class="minor">(calculator found no positive profit.  This can be due to low or high implied volatility, or out of date prices)</span>'
      : ''
    ));

  var maxRoRString = mPRoiAnnDesc === null || s.maxprofit.g === 'u' || s.maxrisk.g === 'u' ? 'N/A'
    : mPRoiDesc+" ("+mPRoiAnnDesc+" ann.)";

  var hasPop = !!(s.PoP || {}).pop;
  var popString = hasPop ? roundTo((s.PoP || {}).pop * 100, 1)+'%' : '';

  for (var i in results.breakeven){}

  var beExpString = "$"+implode(", $", results.breakeven[i]);

  mP = results.initial.g < 0;
  var outlayString ='<span style="'+(mP ? 'color:#900;':'color:#370;')+'">'+
    formatPrice(Math.abs(results.initial.g))+"</span>"+
    "<span class='minor'>"+(mP? '': ' net credit') + "</span>";

  var summary =
    "<p class='asAt minor'>As at "+date("jS M Y", results.start_date)+" ("+results.underlying_symb+" "+formatPrice(results.underlying_current_price)+")</p>"+
    "<p>Entry " + (mP ? "cost" : "credit") +": "+outlayString+" <a href='#' class='subtle initDetail' onclick='showInitDetails(this); return false;'>see details</a></p>"+
    "<p><span class='hideTabPlus'>Max</span> <span class='hideMobile'>Maximum</span> risk: "+ maxRiskString+"</p>"+
    "<p><span class='hideTabPlus'>Max</span> <span class='hideMobile'>Maximum</span> return: "+maxProfitString+"</p>"+
    (!maxRoRString ? '' : '<p>Max return on risk: '+maxRoRString+'</p>')+
    "<p>Breakevens at expiry: "+beExpString+"</p>"+
    (hasPop ? "<p>Probability of profit: "+popString+" <a href='#' onclick='alert(\"Probability of returning at least $0.01 at the time of expiry.  This figure is derived from 30 day Implied Volatility.\");return false;' class='help'>?</a></p>" : "");

  return summary;
}

function showInitDetails(link){
  var tNo = $(link).parents(".stratContent").attr('id')
  tNo = tNo.substr(6, tNo.lastIndexOf('_'));

  $('#t'+tNo+'_graph-detail').html('').dialog('option','title','Detail: Entry cost');
  if (viewStyle == 'mobile'){
    var ww = $(window).width(),
        wh = $(window).height();
    // $('#t'+tNo+'_graph-detail').dialog('option', {width: ww-5, height:wh-5});
  }
  $('#t'+tNo+'_graph-detail').html('').dialog('open');
  $('#t'+tNo+'_graph-detail').html(getCellSummary(tNo, results[tNo]['initial'], true));

}

function graph_listen(tCall, foreignEle, localEle){
  if (tCall == 'underlying_symbol'){
    $('#t'+localEle.tab_num+'_graph-date').val('');
    $('#t'+localEle.tab_num+'_graph-priceMin-val').val('');
    $('#t'+localEle.tab_num+'_graph-priceMax-val').val('');
    $('#'+localEle.tab_num+'_graph-priceMin-quick').val('');
    $('#'+localEle.tab_num+'_graph-priceMax-quick').val('');
  }
}

function initResults(tNo){
  $('#t'+tNo+'_graph').prepend('<div class="popup" id="t'+tNo+'_graph-detail"></div>');

  var ww = $(window).width(),
      wh = $(window).height();

  var dialogOptions = {
    autoOpen:false,
    position: { at: 'right top' },
    dialogClass: "detailPopup",
    title:'Detail',
    maxHeight: 300,
    minHeight: 120,
    width: (ww < 450 ? ww : 450),
    draggable: viewStyle !== 'mobile',
    create: function (event) {
      $(event.target).parent().css('position', 'fixed');
      $(event.target).parent().css('bottom', '0 !important');
    }
  };
  if (viewStyle == 'mobile'){
    dialogOptions.width = ww;
    dialogOptions.resizable = false;
    dialogOptions.position = { at: 'center bottom' };
  }

  try {
    $('#t'+tNo+'_graph-detail').dialog("close");
  } catch (e) {}
  $('#t'+tNo+'_graph-detail').dialog(dialogOptions);

  $('th.t:last-child').hover(
    function(){
      $(this).addClass('hover');
      $(this).append("<div class='hover'>At&nbsp;expiry</div>");

    },
    //$(this).mouseout(
    function(){
      $(this).removeClass('hover');
      $('.hover', this).remove();
    }
  );
  // *** DATA CELLS ***
  $('#t'+tNo+'_graph table td.d').each(function(){
    $(this).html("<div><a href='#' class='subtle'>"+$(this).html()+"</a></div>");
    var thisName = $(this).attr('name');
    var t = thisName.substring(1, thisName.indexOf('-x'));
    var x = thisName.substring(thisName.indexOf('-x')+2);

    $(this).hover(function(){
      $(this).addClass('hover');
      var dis, disDollars, disPerc, disValPerc;
      var lcGraphType = results[curTab].graph_type.toLowerCase();
        disDollars = lcGraphType.indexOf('rawvalue') >= 0
        ? '$'+roundTo(results[curTab].data[x][t].g / 100,2,true)
        : '$'+roundTo(results[curTab].data[x][t].g + results[curTab].initial.g,2,true);
      disValPerc = getDisValByType(
        $.extend({}, results[curTab], {
          graph_type: lcGraphType.indexOf('price') >= 0 || lcGraphType.indexOf('rawvalue') >= 0
            ? 'roiRisk'
            : results[curTab].graph_type
        }),
        results[curTab]['data'][x][t].g
      );
      disPerc = typeof disValPerc == 'number'
        ? roundTo(disValPerc, Math.abs(disValPerc) < 100 ? (Math.abs(disValPerc) < 10 ? 2: 1): 0)+"%"
        : disValPerc;
      dis = lcGraphType.indexOf('price') >= 0
        ? disDollars+(disPerc !== 'N/A' ? '<br/>('+disPerc+')' : '')
        : lcGraphType.indexOf('rawvalue') >= 0
        ? disDollars+'<br/>('+disPerc+')'
        : disPerc+'<br/>('+disDollars+')';
      $('a', this).append("<div class='hover'>"+dis+"</div>");

    },
    function(){
      $(this).removeClass('hover');
      var t = thisName.substring(1, thisName.indexOf('-x'));
      var x = thisName.substring(thisName.indexOf('-x')+2);
      $('a', this).html(fmtNumToFit(getDisValByType(results[curTab], results[curTab]['data'][x][t].g)));
    });
    $('div a', this).click(function(){
      var t = thisName.substring(1, thisName.indexOf('-x'));
      var x = thisName.substring(thisName.indexOf('-x')+2);

      var theTime = parseInt(results[tNo]['start_date'],10) + (3600*24) * parseInt(t,10);

      $('#t'+tNo+'_graph-detail').html('').dialog('option','title','Detail: $'+roundTo(x, 2, 1)+ " on " +date('jS M Y',theTime));
      $('#t'+tNo+'_graph-detail').html('').dialog('open');
      // if (viewStyle == 'mobile'){
      //   var ww = $(window).width(),
      //       wh = $(window).height();
      //   $('#t'+tNo+'_graph-detail').dialog('option', {width: ww-40, height:wh-30});
      // }
      $('#t'+tNo+'_graph-detail').html(getCellSummary(curTab, results[curTab]['data'][x][t]));
      return false;
    })
    // !!! TAKE color class from td
  });

  // *** DAY (HEADER) CELLS ***
  /*$('#t'+tNo+'_graph table th.t').each(function(){
    $(this).html("<div><a href='#' name='"+$(this).html()+"' class='subtle'>"+$(this).html()+"</a></div>");
    $(this).mouseover(function(){
      $(this).addClass('hover');
      var a = $('a', this);

      //var theDate = new Date();
      var theTime = parseInt(results[tNo]['start_date'],10) + (3600*24) * parseInt(a.parent().parent().attr('name'),10);
      // theTime should be 9am EST, but it's going to be the same date in NY so it doesn't matter
      a.html(date('jS M Y',theTime));//+'<br/>9am EST'
    });
    $(this).mouseout(function(){
      $(this).removeClass('hover');
      var a = $('a', this);
      a.html(a.attr('name'));

    });
    $(this).click(function(){
      // !!! day summary
      return false;
    });
  });*/
}

function getCellSummary(tNo, d, isInit){

  var lines = [];// array of arrays [act, number, desc, each, total (absolute)]
  var desc, opType, exp, symb, o, amt, buyMult, num, price;
  var total = 0;

  if (d['S'] != undefined)
  for(var i in d['S']){
    o = d['S'][i];
    buyMult = o.a == 'buy' ? -1:1;
    num = parseInt($('#strat_'+tNo+' [name="'+i+'-num"]').val());
    amt = o.T != undefined ? parseFloat(o.T) : buyMult* parseFloat(num)*price;
    price = o.p != undefined ? parseFloat(o.p) : amt / num; //$('#strat_'+tNo+' [name="'+i+'-curPrice"]').val();
    symb = $('#strat_'+tNo+' [name="'+i+'-symbol"]').val();
    total += amt;
    lines.push([o.a, num, symb+" stocks", roundTo(price,2,true,false), roundTo(amt,2,true,false)]);
  }
  if (d['O'] != undefined)
  for(var i in d['O']){
    o = d['O'][i];
    buyMult = o.a == 'buy' ? -1:1;
    amt = o.T != undefined ? parseFloat(o.T) : buyMult* parseFloat(o.n)*100*o.p;
    opType = $('#strat_'+tNo+' [name="'+i+'-opType"]').val();
    exp = $('#strat_'+tNo+' [name="'+i+'-expiry"]').val();
    desc = dateFromYMD('j<\\s\\up>S</\\s\\up> M'+(dateFromYMD('Y',exp) == date('Y') ? '' : ' Y'), exp)+' $'+o.X+' '+(opType == 'c'?'Call':'Put');
    total += amt;
    lines.push([o.a, o.n+"x100", desc, roundTo(o.p,2,true,false), roundTo(amt,2,true,false)]);
  }
  if (d['C'] != undefined)
  for(var i in d['C']){
    o = d['C'][i];
    amt = o.T;
    var adesc = o.a === 'buy' ? 'Cash held' : 'Cash released';
    total += amt;
    lines.push([adesc, "", "", undefined, roundTo(amt,2,true,false)]);
  }
  var str='<table class="trade_summary" cellpadding="1" cellspacing="0"><tr><th>Trades to '+(isInit?'open':'close')+' position</th><th>No.</th><th>Price</th><th>Total</th></tr>'
  for(i = 0; i<lines.length; i++)
    str+= "<tr><td align='left'>"+ucFirst(lines[i][0])+" "+lines[i][2]+"</td><td align='right'>"+lines[i][1]+"</td><td align='right'>"+(lines[i][3] ? "$"+lines[i][3] : "")+"</td><td align='right'>$"+lines[i][4]+"</td></tr>";

  str+= (lines.length > 1 ? "<tr class='subtotal'><td align='left'>Total"+(isInit?"":" (closing trade)")+"</td><td colspan='3' align='right'>$"+roundTo(total,2,true,false)+"</td></tr>" : "");

  if (isInit !== true){
    var grandTotal = results[tNo].initial.g + total;
    str +=
      "<tr class='init'><td align='left'>Entry cost</td><td colspan='3' align='right'>$"+roundTo(results[tNo].initial.g,2,true,false)+"</td></tr>"+
      "<tr class='total'><td align='left'>Total</td><td colspan='3' align='right'>$"+roundTo(grandTotal,2,true,false)+"</td></tr>";
  }
  return str+"</table>";
}

function fmtNumToFit(disVal){
  if (isNaN(disVal)) return "N/A";
  if (disVal >= 100 || disVal <= -10) disVal = roundTo(disVal);
  else if (disVal >= 10 || (disVal > -10 && disVal < 0)) disVal = roundTo(disVal, 1);
  else if (disVal < 10) disVal = roundTo(disVal, 2);
  if (disVal <= -1000 && disVal > -10000) disVal = "<span class='neg'>-</span>"+(-disVal);
  if (Math.abs(disVal) >= 10000) disVal = roundTo(disVal / 1000,1)+"K";
  return disVal
}

function getLinkBut(self){
  return $('.linkBox', $(self).parent()).slideDown();
}
function closeLinkBox(self){
  return $(self).parent().slideUp();
}

function closeCurrentTabs() {
  $('#tab_holder_tabs').removeClass('--show');
  $('#invisible_shield').hide();
  $('#invisible_shield').unbind('click', closeCurrentTabs);
}

/** initial **/
$(document).ready(function(){
  $('.touch #current_calc_header').click(function() {
    if (!$('#tab_holder_tabs').hasClass('--show')) {
      setTimeout(function () {
        $('#invisible_shield').bind('click', closeCurrentTabs);
      }, 10)
      $('#tab_holder_tabs').addClass('--show');
      $('#invisible_shield').show();
    } else {
      $('#tab_holder_tabs').removeClass('--show');
      $('#invisible_shield').hide();
    }

  });
  $('#strat_F').length && $('#top_menu .id-optionFinder, #strat_F_button').click(function() {
    $('#calcs_holder .jq_exclusive_target').hide();
    $('#top_but-calculator').hide();
    $("#top_menu .dialog_tab").removeClass("dialog_tab_selected");
    $("#top_menu .dialog_tab:not(.id-optionFinder)").removeClass("--active");
    $("#top_menu .dialog_tab.id-optionFinder").addClass("--active");
    $('#tab_holder_tabs .dialog_tab').removeClass('dialog_tab_selected');
    $('#strat_F_button').addClass('dialog_tab_selected');
    setTimeout(
      function() { $('#strat_F').show(); },
      100
    );
    return false;
  });
  $('.id-calculator a').click(function() {
    $("#top_menu .dialog_tab").removeClass("dialog_tab_selected");
    $("#top_menu .dialog_tab:not(.id-calculator)").removeClass("--active");
    $("#top_menu .dialog_tab.id-calculator").addClass("--active");
  });
 /* $('.popTarget').hide();
  $('.popTrigger').click(function(){
    $('.popTarget', $(this).parent()).slideDown();
  });
  $('.popClose').click(function(){
    $(this).parent().slideUp();
  });*/
  //$('.msg')
});


function add_opSelector_dialog(eleId){
  var ww = $(window).width(),
      wh = $(window).height(),
      dialogOptions = {
        autoOpen:false,
        modal:true,
        title:'Choose an option',
        open: function(){
          // * 'fadeTo(0,0.5) for IE - needs to be an inline style to work
          $('.ui-widget-overlay').fadeTo(0, 0.2).hide().fadeIn().click(function() {
            $('#'+eleId+'-option_selector').dialog('close');
          });
        },
        create: function (event) {
          $(event.target).parent().css('position', 'fixed');
        },
        position: { at: 'right-25 top+25' },
        dialogClass: "dialog-fixed dialog-optionSelector",
        height: wh-50,
        width: (600 > ww ? ww : 600),
        show: {effect:'fade', duration:200},
        hide: {effect:'fade', duration:200},
        // ** this is all so the overlay (background) fades out **
        beforeClose: function(event, ui){
          /*$('#'+eleId+'-option_selector').parent().fadeOut();
          $('.ui-widget-overlay').show().fadeOut(300, function(){
            jQuery.ui.dialog.overlay.destroy(jQuery.ui.dialog.overlay.instances[0]);
            $('#'+eleId+'-option_selector').dialog('close');
          });
          return !jQuery.ui.dialog.overlay.instances[0];*/
        }
      };
  if (viewStyle == 'mobile'){
    dialogOptions.width = ww;
    dialogOptions.height = wh;
    dialogOptions.show = null;
    dialogOptions.hide = null;
    dialogOptions.modal = true;
    dialogOptions.position = { at: 'left top' };
    dialogOptions.draggable = false;
  }
  $('#'+eleId+'-option_selector').dialog(dialogOptions);
}

function ele_option_listen(tCall, foreignEle, localEle){
  // underlying symbol changed?  remove price, and option strike
  if (tCall == 'underlying_symbol'){
		$('#'+localEle.ele_id+'-price').val('');
		$('#'+localEle.ele_id+'-marketPrice').val('');
		$('#'+localEle.ele_id+'-lastPrice').val('');
		$('#'+localEle.ele_id+'-strike').val('');
		$('#'+localEle.ele_id+'-expiry').val('');
		$('#'+localEle.ele_id+'-option_selector').html(loadingHtml);
    $('#'+localEle.ele_id+'-opDesc').text('');
    $('#'+localEle.ele_id+'-opDesc').removeClass('option-description--has-content');
    $('#'+localEle.ele_id+'-option .select-button--full').removeClass('select-button--hidden');
    $('#'+localEle.ele_id+'-option .select-button--compressed').addClass('select-button--hidden');
    $('#'+localEle.ele_id+'-iv').val('');
    // not sure if this call is needed:
    getOptions({eleId:localEle.ele_id, uEleId:foreignEle.ele_id});
	}
  else if (tCall == 'underlying_num'){
    var contracts = Math.round(parseInt($('#'+foreignEle.ele_id+'-num').val())/100);
    if (isNaN(contracts)) contracts = '';
		$('#'+localEle.ele_id+'-num').val(contracts);
	}
  else if (tCall == 'option_num'){
    if (localEle.linked_ele != undefined && localEle.linked_ele == foreignEle.ele_name){
      var updateIt = localEle.strict || $('#'+localEle.ele_id+'-num').val() == localEle.default_num;// || $('#'+localEle.ele_id+'-num').val() == oldOpVals_num[foreignEle.ele_id]
      if (updateIt)
        $('#'+localEle.ele_id+'-num').val($('#'+foreignEle.ele_id+'-num').val()*localEle.link_ratio);
    }
    //triggerListener('option_num', foreignEle);
  }
  else if (tCall == 'option'){
    $('#'+localEle.ele_id+'-iv').val('');
    if ($('#'+localEle.ele_id+'-expiry').val() == "")
        $('#'+localEle.ele_id+'-expiry').val(
          $('#'+foreignEle.ele_id+'-expiry').val()
        );
  }
  if (tCall == 'option_price' || tCall == 'option_num'){
		var cost = $('#'+foreignEle.ele_id+'-num').val() * $('#'+foreignEle.ele_id+'-price').val() ;
    $('#'+foreignEle.ele_id+'-cost').val(isNaN(cost) ? '' : commaVal(roundTo(cost*100,2,true)));
    triggerListener('option_cost', foreignEle);
    if (localEle.linked_ele != undefined && localEle.linked_ele == foreignEle.ele_name){ 
      var cost = $('#'+localEle.ele_id+'-num').val() * $('#'+localEle.ele_id+'-price').val();
      $('#'+localEle.ele_id+'-cost').val(isNaN(cost) ? '' : commaVal(roundTo(cost*100,2,true)));
    }
  }
}

function ele_spread_listen(tCall, foreignEle, localEle){
  var net = 0;
  var num = false;
  for(var i in localEle.op_ele_ids){
    net += $('#'+ localEle.op_ele_ids[i]+'-price').val() * ($('#'+ localEle.op_ele_ids[i]+'-num').val() || 1)
     * ($('#'+ localEle.op_ele_ids[i]+'-act').val() == 'sell' ? 1: -1);
    if (num === false) num = $('#'+ localEle.op_ele_ids[i]+'-num').val();
    else if (num !== $('#'+ localEle.op_ele_ids[i]+'-num').val()) num = -1;
  }

  $('[for='+localEle.ele_id+'-spread]').text(num === -1
    ? 'Trade cost:'
    : 'Spread price:');
  var cost = num === -1 ? net * 100 : net;
  $('#'+localEle.ele_id+'-spread').html(roundTo(cost, 2, true) + " (net " + (net >= 0 ? "credit":"debit") + ")");
  $('#'+localEle.ele_id+'-spread').css("color", net >= 0 ? 'black':'red');
}

function ele_stockAndUnderling_listen(tCall, foreignEle, localEle){
  if (tCall == 'underlying_symbol'){
    $('#'+localEle.ele_id+'-price').val('');
    $('#'+localEle.ele_id+'-curPrice').val('');
    $('#'+localEle.ele_id+'-marketPrice').val('');
    $('#'+localEle.ele_id+'-lastPrice').val('');
    $('#'+localEle.ele_id+'-ivHist').val('');
    $('#'+localEle.ele_id+'-updatePriceTime').val('');
    //$('#'+localEle.ele_id+'-curPriceDisp').val('');
    getPrice({eleId:localEle.ele_id, button:localEle.ele_id+'-loading'});
    triggerListener('underlying_price', foreignEle);
  } else if (tCall == 'underlying_price') {
    console.log('*')
  }
  triggerListener('underlying', foreignEle, localEle);
}
function ele_stock_listen(tCall, foreignEle, localEle){
  // calculate total cost from price x num
	if (tCall == 'underlying_price' || tCall == 'underlying_num'){
		var cost = $('#'+foreignEle.ele_id+'-num').val() * $('#'+foreignEle.ele_id+'-price').val() ;
    $('#'+foreignEle.ele_id+'-cost').val(isNaN(cost) ? '' : commaVal(roundTo(cost,2,true)));
    triggerListener('underlying_cost', foreignEle);
	}
  ele_stockAndUnderling_listen(tCall, foreignEle, localEle);
 }
function ele_underlying_listen(tCall, foreignEle, localEle){
  ele_stockAndUnderling_listen(tCall, foreignEle, localEle);
}

function graph_price_range_listen(tCall, foreignEle, meta) {
  $('#t'+meta['tab_num']+'_graph-rangeAuto').val('0');
  $('#t'+meta['tab_num']+'_graph-rangeShouldUpdate').val('1');
  $('#t'+meta['tab_num']+'_graph-rangeUpdate').css('visibility', 'visible');
}

$(window).scroll(function () {
  return true;
});

$(document).ready(function() {
  updateStratAdStickiness()
})/*! jQuery UI - v1.12.1 - 2021-07-15
* http://jqueryui.com
* Includes: widget.js, position.js, data.js, disable-selection.js, focusable.js, form-reset-mixin.js, keycode.js, labels.js, scroll-parent.js, tabbable.js, unique-id.js, widgets/draggable.js, widgets/resizable.js, widgets/autocomplete.js, widgets/button.js, widgets/checkboxradio.js, widgets/controlgroup.js, widgets/datepicker.js, widgets/dialog.js, widgets/menu.js, widgets/mouse.js, widgets/slider.js, widgets/tooltip.js, effect.js, effects/effect-slide.js
* Copyright jQuery Foundation and other contributors; Licensed MIT */

!function(t){"function"==typeof define&&define.amd?define(["jquery"],t):t(jQuery)}(function(k){k.ui=k.ui||{};k.ui.version="1.12.1";var n,i=0,r=Array.prototype.slice;k.cleanData=(n=k.cleanData,function(t){for(var e,i,s=0;null!=(i=t[s]);s++)try{(e=k._data(i,"events"))&&e.remove&&k(i).triggerHandler("remove")}catch(t){}n(t)}),k.widget=function(t,i,e){var s,n,o,a={},r=t.split(".")[0],l=r+"-"+(t=t.split(".")[1]);return e||(e=i,i=k.Widget),k.isArray(e)&&(e=k.extend.apply(null,[{}].concat(e))),k.expr[":"][l.toLowerCase()]=function(t){return!!k.data(t,l)},k[r]=k[r]||{},s=k[r][t],n=k[r][t]=function(t,e){if(!this._createWidget)return new n(t,e);arguments.length&&this._createWidget(t,e)},k.extend(n,s,{version:e.version,_proto:k.extend({},e),_childConstructors:[]}),(o=new i).options=k.widget.extend({},o.options),k.each(e,function(e,s){function n(){return i.prototype[e].apply(this,arguments)}function o(t){return i.prototype[e].apply(this,t)}k.isFunction(s)?a[e]=function(){var t,e=this._super,i=this._superApply;return this._super=n,this._superApply=o,t=s.apply(this,arguments),this._super=e,this._superApply=i,t}:a[e]=s}),n.prototype=k.widget.extend(o,{widgetEventPrefix:s&&o.widgetEventPrefix||t},a,{constructor:n,namespace:r,widgetName:t,widgetFullName:l}),s?(k.each(s._childConstructors,function(t,e){var i=e.prototype;k.widget(i.namespace+"."+i.widgetName,n,e._proto)}),delete s._childConstructors):i._childConstructors.push(n),k.widget.bridge(t,n),n},k.widget.extend=function(t){for(var e,i,s=r.call(arguments,1),n=0,o=s.length;n<o;n++)for(e in s[n])i=s[n][e],s[n].hasOwnProperty(e)&&void 0!==i&&(k.isPlainObject(i)?t[e]=k.isPlainObject(t[e])?k.widget.extend({},t[e],i):k.widget.extend({},i):t[e]=i);return t},k.widget.bridge=function(o,e){var a=e.prototype.widgetFullName||o;k.fn[o]=function(i){var t="string"==typeof i,s=r.call(arguments,1),n=this;return t?this.length||"instance"!==i?this.each(function(){var t,e=k.data(this,a);return"instance"===i?(n=e,!1):e?k.isFunction(e[i])&&"_"!==i.charAt(0)?(t=e[i].apply(e,s))!==e&&void 0!==t?(n=t&&t.jquery?n.pushStack(t.get()):t,!1):void 0:k.error("no such method '"+i+"' for "+o+" widget instance"):k.error("cannot call methods on "+o+" prior to initialization; attempted to call method '"+i+"'")}):n=void 0:(s.length&&(i=k.widget.extend.apply(null,[i].concat(s))),this.each(function(){var t=k.data(this,a);t?(t.option(i||{}),t._init&&t._init()):k.data(this,a,new e(i,this))})),n}},k.Widget=function(){},k.Widget._childConstructors=[],k.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{classes:{},disabled:!1,create:null},_createWidget:function(t,e){e=k(e||this.defaultElement||this)[0],this.element=k(e),this.uuid=i++,this.eventNamespace="."+this.widgetName+this.uuid,this.bindings=k(),this.hoverable=k(),this.focusable=k(),this.classesElementLookup={},e!==this&&(k.data(e,this.widgetFullName,this),this._on(!0,this.element,{remove:function(t){t.target===e&&this.destroy()}}),this.document=k(e.style?e.ownerDocument:e.document||e),this.window=k(this.document[0].defaultView||this.document[0].parentWindow)),this.options=k.widget.extend({},this.options,this._getCreateOptions(),t),this._create(),this.options.disabled&&this._setOptionDisabled(this.options.disabled),this._trigger("create",null,this._getCreateEventData()),this._init()},_getCreateOptions:function(){return{}},_getCreateEventData:k.noop,_create:k.noop,_init:k.noop,destroy:function(){var i=this;this._destroy(),k.each(this.classesElementLookup,function(t,e){i._removeClass(e,t)}),this.element.off(this.eventNamespace).removeData(this.widgetFullName),this.widget().off(this.eventNamespace).removeAttr("aria-disabled"),this.bindings.off(this.eventNamespace)},_destroy:k.noop,widget:function(){return this.element},option:function(t,e){var i,s,n,o=t;if(0===arguments.length)return k.widget.extend({},this.options);if("string"==typeof t)if(o={},t=(i=t.split(".")).shift(),i.length){for(s=o[t]=k.widget.extend({},this.options[t]),n=0;n<i.length-1;n++)s[i[n]]=s[i[n]]||{},s=s[i[n]];if(t=i.pop(),1===arguments.length)return void 0===s[t]?null:s[t];s[t]=e}else{if(1===arguments.length)return void 0===this.options[t]?null:this.options[t];o[t]=e}return this._setOptions(o),this},_setOptions:function(t){for(var e in t)this._setOption(e,t[e]);return this},_setOption:function(t,e){return"classes"===t&&this._setOptionClasses(e),this.options[t]=e,"disabled"===t&&this._setOptionDisabled(e),this},_setOptionClasses:function(t){var e,i,s;for(e in t)s=this.classesElementLookup[e],t[e]!==this.options.classes[e]&&s&&s.length&&(i=k(s.get()),this._removeClass(s,e),i.addClass(this._classes({element:i,keys:e,classes:t,add:!0})))},_setOptionDisabled:function(t){this._toggleClass(this.widget(),this.widgetFullName+"-disabled",null,!!t),t&&(this._removeClass(this.hoverable,null,"ui-state-hover"),this._removeClass(this.focusable,null,"ui-state-focus"))},enable:function(){return this._setOptions({disabled:!1})},disable:function(){return this._setOptions({disabled:!0})},_classes:function(n){var o=[],a=this;function t(t,e){for(var i,s=0;s<t.length;s++)i=a.classesElementLookup[t[s]]||k(),i=n.add?k(k.unique(i.get().concat(n.element.get()))):k(i.not(n.element).get()),a.classesElementLookup[t[s]]=i,o.push(t[s]),e&&n.classes[t[s]]&&o.push(n.classes[t[s]])}return n=k.extend({element:this.element,classes:this.options.classes||{}},n),this._on(n.element,{remove:"_untrackClassesElement"}),n.keys&&t(n.keys.match(/\S+/g)||[],!0),n.extra&&t(n.extra.match(/\S+/g)||[]),o.join(" ")},_untrackClassesElement:function(i){var s=this;k.each(s.classesElementLookup,function(t,e){-1!==k.inArray(i.target,e)&&(s.classesElementLookup[t]=k(e.not(i.target).get()))})},_removeClass:function(t,e,i){return this._toggleClass(t,e,i,!1)},_addClass:function(t,e,i){return this._toggleClass(t,e,i,!0)},_toggleClass:function(t,e,i,s){s="boolean"==typeof s?s:i;var n="string"==typeof t||null===t,t={extra:n?e:i,keys:n?t:e,element:n?this.element:t,add:s};return t.element.toggleClass(this._classes(t),s),this},_on:function(n,o,t){var a,r=this;"boolean"!=typeof n&&(t=o,o=n,n=!1),t?(o=a=k(o),this.bindings=this.bindings.add(o)):(t=o,o=this.element,a=this.widget()),k.each(t,function(t,e){function i(){if(n||!0!==r.options.disabled&&!k(this).hasClass("ui-state-disabled"))return("string"==typeof e?r[e]:e).apply(r,arguments)}"string"!=typeof e&&(i.guid=e.guid=e.guid||i.guid||k.guid++);var s=t.match(/^([\w:-]*)\s*(.*)$/),t=s[1]+r.eventNamespace,s=s[2];s?a.on(t,s,i):o.on(t,i)})},_off:function(t,e){e=(e||"").split(" ").join(this.eventNamespace+" ")+this.eventNamespace,t.off(e).off(e),this.bindings=k(this.bindings.not(t).get()),this.focusable=k(this.focusable.not(t).get()),this.hoverable=k(this.hoverable.not(t).get())},_delay:function(t,e){var i=this;return setTimeout(function(){return("string"==typeof t?i[t]:t).apply(i,arguments)},e||0)},_hoverable:function(t){this.hoverable=this.hoverable.add(t),this._on(t,{mouseenter:function(t){this._addClass(k(t.currentTarget),null,"ui-state-hover")},mouseleave:function(t){this._removeClass(k(t.currentTarget),null,"ui-state-hover")}})},_focusable:function(t){this.focusable=this.focusable.add(t),this._on(t,{focusin:function(t){this._addClass(k(t.currentTarget),null,"ui-state-focus")},focusout:function(t){this._removeClass(k(t.currentTarget),null,"ui-state-focus")}})},_trigger:function(t,e,i){var s,n,o=this.options[t];if(i=i||{},(e=k.Event(e)).type=(t===this.widgetEventPrefix?t:this.widgetEventPrefix+t).toLowerCase(),e.target=this.element[0],n=e.originalEvent)for(s in n)s in e||(e[s]=n[s]);return this.element.trigger(e,i),!(k.isFunction(o)&&!1===o.apply(this.element[0],[e].concat(i))||e.isDefaultPrevented())}},k.each({show:"fadeIn",hide:"fadeOut"},function(o,a){k.Widget.prototype["_"+o]=function(e,t,i){var s;"string"==typeof t&&(t={effect:t});var n=t?!0!==t&&"number"!=typeof t&&t.effect||a:o;"number"==typeof(t=t||{})&&(t={duration:t}),s=!k.isEmptyObject(t),t.complete=i,t.delay&&e.delay(t.delay),s&&k.effects&&k.effects.effect[n]?e[o](t):n!==o&&e[n]?e[n](t.duration,t.easing,i):e.queue(function(t){k(this)[o](),i&&i.call(e[0]),t()})}});var s,D,x,o,a,l,h,u,C;k.widget;function M(t,e,i){return[parseFloat(t[0])*(u.test(t[0])?e/100:1),parseFloat(t[1])*(u.test(t[1])?i/100:1)]}function T(t,e){return parseInt(k.css(t,e),10)||0}D=Math.max,x=Math.abs,o=/left|center|right/,a=/top|center|bottom/,l=/[\+\-]\d+(\.[\d]+)?%?/,h=/^\w+/,u=/%$/,C=k.fn.position,k.position={scrollbarWidth:function(){if(void 0!==s)return s;var t,e=k("<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"),i=e.children()[0];return k("body").append(e),t=i.offsetWidth,e.css("overflow","scroll"),t===(i=i.offsetWidth)&&(i=e[0].clientWidth),e.remove(),s=t-i},getScrollInfo:function(t){var e=t.isWindow||t.isDocument?"":t.element.css("overflow-x"),i=t.isWindow||t.isDocument?"":t.element.css("overflow-y"),e="scroll"===e||"auto"===e&&t.width<t.element[0].scrollWidth;return{width:"scroll"===i||"auto"===i&&t.height<t.element[0].scrollHeight?k.position.scrollbarWidth():0,height:e?k.position.scrollbarWidth():0}},getWithinInfo:function(t){var e=k(t||window),i=k.isWindow(e[0]),s=!!e[0]&&9===e[0].nodeType;return{element:e,isWindow:i,isDocument:s,offset:!i&&!s?k(t).offset():{left:0,top:0},scrollLeft:e.scrollLeft(),scrollTop:e.scrollTop(),width:e.outerWidth(),height:e.outerHeight()}}},k.fn.position=function(c){if(!c||!c.of)return C.apply(this,arguments);c=k.extend({},c);var d,p,f,g,m,t,_=k(c.of),v=k.position.getWithinInfo(c.within),b=k.position.getScrollInfo(v),y=(c.collision||"flip").split(" "),w={},e=9===(t=(e=_)[0]).nodeType?{width:e.width(),height:e.height(),offset:{top:0,left:0}}:k.isWindow(t)?{width:e.width(),height:e.height(),offset:{top:e.scrollTop(),left:e.scrollLeft()}}:t.preventDefault?{width:0,height:0,offset:{top:t.pageY,left:t.pageX}}:{width:e.outerWidth(),height:e.outerHeight(),offset:e.offset()};return _[0].preventDefault&&(c.at="left top"),p=e.width,f=e.height,g=e.offset,m=k.extend({},g),k.each(["my","at"],function(){var t,e,i=(c[this]||"").split(" ");1===i.length&&(i=o.test(i[0])?i.concat(["center"]):a.test(i[0])?["center"].concat(i):["center","center"]),i[0]=o.test(i[0])?i[0]:"center",i[1]=a.test(i[1])?i[1]:"center",t=l.exec(i[0]),e=l.exec(i[1]),w[this]=[t?t[0]:0,e?e[0]:0],c[this]=[h.exec(i[0])[0],h.exec(i[1])[0]]}),1===y.length&&(y[1]=y[0]),"right"===c.at[0]?m.left+=p:"center"===c.at[0]&&(m.left+=p/2),"bottom"===c.at[1]?m.top+=f:"center"===c.at[1]&&(m.top+=f/2),d=M(w.at,p,f),m.left+=d[0],m.top+=d[1],this.each(function(){var i,t,a=k(this),r=a.outerWidth(),l=a.outerHeight(),e=T(this,"marginLeft"),s=T(this,"marginTop"),n=r+e+T(this,"marginRight")+b.width,o=l+s+T(this,"marginBottom")+b.height,h=k.extend({},m),u=M(w.my,a.outerWidth(),a.outerHeight());"right"===c.my[0]?h.left-=r:"center"===c.my[0]&&(h.left-=r/2),"bottom"===c.my[1]?h.top-=l:"center"===c.my[1]&&(h.top-=l/2),h.left+=u[0],h.top+=u[1],i={marginLeft:e,marginTop:s},k.each(["left","top"],function(t,e){k.ui.position[y[t]]&&k.ui.position[y[t]][e](h,{targetWidth:p,targetHeight:f,elemWidth:r,elemHeight:l,collisionPosition:i,collisionWidth:n,collisionHeight:o,offset:[d[0]+u[0],d[1]+u[1]],my:c.my,at:c.at,within:v,elem:a})}),c.using&&(t=function(t){var e=g.left-h.left,i=e+p-r,s=g.top-h.top,n=s+f-l,o={target:{element:_,left:g.left,top:g.top,width:p,height:f},element:{element:a,left:h.left,top:h.top,width:r,height:l},horizontal:i<0?"left":0<e?"right":"center",vertical:n<0?"top":0<s?"bottom":"middle"};p<r&&x(e+i)<p&&(o.horizontal="center"),f<l&&x(s+n)<f&&(o.vertical="middle"),D(x(e),x(i))>D(x(s),x(n))?o.important="horizontal":o.important="vertical",c.using.call(this,t,o)}),a.offset(k.extend(h,{using:t}))})},k.ui.position={fit:{left:function(t,e){var i=e.within,s=i.isWindow?i.scrollLeft:i.offset.left,n=i.width,o=t.left-e.collisionPosition.marginLeft,a=s-o,r=o+e.collisionWidth-n-s;e.collisionWidth>n?0<a&&r<=0?(i=t.left+a+e.collisionWidth-n-s,t.left+=a-i):t.left=!(0<r&&a<=0)&&r<a?s+n-e.collisionWidth:s:0<a?t.left+=a:0<r?t.left-=r:t.left=D(t.left-o,t.left)},top:function(t,e){var i=e.within,s=i.isWindow?i.scrollTop:i.offset.top,n=e.within.height,o=t.top-e.collisionPosition.marginTop,a=s-o,r=o+e.collisionHeight-n-s;e.collisionHeight>n?0<a&&r<=0?(i=t.top+a+e.collisionHeight-n-s,t.top+=a-i):t.top=!(0<r&&a<=0)&&r<a?s+n-e.collisionHeight:s:0<a?t.top+=a:0<r?t.top-=r:t.top=D(t.top-o,t.top)}},flip:{left:function(t,e){var i=e.within,s=i.offset.left+i.scrollLeft,n=i.width,o=i.isWindow?i.scrollLeft:i.offset.left,a=t.left-e.collisionPosition.marginLeft,r=a-o,l=a+e.collisionWidth-n-o,h="left"===e.my[0]?-e.elemWidth:"right"===e.my[0]?e.elemWidth:0,i="left"===e.at[0]?e.targetWidth:"right"===e.at[0]?-e.targetWidth:0,a=-2*e.offset[0];r<0?((s=t.left+h+i+a+e.collisionWidth-n-s)<0||s<x(r))&&(t.left+=h+i+a):0<l&&(0<(o=t.left-e.collisionPosition.marginLeft+h+i+a-o)||x(o)<l)&&(t.left+=h+i+a)},top:function(t,e){var i=e.within,s=i.offset.top+i.scrollTop,n=i.height,o=i.isWindow?i.scrollTop:i.offset.top,a=t.top-e.collisionPosition.marginTop,r=a-o,l=a+e.collisionHeight-n-o,h="top"===e.my[1]?-e.elemHeight:"bottom"===e.my[1]?e.elemHeight:0,i="top"===e.at[1]?e.targetHeight:"bottom"===e.at[1]?-e.targetHeight:0,a=-2*e.offset[1];r<0?((s=t.top+h+i+a+e.collisionHeight-n-s)<0||s<x(r))&&(t.top+=h+i+a):0<l&&(0<(o=t.top-e.collisionPosition.marginTop+h+i+a-o)||x(o)<l)&&(t.top+=h+i+a)}},flipfit:{left:function(){k.ui.position.flip.left.apply(this,arguments),k.ui.position.fit.left.apply(this,arguments)},top:function(){k.ui.position.flip.top.apply(this,arguments),k.ui.position.fit.top.apply(this,arguments)}}};var t;k.ui.position,k.extend(k.expr[":"],{data:k.expr.createPseudo?k.expr.createPseudo(function(e){return function(t){return!!k.data(t,e)}}):function(t,e,i){return!!k.data(t,i[3])}}),k.fn.extend({disableSelection:(t="onselectstart"in document.createElement("div")?"selectstart":"mousedown",function(){return this.on(t+".ui-disableSelection",function(t){t.preventDefault()})}),enableSelection:function(){return this.off(".ui-disableSelection")}});k.ui.focusable=function(t,e){var i,s,n,o,a=t.nodeName.toLowerCase();return"area"===a?(s=(i=t.parentNode).name,!(!t.href||!s||"map"!==i.nodeName.toLowerCase())&&(0<(s=k("img[usemap='#"+s+"']")).length&&s.is(":visible"))):(/^(input|select|textarea|button|object)$/.test(a)?(n=!t.disabled)&&(o=k(t).closest("fieldset")[0])&&(n=!o.disabled):n="a"===a&&t.href||e,n&&k(t).is(":visible")&&function(t){var e=t.css("visibility");for(;"inherit"===e;)t=t.parent(),e=t.css("visibility");return"hidden"!==e}(k(t)))},k.extend(k.expr[":"],{focusable:function(t){return k.ui.focusable(t,null!=k.attr(t,"tabindex"))}});k.ui.focusable,k.fn.form=function(){return"string"==typeof this[0].form?this.closest("form"):k(this[0].form)},k.ui.formResetMixin={_formResetHandler:function(){var e=k(this);setTimeout(function(){var t=e.data("ui-form-reset-instances");k.each(t,function(){this.refresh()})})},_bindFormResetHandler:function(){var t;this.form=this.element.form(),this.form.length&&((t=this.form.data("ui-form-reset-instances")||[]).length||this.form.on("reset.ui-form-reset",this._formResetHandler),t.push(this),this.form.data("ui-form-reset-instances",t))},_unbindFormResetHandler:function(){var t;this.form.length&&((t=this.form.data("ui-form-reset-instances")).splice(k.inArray(this,t),1),t.length?this.form.data("ui-form-reset-instances",t):this.form.removeData("ui-form-reset-instances").off("reset.ui-form-reset"))}},k.ui.keyCode={BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38},k.ui.escapeSelector=(e=/([!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g,function(t){return t.replace(e,"\\$1")}),k.fn.labels=function(){var t,e,i;return this[0].labels&&this[0].labels.length?this.pushStack(this[0].labels):(e=this.eq(0).parents("label"),(t=this.attr("id"))&&(i=(i=this.eq(0).parents().last()).add((i.length?i:this).siblings()),t="label[for='"+k.ui.escapeSelector(t)+"']",e=e.add(i.find(t).addBack(t))),this.pushStack(e))},k.fn.scrollParent=function(t){var e=this.css("position"),i="absolute"===e,s=t?/(auto|scroll|hidden)/:/(auto|scroll)/,t=this.parents().filter(function(){var t=k(this);return(!i||"static"!==t.css("position"))&&s.test(t.css("overflow")+t.css("overflow-y")+t.css("overflow-x"))}).eq(0);return"fixed"!==e&&t.length?t:k(this[0].ownerDocument||document)},k.extend(k.expr[":"],{tabbable:function(t){var e=k.attr(t,"tabindex"),i=null!=e;return(!i||0<=e)&&k.ui.focusable(t,i)}}),k.fn.extend({uniqueId:(c=0,function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++c)})}),removeUniqueId:function(){return this.each(function(){/^ui-id-\d+$/.test(this.id)&&k(this).removeAttr("id")})}}),k.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase());var e,c,d=!1;k(document).on("mouseup",function(){d=!1});k.widget("ui.mouse",{version:"1.12.1",options:{cancel:"input, textarea, button, select, option",distance:1,delay:0},_mouseInit:function(){var e=this;this.element.on("mousedown."+this.widgetName,function(t){return e._mouseDown(t)}).on("click."+this.widgetName,function(t){if(!0===k.data(t.target,e.widgetName+".preventClickEvent"))return k.removeData(t.target,e.widgetName+".preventClickEvent"),t.stopImmediatePropagation(),!1}),this.started=!1},_mouseDestroy:function(){this.element.off("."+this.widgetName),this._mouseMoveDelegate&&this.document.off("mousemove."+this.widgetName,this._mouseMoveDelegate).off("mouseup."+this.widgetName,this._mouseUpDelegate)},_mouseDown:function(t){if(!d){this._mouseMoved=!1,this._mouseStarted&&this._mouseUp(t),this._mouseDownEvent=t;var e=this,i=1===t.which,s=!("string"!=typeof this.options.cancel||!t.target.nodeName)&&k(t.target).closest(this.options.cancel).length;return i&&!s&&this._mouseCapture(t)?(this.mouseDelayMet=!this.options.delay,this.mouseDelayMet||(this._mouseDelayTimer=setTimeout(function(){e.mouseDelayMet=!0},this.options.delay)),this._mouseDistanceMet(t)&&this._mouseDelayMet(t)&&(this._mouseStarted=!1!==this._mouseStart(t),!this._mouseStarted)?(t.preventDefault(),!0):(!0===k.data(t.target,this.widgetName+".preventClickEvent")&&k.removeData(t.target,this.widgetName+".preventClickEvent"),this._mouseMoveDelegate=function(t){return e._mouseMove(t)},this._mouseUpDelegate=function(t){return e._mouseUp(t)},this.document.on("mousemove."+this.widgetName,this._mouseMoveDelegate).on("mouseup."+this.widgetName,this._mouseUpDelegate),t.preventDefault(),d=!0)):!0}},_mouseMove:function(t){if(this._mouseMoved){if(k.ui.ie&&(!document.documentMode||document.documentMode<9)&&!t.button)return this._mouseUp(t);if(!t.which)if(t.originalEvent.altKey||t.originalEvent.ctrlKey||t.originalEvent.metaKey||t.originalEvent.shiftKey)this.ignoreMissingWhich=!0;else if(!this.ignoreMissingWhich)return this._mouseUp(t)}return(t.which||t.button)&&(this._mouseMoved=!0),this._mouseStarted?(this._mouseDrag(t),t.preventDefault()):(this._mouseDistanceMet(t)&&this._mouseDelayMet(t)&&(this._mouseStarted=!1!==this._mouseStart(this._mouseDownEvent,t),this._mouseStarted?this._mouseDrag(t):this._mouseUp(t)),!this._mouseStarted)},_mouseUp:function(t){this.document.off("mousemove."+this.widgetName,this._mouseMoveDelegate).off("mouseup."+this.widgetName,this._mouseUpDelegate),this._mouseStarted&&(this._mouseStarted=!1,t.target===this._mouseDownEvent.target&&k.data(t.target,this.widgetName+".preventClickEvent",!0),this._mouseStop(t)),this._mouseDelayTimer&&(clearTimeout(this._mouseDelayTimer),delete this._mouseDelayTimer),this.ignoreMissingWhich=!1,d=!1,t.preventDefault()},_mouseDistanceMet:function(t){return Math.max(Math.abs(this._mouseDownEvent.pageX-t.pageX),Math.abs(this._mouseDownEvent.pageY-t.pageY))>=this.options.distance},_mouseDelayMet:function(){return this.mouseDelayMet},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return!0}}),k.ui.plugin={add:function(t,e,i){var s,n=k.ui[t].prototype;for(s in i)n.plugins[s]=n.plugins[s]||[],n.plugins[s].push([e,i[s]])},call:function(t,e,i,s){var n,o=t.plugins[e];if(o&&(s||t.element[0].parentNode&&11!==t.element[0].parentNode.nodeType))for(n=0;n<o.length;n++)t.options[o[n][0]]&&o[n][1].apply(t.element,i)}},k.ui.safeActiveElement=function(e){var i;try{i=e.activeElement}catch(t){i=e.body}return(i=i||e.body).nodeName||(i=e.body),i},k.ui.safeBlur=function(t){t&&"body"!==t.nodeName.toLowerCase()&&k(t).trigger("blur")};k.widget("ui.draggable",k.ui.mouse,{version:"1.12.1",widgetEventPrefix:"drag",options:{addClasses:!0,appendTo:"parent",axis:!1,connectToSortable:!1,containment:!1,cursor:"auto",cursorAt:!1,grid:!1,handle:!1,helper:"original",iframeFix:!1,opacity:!1,refreshPositions:!1,revert:!1,revertDuration:500,scope:"default",scroll:!0,scrollSensitivity:20,scrollSpeed:20,snap:!1,snapMode:"both",snapTolerance:20,stack:!1,zIndex:!1,drag:null,start:null,stop:null},_create:function(){"original"===this.options.helper&&this._setPositionRelative(),this.options.addClasses&&this._addClass("ui-draggable"),this._setHandleClassName(),this._mouseInit()},_setOption:function(t,e){this._super(t,e),"handle"===t&&(this._removeHandleClassName(),this._setHandleClassName())},_destroy:function(){(this.helper||this.element).is(".ui-draggable-dragging")?this.destroyOnClear=!0:(this._removeHandleClassName(),this._mouseDestroy())},_mouseCapture:function(t){var e=this.options;return!(this.helper||e.disabled||0<k(t.target).closest(".ui-resizable-handle").length)&&(this.handle=this._getHandle(t),!!this.handle&&(this._blurActiveElement(t),this._blockFrames(!0===e.iframeFix?"iframe":e.iframeFix),!0))},_blockFrames:function(t){this.iframeBlocks=this.document.find(t).map(function(){var t=k(this);return k("<div>").css("position","absolute").appendTo(t.parent()).outerWidth(t.outerWidth()).outerHeight(t.outerHeight()).offset(t.offset())[0]})},_unblockFrames:function(){this.iframeBlocks&&(this.iframeBlocks.remove(),delete this.iframeBlocks)},_blurActiveElement:function(t){var e=k.ui.safeActiveElement(this.document[0]);k(t.target).closest(e).length||k.ui.safeBlur(e)},_mouseStart:function(t){var e=this.options;return this.helper=this._createHelper(t),this._addClass(this.helper,"ui-draggable-dragging"),this._cacheHelperProportions(),k.ui.ddmanager&&(k.ui.ddmanager.current=this),this._cacheMargins(),this.cssPosition=this.helper.css("position"),this.scrollParent=this.helper.scrollParent(!0),this.offsetParent=this.helper.offsetParent(),this.hasFixedAncestor=0<this.helper.parents().filter(function(){return"fixed"===k(this).css("position")}).length,this.positionAbs=this.element.offset(),this._refreshOffsets(t),this.originalPosition=this.position=this._generatePosition(t,!1),this.originalPageX=t.pageX,this.originalPageY=t.pageY,e.cursorAt&&this._adjustOffsetFromHelper(e.cursorAt),this._setContainment(),!1===this._trigger("start",t)?(this._clear(),!1):(this._cacheHelperProportions(),k.ui.ddmanager&&!e.dropBehaviour&&k.ui.ddmanager.prepareOffsets(this,t),this._mouseDrag(t,!0),k.ui.ddmanager&&k.ui.ddmanager.dragStart(this,t),!0)},_refreshOffsets:function(t){this.offset={top:this.positionAbs.top-this.margins.top,left:this.positionAbs.left-this.margins.left,scroll:!1,parent:this._getParentOffset(),relative:this._getRelativeOffset()},this.offset.click={left:t.pageX-this.offset.left,top:t.pageY-this.offset.top}},_mouseDrag:function(t,e){if(this.hasFixedAncestor&&(this.offset.parent=this._getParentOffset()),this.position=this._generatePosition(t,!0),this.positionAbs=this._convertPositionTo("absolute"),!e){e=this._uiHash();if(!1===this._trigger("drag",t,e))return this._mouseUp(new k.Event("mouseup",t)),!1;this.position=e.position}return this.helper[0].style.left=this.position.left+"px",this.helper[0].style.top=this.position.top+"px",k.ui.ddmanager&&k.ui.ddmanager.drag(this,t),!1},_mouseStop:function(t){var e=this,i=!1;return k.ui.ddmanager&&!this.options.dropBehaviour&&(i=k.ui.ddmanager.drop(this,t)),this.dropped&&(i=this.dropped,this.dropped=!1),"invalid"===this.options.revert&&!i||"valid"===this.options.revert&&i||!0===this.options.revert||k.isFunction(this.options.revert)&&this.options.revert.call(this.element,i)?k(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){!1!==e._trigger("stop",t)&&e._clear()}):!1!==this._trigger("stop",t)&&this._clear(),!1},_mouseUp:function(t){return this._unblockFrames(),k.ui.ddmanager&&k.ui.ddmanager.dragStop(this,t),this.handleElement.is(t.target)&&this.element.trigger("focus"),k.ui.mouse.prototype._mouseUp.call(this,t)},cancel:function(){return this.helper.is(".ui-draggable-dragging")?this._mouseUp(new k.Event("mouseup",{target:this.element[0]})):this._clear(),this},_getHandle:function(t){return!this.options.handle||!!k(t.target).closest(this.element.find(this.options.handle)).length},_setHandleClassName:function(){this.handleElement=this.options.handle?this.element.find(this.options.handle):this.element,this._addClass(this.handleElement,"ui-draggable-handle")},_removeHandleClassName:function(){this._removeClass(this.handleElement,"ui-draggable-handle")},_createHelper:function(t){var e=this.options,i=k.isFunction(e.helper),t=i?k(e.helper.apply(this.element[0],[t])):"clone"===e.helper?this.element.clone().removeAttr("id"):this.element;return t.parents("body").length||t.appendTo("parent"===e.appendTo?this.element[0].parentNode:e.appendTo),i&&t[0]===this.element[0]&&this._setPositionRelative(),t[0]===this.element[0]||/(fixed|absolute)/.test(t.css("position"))||t.css("position","absolute"),t},_setPositionRelative:function(){/^(?:r|a|f)/.test(this.element.css("position"))||(this.element[0].style.position="relative")},_adjustOffsetFromHelper:function(t){"string"==typeof t&&(t=t.split(" ")),k.isArray(t)&&(t={left:+t[0],top:+t[1]||0}),"left"in t&&(this.offset.click.left=t.left+this.margins.left),"right"in t&&(this.offset.click.left=this.helperProportions.width-t.right+this.margins.left),"top"in t&&(this.offset.click.top=t.top+this.margins.top),"bottom"in t&&(this.offset.click.top=this.helperProportions.height-t.bottom+this.margins.top)},_isRootNode:function(t){return/(html|body)/i.test(t.tagName)||t===this.document[0]},_getParentOffset:function(){var t=this.offsetParent.offset(),e=this.document[0];return"absolute"===this.cssPosition&&this.scrollParent[0]!==e&&k.contains(this.scrollParent[0],this.offsetParent[0])&&(t.left+=this.scrollParent.scrollLeft(),t.top+=this.scrollParent.scrollTop()),this._isRootNode(this.offsetParent[0])&&(t={top:0,left:0}),{top:t.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:t.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if("relative"!==this.cssPosition)return{top:0,left:0};var t=this.element.position(),e=this._isRootNode(this.scrollParent[0]);return{top:t.top-(parseInt(this.helper.css("top"),10)||0)+(e?0:this.scrollParent.scrollTop()),left:t.left-(parseInt(this.helper.css("left"),10)||0)+(e?0:this.scrollParent.scrollLeft())}},_cacheMargins:function(){this.margins={left:parseInt(this.element.css("marginLeft"),10)||0,top:parseInt(this.element.css("marginTop"),10)||0,right:parseInt(this.element.css("marginRight"),10)||0,bottom:parseInt(this.element.css("marginBottom"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var t,e,i,s=this.options,n=this.document[0];this.relativeContainer=null,s.containment?"window"!==s.containment?"document"!==s.containment?s.containment.constructor!==Array?("parent"===s.containment&&(s.containment=this.helper[0].parentNode),(i=(e=k(s.containment))[0])&&(t=/(scroll|auto)/.test(e.css("overflow")),this.containment=[(parseInt(e.css("borderLeftWidth"),10)||0)+(parseInt(e.css("paddingLeft"),10)||0),(parseInt(e.css("borderTopWidth"),10)||0)+(parseInt(e.css("paddingTop"),10)||0),(t?Math.max(i.scrollWidth,i.offsetWidth):i.offsetWidth)-(parseInt(e.css("borderRightWidth"),10)||0)-(parseInt(e.css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left-this.margins.right,(t?Math.max(i.scrollHeight,i.offsetHeight):i.offsetHeight)-(parseInt(e.css("borderBottomWidth"),10)||0)-(parseInt(e.css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top-this.margins.bottom],this.relativeContainer=e)):this.containment=s.containment:this.containment=[0,0,k(n).width()-this.helperProportions.width-this.margins.left,(k(n).height()||n.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top]:this.containment=[k(window).scrollLeft()-this.offset.relative.left-this.offset.parent.left,k(window).scrollTop()-this.offset.relative.top-this.offset.parent.top,k(window).scrollLeft()+k(window).width()-this.helperProportions.width-this.margins.left,k(window).scrollTop()+(k(window).height()||n.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top]:this.containment=null},_convertPositionTo:function(t,e){e=e||this.position;var i="absolute"===t?1:-1,t=this._isRootNode(this.scrollParent[0]);return{top:e.top+this.offset.relative.top*i+this.offset.parent.top*i-("fixed"===this.cssPosition?-this.offset.scroll.top:t?0:this.offset.scroll.top)*i,left:e.left+this.offset.relative.left*i+this.offset.parent.left*i-("fixed"===this.cssPosition?-this.offset.scroll.left:t?0:this.offset.scroll.left)*i}},_generatePosition:function(t,e){var i,s=this.options,n=this._isRootNode(this.scrollParent[0]),o=t.pageX,a=t.pageY;return n&&this.offset.scroll||(this.offset.scroll={top:this.scrollParent.scrollTop(),left:this.scrollParent.scrollLeft()}),e&&(this.containment&&(i=this.relativeContainer?(i=this.relativeContainer.offset(),[this.containment[0]+i.left,this.containment[1]+i.top,this.containment[2]+i.left,this.containment[3]+i.top]):this.containment,t.pageX-this.offset.click.left<i[0]&&(o=i[0]+this.offset.click.left),t.pageY-this.offset.click.top<i[1]&&(a=i[1]+this.offset.click.top),t.pageX-this.offset.click.left>i[2]&&(o=i[2]+this.offset.click.left),t.pageY-this.offset.click.top>i[3]&&(a=i[3]+this.offset.click.top)),s.grid&&(t=s.grid[1]?this.originalPageY+Math.round((a-this.originalPageY)/s.grid[1])*s.grid[1]:this.originalPageY,a=!i||t-this.offset.click.top>=i[1]||t-this.offset.click.top>i[3]?t:t-this.offset.click.top>=i[1]?t-s.grid[1]:t+s.grid[1],t=s.grid[0]?this.originalPageX+Math.round((o-this.originalPageX)/s.grid[0])*s.grid[0]:this.originalPageX,o=!i||t-this.offset.click.left>=i[0]||t-this.offset.click.left>i[2]?t:t-this.offset.click.left>=i[0]?t-s.grid[0]:t+s.grid[0]),"y"===s.axis&&(o=this.originalPageX),"x"===s.axis&&(a=this.originalPageY)),{top:a-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+("fixed"===this.cssPosition?-this.offset.scroll.top:n?0:this.offset.scroll.top),left:o-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+("fixed"===this.cssPosition?-this.offset.scroll.left:n?0:this.offset.scroll.left)}},_clear:function(){this._removeClass(this.helper,"ui-draggable-dragging"),this.helper[0]===this.element[0]||this.cancelHelperRemoval||this.helper.remove(),this.helper=null,this.cancelHelperRemoval=!1,this.destroyOnClear&&this.destroy()},_trigger:function(t,e,i){return i=i||this._uiHash(),k.ui.plugin.call(this,t,[e,i,this],!0),/^(drag|start|stop)/.test(t)&&(this.positionAbs=this._convertPositionTo("absolute"),i.offset=this.positionAbs),k.Widget.prototype._trigger.call(this,t,e,i)},plugins:{},_uiHash:function(){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs}}}),k.ui.plugin.add("draggable","connectToSortable",{start:function(e,t,i){var s=k.extend({},t,{item:i.element});i.sortables=[],k(i.options.connectToSortable).each(function(){var t=k(this).sortable("instance");t&&!t.options.disabled&&(i.sortables.push(t),t.refreshPositions(),t._trigger("activate",e,s))})},stop:function(e,t,i){var s=k.extend({},t,{item:i.element});i.cancelHelperRemoval=!1,k.each(i.sortables,function(){var t=this;t.isOver?(t.isOver=0,i.cancelHelperRemoval=!0,t.cancelHelperRemoval=!1,t._storedCSS={position:t.placeholder.css("position"),top:t.placeholder.css("top"),left:t.placeholder.css("left")},t._mouseStop(e),t.options.helper=t.options._helper):(t.cancelHelperRemoval=!0,t._trigger("deactivate",e,s))})},drag:function(i,s,n){k.each(n.sortables,function(){var t=!1,e=this;e.positionAbs=n.positionAbs,e.helperProportions=n.helperProportions,e.offset.click=n.offset.click,e._intersectsWith(e.containerCache)&&(t=!0,k.each(n.sortables,function(){return this.positionAbs=n.positionAbs,this.helperProportions=n.helperProportions,this.offset.click=n.offset.click,this!==e&&this._intersectsWith(this.containerCache)&&k.contains(e.element[0],this.element[0])&&(t=!1),t})),t?(e.isOver||(e.isOver=1,n._parent=s.helper.parent(),e.currentItem=s.helper.appendTo(e.element).data("ui-sortable-item",!0),e.options._helper=e.options.helper,e.options.helper=function(){return s.helper[0]},i.target=e.currentItem[0],e._mouseCapture(i,!0),e._mouseStart(i,!0,!0),e.offset.click.top=n.offset.click.top,e.offset.click.left=n.offset.click.left,e.offset.parent.left-=n.offset.parent.left-e.offset.parent.left,e.offset.parent.top-=n.offset.parent.top-e.offset.parent.top,n._trigger("toSortable",i),n.dropped=e.element,k.each(n.sortables,function(){this.refreshPositions()}),n.currentItem=n.element,e.fromOutside=n),e.currentItem&&(e._mouseDrag(i),s.position=e.position)):e.isOver&&(e.isOver=0,e.cancelHelperRemoval=!0,e.options._revert=e.options.revert,e.options.revert=!1,e._trigger("out",i,e._uiHash(e)),e._mouseStop(i,!0),e.options.revert=e.options._revert,e.options.helper=e.options._helper,e.placeholder&&e.placeholder.remove(),s.helper.appendTo(n._parent),n._refreshOffsets(i),s.position=n._generatePosition(i,!0),n._trigger("fromSortable",i),n.dropped=!1,k.each(n.sortables,function(){this.refreshPositions()}))})}}),k.ui.plugin.add("draggable","cursor",{start:function(t,e,i){var s=k("body"),i=i.options;s.css("cursor")&&(i._cursor=s.css("cursor")),s.css("cursor",i.cursor)},stop:function(t,e,i){i=i.options;i._cursor&&k("body").css("cursor",i._cursor)}}),k.ui.plugin.add("draggable","opacity",{start:function(t,e,i){e=k(e.helper),i=i.options;e.css("opacity")&&(i._opacity=e.css("opacity")),e.css("opacity",i.opacity)},stop:function(t,e,i){i=i.options;i._opacity&&k(e.helper).css("opacity",i._opacity)}}),k.ui.plugin.add("draggable","scroll",{start:function(t,e,i){i.scrollParentNotHidden||(i.scrollParentNotHidden=i.helper.scrollParent(!1)),i.scrollParentNotHidden[0]!==i.document[0]&&"HTML"!==i.scrollParentNotHidden[0].tagName&&(i.overflowOffset=i.scrollParentNotHidden.offset())},drag:function(t,e,i){var s=i.options,n=!1,o=i.scrollParentNotHidden[0],a=i.document[0];o!==a&&"HTML"!==o.tagName?(s.axis&&"x"===s.axis||(i.overflowOffset.top+o.offsetHeight-t.pageY<s.scrollSensitivity?o.scrollTop=n=o.scrollTop+s.scrollSpeed:t.pageY-i.overflowOffset.top<s.scrollSensitivity&&(o.scrollTop=n=o.scrollTop-s.scrollSpeed)),s.axis&&"y"===s.axis||(i.overflowOffset.left+o.offsetWidth-t.pageX<s.scrollSensitivity?o.scrollLeft=n=o.scrollLeft+s.scrollSpeed:t.pageX-i.overflowOffset.left<s.scrollSensitivity&&(o.scrollLeft=n=o.scrollLeft-s.scrollSpeed))):(s.axis&&"x"===s.axis||(t.pageY-k(a).scrollTop()<s.scrollSensitivity?n=k(a).scrollTop(k(a).scrollTop()-s.scrollSpeed):k(window).height()-(t.pageY-k(a).scrollTop())<s.scrollSensitivity&&(n=k(a).scrollTop(k(a).scrollTop()+s.scrollSpeed))),s.axis&&"y"===s.axis||(t.pageX-k(a).scrollLeft()<s.scrollSensitivity?n=k(a).scrollLeft(k(a).scrollLeft()-s.scrollSpeed):k(window).width()-(t.pageX-k(a).scrollLeft())<s.scrollSensitivity&&(n=k(a).scrollLeft(k(a).scrollLeft()+s.scrollSpeed)))),!1!==n&&k.ui.ddmanager&&!s.dropBehaviour&&k.ui.ddmanager.prepareOffsets(i,t)}}),k.ui.plugin.add("draggable","snap",{start:function(t,e,i){var s=i.options;i.snapElements=[],k(s.snap.constructor!==String?s.snap.items||":data(ui-draggable)":s.snap).each(function(){var t=k(this),e=t.offset();this!==i.element[0]&&i.snapElements.push({item:this,width:t.outerWidth(),height:t.outerHeight(),top:e.top,left:e.left})})},drag:function(t,e,i){for(var s,n,o,a,r,l,h,u,c,d=i.options,p=d.snapTolerance,f=e.offset.left,g=f+i.helperProportions.width,m=e.offset.top,_=m+i.helperProportions.height,v=i.snapElements.length-1;0<=v;v--)l=(r=i.snapElements[v].left-i.margins.left)+i.snapElements[v].width,u=(h=i.snapElements[v].top-i.margins.top)+i.snapElements[v].height,g<r-p||l+p<f||_<h-p||u+p<m||!k.contains(i.snapElements[v].item.ownerDocument,i.snapElements[v].item)?(i.snapElements[v].snapping&&i.options.snap.release&&i.options.snap.release.call(i.element,t,k.extend(i._uiHash(),{snapItem:i.snapElements[v].item})),i.snapElements[v].snapping=!1):("inner"!==d.snapMode&&(s=Math.abs(h-_)<=p,n=Math.abs(u-m)<=p,o=Math.abs(r-g)<=p,a=Math.abs(l-f)<=p,s&&(e.position.top=i._convertPositionTo("relative",{top:h-i.helperProportions.height,left:0}).top),n&&(e.position.top=i._convertPositionTo("relative",{top:u,left:0}).top),o&&(e.position.left=i._convertPositionTo("relative",{top:0,left:r-i.helperProportions.width}).left),a&&(e.position.left=i._convertPositionTo("relative",{top:0,left:l}).left)),c=s||n||o||a,"outer"!==d.snapMode&&(s=Math.abs(h-m)<=p,n=Math.abs(u-_)<=p,o=Math.abs(r-f)<=p,a=Math.abs(l-g)<=p,s&&(e.position.top=i._convertPositionTo("relative",{top:h,left:0}).top),n&&(e.position.top=i._convertPositionTo("relative",{top:u-i.helperProportions.height,left:0}).top),o&&(e.position.left=i._convertPositionTo("relative",{top:0,left:r}).left),a&&(e.position.left=i._convertPositionTo("relative",{top:0,left:l-i.helperProportions.width}).left)),!i.snapElements[v].snapping&&(s||n||o||a||c)&&i.options.snap.snap&&i.options.snap.snap.call(i.element,t,k.extend(i._uiHash(),{snapItem:i.snapElements[v].item})),i.snapElements[v].snapping=s||n||o||a||c)}}),k.ui.plugin.add("draggable","stack",{start:function(t,e,i){var s,i=i.options,i=k.makeArray(k(i.stack)).sort(function(t,e){return(parseInt(k(t).css("zIndex"),10)||0)-(parseInt(k(e).css("zIndex"),10)||0)});i.length&&(s=parseInt(k(i[0]).css("zIndex"),10)||0,k(i).each(function(t){k(this).css("zIndex",s+t)}),this.css("zIndex",s+i.length))}}),k.ui.plugin.add("draggable","zIndex",{start:function(t,e,i){e=k(e.helper),i=i.options;e.css("zIndex")&&(i._zIndex=e.css("zIndex")),e.css("zIndex",i.zIndex)},stop:function(t,e,i){i=i.options;i._zIndex&&k(e.helper).css("zIndex",i._zIndex)}});k.ui.draggable;k.widget("ui.resizable",k.ui.mouse,{version:"1.12.1",widgetEventPrefix:"resize",options:{alsoResize:!1,animate:!1,animateDuration:"slow",animateEasing:"swing",aspectRatio:!1,autoHide:!1,classes:{"ui-resizable-se":"ui-icon ui-icon-gripsmall-diagonal-se"},containment:!1,ghost:!1,grid:!1,handles:"e,s,se",helper:!1,maxHeight:null,maxWidth:null,minHeight:10,minWidth:10,zIndex:90,resize:null,start:null,stop:null},_num:function(t){return parseFloat(t)||0},_isNumber:function(t){return!isNaN(parseFloat(t))},_hasScroll:function(t,e){if("hidden"===k(t).css("overflow"))return!1;var i=e&&"left"===e?"scrollLeft":"scrollTop",e=!1;return 0<t[i]||(t[i]=1,e=0<t[i],t[i]=0,e)},_create:function(){var t,e=this.options,i=this;this._addClass("ui-resizable"),k.extend(this,{_aspectRatio:!!e.aspectRatio,aspectRatio:e.aspectRatio,originalElement:this.element,_proportionallyResizeElements:[],_helper:e.helper||e.ghost||e.animate?e.helper||"ui-resizable-helper":null}),this.element[0].nodeName.match(/^(canvas|textarea|input|select|button|img)$/i)&&(this.element.wrap(k("<div class='ui-wrapper' style='overflow: hidden;'></div>").css({position:this.element.css("position"),width:this.element.outerWidth(),height:this.element.outerHeight(),top:this.element.css("top"),left:this.element.css("left")})),this.element=this.element.parent().data("ui-resizable",this.element.resizable("instance")),this.elementIsWrapper=!0,t={marginTop:this.originalElement.css("marginTop"),marginRight:this.originalElement.css("marginRight"),marginBottom:this.originalElement.css("marginBottom"),marginLeft:this.originalElement.css("marginLeft")},this.element.css(t),this.originalElement.css("margin",0),this.originalResizeStyle=this.originalElement.css("resize"),this.originalElement.css("resize","none"),this._proportionallyResizeElements.push(this.originalElement.css({position:"static",zoom:1,display:"block"})),this.originalElement.css(t),this._proportionallyResize()),this._setupHandles(),e.autoHide&&k(this.element).on("mouseenter",function(){e.disabled||(i._removeClass("ui-resizable-autohide"),i._handles.show())}).on("mouseleave",function(){e.disabled||i.resizing||(i._addClass("ui-resizable-autohide"),i._handles.hide())}),this._mouseInit()},_destroy:function(){this._mouseDestroy();function t(t){k(t).removeData("resizable").removeData("ui-resizable").off(".resizable").find(".ui-resizable-handle").remove()}var e;return this.elementIsWrapper&&(t(this.element),e=this.element,this.originalElement.css({position:e.css("position"),width:e.outerWidth(),height:e.outerHeight(),top:e.css("top"),left:e.css("left")}).insertAfter(e),e.remove()),this.originalElement.css("resize",this.originalResizeStyle),t(this.originalElement),this},_setOption:function(t,e){this._super(t,e),"handles"===t&&(this._removeHandles(),this._setupHandles())},_setupHandles:function(){var t,e,i,s,n,o=this.options,a=this;if(this.handles=o.handles||(k(".ui-resizable-handle",this.element).length?{n:".ui-resizable-n",e:".ui-resizable-e",s:".ui-resizable-s",w:".ui-resizable-w",se:".ui-resizable-se",sw:".ui-resizable-sw",ne:".ui-resizable-ne",nw:".ui-resizable-nw"}:"e,s,se"),this._handles=k(),this.handles.constructor===String)for("all"===this.handles&&(this.handles="n,e,s,w,se,sw,ne,nw"),i=this.handles.split(","),this.handles={},e=0;e<i.length;e++)s="ui-resizable-"+(t=k.trim(i[e])),n=k("<div>"),this._addClass(n,"ui-resizable-handle "+s),n.css({zIndex:o.zIndex}),this.handles[t]=".ui-resizable-"+t,this.element.append(n);this._renderAxis=function(t){var e,i,s;for(e in t=t||this.element,this.handles)this.handles[e].constructor===String?this.handles[e]=this.element.children(this.handles[e]).first().show():(this.handles[e].jquery||this.handles[e].nodeType)&&(this.handles[e]=k(this.handles[e]),this._on(this.handles[e],{mousedown:a._mouseDown})),this.elementIsWrapper&&this.originalElement[0].nodeName.match(/^(textarea|input|select|button)$/i)&&(i=k(this.handles[e],this.element),s=/sw|ne|nw|se|n|s/.test(e)?i.outerHeight():i.outerWidth(),i=["padding",/ne|nw|n/.test(e)?"Top":/se|sw|s/.test(e)?"Bottom":/^e$/.test(e)?"Right":"Left"].join(""),t.css(i,s),this._proportionallyResize()),this._handles=this._handles.add(this.handles[e])},this._renderAxis(this.element),this._handles=this._handles.add(this.element.find(".ui-resizable-handle")),this._handles.disableSelection(),this._handles.on("mouseover",function(){a.resizing||(this.className&&(n=this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i)),a.axis=n&&n[1]?n[1]:"se")}),o.autoHide&&(this._handles.hide(),this._addClass("ui-resizable-autohide"))},_removeHandles:function(){this._handles.remove()},_mouseCapture:function(t){var e,i,s=!1;for(e in this.handles)(i=k(this.handles[e])[0])!==t.target&&!k.contains(i,t.target)||(s=!0);return!this.options.disabled&&s},_mouseStart:function(t){var e,i,s=this.options,n=this.element;return this.resizing=!0,this._renderProxy(),e=this._num(this.helper.css("left")),i=this._num(this.helper.css("top")),s.containment&&(e+=k(s.containment).scrollLeft()||0,i+=k(s.containment).scrollTop()||0),this.offset=this.helper.offset(),this.position={left:e,top:i},this.size=this._helper?{width:this.helper.width(),height:this.helper.height()}:{width:n.width(),height:n.height()},this.originalSize=this._helper?{width:n.outerWidth(),height:n.outerHeight()}:{width:n.width(),height:n.height()},this.sizeDiff={width:n.outerWidth()-n.width(),height:n.outerHeight()-n.height()},this.originalPosition={left:e,top:i},this.originalMousePosition={left:t.pageX,top:t.pageY},this.aspectRatio="number"==typeof s.aspectRatio?s.aspectRatio:this.originalSize.width/this.originalSize.height||1,s=k(".ui-resizable-"+this.axis).css("cursor"),k("body").css("cursor","auto"===s?this.axis+"-resize":s),this._addClass("ui-resizable-resizing"),this._propagate("start",t),!0},_mouseDrag:function(t){var e=this.originalMousePosition,i=this.axis,s=t.pageX-e.left||0,e=t.pageY-e.top||0,i=this._change[i];return this._updatePrevProperties(),i&&(e=i.apply(this,[t,s,e]),this._updateVirtualBoundaries(t.shiftKey),(this._aspectRatio||t.shiftKey)&&(e=this._updateRatio(e,t)),e=this._respectSize(e,t),this._updateCache(e),this._propagate("resize",t),e=this._applyChanges(),!this._helper&&this._proportionallyResizeElements.length&&this._proportionallyResize(),k.isEmptyObject(e)||(this._updatePrevProperties(),this._trigger("resize",t,this.ui()),this._applyChanges())),!1},_mouseStop:function(t){this.resizing=!1;var e,i,s,n=this.options,o=this;return this._helper&&(s=(e=(i=this._proportionallyResizeElements).length&&/textarea/i.test(i[0].nodeName))&&this._hasScroll(i[0],"left")?0:o.sizeDiff.height,i=e?0:o.sizeDiff.width,e={width:o.helper.width()-i,height:o.helper.height()-s},i=parseFloat(o.element.css("left"))+(o.position.left-o.originalPosition.left)||null,s=parseFloat(o.element.css("top"))+(o.position.top-o.originalPosition.top)||null,n.animate||this.element.css(k.extend(e,{top:s,left:i})),o.helper.height(o.size.height),o.helper.width(o.size.width),this._helper&&!n.animate&&this._proportionallyResize()),k("body").css("cursor","auto"),this._removeClass("ui-resizable-resizing"),this._propagate("stop",t),this._helper&&this.helper.remove(),!1},_updatePrevProperties:function(){this.prevPosition={top:this.position.top,left:this.position.left},this.prevSize={width:this.size.width,height:this.size.height}},_applyChanges:function(){var t={};return this.position.top!==this.prevPosition.top&&(t.top=this.position.top+"px"),this.position.left!==this.prevPosition.left&&(t.left=this.position.left+"px"),this.size.width!==this.prevSize.width&&(t.width=this.size.width+"px"),this.size.height!==this.prevSize.height&&(t.height=this.size.height+"px"),this.helper.css(t),t},_updateVirtualBoundaries:function(t){var e,i,s=this.options,n={minWidth:this._isNumber(s.minWidth)?s.minWidth:0,maxWidth:this._isNumber(s.maxWidth)?s.maxWidth:1/0,minHeight:this._isNumber(s.minHeight)?s.minHeight:0,maxHeight:this._isNumber(s.maxHeight)?s.maxHeight:1/0};(this._aspectRatio||t)&&(e=n.minHeight*this.aspectRatio,i=n.minWidth/this.aspectRatio,s=n.maxHeight*this.aspectRatio,t=n.maxWidth/this.aspectRatio,e>n.minWidth&&(n.minWidth=e),i>n.minHeight&&(n.minHeight=i),s<n.maxWidth&&(n.maxWidth=s),t<n.maxHeight&&(n.maxHeight=t)),this._vBoundaries=n},_updateCache:function(t){this.offset=this.helper.offset(),this._isNumber(t.left)&&(this.position.left=t.left),this._isNumber(t.top)&&(this.position.top=t.top),this._isNumber(t.height)&&(this.size.height=t.height),this._isNumber(t.width)&&(this.size.width=t.width)},_updateRatio:function(t){var e=this.position,i=this.size,s=this.axis;return this._isNumber(t.height)?t.width=t.height*this.aspectRatio:this._isNumber(t.width)&&(t.height=t.width/this.aspectRatio),"sw"===s&&(t.left=e.left+(i.width-t.width),t.top=null),"nw"===s&&(t.top=e.top+(i.height-t.height),t.left=e.left+(i.width-t.width)),t},_respectSize:function(t){var e=this._vBoundaries,i=this.axis,s=this._isNumber(t.width)&&e.maxWidth&&e.maxWidth<t.width,n=this._isNumber(t.height)&&e.maxHeight&&e.maxHeight<t.height,o=this._isNumber(t.width)&&e.minWidth&&e.minWidth>t.width,a=this._isNumber(t.height)&&e.minHeight&&e.minHeight>t.height,r=this.originalPosition.left+this.originalSize.width,l=this.originalPosition.top+this.originalSize.height,h=/sw|nw|w/.test(i),i=/nw|ne|n/.test(i);return o&&(t.width=e.minWidth),a&&(t.height=e.minHeight),s&&(t.width=e.maxWidth),n&&(t.height=e.maxHeight),o&&h&&(t.left=r-e.minWidth),s&&h&&(t.left=r-e.maxWidth),a&&i&&(t.top=l-e.minHeight),n&&i&&(t.top=l-e.maxHeight),t.width||t.height||t.left||!t.top?t.width||t.height||t.top||!t.left||(t.left=null):t.top=null,t},_getPaddingPlusBorderDimensions:function(t){for(var e=0,i=[],s=[t.css("borderTopWidth"),t.css("borderRightWidth"),t.css("borderBottomWidth"),t.css("borderLeftWidth")],n=[t.css("paddingTop"),t.css("paddingRight"),t.css("paddingBottom"),t.css("paddingLeft")];e<4;e++)i[e]=parseFloat(s[e])||0,i[e]+=parseFloat(n[e])||0;return{height:i[0]+i[2],width:i[1]+i[3]}},_proportionallyResize:function(){if(this._proportionallyResizeElements.length)for(var t,e=0,i=this.helper||this.element;e<this._proportionallyResizeElements.length;e++)t=this._proportionallyResizeElements[e],this.outerDimensions||(this.outerDimensions=this._getPaddingPlusBorderDimensions(t)),t.css({height:i.height()-this.outerDimensions.height||0,width:i.width()-this.outerDimensions.width||0})},_renderProxy:function(){var t=this.element,e=this.options;this.elementOffset=t.offset(),this._helper?(this.helper=this.helper||k("<div style='overflow:hidden;'></div>"),this._addClass(this.helper,this._helper),this.helper.css({width:this.element.outerWidth(),height:this.element.outerHeight(),position:"absolute",left:this.elementOffset.left+"px",top:this.elementOffset.top+"px",zIndex:++e.zIndex}),this.helper.appendTo("body").disableSelection()):this.helper=this.element},_change:{e:function(t,e){return{width:this.originalSize.width+e}},w:function(t,e){var i=this.originalSize;return{left:this.originalPosition.left+e,width:i.width-e}},n:function(t,e,i){var s=this.originalSize;return{top:this.originalPosition.top+i,height:s.height-i}},s:function(t,e,i){return{height:this.originalSize.height+i}},se:function(t,e,i){return k.extend(this._change.s.apply(this,arguments),this._change.e.apply(this,[t,e,i]))},sw:function(t,e,i){return k.extend(this._change.s.apply(this,arguments),this._change.w.apply(this,[t,e,i]))},ne:function(t,e,i){return k.extend(this._change.n.apply(this,arguments),this._change.e.apply(this,[t,e,i]))},nw:function(t,e,i){return k.extend(this._change.n.apply(this,arguments),this._change.w.apply(this,[t,e,i]))}},_propagate:function(t,e){k.ui.plugin.call(this,t,[e,this.ui()]),"resize"!==t&&this._trigger(t,e,this.ui())},plugins:{},ui:function(){return{originalElement:this.originalElement,element:this.element,helper:this.helper,position:this.position,size:this.size,originalSize:this.originalSize,originalPosition:this.originalPosition}}}),k.ui.plugin.add("resizable","animate",{stop:function(e){var i=k(this).resizable("instance"),t=i.options,s=i._proportionallyResizeElements,n=s.length&&/textarea/i.test(s[0].nodeName),o=n&&i._hasScroll(s[0],"left")?0:i.sizeDiff.height,a=n?0:i.sizeDiff.width,n={width:i.size.width-a,height:i.size.height-o},a=parseFloat(i.element.css("left"))+(i.position.left-i.originalPosition.left)||null,o=parseFloat(i.element.css("top"))+(i.position.top-i.originalPosition.top)||null;i.element.animate(k.extend(n,o&&a?{top:o,left:a}:{}),{duration:t.animateDuration,easing:t.animateEasing,step:function(){var t={width:parseFloat(i.element.css("width")),height:parseFloat(i.element.css("height")),top:parseFloat(i.element.css("top")),left:parseFloat(i.element.css("left"))};s&&s.length&&k(s[0]).css({width:t.width,height:t.height}),i._updateCache(t),i._propagate("resize",e)}})}}),k.ui.plugin.add("resizable","containment",{start:function(){var i,s,n=k(this).resizable("instance"),t=n.options,e=n.element,o=t.containment,a=o instanceof k?o.get(0):/parent/.test(o)?e.parent().get(0):o;a&&(n.containerElement=k(a),/document/.test(o)||o===document?(n.containerOffset={left:0,top:0},n.containerPosition={left:0,top:0},n.parentData={element:k(document),left:0,top:0,width:k(document).width(),height:k(document).height()||document.body.parentNode.scrollHeight}):(i=k(a),s=[],k(["Top","Right","Left","Bottom"]).each(function(t,e){s[t]=n._num(i.css("padding"+e))}),n.containerOffset=i.offset(),n.containerPosition=i.position(),n.containerSize={height:i.innerHeight()-s[3],width:i.innerWidth()-s[1]},t=n.containerOffset,e=n.containerSize.height,o=n.containerSize.width,o=n._hasScroll(a,"left")?a.scrollWidth:o,e=n._hasScroll(a)?a.scrollHeight:e,n.parentData={element:a,left:t.left,top:t.top,width:o,height:e}))},resize:function(t){var e=k(this).resizable("instance"),i=e.options,s=e.containerOffset,n=e.position,o=e._aspectRatio||t.shiftKey,a={top:0,left:0},r=e.containerElement,t=!0;r[0]!==document&&/static/.test(r.css("position"))&&(a=s),n.left<(e._helper?s.left:0)&&(e.size.width=e.size.width+(e._helper?e.position.left-s.left:e.position.left-a.left),o&&(e.size.height=e.size.width/e.aspectRatio,t=!1),e.position.left=i.helper?s.left:0),n.top<(e._helper?s.top:0)&&(e.size.height=e.size.height+(e._helper?e.position.top-s.top:e.position.top),o&&(e.size.width=e.size.height*e.aspectRatio,t=!1),e.position.top=e._helper?s.top:0),i=e.containerElement.get(0)===e.element.parent().get(0),n=/relative|absolute/.test(e.containerElement.css("position")),i&&n?(e.offset.left=e.parentData.left+e.position.left,e.offset.top=e.parentData.top+e.position.top):(e.offset.left=e.element.offset().left,e.offset.top=e.element.offset().top),n=Math.abs(e.sizeDiff.width+(e._helper?e.offset.left-a.left:e.offset.left-s.left)),s=Math.abs(e.sizeDiff.height+(e._helper?e.offset.top-a.top:e.offset.top-s.top)),n+e.size.width>=e.parentData.width&&(e.size.width=e.parentData.width-n,o&&(e.size.height=e.size.width/e.aspectRatio,t=!1)),s+e.size.height>=e.parentData.height&&(e.size.height=e.parentData.height-s,o&&(e.size.width=e.size.height*e.aspectRatio,t=!1)),t||(e.position.left=e.prevPosition.left,e.position.top=e.prevPosition.top,e.size.width=e.prevSize.width,e.size.height=e.prevSize.height)},stop:function(){var t=k(this).resizable("instance"),e=t.options,i=t.containerOffset,s=t.containerPosition,n=t.containerElement,o=k(t.helper),a=o.offset(),r=o.outerWidth()-t.sizeDiff.width,o=o.outerHeight()-t.sizeDiff.height;t._helper&&!e.animate&&/relative/.test(n.css("position"))&&k(this).css({left:a.left-s.left-i.left,width:r,height:o}),t._helper&&!e.animate&&/static/.test(n.css("position"))&&k(this).css({left:a.left-s.left-i.left,width:r,height:o})}}),k.ui.plugin.add("resizable","alsoResize",{start:function(){var t=k(this).resizable("instance").options;k(t.alsoResize).each(function(){var t=k(this);t.data("ui-resizable-alsoresize",{width:parseFloat(t.width()),height:parseFloat(t.height()),left:parseFloat(t.css("left")),top:parseFloat(t.css("top"))})})},resize:function(t,i){var e=k(this).resizable("instance"),s=e.options,n=e.originalSize,o=e.originalPosition,a={height:e.size.height-n.height||0,width:e.size.width-n.width||0,top:e.position.top-o.top||0,left:e.position.left-o.left||0};k(s.alsoResize).each(function(){var t=k(this),s=k(this).data("ui-resizable-alsoresize"),n={},e=t.parents(i.originalElement[0]).length?["width","height"]:["width","height","top","left"];k.each(e,function(t,e){var i=(s[e]||0)+(a[e]||0);i&&0<=i&&(n[e]=i||null)}),t.css(n)})},stop:function(){k(this).removeData("ui-resizable-alsoresize")}}),k.ui.plugin.add("resizable","ghost",{start:function(){var t=k(this).resizable("instance"),e=t.size;t.ghost=t.originalElement.clone(),t.ghost.css({opacity:.25,display:"block",position:"relative",height:e.height,width:e.width,margin:0,left:0,top:0}),t._addClass(t.ghost,"ui-resizable-ghost"),!1!==k.uiBackCompat&&"string"==typeof t.options.ghost&&t.ghost.addClass(this.options.ghost),t.ghost.appendTo(t.helper)},resize:function(){var t=k(this).resizable("instance");t.ghost&&t.ghost.css({position:"relative",height:t.size.height,width:t.size.width})},stop:function(){var t=k(this).resizable("instance");t.ghost&&t.helper&&t.helper.get(0).removeChild(t.ghost.get(0))}}),k.ui.plugin.add("resizable","grid",{resize:function(){var t,e=k(this).resizable("instance"),i=e.options,s=e.size,n=e.originalSize,o=e.originalPosition,a=e.axis,r="number"==typeof i.grid?[i.grid,i.grid]:i.grid,l=r[0]||1,h=r[1]||1,u=Math.round((s.width-n.width)/l)*l,c=Math.round((s.height-n.height)/h)*h,d=n.width+u,p=n.height+c,f=i.maxWidth&&i.maxWidth<d,g=i.maxHeight&&i.maxHeight<p,m=i.minWidth&&i.minWidth>d,s=i.minHeight&&i.minHeight>p;i.grid=r,m&&(d+=l),s&&(p+=h),f&&(d-=l),g&&(p-=h),/^(se|s|e)$/.test(a)?(e.size.width=d,e.size.height=p):/^(ne)$/.test(a)?(e.size.width=d,e.size.height=p,e.position.top=o.top-c):/^(sw)$/.test(a)?(e.size.width=d,e.size.height=p,e.position.left=o.left-u):((p-h<=0||d-l<=0)&&(t=e._getPaddingPlusBorderDimensions(this)),0<p-h?(e.size.height=p,e.position.top=o.top-c):(p=h-t.height,e.size.height=p,e.position.top=o.top+n.height-p),0<d-l?(e.size.width=d,e.position.left=o.left-u):(d=l-t.width,e.size.width=d,e.position.left=o.left+n.width-d))}});k.ui.resizable,k.widget("ui.menu",{version:"1.12.1",defaultElement:"<ul>",delay:300,options:{icons:{submenu:"ui-icon-caret-1-e"},items:"> *",menus:"ul",position:{my:"left top",at:"right top"},role:"menu",blur:null,focus:null,select:null},_create:function(){this.activeMenu=this.element,this.mouseHandled=!1,this.element.uniqueId().attr({role:this.options.role,tabIndex:0}),this._addClass("ui-menu","ui-widget ui-widget-content"),this._on({"mousedown .ui-menu-item":function(t){t.preventDefault()},"click .ui-menu-item":function(t){var e=k(t.target),i=k(k.ui.safeActiveElement(this.document[0]));!this.mouseHandled&&e.not(".ui-state-disabled").length&&(this.select(t),t.isPropagationStopped()||(this.mouseHandled=!0),e.has(".ui-menu").length?this.expand(t):!this.element.is(":focus")&&i.closest(".ui-menu").length&&(this.element.trigger("focus",[!0]),this.active&&1===this.active.parents(".ui-menu").length&&clearTimeout(this.timer)))},"mouseenter .ui-menu-item":function(t){var e,i;this.previousFilter||(e=k(t.target).closest(".ui-menu-item"),i=k(t.currentTarget),e[0]===i[0]&&(this._removeClass(i.siblings().children(".ui-state-active"),null,"ui-state-active"),this.focus(t,i)))},mouseleave:"collapseAll","mouseleave .ui-menu":"collapseAll",focus:function(t,e){var i=this.active||this.element.find(this.options.items).eq(0);e||this.focus(t,i)},blur:function(t){this._delay(function(){k.contains(this.element[0],k.ui.safeActiveElement(this.document[0]))||this.collapseAll(t)})},keydown:"_keydown"}),this.refresh(),this._on(this.document,{click:function(t){this._closeOnDocumentClick(t)&&this.collapseAll(t),this.mouseHandled=!1}})},_destroy:function(){var t=this.element.find(".ui-menu-item").removeAttr("role aria-disabled").children(".ui-menu-item-wrapper").removeUniqueId().removeAttr("tabIndex role aria-haspopup");this.element.removeAttr("aria-activedescendant").find(".ui-menu").addBack().removeAttr("role aria-labelledby aria-expanded aria-hidden aria-disabled tabIndex").removeUniqueId().show(),t.children().each(function(){var t=k(this);t.data("ui-menu-submenu-caret")&&t.remove()})},_keydown:function(t){var e,i,s,n=!0;switch(t.keyCode){case k.ui.keyCode.PAGE_UP:this.previousPage(t);break;case k.ui.keyCode.PAGE_DOWN:this.nextPage(t);break;case k.ui.keyCode.HOME:this._move("first","first",t);break;case k.ui.keyCode.END:this._move("last","last",t);break;case k.ui.keyCode.UP:this.previous(t);break;case k.ui.keyCode.DOWN:this.next(t);break;case k.ui.keyCode.LEFT:this.collapse(t);break;case k.ui.keyCode.RIGHT:this.active&&!this.active.is(".ui-state-disabled")&&this.expand(t);break;case k.ui.keyCode.ENTER:case k.ui.keyCode.SPACE:this._activate(t);break;case k.ui.keyCode.ESCAPE:this.collapse(t);break;default:n=!1,e=this.previousFilter||"",s=!1,i=96<=t.keyCode&&t.keyCode<=105?(t.keyCode-96).toString():String.fromCharCode(t.keyCode),clearTimeout(this.filterTimer),i===e?s=!0:i=e+i,e=this._filterMenuItems(i),(e=s&&-1!==e.index(this.active.next())?this.active.nextAll(".ui-menu-item"):e).length||(i=String.fromCharCode(t.keyCode),e=this._filterMenuItems(i)),e.length?(this.focus(t,e),this.previousFilter=i,this.filterTimer=this._delay(function(){delete this.previousFilter},1e3)):delete this.previousFilter}n&&t.preventDefault()},_activate:function(t){this.active&&!this.active.is(".ui-state-disabled")&&(this.active.children("[aria-haspopup='true']").length?this.expand(t):this.select(t))},refresh:function(){var t,e,s=this,n=this.options.icons.submenu,i=this.element.find(this.options.menus);this._toggleClass("ui-menu-icons",null,!!this.element.find(".ui-icon").length),e=i.filter(":not(.ui-menu)").hide().attr({role:this.options.role,"aria-hidden":"true","aria-expanded":"false"}).each(function(){var t=k(this),e=t.prev(),i=k("<span>").data("ui-menu-submenu-caret",!0);s._addClass(i,"ui-menu-icon","ui-icon "+n),e.attr("aria-haspopup","true").prepend(i),t.attr("aria-labelledby",e.attr("id"))}),this._addClass(e,"ui-menu","ui-widget ui-widget-content ui-front"),(t=i.add(this.element).find(this.options.items)).not(".ui-menu-item").each(function(){var t=k(this);s._isDivider(t)&&s._addClass(t,"ui-menu-divider","ui-widget-content")}),i=(e=t.not(".ui-menu-item, .ui-menu-divider")).children().not(".ui-menu").uniqueId().attr({tabIndex:-1,role:this._itemRole()}),this._addClass(e,"ui-menu-item")._addClass(i,"ui-menu-item-wrapper"),t.filter(".ui-state-disabled").attr("aria-disabled","true"),this.active&&!k.contains(this.element[0],this.active[0])&&this.blur()},_itemRole:function(){return{menu:"menuitem",listbox:"option"}[this.options.role]},_setOption:function(t,e){var i;"icons"===t&&(i=this.element.find(".ui-menu-icon"),this._removeClass(i,null,this.options.icons.submenu)._addClass(i,null,e.submenu)),this._super(t,e)},_setOptionDisabled:function(t){this._super(t),this.element.attr("aria-disabled",String(t)),this._toggleClass(null,"ui-state-disabled",!!t)},focus:function(t,e){var i;this.blur(t,t&&"focus"===t.type),this._scrollIntoView(e),this.active=e.first(),i=this.active.children(".ui-menu-item-wrapper"),this._addClass(i,null,"ui-state-active"),this.options.role&&this.element.attr("aria-activedescendant",i.attr("id")),i=this.active.parent().closest(".ui-menu-item").children(".ui-menu-item-wrapper"),this._addClass(i,null,"ui-state-active"),t&&"keydown"===t.type?this._close():this.timer=this._delay(function(){this._close()},this.delay),(i=e.children(".ui-menu")).length&&t&&/^mouse/.test(t.type)&&this._startOpening(i),this.activeMenu=e.parent(),this._trigger("focus",t,{item:e})},_scrollIntoView:function(t){var e,i,s;this._hasScroll()&&(i=parseFloat(k.css(this.activeMenu[0],"borderTopWidth"))||0,s=parseFloat(k.css(this.activeMenu[0],"paddingTop"))||0,e=t.offset().top-this.activeMenu.offset().top-i-s,i=this.activeMenu.scrollTop(),s=this.activeMenu.height(),t=t.outerHeight(),e<0?this.activeMenu.scrollTop(i+e):s<e+t&&this.activeMenu.scrollTop(i+e-s+t))},blur:function(t,e){e||clearTimeout(this.timer),this.active&&(this._removeClass(this.active.children(".ui-menu-item-wrapper"),null,"ui-state-active"),this._trigger("blur",t,{item:this.active}),this.active=null)},_startOpening:function(t){clearTimeout(this.timer),"true"===t.attr("aria-hidden")&&(this.timer=this._delay(function(){this._close(),this._open(t)},this.delay))},_open:function(t){var e=k.extend({of:this.active},this.options.position);clearTimeout(this.timer),this.element.find(".ui-menu").not(t.parents(".ui-menu")).hide().attr("aria-hidden","true"),t.show().removeAttr("aria-hidden").attr("aria-expanded","true").position(e)},collapseAll:function(e,i){clearTimeout(this.timer),this.timer=this._delay(function(){var t=i?this.element:k(e&&e.target).closest(this.element.find(".ui-menu"));t.length||(t=this.element),this._close(t),this.blur(e),this._removeClass(t.find(".ui-state-active"),null,"ui-state-active"),this.activeMenu=t},this.delay)},_close:function(t){(t=t||(this.active?this.active.parent():this.element)).find(".ui-menu").hide().attr("aria-hidden","true").attr("aria-expanded","false")},_closeOnDocumentClick:function(t){return!k(t.target).closest(".ui-menu").length},_isDivider:function(t){return!/[^\-\u2014\u2013\s]/.test(t.text())},collapse:function(t){var e=this.active&&this.active.parent().closest(".ui-menu-item",this.element);e&&e.length&&(this._close(),this.focus(t,e))},expand:function(t){var e=this.active&&this.active.children(".ui-menu ").find(this.options.items).first();e&&e.length&&(this._open(e.parent()),this._delay(function(){this.focus(t,e)}))},next:function(t){this._move("next","first",t)},previous:function(t){this._move("prev","last",t)},isFirstItem:function(){return this.active&&!this.active.prevAll(".ui-menu-item").length},isLastItem:function(){return this.active&&!this.active.nextAll(".ui-menu-item").length},_move:function(t,e,i){var s;this.active&&(s="first"===t||"last"===t?this.active["first"===t?"prevAll":"nextAll"](".ui-menu-item").eq(-1):this.active[t+"All"](".ui-menu-item").eq(0)),s&&s.length&&this.active||(s=this.activeMenu.find(this.options.items)[e]()),this.focus(i,s)},nextPage:function(t){var e,i,s;this.active?this.isLastItem()||(this._hasScroll()?(i=this.active.offset().top,s=this.element.height(),this.active.nextAll(".ui-menu-item").each(function(){return(e=k(this)).offset().top-i-s<0}),this.focus(t,e)):this.focus(t,this.activeMenu.find(this.options.items)[this.active?"last":"first"]())):this.next(t)},previousPage:function(t){var e,i,s;this.active?this.isFirstItem()||(this._hasScroll()?(i=this.active.offset().top,s=this.element.height(),this.active.prevAll(".ui-menu-item").each(function(){return 0<(e=k(this)).offset().top-i+s}),this.focus(t,e)):this.focus(t,this.activeMenu.find(this.options.items).first())):this.next(t)},_hasScroll:function(){return this.element.outerHeight()<this.element.prop("scrollHeight")},select:function(t){this.active=this.active||k(t.target).closest(".ui-menu-item");var e={item:this.active};this.active.has(".ui-menu").length||this.collapseAll(t,!0),this._trigger("select",t,e)},_filterMenuItems:function(t){var t=t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"),e=new RegExp("^"+t,"i");return this.activeMenu.find(this.options.items).filter(".ui-menu-item").filter(function(){return e.test(k.trim(k(this).children(".ui-menu-item-wrapper").text()))})}});k.widget("ui.autocomplete",{version:"1.12.1",defaultElement:"<input>",options:{appendTo:null,autoFocus:!1,delay:300,minLength:1,position:{my:"left top",at:"left bottom",collision:"none"},source:null,change:null,close:null,focus:null,open:null,response:null,search:null,select:null},requestIndex:0,pending:0,_create:function(){var i,s,n,t=this.element[0].nodeName.toLowerCase(),e="textarea"===t,t="input"===t;this.isMultiLine=e||!t&&this._isContentEditable(this.element),this.valueMethod=this.element[e||t?"val":"text"],this.isNewMenu=!0,this._addClass("ui-autocomplete-input"),this.element.attr("autocomplete","off"),this._on(this.element,{keydown:function(t){if(this.element.prop("readOnly"))s=n=i=!0;else{s=n=i=!1;var e=k.ui.keyCode;switch(t.keyCode){case e.PAGE_UP:i=!0,this._move("previousPage",t);break;case e.PAGE_DOWN:i=!0,this._move("nextPage",t);break;case e.UP:i=!0,this._keyEvent("previous",t);break;case e.DOWN:i=!0,this._keyEvent("next",t);break;case e.ENTER:this.menu.active&&(i=!0,t.preventDefault(),this.menu.select(t));break;case e.TAB:this.menu.active&&this.menu.select(t);break;case e.ESCAPE:this.menu.element.is(":visible")&&(this.isMultiLine||this._value(this.term),this.close(t),t.preventDefault());break;default:s=!0,this._searchTimeout(t)}}},keypress:function(t){if(i)return i=!1,void(this.isMultiLine&&!this.menu.element.is(":visible")||t.preventDefault());if(!s){var e=k.ui.keyCode;switch(t.keyCode){case e.PAGE_UP:this._move("previousPage",t);break;case e.PAGE_DOWN:this._move("nextPage",t);break;case e.UP:this._keyEvent("previous",t);break;case e.DOWN:this._keyEvent("next",t)}}},input:function(t){if(n)return n=!1,void t.preventDefault();this._searchTimeout(t)},focus:function(){this.selectedItem=null,this.previous=this._value()},blur:function(t){this.cancelBlur?delete this.cancelBlur:(clearTimeout(this.searching),this.close(t),this._change(t))}}),this._initSource(),this.menu=k("<ul>").appendTo(this._appendTo()).menu({role:null}).hide().menu("instance"),this._addClass(this.menu.element,"ui-autocomplete","ui-front"),this._on(this.menu.element,{mousedown:function(t){t.preventDefault(),this.cancelBlur=!0,this._delay(function(){delete this.cancelBlur,this.element[0]!==k.ui.safeActiveElement(this.document[0])&&this.element.trigger("focus")})},menufocus:function(t,e){var i;if(this.isNewMenu&&(this.isNewMenu=!1,t.originalEvent&&/^mouse/.test(t.originalEvent.type)))return this.menu.blur(),void this.document.one("mousemove",function(){k(t.target).trigger(t.originalEvent)});i=e.item.data("ui-autocomplete-item"),!1!==this._trigger("focus",t,{item:i})&&t.originalEvent&&/^key/.test(t.originalEvent.type)&&this._value(i.value),(i=e.item.attr("aria-label")||i.value)&&k.trim(i).length&&(this.liveRegion.children().hide(),k("<div>").text(i).appendTo(this.liveRegion))},menuselect:function(t,e){var i=e.item.data("ui-autocomplete-item"),s=this.previous;this.element[0]!==k.ui.safeActiveElement(this.document[0])&&(this.element.trigger("focus"),this.previous=s,this._delay(function(){this.previous=s,this.selectedItem=i})),!1!==this._trigger("select",t,{item:i})&&this._value(i.value),this.term=this._value(),this.close(t),this.selectedItem=i}}),this.liveRegion=k("<div>",{role:"status","aria-live":"assertive","aria-relevant":"additions"}).appendTo(this.document[0].body),this._addClass(this.liveRegion,null,"ui-helper-hidden-accessible"),this._on(this.window,{beforeunload:function(){this.element.removeAttr("autocomplete")}})},_destroy:function(){clearTimeout(this.searching),this.element.removeAttr("autocomplete"),this.menu.element.remove(),this.liveRegion.remove()},_setOption:function(t,e){this._super(t,e),"source"===t&&this._initSource(),"appendTo"===t&&this.menu.element.appendTo(this._appendTo()),"disabled"===t&&e&&this.xhr&&this.xhr.abort()},_isEventTargetInWidget:function(t){var e=this.menu.element[0];return t.target===this.element[0]||t.target===e||k.contains(e,t.target)},_closeOnClickOutside:function(t){this._isEventTargetInWidget(t)||this.close()},_appendTo:function(){var t=this.options.appendTo;return(t=t&&(t.jquery||t.nodeType?k(t):this.document.find(t).eq(0)))&&t[0]||(t=this.element.closest(".ui-front, dialog")),t.length||(t=this.document[0].body),t},_initSource:function(){var i,s,n=this;k.isArray(this.options.source)?(i=this.options.source,this.source=function(t,e){e(k.ui.autocomplete.filter(i,t.term))}):"string"==typeof this.options.source?(s=this.options.source,this.source=function(t,e){n.xhr&&n.xhr.abort(),n.xhr=k.ajax({url:s,data:t,dataType:"json",success:function(t){e(t)},error:function(){e([])}})}):this.source=this.options.source},_searchTimeout:function(s){clearTimeout(this.searching),this.searching=this._delay(function(){var t=this.term===this._value(),e=this.menu.element.is(":visible"),i=s.altKey||s.ctrlKey||s.metaKey||s.shiftKey;t&&(!t||e||i)||(this.selectedItem=null,this.search(null,s))},this.options.delay)},search:function(t,e){return t=null!=t?t:this._value(),this.term=this._value(),t.length<this.options.minLength?this.close(e):!1!==this._trigger("search",e)?this._search(t):void 0},_search:function(t){this.pending++,this._addClass("ui-autocomplete-loading"),this.cancelSearch=!1,this.source({term:t},this._response())},_response:function(){var e=++this.requestIndex;return k.proxy(function(t){e===this.requestIndex&&this.__response(t),this.pending--,this.pending||this._removeClass("ui-autocomplete-loading")},this)},__response:function(t){t=t&&this._normalize(t),this._trigger("response",null,{content:t}),!this.options.disabled&&t&&t.length&&!this.cancelSearch?(this._suggest(t),this._trigger("open")):this._close()},close:function(t){this.cancelSearch=!0,this._close(t)},_close:function(t){this._off(this.document,"mousedown"),this.menu.element.is(":visible")&&(this.menu.element.hide(),this.menu.blur(),this.isNewMenu=!0,this._trigger("close",t))},_change:function(t){this.previous!==this._value()&&this._trigger("change",t,{item:this.selectedItem})},_normalize:function(t){return t.length&&t[0].label&&t[0].value?t:k.map(t,function(t){return"string"==typeof t?{label:t,value:t}:k.extend({},t,{label:t.label||t.value,value:t.value||t.label})})},_suggest:function(t){var e=this.menu.element.empty();this._renderMenu(e,t),this.isNewMenu=!0,this.menu.refresh(),e.show(),this._resizeMenu(),e.position(k.extend({of:this.element},this.options.position)),this.options.autoFocus&&this.menu.next(),this._on(this.document,{mousedown:"_closeOnClickOutside"})},_resizeMenu:function(){var t=this.menu.element;t.outerWidth(Math.max(t.width("").outerWidth()+1,this.element.outerWidth()))},_renderMenu:function(i,t){var s=this;k.each(t,function(t,e){s._renderItemData(i,e)})},_renderItemData:function(t,e){return this._renderItem(t,e).data("ui-autocomplete-item",e)},_renderItem:function(t,e){return k("<li>").append(k("<div>").text(e.label)).appendTo(t)},_move:function(t,e){if(this.menu.element.is(":visible"))return this.menu.isFirstItem()&&/^previous/.test(t)||this.menu.isLastItem()&&/^next/.test(t)?(this.isMultiLine||this._value(this.term),void this.menu.blur()):void this.menu[t](e);this.search(null,e)},widget:function(){return this.menu.element},_value:function(){return this.valueMethod.apply(this.element,arguments)},_keyEvent:function(t,e){this.isMultiLine&&!this.menu.element.is(":visible")||(this._move(t,e),e.preventDefault())},_isContentEditable:function(t){if(!t.length)return!1;var e=t.prop("contentEditable");return"inherit"===e?this._isContentEditable(t.parent()):"true"===e}}),k.extend(k.ui.autocomplete,{escapeRegex:function(t){return t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")},filter:function(t,e){var i=new RegExp(k.ui.autocomplete.escapeRegex(e),"i");return k.grep(t,function(t){return i.test(t.label||t.value||t)})}}),k.widget("ui.autocomplete",k.ui.autocomplete,{options:{messages:{noResults:"No search results.",results:function(t){return t+(1<t?" results are":" result is")+" available, use up and down arrow keys to navigate."}}},__response:function(t){var e;this._superApply(arguments),this.options.disabled||this.cancelSearch||(e=t&&t.length?this.options.messages.results(t.length):this.options.messages.noResults,this.liveRegion.children().hide(),k("<div>").text(e).appendTo(this.liveRegion))}});k.ui.autocomplete;var p=/ui-corner-([a-z]){2,6}/g;k.widget("ui.controlgroup",{version:"1.12.1",defaultElement:"<div>",options:{direction:"horizontal",disabled:null,onlyVisible:!0,items:{button:"input[type=button], input[type=submit], input[type=reset], button, a",controlgroupLabel:".ui-controlgroup-label",checkboxradio:"input[type='checkbox'], input[type='radio']",selectmenu:"select",spinner:".ui-spinner-input"}},_create:function(){this._enhance()},_enhance:function(){this.element.attr("role","toolbar"),this.refresh()},_destroy:function(){this._callChildMethod("destroy"),this.childWidgets.removeData("ui-controlgroup-data"),this.element.removeAttr("role"),this.options.items.controlgroupLabel&&this.element.find(this.options.items.controlgroupLabel).find(".ui-controlgroup-label-contents").contents().unwrap()},_initWidgets:function(){var o=this,a=[];k.each(this.options.items,function(s,t){var e,n={};if(t)return"controlgroupLabel"===s?((e=o.element.find(t)).each(function(){var t=k(this);t.children(".ui-controlgroup-label-contents").length||t.contents().wrapAll("<span class='ui-controlgroup-label-contents'></span>")}),o._addClass(e,null,"ui-widget ui-widget-content ui-state-default"),void(a=a.concat(e.get()))):void(k.fn[s]&&(n=o["_"+s+"Options"]?o["_"+s+"Options"]("middle"):{classes:{}},o.element.find(t).each(function(){var t=k(this),e=t[s]("instance"),i=k.widget.extend({},n);"button"===s&&t.parent(".ui-spinner").length||((e=e||t[s]()[s]("instance"))&&(i.classes=o._resolveClassesValues(i.classes,e)),t[s](i),i=t[s]("widget"),k.data(i[0],"ui-controlgroup-data",e||t[s]("instance")),a.push(i[0]))})))}),this.childWidgets=k(k.unique(a)),this._addClass(this.childWidgets,"ui-controlgroup-item")},_callChildMethod:function(e){this.childWidgets.each(function(){var t=k(this).data("ui-controlgroup-data");t&&t[e]&&t[e]()})},_updateCornerClass:function(t,e){e=this._buildSimpleOptions(e,"label").classes.label;this._removeClass(t,null,"ui-corner-top ui-corner-bottom ui-corner-left ui-corner-right ui-corner-all"),this._addClass(t,null,e)},_buildSimpleOptions:function(t,e){var i="vertical"===this.options.direction,s={classes:{}};return s.classes[e]={middle:"",first:"ui-corner-"+(i?"top":"left"),last:"ui-corner-"+(i?"bottom":"right"),only:"ui-corner-all"}[t],s},_spinnerOptions:function(t){t=this._buildSimpleOptions(t,"ui-spinner");return t.classes["ui-spinner-up"]="",t.classes["ui-spinner-down"]="",t},_buttonOptions:function(t){return this._buildSimpleOptions(t,"ui-button")},_checkboxradioOptions:function(t){return this._buildSimpleOptions(t,"ui-checkboxradio-label")},_selectmenuOptions:function(t){var e="vertical"===this.options.direction;return{width:e&&"auto",classes:{middle:{"ui-selectmenu-button-open":"","ui-selectmenu-button-closed":""},first:{"ui-selectmenu-button-open":"ui-corner-"+(e?"top":"tl"),"ui-selectmenu-button-closed":"ui-corner-"+(e?"top":"left")},last:{"ui-selectmenu-button-open":e?"":"ui-corner-tr","ui-selectmenu-button-closed":"ui-corner-"+(e?"bottom":"right")},only:{"ui-selectmenu-button-open":"ui-corner-top","ui-selectmenu-button-closed":"ui-corner-all"}}[t]}},_resolveClassesValues:function(i,s){var n={};return k.each(i,function(t){var e=s.options.classes[t]||"",e=k.trim(e.replace(p,""));n[t]=(e+" "+i[t]).replace(/\s+/g," ")}),n},_setOption:function(t,e){"direction"===t&&this._removeClass("ui-controlgroup-"+this.options.direction),this._super(t,e),"disabled"!==t?this.refresh():this._callChildMethod(e?"disable":"enable")},refresh:function(){var n,o=this;this._addClass("ui-controlgroup ui-controlgroup-"+this.options.direction),"horizontal"===this.options.direction&&this._addClass(null,"ui-helper-clearfix"),this._initWidgets(),n=this.childWidgets,this.options.onlyVisible&&(n=n.filter(":visible")),n.length&&(k.each(["first","last"],function(t,e){var i,s=n[e]().data("ui-controlgroup-data");s&&o["_"+s.widgetName+"Options"]?((i=o["_"+s.widgetName+"Options"](1===n.length?"only":e)).classes=o._resolveClassesValues(i.classes,s),s.element[s.widgetName](i)):o._updateCornerClass(n[e](),e)}),this._callChildMethod("refresh"))}});k.widget("ui.checkboxradio",[k.ui.formResetMixin,{version:"1.12.1",options:{disabled:null,label:null,icon:!0,classes:{"ui-checkboxradio-label":"ui-corner-all","ui-checkboxradio-icon":"ui-corner-all"}},_getCreateOptions:function(){var t,e=this,i=this._super()||{};return this._readType(),t=this.element.labels(),this.label=k(t[t.length-1]),this.label.length||k.error("No label found for checkboxradio widget"),this.originalLabel="",this.label.contents().not(this.element[0]).each(function(){e.originalLabel+=3===this.nodeType?k(this).text():this.outerHTML}),this.originalLabel&&(i.label=this.originalLabel),null!=(t=this.element[0].disabled)&&(i.disabled=t),i},_create:function(){var t=this.element[0].checked;this._bindFormResetHandler(),null==this.options.disabled&&(this.options.disabled=this.element[0].disabled),this._setOption("disabled",this.options.disabled),this._addClass("ui-checkboxradio","ui-helper-hidden-accessible"),this._addClass(this.label,"ui-checkboxradio-label","ui-button ui-widget"),"radio"===this.type&&this._addClass(this.label,"ui-checkboxradio-radio-label"),this.options.label&&this.options.label!==this.originalLabel?this._updateLabel():this.originalLabel&&(this.options.label=this.originalLabel),this._enhance(),t&&(this._addClass(this.label,"ui-checkboxradio-checked","ui-state-active"),this.icon&&this._addClass(this.icon,null,"ui-state-hover")),this._on({change:"_toggleClasses",focus:function(){this._addClass(this.label,null,"ui-state-focus ui-visual-focus")},blur:function(){this._removeClass(this.label,null,"ui-state-focus ui-visual-focus")}})},_readType:function(){var t=this.element[0].nodeName.toLowerCase();this.type=this.element[0].type,"input"===t&&/radio|checkbox/.test(this.type)||k.error("Can't create checkboxradio on element.nodeName="+t+" and element.type="+this.type)},_enhance:function(){this._updateIcon(this.element[0].checked)},widget:function(){return this.label},_getRadioGroup:function(){var t=this.element[0].name,e="input[name='"+k.ui.escapeSelector(t)+"']";return t?(this.form.length?k(this.form[0].elements).filter(e):k(e).filter(function(){return 0===k(this).form().length})).not(this.element):k([])},_toggleClasses:function(){var t=this.element[0].checked;this._toggleClass(this.label,"ui-checkboxradio-checked","ui-state-active",t),this.options.icon&&"checkbox"===this.type&&this._toggleClass(this.icon,null,"ui-icon-check ui-state-checked",t)._toggleClass(this.icon,null,"ui-icon-blank",!t),"radio"===this.type&&this._getRadioGroup().each(function(){var t=k(this).checkboxradio("instance");t&&t._removeClass(t.label,"ui-checkboxradio-checked","ui-state-active")})},_destroy:function(){this._unbindFormResetHandler(),this.icon&&(this.icon.remove(),this.iconSpace.remove())},_setOption:function(t,e){if("label"!==t||e){if(this._super(t,e),"disabled"===t)return this._toggleClass(this.label,null,"ui-state-disabled",e),void(this.element[0].disabled=e);this.refresh()}},_updateIcon:function(t){var e="ui-icon ui-icon-background ";this.options.icon?(this.icon||(this.icon=k("<span>"),this.iconSpace=k("<span> </span>"),this._addClass(this.iconSpace,"ui-checkboxradio-icon-space")),"checkbox"===this.type?(e+=t?"ui-icon-check ui-state-checked":"ui-icon-blank",this._removeClass(this.icon,null,t?"ui-icon-blank":"ui-icon-check")):e+="ui-icon-blank",this._addClass(this.icon,"ui-checkboxradio-icon",e),t||this._removeClass(this.icon,null,"ui-icon-check ui-state-checked"),this.icon.prependTo(this.label).after(this.iconSpace)):void 0!==this.icon&&(this.icon.remove(),this.iconSpace.remove(),delete this.icon)},_updateLabel:function(){var t=this.label.contents().not(this.element[0]);this.icon&&(t=t.not(this.icon[0])),this.iconSpace&&(t=t.not(this.iconSpace[0])),t.remove(),this.label.append(this.options.label)},refresh:function(){var t=this.element[0].checked,e=this.element[0].disabled;this._updateIcon(t),this._toggleClass(this.label,"ui-checkboxradio-checked","ui-state-active",t),null!==this.options.label&&this._updateLabel(),e!==this.options.disabled&&this._setOptions({disabled:e})}}]);var f;k.ui.checkboxradio;k.widget("ui.button",{version:"1.12.1",defaultElement:"<button>",options:{classes:{"ui-button":"ui-corner-all"},disabled:null,icon:null,iconPosition:"beginning",label:null,showLabel:!0},_getCreateOptions:function(){var t,e=this._super()||{};return this.isInput=this.element.is("input"),null!=(t=this.element[0].disabled)&&(e.disabled=t),this.originalLabel=this.isInput?this.element.val():this.element.html(),this.originalLabel&&(e.label=this.originalLabel),e},_create:function(){!this.option.showLabel&!this.options.icon&&(this.options.showLabel=!0),null==this.options.disabled&&(this.options.disabled=this.element[0].disabled||!1),this.hasTitle=!!this.element.attr("title"),this.options.label&&this.options.label!==this.originalLabel&&(this.isInput?this.element.val(this.options.label):this.element.html(this.options.label)),this._addClass("ui-button","ui-widget"),this._setOption("disabled",this.options.disabled),this._enhance(),this.element.is("a")&&this._on({keyup:function(t){t.keyCode===k.ui.keyCode.SPACE&&(t.preventDefault(),this.element[0].click?this.element[0].click():this.element.trigger("click"))}})},_enhance:function(){this.element.is("button")||this.element.attr("role","button"),this.options.icon&&(this._updateIcon("icon",this.options.icon),this._updateTooltip())},_updateTooltip:function(){this.title=this.element.attr("title"),this.options.showLabel||this.title||this.element.attr("title",this.options.label)},_updateIcon:function(t,e){var i="iconPosition"!==t,s=i?this.options.iconPosition:e,t="top"===s||"bottom"===s;this.icon?i&&this._removeClass(this.icon,null,this.options.icon):(this.icon=k("<span>"),this._addClass(this.icon,"ui-button-icon","ui-icon"),this.options.showLabel||this._addClass("ui-button-icon-only")),i&&this._addClass(this.icon,null,e),this._attachIcon(s),t?(this._addClass(this.icon,null,"ui-widget-icon-block"),this.iconSpace&&this.iconSpace.remove()):(this.iconSpace||(this.iconSpace=k("<span> </span>"),this._addClass(this.iconSpace,"ui-button-icon-space")),this._removeClass(this.icon,null,"ui-wiget-icon-block"),this._attachIconSpace(s))},_destroy:function(){this.element.removeAttr("role"),this.icon&&this.icon.remove(),this.iconSpace&&this.iconSpace.remove(),this.hasTitle||this.element.removeAttr("title")},_attachIconSpace:function(t){this.icon[/^(?:end|bottom)/.test(t)?"before":"after"](this.iconSpace)},_attachIcon:function(t){this.element[/^(?:end|bottom)/.test(t)?"append":"prepend"](this.icon)},_setOptions:function(t){var e=(void 0===t.showLabel?this.options:t).showLabel,i=(void 0===t.icon?this.options:t).icon;e||i||(t.showLabel=!0),this._super(t)},_setOption:function(t,e){"icon"===t&&(e?this._updateIcon(t,e):this.icon&&(this.icon.remove(),this.iconSpace&&this.iconSpace.remove())),"iconPosition"===t&&this._updateIcon(t,e),"showLabel"===t&&(this._toggleClass("ui-button-icon-only",null,!e),this._updateTooltip()),"label"===t&&(this.isInput?this.element.val(e):(this.element.html(e),this.icon&&(this._attachIcon(this.options.iconPosition),this._attachIconSpace(this.options.iconPosition)))),this._super(t,e),"disabled"===t&&(this._toggleClass(null,"ui-state-disabled",e),(this.element[0].disabled=e)&&this.element.blur())},refresh:function(){var t=this.element.is("input, button")?this.element[0].disabled:this.element.hasClass("ui-button-disabled");t!==this.options.disabled&&this._setOptions({disabled:t}),this._updateTooltip()}}),!1!==k.uiBackCompat&&(k.widget("ui.button",k.ui.button,{options:{text:!0,icons:{primary:null,secondary:null}},_create:function(){this.options.showLabel&&!this.options.text&&(this.options.showLabel=this.options.text),!this.options.showLabel&&this.options.text&&(this.options.text=this.options.showLabel),this.options.icon||!this.options.icons.primary&&!this.options.icons.secondary?this.options.icon&&(this.options.icons.primary=this.options.icon):this.options.icons.primary?this.options.icon=this.options.icons.primary:(this.options.icon=this.options.icons.secondary,this.options.iconPosition="end"),this._super()},_setOption:function(t,e){"text"!==t?("showLabel"===t&&(this.options.text=e),"icon"===t&&(this.options.icons.primary=e),"icons"===t&&(e.primary?(this._super("icon",e.primary),this._super("iconPosition","beginning")):e.secondary&&(this._super("icon",e.secondary),this._super("iconPosition","end"))),this._superApply(arguments)):this._super("showLabel",e)}}),k.fn.button=(f=k.fn.button,function(){return!this.length||this.length&&"INPUT"!==this[0].tagName||this.length&&"INPUT"===this[0].tagName&&"checkbox"!==this.attr("type")&&"radio"!==this.attr("type")?f.apply(this,arguments):(k.ui.checkboxradio||k.error("Checkboxradio widget missing"),0===arguments.length?this.checkboxradio({icon:!1}):this.checkboxradio.apply(this,arguments))}),k.fn.buttonset=function(){return k.ui.controlgroup||k.error("Controlgroup widget missing"),"option"===arguments[0]&&"items"===arguments[1]&&arguments[2]?this.controlgroup.apply(this,[arguments[0],"items.button",arguments[2]]):"option"===arguments[0]&&"items"===arguments[1]?this.controlgroup.apply(this,[arguments[0],"items.button"]):("object"==typeof arguments[0]&&arguments[0].items&&(arguments[0].items={button:arguments[0].items}),this.controlgroup.apply(this,arguments))});var g;k.ui.button;function m(){this._curInst=null,this._keyEvent=!1,this._disabledInputs=[],this._datepickerShowing=!1,this._inDialog=!1,this._mainDivId="ui-datepicker-div",this._inlineClass="ui-datepicker-inline",this._appendClass="ui-datepicker-append",this._triggerClass="ui-datepicker-trigger",this._dialogClass="ui-datepicker-dialog",this._disableClass="ui-datepicker-disabled",this._unselectableClass="ui-datepicker-unselectable",this._currentClass="ui-datepicker-current-day",this._dayOverClass="ui-datepicker-days-cell-over",this.regional=[],this.regional[""]={closeText:"Done",prevText:"Prev",nextText:"Next",currentText:"Today",monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayNamesMin:["Su","Mo","Tu","We","Th","Fr","Sa"],weekHeader:"Wk",dateFormat:"mm/dd/yy",firstDay:0,isRTL:!1,showMonthAfterYear:!1,yearSuffix:""},this._defaults={showOn:"focus",showAnim:"fadeIn",showOptions:{},defaultDate:null,appendText:"",buttonText:"...",buttonImage:"",buttonImageOnly:!1,hideIfNoPrevNext:!1,navigationAsDateFormat:!1,gotoCurrent:!1,changeMonth:!1,changeYear:!1,yearRange:"c-10:c+10",showOtherMonths:!1,selectOtherMonths:!1,showWeek:!1,calculateWeek:this.iso8601Week,shortYearCutoff:"+10",minDate:null,maxDate:null,duration:"fast",beforeShowDay:null,beforeShow:null,onSelect:null,onChangeMonthYear:null,onClose:null,numberOfMonths:1,showCurrentAtPos:0,stepMonths:1,stepBigMonths:12,altField:"",altFormat:"",constrainInput:!0,showButtonPanel:!1,autoSize:!1,disabled:!1},k.extend(this._defaults,this.regional[""]),this.regional.en=k.extend(!0,{},this.regional[""]),this.regional["en-US"]=k.extend(!0,{},this.regional.en),this.dpDiv=_(k("<div id='"+this._mainDivId+"' class='ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"))}function _(t){var e="button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a";return t.on("mouseout",e,function(){k(this).removeClass("ui-state-hover"),-1!==this.className.indexOf("ui-datepicker-prev")&&k(this).removeClass("ui-datepicker-prev-hover"),-1!==this.className.indexOf("ui-datepicker-next")&&k(this).removeClass("ui-datepicker-next-hover")}).on("mouseover",e,v)}function v(){k.datepicker._isDisabledDatepicker((g.inline?g.dpDiv.parent():g.input)[0])||(k(this).parents(".ui-datepicker-calendar").find("a").removeClass("ui-state-hover"),k(this).addClass("ui-state-hover"),-1!==this.className.indexOf("ui-datepicker-prev")&&k(this).addClass("ui-datepicker-prev-hover"),-1!==this.className.indexOf("ui-datepicker-next")&&k(this).addClass("ui-datepicker-next-hover"))}function b(t,e){for(var i in k.extend(t,e),e)null==e[i]&&(t[i]=e[i]);return t}k.extend(k.ui,{datepicker:{version:"1.12.1"}}),k.extend(m.prototype,{markerClassName:"hasDatepicker",maxRows:4,_widgetDatepicker:function(){return this.dpDiv},setDefaults:function(t){return b(this._defaults,t||{}),this},_attachDatepicker:function(t,e){var i,s=t.nodeName.toLowerCase(),n="div"===s||"span"===s;t.id||(this.uuid+=1,t.id="dp"+this.uuid),(i=this._newInst(k(t),n)).settings=k.extend({},e||{}),"input"===s?this._connectDatepicker(t,i):n&&this._inlineDatepicker(t,i)},_newInst:function(t,e){return{id:t[0].id.replace(/([^A-Za-z0-9_\-])/g,"\\\\$1"),input:t,selectedDay:0,selectedMonth:0,selectedYear:0,drawMonth:0,drawYear:0,inline:e,dpDiv:e?_(k("<div class='"+this._inlineClass+" ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>")):this.dpDiv}},_connectDatepicker:function(t,e){var i=k(t);e.append=k([]),e.trigger=k([]),i.hasClass(this.markerClassName)||(this._attachments(i,e),i.addClass(this.markerClassName).on("keydown",this._doKeyDown).on("keypress",this._doKeyPress).on("keyup",this._doKeyUp),this._autoSize(e),k.data(t,"datepicker",e),e.settings.disabled&&this._disableDatepicker(t))},_attachments:function(t,e){var i,s=this._get(e,"appendText"),n=this._get(e,"isRTL");e.append&&e.append.remove(),s&&(e.append=k("<span class='"+this._appendClass+"'>"+s+"</span>"),t[n?"before":"after"](e.append)),t.off("focus",this._showDatepicker),e.trigger&&e.trigger.remove(),"focus"!==(i=this._get(e,"showOn"))&&"both"!==i||t.on("focus",this._showDatepicker),"button"!==i&&"both"!==i||(s=this._get(e,"buttonText"),i=this._get(e,"buttonImage"),e.trigger=k(this._get(e,"buttonImageOnly")?k("<img/>").addClass(this._triggerClass).attr({src:i,alt:s,title:s}):k("<button type='button'></button>").addClass(this._triggerClass).html(i?k("<img/>").attr({src:i,alt:s,title:s}):s)),t[n?"before":"after"](e.trigger),e.trigger.on("click",function(){return k.datepicker._datepickerShowing&&k.datepicker._lastInput===t[0]?k.datepicker._hideDatepicker():(k.datepicker._datepickerShowing&&k.datepicker._lastInput!==t[0]&&k.datepicker._hideDatepicker(),k.datepicker._showDatepicker(t[0])),!1}))},_autoSize:function(t){var e,i,s,n,o,a;this._get(t,"autoSize")&&!t.inline&&(o=new Date(2009,11,20),(a=this._get(t,"dateFormat")).match(/[DM]/)&&(e=function(t){for(n=s=i=0;n<t.length;n++)t[n].length>i&&(i=t[n].length,s=n);return s},o.setMonth(e(this._get(t,a.match(/MM/)?"monthNames":"monthNamesShort"))),o.setDate(e(this._get(t,a.match(/DD/)?"dayNames":"dayNamesShort"))+20-o.getDay())),t.input.attr("size",this._formatDate(t,o).length))},_inlineDatepicker:function(t,e){var i=k(t);i.hasClass(this.markerClassName)||(i.addClass(this.markerClassName).append(e.dpDiv),k.data(t,"datepicker",e),this._setDate(e,this._getDefaultDate(e),!0),this._updateDatepicker(e),this._updateAlternate(e),e.settings.disabled&&this._disableDatepicker(t),e.dpDiv.css("display","block"))},_dialogDatepicker:function(t,e,i,s,n){var o,a=this._dialogInst;return a||(this.uuid+=1,o="dp"+this.uuid,this._dialogInput=k("<input type='text' id='"+o+"' style='position: absolute; top: -100px; width: 0px;'/>"),this._dialogInput.on("keydown",this._doKeyDown),k("body").append(this._dialogInput),(a=this._dialogInst=this._newInst(this._dialogInput,!1)).settings={},k.data(this._dialogInput[0],"datepicker",a)),b(a.settings,s||{}),e=e&&e.constructor===Date?this._formatDate(a,e):e,this._dialogInput.val(e),this._pos=n?n.length?n:[n.pageX,n.pageY]:null,this._pos||(o=document.documentElement.clientWidth,s=document.documentElement.clientHeight,e=document.documentElement.scrollLeft||document.body.scrollLeft,n=document.documentElement.scrollTop||document.body.scrollTop,this._pos=[o/2-100+e,s/2-150+n]),this._dialogInput.css("left",this._pos[0]+20+"px").css("top",this._pos[1]+"px"),a.settings.onSelect=i,this._inDialog=!0,this.dpDiv.addClass(this._dialogClass),this._showDatepicker(this._dialogInput[0]),k.blockUI&&k.blockUI(this.dpDiv),k.data(this._dialogInput[0],"datepicker",a),this},_destroyDatepicker:function(t){var e,i=k(t),s=k.data(t,"datepicker");i.hasClass(this.markerClassName)&&(e=t.nodeName.toLowerCase(),k.removeData(t,"datepicker"),"input"===e?(s.append.remove(),s.trigger.remove(),i.removeClass(this.markerClassName).off("focus",this._showDatepicker).off("keydown",this._doKeyDown).off("keypress",this._doKeyPress).off("keyup",this._doKeyUp)):"div"!==e&&"span"!==e||i.removeClass(this.markerClassName).empty(),g===s&&(g=null))},_enableDatepicker:function(e){var t,i=k(e),s=k.data(e,"datepicker");i.hasClass(this.markerClassName)&&("input"===(t=e.nodeName.toLowerCase())?(e.disabled=!1,s.trigger.filter("button").each(function(){this.disabled=!1}).end().filter("img").css({opacity:"1.0",cursor:""})):"div"!==t&&"span"!==t||((i=i.children("."+this._inlineClass)).children().removeClass("ui-state-disabled"),i.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!1)),this._disabledInputs=k.map(this._disabledInputs,function(t){return t===e?null:t}))},_disableDatepicker:function(e){var t,i=k(e),s=k.data(e,"datepicker");i.hasClass(this.markerClassName)&&("input"===(t=e.nodeName.toLowerCase())?(e.disabled=!0,s.trigger.filter("button").each(function(){this.disabled=!0}).end().filter("img").css({opacity:"0.5",cursor:"default"})):"div"!==t&&"span"!==t||((i=i.children("."+this._inlineClass)).children().addClass("ui-state-disabled"),i.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!0)),this._disabledInputs=k.map(this._disabledInputs,function(t){return t===e?null:t}),this._disabledInputs[this._disabledInputs.length]=e)},_isDisabledDatepicker:function(t){if(!t)return!1;for(var e=0;e<this._disabledInputs.length;e++)if(this._disabledInputs[e]===t)return!0;return!1},_getInst:function(t){try{return k.data(t,"datepicker")}catch(t){throw"Missing instance data for this datepicker"}},_optionDatepicker:function(t,e,i){var s,n,o,a,r=this._getInst(t);if(2===arguments.length&&"string"==typeof e)return"defaults"===e?k.extend({},k.datepicker._defaults):r?"all"===e?k.extend({},r.settings):this._get(r,e):null;s=e||{},"string"==typeof e&&((s={})[e]=i),r&&(this._curInst===r&&this._hideDatepicker(),n=this._getDateDatepicker(t,!0),o=this._getMinMaxDate(r,"min"),a=this._getMinMaxDate(r,"max"),b(r.settings,s),null!==o&&void 0!==s.dateFormat&&void 0===s.minDate&&(r.settings.minDate=this._formatDate(r,o)),null!==a&&void 0!==s.dateFormat&&void 0===s.maxDate&&(r.settings.maxDate=this._formatDate(r,a)),"disabled"in s&&(s.disabled?this._disableDatepicker(t):this._enableDatepicker(t)),this._attachments(k(t),r),this._autoSize(r),this._setDate(r,n),this._updateAlternate(r),this._updateDatepicker(r))},_changeDatepicker:function(t,e,i){this._optionDatepicker(t,e,i)},_refreshDatepicker:function(t){t=this._getInst(t);t&&this._updateDatepicker(t)},_setDateDatepicker:function(t,e){t=this._getInst(t);t&&(this._setDate(t,e),this._updateDatepicker(t),this._updateAlternate(t))},_getDateDatepicker:function(t,e){t=this._getInst(t);return t&&!t.inline&&this._setDateFromField(t,e),t?this._getDate(t):null},_doKeyDown:function(t){var e,i,s=k.datepicker._getInst(t.target),n=!0,o=s.dpDiv.is(".ui-datepicker-rtl");if(s._keyEvent=!0,k.datepicker._datepickerShowing)switch(t.keyCode){case 9:k.datepicker._hideDatepicker(),n=!1;break;case 13:return(i=k("td."+k.datepicker._dayOverClass+":not(."+k.datepicker._currentClass+")",s.dpDiv))[0]&&k.datepicker._selectDay(t.target,s.selectedMonth,s.selectedYear,i[0]),(e=k.datepicker._get(s,"onSelect"))?(i=k.datepicker._formatDate(s),e.apply(s.input?s.input[0]:null,[i,s])):k.datepicker._hideDatepicker(),!1;case 27:k.datepicker._hideDatepicker();break;case 33:k.datepicker._adjustDate(t.target,t.ctrlKey?-k.datepicker._get(s,"stepBigMonths"):-k.datepicker._get(s,"stepMonths"),"M");break;case 34:k.datepicker._adjustDate(t.target,t.ctrlKey?+k.datepicker._get(s,"stepBigMonths"):+k.datepicker._get(s,"stepMonths"),"M");break;case 35:(t.ctrlKey||t.metaKey)&&k.datepicker._clearDate(t.target),n=t.ctrlKey||t.metaKey;break;case 36:(t.ctrlKey||t.metaKey)&&k.datepicker._gotoToday(t.target),n=t.ctrlKey||t.metaKey;break;case 37:(t.ctrlKey||t.metaKey)&&k.datepicker._adjustDate(t.target,o?1:-1,"D"),n=t.ctrlKey||t.metaKey,t.originalEvent.altKey&&k.datepicker._adjustDate(t.target,t.ctrlKey?-k.datepicker._get(s,"stepBigMonths"):-k.datepicker._get(s,"stepMonths"),"M");break;case 38:(t.ctrlKey||t.metaKey)&&k.datepicker._adjustDate(t.target,-7,"D"),n=t.ctrlKey||t.metaKey;break;case 39:(t.ctrlKey||t.metaKey)&&k.datepicker._adjustDate(t.target,o?-1:1,"D"),n=t.ctrlKey||t.metaKey,t.originalEvent.altKey&&k.datepicker._adjustDate(t.target,t.ctrlKey?+k.datepicker._get(s,"stepBigMonths"):+k.datepicker._get(s,"stepMonths"),"M");break;case 40:(t.ctrlKey||t.metaKey)&&k.datepicker._adjustDate(t.target,7,"D"),n=t.ctrlKey||t.metaKey;break;default:n=!1}else 36===t.keyCode&&t.ctrlKey?k.datepicker._showDatepicker(this):n=!1;n&&(t.preventDefault(),t.stopPropagation())},_doKeyPress:function(t){var e,i=k.datepicker._getInst(t.target);if(k.datepicker._get(i,"constrainInput"))return e=k.datepicker._possibleChars(k.datepicker._get(i,"dateFormat")),i=String.fromCharCode(null==t.charCode?t.keyCode:t.charCode),t.ctrlKey||t.metaKey||i<" "||!e||-1<e.indexOf(i)},_doKeyUp:function(t){var e=k.datepicker._getInst(t.target);if(e.input.val()!==e.lastVal)try{k.datepicker.parseDate(k.datepicker._get(e,"dateFormat"),e.input?e.input.val():null,k.datepicker._getFormatConfig(e))&&(k.datepicker._setDateFromField(e),k.datepicker._updateAlternate(e),k.datepicker._updateDatepicker(e))}catch(t){}return!0},_showDatepicker:function(t){var e,i,s,n;"input"!==(t=t.target||t).nodeName.toLowerCase()&&(t=k("input",t.parentNode)[0]),k.datepicker._isDisabledDatepicker(t)||k.datepicker._lastInput===t||(n=k.datepicker._getInst(t),k.datepicker._curInst&&k.datepicker._curInst!==n&&(k.datepicker._curInst.dpDiv.stop(!0,!0),n&&k.datepicker._datepickerShowing&&k.datepicker._hideDatepicker(k.datepicker._curInst.input[0])),!1!==(i=(s=k.datepicker._get(n,"beforeShow"))?s.apply(t,[t,n]):{})&&(b(n.settings,i),n.lastVal=null,k.datepicker._lastInput=t,k.datepicker._setDateFromField(n),k.datepicker._inDialog&&(t.value=""),k.datepicker._pos||(k.datepicker._pos=k.datepicker._findPos(t),k.datepicker._pos[1]+=t.offsetHeight),e=!1,k(t).parents().each(function(){return!(e|="fixed"===k(this).css("position"))}),s={left:k.datepicker._pos[0],top:k.datepicker._pos[1]},k.datepicker._pos=null,n.dpDiv.empty(),n.dpDiv.css({position:"absolute",display:"block",top:"-1000px"}),k.datepicker._updateDatepicker(n),s=k.datepicker._checkOffset(n,s,e),n.dpDiv.css({position:k.datepicker._inDialog&&k.blockUI?"static":e?"fixed":"absolute",display:"none",left:s.left+"px",top:s.top+"px"}),n.inline||(i=k.datepicker._get(n,"showAnim"),s=k.datepicker._get(n,"duration"),n.dpDiv.css("z-index",function(t){for(var e,i;t.length&&t[0]!==document;){if(("absolute"===(e=t.css("position"))||"relative"===e||"fixed"===e)&&(i=parseInt(t.css("zIndex"),10),!isNaN(i)&&0!==i))return i;t=t.parent()}return 0}(k(t))+1),k.datepicker._datepickerShowing=!0,k.effects&&k.effects.effect[i]?n.dpDiv.show(i,k.datepicker._get(n,"showOptions"),s):n.dpDiv[i||"show"](i?s:null),k.datepicker._shouldFocusInput(n)&&n.input.trigger("focus"),k.datepicker._curInst=n)))},_updateDatepicker:function(t){this.maxRows=4,(g=t).dpDiv.empty().append(this._generateHTML(t)),this._attachHandlers(t);var e,i=this._getNumberOfMonths(t),s=i[1],n=t.dpDiv.find("."+this._dayOverClass+" a");0<n.length&&v.apply(n.get(0)),t.dpDiv.removeClass("ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4").width(""),1<s&&t.dpDiv.addClass("ui-datepicker-multi-"+s).css("width",17*s+"em"),t.dpDiv[(1!==i[0]||1!==i[1]?"add":"remove")+"Class"]("ui-datepicker-multi"),t.dpDiv[(this._get(t,"isRTL")?"add":"remove")+"Class"]("ui-datepicker-rtl"),t===k.datepicker._curInst&&k.datepicker._datepickerShowing&&k.datepicker._shouldFocusInput(t)&&t.input.trigger("focus"),t.yearshtml&&(e=t.yearshtml,setTimeout(function(){e===t.yearshtml&&t.yearshtml&&t.dpDiv.find("select.ui-datepicker-year:first").replaceWith(t.yearshtml),e=t.yearshtml=null},0))},_shouldFocusInput:function(t){return t.input&&t.input.is(":visible")&&!t.input.is(":disabled")&&!t.input.is(":focus")},_checkOffset:function(t,e,i){var s=t.dpDiv.outerWidth(),n=t.dpDiv.outerHeight(),o=t.input?t.input.outerWidth():0,a=t.input?t.input.outerHeight():0,r=document.documentElement.clientWidth+(i?0:k(document).scrollLeft()),l=document.documentElement.clientHeight+(i?0:k(document).scrollTop());return e.left-=this._get(t,"isRTL")?s-o:0,e.left-=i&&e.left===t.input.offset().left?k(document).scrollLeft():0,e.top-=i&&e.top===t.input.offset().top+a?k(document).scrollTop():0,e.left-=Math.min(e.left,e.left+s>r&&s<r?Math.abs(e.left+s-r):0),e.top-=Math.min(e.top,e.top+n>l&&n<l?Math.abs(n+a):0),e},_findPos:function(t){for(var e=this._getInst(t),i=this._get(e,"isRTL");t&&("hidden"===t.type||1!==t.nodeType||k.expr.filters.hidden(t));)t=t[i?"previousSibling":"nextSibling"];return[(e=k(t).offset()).left,e.top]},_hideDatepicker:function(t){var e,i,s=this._curInst;!s||t&&s!==k.data(t,"datepicker")||this._datepickerShowing&&(e=this._get(s,"showAnim"),i=this._get(s,"duration"),t=function(){k.datepicker._tidyDialog(s)},k.effects&&(k.effects.effect[e]||k.effects[e])?s.dpDiv.hide(e,k.datepicker._get(s,"showOptions"),i,t):s.dpDiv["slideDown"===e?"slideUp":"fadeIn"===e?"fadeOut":"hide"](e?i:null,t),e||t(),this._datepickerShowing=!1,(t=this._get(s,"onClose"))&&t.apply(s.input?s.input[0]:null,[s.input?s.input.val():"",s]),this._lastInput=null,this._inDialog&&(this._dialogInput.css({position:"absolute",left:"0",top:"-100px"}),k.blockUI&&(k.unblockUI(),k("body").append(this.dpDiv))),this._inDialog=!1)},_tidyDialog:function(t){t.dpDiv.removeClass(this._dialogClass).off(".ui-datepicker-calendar")},_checkExternalClick:function(t){var e;k.datepicker._curInst&&(e=k(t.target),t=k.datepicker._getInst(e[0]),(e[0].id===k.datepicker._mainDivId||0!==e.parents("#"+k.datepicker._mainDivId).length||e.hasClass(k.datepicker.markerClassName)||e.closest("."+k.datepicker._triggerClass).length||!k.datepicker._datepickerShowing||k.datepicker._inDialog&&k.blockUI)&&(!e.hasClass(k.datepicker.markerClassName)||k.datepicker._curInst===t)||k.datepicker._hideDatepicker())},_adjustDate:function(t,e,i){var s=k(t),t=this._getInst(s[0]);this._isDisabledDatepicker(s[0])||(this._adjustInstDate(t,e+("M"===i?this._get(t,"showCurrentAtPos"):0),i),this._updateDatepicker(t))},_gotoToday:function(t){var e=k(t),i=this._getInst(e[0]);this._get(i,"gotoCurrent")&&i.currentDay?(i.selectedDay=i.currentDay,i.drawMonth=i.selectedMonth=i.currentMonth,i.drawYear=i.selectedYear=i.currentYear):(t=new Date,i.selectedDay=t.getDate(),i.drawMonth=i.selectedMonth=t.getMonth(),i.drawYear=i.selectedYear=t.getFullYear()),this._notifyChange(i),this._adjustDate(e)},_selectMonthYear:function(t,e,i){var s=k(t),t=this._getInst(s[0]);t["selected"+("M"===i?"Month":"Year")]=t["draw"+("M"===i?"Month":"Year")]=parseInt(e.options[e.selectedIndex].value,10),this._notifyChange(t),this._adjustDate(s)},_selectDay:function(t,e,i,s){var n=k(t);k(s).hasClass(this._unselectableClass)||this._isDisabledDatepicker(n[0])||((n=this._getInst(n[0])).selectedDay=n.currentDay=k("a",s).html(),n.selectedMonth=n.currentMonth=e,n.selectedYear=n.currentYear=i,this._selectDate(t,this._formatDate(n,n.currentDay,n.currentMonth,n.currentYear)))},_clearDate:function(t){t=k(t);this._selectDate(t,"")},_selectDate:function(t,e){var i=k(t),t=this._getInst(i[0]);e=null!=e?e:this._formatDate(t),t.input&&t.input.val(e),this._updateAlternate(t),(i=this._get(t,"onSelect"))?i.apply(t.input?t.input[0]:null,[e,t]):t.input&&t.input.trigger("change"),t.inline?this._updateDatepicker(t):(this._hideDatepicker(),this._lastInput=t.input[0],"object"!=typeof t.input[0]&&t.input.trigger("focus"),this._lastInput=null)},_updateAlternate:function(t){var e,i,s=this._get(t,"altField");s&&(e=this._get(t,"altFormat")||this._get(t,"dateFormat"),i=this._getDate(t),t=this.formatDate(e,i,this._getFormatConfig(t)),k(s).val(t))},noWeekends:function(t){t=t.getDay();return[0<t&&t<6,""]},iso8601Week:function(t){var e=new Date(t.getTime());return e.setDate(e.getDate()+4-(e.getDay()||7)),t=e.getTime(),e.setMonth(0),e.setDate(1),Math.floor(Math.round((t-e)/864e5)/7)+1},parseDate:function(e,n,t){if(null==e||null==n)throw"Invalid arguments";if(""===(n="object"==typeof n?n.toString():n+""))return null;function o(t){return(t=w+1<e.length&&e.charAt(w+1)===t)&&w++,t}function i(t){var e=o(t),e="@"===t?14:"!"===t?20:"y"===t&&e?4:"o"===t?3:2,e=new RegExp("^\\d{"+("y"===t?e:1)+","+e+"}");if(!(e=n.substring(u).match(e)))throw"Missing number at position "+u;return u+=e[0].length,parseInt(e[0],10)}function s(t,e,i){var s=-1,e=k.map(o(t)?i:e,function(t,e){return[[e,t]]}).sort(function(t,e){return-(t[1].length-e[1].length)});if(k.each(e,function(t,e){var i=e[1];if(n.substr(u,i.length).toLowerCase()===i.toLowerCase())return s=e[0],u+=i.length,!1}),-1!==s)return s+1;throw"Unknown name at position "+u}function a(){if(n.charAt(u)!==e.charAt(w))throw"Unexpected literal at position "+u;u++}for(var r,l,h,u=0,c=(t?t.shortYearCutoff:null)||this._defaults.shortYearCutoff,c="string"!=typeof c?c:(new Date).getFullYear()%100+parseInt(c,10),d=(t?t.dayNamesShort:null)||this._defaults.dayNamesShort,p=(t?t.dayNames:null)||this._defaults.dayNames,f=(t?t.monthNamesShort:null)||this._defaults.monthNamesShort,g=(t?t.monthNames:null)||this._defaults.monthNames,m=-1,_=-1,v=-1,b=-1,y=!1,w=0;w<e.length;w++)if(y)"'"!==e.charAt(w)||o("'")?a():y=!1;else switch(e.charAt(w)){case"d":v=i("d");break;case"D":s("D",d,p);break;case"o":b=i("o");break;case"m":_=i("m");break;case"M":_=s("M",f,g);break;case"y":m=i("y");break;case"@":m=(h=new Date(i("@"))).getFullYear(),_=h.getMonth()+1,v=h.getDate();break;case"!":m=(h=new Date((i("!")-this._ticksTo1970)/1e4)).getFullYear(),_=h.getMonth()+1,v=h.getDate();break;case"'":o("'")?a():y=!0;break;default:a()}if(u<n.length&&(l=n.substr(u),!/^\s+/.test(l)))throw"Extra/unparsed characters found in date: "+l;if(-1===m?m=(new Date).getFullYear():m<100&&(m+=(new Date).getFullYear()-(new Date).getFullYear()%100+(m<=c?0:-100)),-1<b)for(_=1,v=b;;){if(v<=(r=this._getDaysInMonth(m,_-1)))break;_++,v-=r}if((h=this._daylightSavingAdjust(new Date(m,_-1,v))).getFullYear()!==m||h.getMonth()+1!==_||h.getDate()!==v)throw"Invalid date";return h},ATOM:"yy-mm-dd",COOKIE:"D, dd M yy",ISO_8601:"yy-mm-dd",RFC_822:"D, d M y",RFC_850:"DD, dd-M-y",RFC_1036:"D, d M y",RFC_1123:"D, d M yy",RFC_2822:"D, d M yy",RSS:"D, d M y",TICKS:"!",TIMESTAMP:"@",W3C:"yy-mm-dd",_ticksTo1970:24*(718685+Math.floor(492.5)-Math.floor(19.7)+Math.floor(4.925))*60*60*1e7,formatDate:function(e,t,i){if(!t)return"";function n(t){return(t=a+1<e.length&&e.charAt(a+1)===t)&&a++,t}function s(t,e,i){var s=""+e;if(n(t))for(;s.length<i;)s="0"+s;return s}function o(t,e,i,s){return(n(t)?s:i)[e]}var a,r=(i?i.dayNamesShort:null)||this._defaults.dayNamesShort,l=(i?i.dayNames:null)||this._defaults.dayNames,h=(i?i.monthNamesShort:null)||this._defaults.monthNamesShort,u=(i?i.monthNames:null)||this._defaults.monthNames,c="",d=!1;if(t)for(a=0;a<e.length;a++)if(d)"'"!==e.charAt(a)||n("'")?c+=e.charAt(a):d=!1;else switch(e.charAt(a)){case"d":c+=s("d",t.getDate(),2);break;case"D":c+=o("D",t.getDay(),r,l);break;case"o":c+=s("o",Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime()-new Date(t.getFullYear(),0,0).getTime())/864e5),3);break;case"m":c+=s("m",t.getMonth()+1,2);break;case"M":c+=o("M",t.getMonth(),h,u);break;case"y":c+=n("y")?t.getFullYear():(t.getFullYear()%100<10?"0":"")+t.getFullYear()%100;break;case"@":c+=t.getTime();break;case"!":c+=1e4*t.getTime()+this._ticksTo1970;break;case"'":n("'")?c+="'":d=!0;break;default:c+=e.charAt(a)}return c},_possibleChars:function(e){function t(t){return(t=n+1<e.length&&e.charAt(n+1)===t)&&n++,t}for(var i="",s=!1,n=0;n<e.length;n++)if(s)"'"!==e.charAt(n)||t("'")?i+=e.charAt(n):s=!1;else switch(e.charAt(n)){case"d":case"m":case"y":case"@":i+="0123456789";break;case"D":case"M":return null;case"'":t("'")?i+="'":s=!0;break;default:i+=e.charAt(n)}return i},_get:function(t,e){return(void 0!==t.settings[e]?t.settings:this._defaults)[e]},_setDateFromField:function(t,e){if(t.input.val()!==t.lastVal){var i=this._get(t,"dateFormat"),s=t.lastVal=t.input?t.input.val():null,n=this._getDefaultDate(t),o=n,a=this._getFormatConfig(t);try{o=this.parseDate(i,s,a)||n}catch(t){s=e?"":s}t.selectedDay=o.getDate(),t.drawMonth=t.selectedMonth=o.getMonth(),t.drawYear=t.selectedYear=o.getFullYear(),t.currentDay=s?o.getDate():0,t.currentMonth=s?o.getMonth():0,t.currentYear=s?o.getFullYear():0,this._adjustInstDate(t)}},_getDefaultDate:function(t){return this._restrictMinMax(t,this._determineDate(t,this._get(t,"defaultDate"),new Date))},_determineDate:function(r,t,e){var i,s,t=null==t||""===t?e:"string"==typeof t?function(t){try{return k.datepicker.parseDate(k.datepicker._get(r,"dateFormat"),t,k.datepicker._getFormatConfig(r))}catch(t){}for(var e=(t.toLowerCase().match(/^c/)?k.datepicker._getDate(r):null)||new Date,i=e.getFullYear(),s=e.getMonth(),n=e.getDate(),o=/([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g,a=o.exec(t);a;){switch(a[2]||"d"){case"d":case"D":n+=parseInt(a[1],10);break;case"w":case"W":n+=7*parseInt(a[1],10);break;case"m":case"M":s+=parseInt(a[1],10),n=Math.min(n,k.datepicker._getDaysInMonth(i,s));break;case"y":case"Y":i+=parseInt(a[1],10),n=Math.min(n,k.datepicker._getDaysInMonth(i,s))}a=o.exec(t)}return new Date(i,s,n)}(t):"number"==typeof t?isNaN(t)?e:(i=t,(s=new Date).setDate(s.getDate()+i),s):new Date(t.getTime());return(t=t&&"Invalid Date"===t.toString()?e:t)&&(t.setHours(0),t.setMinutes(0),t.setSeconds(0),t.setMilliseconds(0)),this._daylightSavingAdjust(t)},_daylightSavingAdjust:function(t){return t?(t.setHours(12<t.getHours()?t.getHours()+2:0),t):null},_setDate:function(t,e,i){var s=!e,n=t.selectedMonth,o=t.selectedYear,e=this._restrictMinMax(t,this._determineDate(t,e,new Date));t.selectedDay=t.currentDay=e.getDate(),t.drawMonth=t.selectedMonth=t.currentMonth=e.getMonth(),t.drawYear=t.selectedYear=t.currentYear=e.getFullYear(),n===t.selectedMonth&&o===t.selectedYear||i||this._notifyChange(t),this._adjustInstDate(t),t.input&&t.input.val(s?"":this._formatDate(t))},_getDate:function(t){return!t.currentYear||t.input&&""===t.input.val()?null:this._daylightSavingAdjust(new Date(t.currentYear,t.currentMonth,t.currentDay))},_attachHandlers:function(t){var e=this._get(t,"stepMonths"),i="#"+t.id.replace(/\\\\/g,"\\");t.dpDiv.find("[data-handler]").map(function(){var t={prev:function(){k.datepicker._adjustDate(i,-e,"M")},next:function(){k.datepicker._adjustDate(i,+e,"M")},hide:function(){k.datepicker._hideDatepicker()},today:function(){k.datepicker._gotoToday(i)},selectDay:function(){return k.datepicker._selectDay(i,+this.getAttribute("data-month"),+this.getAttribute("data-year"),this),!1},selectMonth:function(){return k.datepicker._selectMonthYear(i,this,"M"),!1},selectYear:function(){return k.datepicker._selectMonthYear(i,this,"Y"),!1}};k(this).on(this.getAttribute("data-event"),t[this.getAttribute("data-handler")])})},_generateHTML:function(t){var e,i,s,n,o,a,r,l,h,u,c,d,p,f,g,m,_,v,b,y,w,k,D,x,C,M,T,I,z,S,P,E=new Date,N=this._daylightSavingAdjust(new Date(E.getFullYear(),E.getMonth(),E.getDate())),O=this._get(t,"isRTL"),H=this._get(t,"showButtonPanel"),A=this._get(t,"hideIfNoPrevNext"),W=this._get(t,"navigationAsDateFormat"),F=this._getNumberOfMonths(t),R=this._get(t,"showCurrentAtPos"),E=this._get(t,"stepMonths"),L=1!==F[0]||1!==F[1],Y=this._daylightSavingAdjust(t.currentDay?new Date(t.currentYear,t.currentMonth,t.currentDay):new Date(9999,9,9)),B=this._getMinMaxDate(t,"min"),j=this._getMinMaxDate(t,"max"),K=t.drawMonth-R,V=t.drawYear;if(K<0&&(K+=12,V--),j)for(e=this._daylightSavingAdjust(new Date(j.getFullYear(),j.getMonth()-F[0]*F[1]+1,j.getDate())),e=B&&e<B?B:e;this._daylightSavingAdjust(new Date(V,K,1))>e;)--K<0&&(K=11,V--);for(t.drawMonth=K,t.drawYear=V,R=this._get(t,"prevText"),R=W?this.formatDate(R,this._daylightSavingAdjust(new Date(V,K-E,1)),this._getFormatConfig(t)):R,i=this._canAdjustMonth(t,-1,V,K)?"<a class='ui-datepicker-prev ui-corner-all' data-handler='prev' data-event='click' title='"+R+"'><span class='ui-icon ui-icon-circle-triangle-"+(O?"e":"w")+"'>"+R+"</span></a>":A?"":"<a class='ui-datepicker-prev ui-corner-all ui-state-disabled' title='"+R+"'><span class='ui-icon ui-icon-circle-triangle-"+(O?"e":"w")+"'>"+R+"</span></a>",R=this._get(t,"nextText"),R=W?this.formatDate(R,this._daylightSavingAdjust(new Date(V,K+E,1)),this._getFormatConfig(t)):R,s=this._canAdjustMonth(t,1,V,K)?"<a class='ui-datepicker-next ui-corner-all' data-handler='next' data-event='click' title='"+R+"'><span class='ui-icon ui-icon-circle-triangle-"+(O?"w":"e")+"'>"+R+"</span></a>":A?"":"<a class='ui-datepicker-next ui-corner-all ui-state-disabled' title='"+R+"'><span class='ui-icon ui-icon-circle-triangle-"+(O?"w":"e")+"'>"+R+"</span></a>",A=this._get(t,"currentText"),R=this._get(t,"gotoCurrent")&&t.currentDay?Y:N,A=W?this.formatDate(A,R,this._getFormatConfig(t)):A,W=t.inline?"":"<button type='button' class='ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all' data-handler='hide' data-event='click'>"+this._get(t,"closeText")+"</button>",W=H?"<div class='ui-datepicker-buttonpane ui-widget-content'>"+(O?W:"")+(this._isInRange(t,R)?"<button type='button' class='ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all' data-handler='today' data-event='click'>"+A+"</button>":"")+(O?"":W)+"</div>":"",n=parseInt(this._get(t,"firstDay"),10),n=isNaN(n)?0:n,o=this._get(t,"showWeek"),a=this._get(t,"dayNames"),r=this._get(t,"dayNamesMin"),l=this._get(t,"monthNames"),h=this._get(t,"monthNamesShort"),u=this._get(t,"beforeShowDay"),c=this._get(t,"showOtherMonths"),d=this._get(t,"selectOtherMonths"),p=this._getDefaultDate(t),f="",m=0;m<F[0];m++){for(_="",this.maxRows=4,v=0;v<F[1];v++){if(b=this._daylightSavingAdjust(new Date(V,K,t.selectedDay)),D=" ui-corner-all",y="",L){if(y+="<div class='ui-datepicker-group",1<F[1])switch(v){case 0:y+=" ui-datepicker-group-first",D=" ui-corner-"+(O?"right":"left");break;case F[1]-1:y+=" ui-datepicker-group-last",D=" ui-corner-"+(O?"left":"right");break;default:y+=" ui-datepicker-group-middle",D=""}y+="'>"}for(y+="<div class='ui-datepicker-header ui-widget-header ui-helper-clearfix"+D+"'>"+(/all|left/.test(D)&&0===m?O?s:i:"")+(/all|right/.test(D)&&0===m?O?i:s:"")+this._generateMonthYearHeader(t,K,V,B,j,0<m||0<v,l,h)+"</div><table class='ui-datepicker-calendar'><thead><tr>",w=o?"<th class='ui-datepicker-week-col'>"+this._get(t,"weekHeader")+"</th>":"",g=0;g<7;g++)w+="<th scope='col'"+(5<=(g+n+6)%7?" class='ui-datepicker-week-end'":"")+"><span title='"+a[k=(g+n)%7]+"'>"+r[k]+"</span></th>";for(y+=w+"</tr></thead><tbody>",x=this._getDaysInMonth(V,K),V===t.selectedYear&&K===t.selectedMonth&&(t.selectedDay=Math.min(t.selectedDay,x)),D=(this._getFirstDayOfMonth(V,K)-n+7)%7,x=Math.ceil((D+x)/7),C=L&&this.maxRows>x?this.maxRows:x,this.maxRows=C,M=this._daylightSavingAdjust(new Date(V,K,1-D)),T=0;T<C;T++){for(y+="<tr>",I=o?"<td class='ui-datepicker-week-col'>"+this._get(t,"calculateWeek")(M)+"</td>":"",g=0;g<7;g++)z=u?u.apply(t.input?t.input[0]:null,[M]):[!0,""],P=(S=M.getMonth()!==K)&&!d||!z[0]||B&&M<B||j&&j<M,I+="<td class='"+(5<=(g+n+6)%7?" ui-datepicker-week-end":"")+(S?" ui-datepicker-other-month":"")+(M.getTime()===b.getTime()&&K===t.selectedMonth&&t._keyEvent||p.getTime()===M.getTime()&&p.getTime()===b.getTime()?" "+this._dayOverClass:"")+(P?" "+this._unselectableClass+" ui-state-disabled":"")+(S&&!c?"":" "+z[1]+(M.getTime()===Y.getTime()?" "+this._currentClass:"")+(M.getTime()===N.getTime()?" ui-datepicker-today":""))+"'"+(S&&!c||!z[2]?"":" title='"+z[2].replace(/'/g,"&#39;")+"'")+(P?"":" data-handler='selectDay' data-event='click' data-month='"+M.getMonth()+"' data-year='"+M.getFullYear()+"'")+">"+(S&&!c?"&#xa0;":P?"<span class='ui-state-default'>"+M.getDate()+"</span>":"<a class='ui-state-default"+(M.getTime()===N.getTime()?" ui-state-highlight":"")+(M.getTime()===Y.getTime()?" ui-state-active":"")+(S?" ui-priority-secondary":"")+"' href='#'>"+M.getDate()+"</a>")+"</td>",M.setDate(M.getDate()+1),M=this._daylightSavingAdjust(M);y+=I+"</tr>"}11<++K&&(K=0,V++),_+=y+="</tbody></table>"+(L?"</div>"+(0<F[0]&&v===F[1]-1?"<div class='ui-datepicker-row-break'></div>":""):"")}f+=_}return f+=W,t._keyEvent=!1,f},_generateMonthYearHeader:function(t,e,i,s,n,o,a,r){var l,h,u,c,d,p,f,g=this._get(t,"changeMonth"),m=this._get(t,"changeYear"),_=this._get(t,"showMonthAfterYear"),v="<div class='ui-datepicker-title'>",b="";if(o||!g)b+="<span class='ui-datepicker-month'>"+a[e]+"</span>";else{for(l=s&&s.getFullYear()===i,h=n&&n.getFullYear()===i,b+="<select class='ui-datepicker-month' data-handler='selectMonth' data-event='change'>",u=0;u<12;u++)(!l||u>=s.getMonth())&&(!h||u<=n.getMonth())&&(b+="<option value='"+u+"'"+(u===e?" selected='selected'":"")+">"+r[u]+"</option>");b+="</select>"}if(_||(v+=b+(!o&&g&&m?"":"&#xa0;")),!t.yearshtml)if(t.yearshtml="",o||!m)v+="<span class='ui-datepicker-year'>"+i+"</span>";else{for(c=this._get(t,"yearRange").split(":"),d=(new Date).getFullYear(),p=(a=function(t){t=t.match(/c[+\-].*/)?i+parseInt(t.substring(1),10):t.match(/[+\-].*/)?d+parseInt(t,10):parseInt(t,10);return isNaN(t)?d:t})(c[0]),f=Math.max(p,a(c[1]||"")),p=s?Math.max(p,s.getFullYear()):p,f=n?Math.min(f,n.getFullYear()):f,t.yearshtml+="<select class='ui-datepicker-year' data-handler='selectYear' data-event='change'>";p<=f;p++)t.yearshtml+="<option value='"+p+"'"+(p===i?" selected='selected'":"")+">"+p+"</option>";t.yearshtml+="</select>",v+=t.yearshtml,t.yearshtml=null}return v+=this._get(t,"yearSuffix"),_&&(v+=(!o&&g&&m?"":"&#xa0;")+b),v+="</div>"},_adjustInstDate:function(t,e,i){var s=t.selectedYear+("Y"===i?e:0),n=t.selectedMonth+("M"===i?e:0),e=Math.min(t.selectedDay,this._getDaysInMonth(s,n))+("D"===i?e:0),e=this._restrictMinMax(t,this._daylightSavingAdjust(new Date(s,n,e)));t.selectedDay=e.getDate(),t.drawMonth=t.selectedMonth=e.getMonth(),t.drawYear=t.selectedYear=e.getFullYear(),"M"!==i&&"Y"!==i||this._notifyChange(t)},_restrictMinMax:function(t,e){var i=this._getMinMaxDate(t,"min"),t=this._getMinMaxDate(t,"max"),e=i&&e<i?i:e;return t&&t<e?t:e},_notifyChange:function(t){var e=this._get(t,"onChangeMonthYear");e&&e.apply(t.input?t.input[0]:null,[t.selectedYear,t.selectedMonth+1,t])},_getNumberOfMonths:function(t){t=this._get(t,"numberOfMonths");return null==t?[1,1]:"number"==typeof t?[1,t]:t},_getMinMaxDate:function(t,e){return this._determineDate(t,this._get(t,e+"Date"),null)},_getDaysInMonth:function(t,e){return 32-this._daylightSavingAdjust(new Date(t,e,32)).getDate()},_getFirstDayOfMonth:function(t,e){return new Date(t,e,1).getDay()},_canAdjustMonth:function(t,e,i,s){var n=this._getNumberOfMonths(t),n=this._daylightSavingAdjust(new Date(i,s+(e<0?e:n[0]*n[1]),1));return e<0&&n.setDate(this._getDaysInMonth(n.getFullYear(),n.getMonth())),this._isInRange(t,n)},_isInRange:function(t,e){var i=this._getMinMaxDate(t,"min"),s=this._getMinMaxDate(t,"max"),n=null,o=null,a=this._get(t,"yearRange");return a&&(t=a.split(":"),a=(new Date).getFullYear(),n=parseInt(t[0],10),o=parseInt(t[1],10),t[0].match(/[+\-].*/)&&(n+=a),t[1].match(/[+\-].*/)&&(o+=a)),(!i||e.getTime()>=i.getTime())&&(!s||e.getTime()<=s.getTime())&&(!n||e.getFullYear()>=n)&&(!o||e.getFullYear()<=o)},_getFormatConfig:function(t){var e=this._get(t,"shortYearCutoff");return{shortYearCutoff:e="string"!=typeof e?e:(new Date).getFullYear()%100+parseInt(e,10),dayNamesShort:this._get(t,"dayNamesShort"),dayNames:this._get(t,"dayNames"),monthNamesShort:this._get(t,"monthNamesShort"),monthNames:this._get(t,"monthNames")}},_formatDate:function(t,e,i,s){e||(t.currentDay=t.selectedDay,t.currentMonth=t.selectedMonth,t.currentYear=t.selectedYear);e=e?"object"==typeof e?e:this._daylightSavingAdjust(new Date(s,i,e)):this._daylightSavingAdjust(new Date(t.currentYear,t.currentMonth,t.currentDay));return this.formatDate(this._get(t,"dateFormat"),e,this._getFormatConfig(t))}}),k.fn.datepicker=function(t){if(!this.length)return this;k.datepicker.initialized||(k(document).on("mousedown",k.datepicker._checkExternalClick),k.datepicker.initialized=!0),0===k("#"+k.datepicker._mainDivId).length&&k("body").append(k.datepicker.dpDiv);var e=Array.prototype.slice.call(arguments,1);return"string"==typeof t&&("isDisabled"===t||"getDate"===t||"widget"===t)||"option"===t&&2===arguments.length&&"string"==typeof arguments[1]?k.datepicker["_"+t+"Datepicker"].apply(k.datepicker,[this[0]].concat(e)):this.each(function(){"string"==typeof t?k.datepicker["_"+t+"Datepicker"].apply(k.datepicker,[this].concat(e)):k.datepicker._attachDatepicker(this,t)})},k.datepicker=new m,k.datepicker.initialized=!1,k.datepicker.uuid=(new Date).getTime(),k.datepicker.version="1.12.1";k.datepicker;k.widget("ui.dialog",{version:"1.12.1",options:{appendTo:"body",autoOpen:!0,buttons:[],classes:{"ui-dialog":"ui-corner-all","ui-dialog-titlebar":"ui-corner-all"},closeOnEscape:!0,closeText:"Close",draggable:!0,hide:null,height:"auto",maxHeight:null,maxWidth:null,minHeight:150,minWidth:150,modal:!1,position:{my:"center",at:"center",of:window,collision:"fit",using:function(t){var e=k(this).css(t).offset().top;e<0&&k(this).css("top",t.top-e)}},resizable:!0,show:null,title:null,width:300,beforeClose:null,close:null,drag:null,dragStart:null,dragStop:null,focus:null,open:null,resize:null,resizeStart:null,resizeStop:null},sizeRelatedOptions:{buttons:!0,height:!0,maxHeight:!0,maxWidth:!0,minHeight:!0,minWidth:!0,width:!0},resizableRelatedOptions:{maxHeight:!0,maxWidth:!0,minHeight:!0,minWidth:!0},_create:function(){this.originalCss={display:this.element[0].style.display,width:this.element[0].style.width,minHeight:this.element[0].style.minHeight,maxHeight:this.element[0].style.maxHeight,height:this.element[0].style.height},this.originalPosition={parent:this.element.parent(),index:this.element.parent().children().index(this.element)},this.originalTitle=this.element.attr("title"),null==this.options.title&&null!=this.originalTitle&&(this.options.title=this.originalTitle),this.options.disabled&&(this.options.disabled=!1),this._createWrapper(),this.element.show().removeAttr("title").appendTo(this.uiDialog),this._addClass("ui-dialog-content","ui-widget-content"),this._createTitlebar(),this._createButtonPane(),this.options.draggable&&k.fn.draggable&&this._makeDraggable(),this.options.resizable&&k.fn.resizable&&this._makeResizable(),this._isOpen=!1,this._trackFocus()},_init:function(){this.options.autoOpen&&this.open()},_appendTo:function(){var t=this.options.appendTo;return t&&(t.jquery||t.nodeType)?k(t):this.document.find(t||"body").eq(0)},_destroy:function(){var t,e=this.originalPosition;this._untrackInstance(),this._destroyOverlay(),this.element.removeUniqueId().css(this.originalCss).detach(),this.uiDialog.remove(),this.originalTitle&&this.element.attr("title",this.originalTitle),(t=e.parent.children().eq(e.index)).length&&t[0]!==this.element[0]?t.before(this.element):e.parent.append(this.element)},widget:function(){return this.uiDialog},disable:k.noop,enable:k.noop,close:function(t){var e=this;this._isOpen&&!1!==this._trigger("beforeClose",t)&&(this._isOpen=!1,this._focusedElement=null,this._destroyOverlay(),this._untrackInstance(),this.opener.filter(":focusable").trigger("focus").length||k.ui.safeBlur(k.ui.safeActiveElement(this.document[0])),this._hide(this.uiDialog,this.options.hide,function(){e._trigger("close",t)}))},isOpen:function(){return this._isOpen},moveToTop:function(){this._moveToTop()},_moveToTop:function(t,e){var i=!1,s=this.uiDialog.siblings(".ui-front:visible").map(function(){return+k(this).css("z-index")}).get(),s=Math.max.apply(null,s);return s>=+this.uiDialog.css("z-index")&&(this.uiDialog.css("z-index",s+1),i=!0),i&&!e&&this._trigger("focus",t),i},open:function(){var t=this;this._isOpen?this._moveToTop()&&this._focusTabbable():(this._isOpen=!0,this.opener=k(k.ui.safeActiveElement(this.document[0])),this._size(),this._position(),this._createOverlay(),this._moveToTop(null,!0),this.overlay&&this.overlay.css("z-index",this.uiDialog.css("z-index")-1),this._show(this.uiDialog,this.options.show,function(){t._focusTabbable(),t._trigger("focus")}),this._makeFocusTarget(),this._trigger("open"))},_focusTabbable:function(){var t=this._focusedElement;(t=t||this.element.find("[autofocus]")).length||(t=this.element.find(":tabbable")),t.length||(t=this.uiDialogButtonPane.find(":tabbable")),t.length||(t=this.uiDialogTitlebarClose.filter(":tabbable")),t.length||(t=this.uiDialog),t.eq(0).trigger("focus")},_keepFocus:function(t){function e(){var t=k.ui.safeActiveElement(this.document[0]);this.uiDialog[0]===t||k.contains(this.uiDialog[0],t)||this._focusTabbable()}t.preventDefault(),e.call(this),this._delay(e)},_createWrapper:function(){this.uiDialog=k("<div>").hide().attr({tabIndex:-1,role:"dialog"}).appendTo(this._appendTo()),this._addClass(this.uiDialog,"ui-dialog","ui-widget ui-widget-content ui-front"),this._on(this.uiDialog,{keydown:function(t){if(this.options.closeOnEscape&&!t.isDefaultPrevented()&&t.keyCode&&t.keyCode===k.ui.keyCode.ESCAPE)return t.preventDefault(),void this.close(t);var e,i,s;t.keyCode!==k.ui.keyCode.TAB||t.isDefaultPrevented()||(e=this.uiDialog.find(":tabbable"),i=e.filter(":first"),s=e.filter(":last"),t.target!==s[0]&&t.target!==this.uiDialog[0]||t.shiftKey?t.target!==i[0]&&t.target!==this.uiDialog[0]||!t.shiftKey||(this._delay(function(){s.trigger("focus")}),t.preventDefault()):(this._delay(function(){i.trigger("focus")}),t.preventDefault()))},mousedown:function(t){this._moveToTop(t)&&this._focusTabbable()}}),this.element.find("[aria-describedby]").length||this.uiDialog.attr({"aria-describedby":this.element.uniqueId().attr("id")})},_createTitlebar:function(){var t;this.uiDialogTitlebar=k("<div>"),this._addClass(this.uiDialogTitlebar,"ui-dialog-titlebar","ui-widget-header ui-helper-clearfix"),this._on(this.uiDialogTitlebar,{mousedown:function(t){k(t.target).closest(".ui-dialog-titlebar-close")||this.uiDialog.trigger("focus")}}),this.uiDialogTitlebarClose=k("<button type='button'></button>").button({label:k("<a>").text(this.options.closeText).html(),icon:"ui-icon-closethick",showLabel:!1}).appendTo(this.uiDialogTitlebar),this._addClass(this.uiDialogTitlebarClose,"ui-dialog-titlebar-close"),this._on(this.uiDialogTitlebarClose,{click:function(t){t.preventDefault(),this.close(t)}}),t=k("<span>").uniqueId().prependTo(this.uiDialogTitlebar),this._addClass(t,"ui-dialog-title"),this._title(t),this.uiDialogTitlebar.prependTo(this.uiDialog),this.uiDialog.attr({"aria-labelledby":t.attr("id")})},_title:function(t){this.options.title?t.text(this.options.title):t.html("&#160;")},_createButtonPane:function(){this.uiDialogButtonPane=k("<div>"),this._addClass(this.uiDialogButtonPane,"ui-dialog-buttonpane","ui-widget-content ui-helper-clearfix"),this.uiButtonSet=k("<div>").appendTo(this.uiDialogButtonPane),this._addClass(this.uiButtonSet,"ui-dialog-buttonset"),this._createButtons()},_createButtons:function(){var s=this,t=this.options.buttons;this.uiDialogButtonPane.remove(),this.uiButtonSet.empty(),k.isEmptyObject(t)||k.isArray(t)&&!t.length?this._removeClass(this.uiDialog,"ui-dialog-buttons"):(k.each(t,function(t,e){var i;e=k.isFunction(e)?{click:e,text:t}:e,e=k.extend({type:"button"},e),i=e.click,t={icon:e.icon,iconPosition:e.iconPosition,showLabel:e.showLabel,icons:e.icons,text:e.text},delete e.click,delete e.icon,delete e.iconPosition,delete e.showLabel,delete e.icons,"boolean"==typeof e.text&&delete e.text,k("<button></button>",e).button(t).appendTo(s.uiButtonSet).on("click",function(){i.apply(s.element[0],arguments)})}),this._addClass(this.uiDialog,"ui-dialog-buttons"),this.uiDialogButtonPane.appendTo(this.uiDialog))},_makeDraggable:function(){var n=this,o=this.options;function a(t){return{position:t.position,offset:t.offset}}this.uiDialog.draggable({cancel:".ui-dialog-content, .ui-dialog-titlebar-close",handle:".ui-dialog-titlebar",containment:"document",start:function(t,e){n._addClass(k(this),"ui-dialog-dragging"),n._blockFrames(),n._trigger("dragStart",t,a(e))},drag:function(t,e){n._trigger("drag",t,a(e))},stop:function(t,e){var i=e.offset.left-n.document.scrollLeft(),s=e.offset.top-n.document.scrollTop();o.position={my:"left top",at:"left"+(0<=i?"+":"")+i+" top"+(0<=s?"+":"")+s,of:n.window},n._removeClass(k(this),"ui-dialog-dragging"),n._unblockFrames(),n._trigger("dragStop",t,a(e))}})},_makeResizable:function(){var n=this,o=this.options,t=o.resizable,e=this.uiDialog.css("position"),t="string"==typeof t?t:"n,e,s,w,se,sw,ne,nw";function a(t){return{originalPosition:t.originalPosition,originalSize:t.originalSize,position:t.position,size:t.size}}this.uiDialog.resizable({cancel:".ui-dialog-content",containment:"document",alsoResize:this.element,maxWidth:o.maxWidth,maxHeight:o.maxHeight,minWidth:o.minWidth,minHeight:this._minHeight(),handles:t,start:function(t,e){n._addClass(k(this),"ui-dialog-resizing"),n._blockFrames(),n._trigger("resizeStart",t,a(e))},resize:function(t,e){n._trigger("resize",t,a(e))},stop:function(t,e){var i=n.uiDialog.offset(),s=i.left-n.document.scrollLeft(),i=i.top-n.document.scrollTop();o.height=n.uiDialog.height(),o.width=n.uiDialog.width(),o.position={my:"left top",at:"left"+(0<=s?"+":"")+s+" top"+(0<=i?"+":"")+i,of:n.window},n._removeClass(k(this),"ui-dialog-resizing"),n._unblockFrames(),n._trigger("resizeStop",t,a(e))}}).css("position",e)},_trackFocus:function(){this._on(this.widget(),{focusin:function(t){this._makeFocusTarget(),this._focusedElement=k(t.target)}})},_makeFocusTarget:function(){this._untrackInstance(),this._trackingInstances().unshift(this)},_untrackInstance:function(){var t=this._trackingInstances(),e=k.inArray(this,t);-1!==e&&t.splice(e,1)},_trackingInstances:function(){var t=this.document.data("ui-dialog-instances");return t||(t=[],this.document.data("ui-dialog-instances",t)),t},_minHeight:function(){var t=this.options;return"auto"===t.height?t.minHeight:Math.min(t.minHeight,t.height)},_position:function(){var t=this.uiDialog.is(":visible");t||this.uiDialog.show(),this.uiDialog.position(this.options.position),t||this.uiDialog.hide()},_setOptions:function(t){var i=this,s=!1,n={};k.each(t,function(t,e){i._setOption(t,e),t in i.sizeRelatedOptions&&(s=!0),t in i.resizableRelatedOptions&&(n[t]=e)}),s&&(this._size(),this._position()),this.uiDialog.is(":data(ui-resizable)")&&this.uiDialog.resizable("option",n)},_setOption:function(t,e){var i,s=this.uiDialog;"disabled"!==t&&(this._super(t,e),"appendTo"===t&&this.uiDialog.appendTo(this._appendTo()),"buttons"===t&&this._createButtons(),"closeText"===t&&this.uiDialogTitlebarClose.button({label:k("<a>").text(""+this.options.closeText).html()}),"draggable"===t&&((i=s.is(":data(ui-draggable)"))&&!e&&s.draggable("destroy"),!i&&e&&this._makeDraggable()),"position"===t&&this._position(),"resizable"===t&&((i=s.is(":data(ui-resizable)"))&&!e&&s.resizable("destroy"),i&&"string"==typeof e&&s.resizable("option","handles",e),i||!1===e||this._makeResizable()),"title"===t&&this._title(this.uiDialogTitlebar.find(".ui-dialog-title")))},_size:function(){var t,e,i,s=this.options;this.element.show().css({width:"auto",minHeight:0,maxHeight:"none",height:0}),s.minWidth>s.width&&(s.width=s.minWidth),t=this.uiDialog.css({height:"auto",width:s.width}).outerHeight(),e=Math.max(0,s.minHeight-t),i="number"==typeof s.maxHeight?Math.max(0,s.maxHeight-t):"none","auto"===s.height?this.element.css({minHeight:e,maxHeight:i,height:"auto"}):this.element.height(Math.max(0,s.height-t)),this.uiDialog.is(":data(ui-resizable)")&&this.uiDialog.resizable("option","minHeight",this._minHeight())},_blockFrames:function(){this.iframeBlocks=this.document.find("iframe").map(function(){var t=k(this);return k("<div>").css({position:"absolute",width:t.outerWidth(),height:t.outerHeight()}).appendTo(t.parent()).offset(t.offset())[0]})},_unblockFrames:function(){this.iframeBlocks&&(this.iframeBlocks.remove(),delete this.iframeBlocks)},_allowInteraction:function(t){return!!k(t.target).closest(".ui-dialog").length||!!k(t.target).closest(".ui-datepicker").length},_createOverlay:function(){var e;this.options.modal&&(e=!0,this._delay(function(){e=!1}),this.document.data("ui-dialog-overlays")||this._on(this.document,{focusin:function(t){e||this._allowInteraction(t)||(t.preventDefault(),this._trackingInstances()[0]._focusTabbable())}}),this.overlay=k("<div>").appendTo(this._appendTo()),this._addClass(this.overlay,null,"ui-widget-overlay ui-front"),this._on(this.overlay,{mousedown:"_keepFocus"}),this.document.data("ui-dialog-overlays",(this.document.data("ui-dialog-overlays")||0)+1))},_destroyOverlay:function(){var t;this.options.modal&&this.overlay&&((t=this.document.data("ui-dialog-overlays")-1)?this.document.data("ui-dialog-overlays",t):(this._off(this.document,"focusin"),this.document.removeData("ui-dialog-overlays")),this.overlay.remove(),this.overlay=null)}}),!1!==k.uiBackCompat&&k.widget("ui.dialog",k.ui.dialog,{options:{dialogClass:""},_createWrapper:function(){this._super(),this.uiDialog.addClass(this.options.dialogClass)},_setOption:function(t,e){"dialogClass"===t&&this.uiDialog.removeClass(this.options.dialogClass).addClass(e),this._superApply(arguments)}});k.ui.dialog,k.widget("ui.slider",k.ui.mouse,{version:"1.12.1",widgetEventPrefix:"slide",options:{animate:!1,classes:{"ui-slider":"ui-corner-all","ui-slider-handle":"ui-corner-all","ui-slider-range":"ui-corner-all ui-widget-header"},distance:0,max:100,min:0,orientation:"horizontal",range:!1,step:1,value:0,values:null,change:null,slide:null,start:null,stop:null},numPages:5,_create:function(){this._keySliding=!1,this._mouseSliding=!1,this._animateOff=!0,this._handleIndex=null,this._detectOrientation(),this._mouseInit(),this._calculateNewMax(),this._addClass("ui-slider ui-slider-"+this.orientation,"ui-widget ui-widget-content"),this._refresh(),this._animateOff=!1},_refresh:function(){this._createRange(),this._createHandles(),this._setupEvents(),this._refreshValue()},_createHandles:function(){var t,e=this.options,i=this.element.find(".ui-slider-handle"),s=[],n=e.values&&e.values.length||1;for(i.length>n&&(i.slice(n).remove(),i=i.slice(0,n)),t=i.length;t<n;t++)s.push("<span tabindex='0'></span>");this.handles=i.add(k(s.join("")).appendTo(this.element)),this._addClass(this.handles,"ui-slider-handle","ui-state-default"),this.handle=this.handles.eq(0),this.handles.each(function(t){k(this).data("ui-slider-handle-index",t).attr("tabIndex",0)})},_createRange:function(){var t=this.options;t.range?(!0===t.range&&(t.values?t.values.length&&2!==t.values.length?t.values=[t.values[0],t.values[0]]:k.isArray(t.values)&&(t.values=t.values.slice(0)):t.values=[this._valueMin(),this._valueMin()]),this.range&&this.range.length?(this._removeClass(this.range,"ui-slider-range-min ui-slider-range-max"),this.range.css({left:"",bottom:""})):(this.range=k("<div>").appendTo(this.element),this._addClass(this.range,"ui-slider-range")),"min"!==t.range&&"max"!==t.range||this._addClass(this.range,"ui-slider-range-"+t.range)):(this.range&&this.range.remove(),this.range=null)},_setupEvents:function(){this._off(this.handles),this._on(this.handles,this._handleEvents),this._hoverable(this.handles),this._focusable(this.handles)},_destroy:function(){this.handles.remove(),this.range&&this.range.remove(),this._mouseDestroy()},_mouseCapture:function(t){var i,s,n,o,e,a,r=this,l=this.options;return!l.disabled&&(this.elementSize={width:this.element.outerWidth(),height:this.element.outerHeight()},this.elementOffset=this.element.offset(),a={x:t.pageX,y:t.pageY},i=this._normValueFromMouse(a),s=this._valueMax()-this._valueMin()+1,this.handles.each(function(t){var e=Math.abs(i-r.values(t));(e<s||s===e&&(t===r._lastChangedValue||r.values(t)===l.min))&&(s=e,n=k(this),o=t)}),!1!==this._start(t,o)&&(this._mouseSliding=!0,this._handleIndex=o,this._addClass(n,null,"ui-state-active"),n.trigger("focus"),e=n.offset(),a=!k(t.target).parents().addBack().is(".ui-slider-handle"),this._clickOffset=a?{left:0,top:0}:{left:t.pageX-e.left-n.width()/2,top:t.pageY-e.top-n.height()/2-(parseInt(n.css("borderTopWidth"),10)||0)-(parseInt(n.css("borderBottomWidth"),10)||0)+(parseInt(n.css("marginTop"),10)||0)},this.handles.hasClass("ui-state-hover")||this._slide(t,o,i),this._animateOff=!0))},_mouseStart:function(){return!0},_mouseDrag:function(t){var e={x:t.pageX,y:t.pageY},e=this._normValueFromMouse(e);return this._slide(t,this._handleIndex,e),!1},_mouseStop:function(t){return this._removeClass(this.handles,null,"ui-state-active"),this._mouseSliding=!1,this._stop(t,this._handleIndex),this._change(t,this._handleIndex),this._handleIndex=null,this._clickOffset=null,this._animateOff=!1},_detectOrientation:function(){this.orientation="vertical"===this.options.orientation?"vertical":"horizontal"},_normValueFromMouse:function(t){var e,t="horizontal"===this.orientation?(e=this.elementSize.width,t.x-this.elementOffset.left-(this._clickOffset?this._clickOffset.left:0)):(e=this.elementSize.height,t.y-this.elementOffset.top-(this._clickOffset?this._clickOffset.top:0)),t=t/e;return 1<t&&(t=1),t<0&&(t=0),"vertical"===this.orientation&&(t=1-t),e=this._valueMax()-this._valueMin(),e=this._valueMin()+t*e,this._trimAlignValue(e)},_uiHash:function(t,e,i){var s={handle:this.handles[t],handleIndex:t,value:void 0!==e?e:this.value()};return this._hasMultipleValues()&&(s.value=void 0!==e?e:this.values(t),s.values=i||this.values()),s},_hasMultipleValues:function(){return this.options.values&&this.options.values.length},_start:function(t,e){return this._trigger("start",t,this._uiHash(e))},_slide:function(t,e,i){var s,n=this.value(),o=this.values();this._hasMultipleValues()&&(s=this.values(e?0:1),n=this.values(e),2===this.options.values.length&&!0===this.options.range&&(i=0===e?Math.min(s,i):Math.max(s,i)),o[e]=i),i!==n&&!1!==this._trigger("slide",t,this._uiHash(e,i,o))&&(this._hasMultipleValues()?this.values(e,i):this.value(i))},_stop:function(t,e){this._trigger("stop",t,this._uiHash(e))},_change:function(t,e){this._keySliding||this._mouseSliding||(this._lastChangedValue=e,this._trigger("change",t,this._uiHash(e)))},value:function(t){return arguments.length?(this.options.value=this._trimAlignValue(t),this._refreshValue(),void this._change(null,0)):this._value()},values:function(t,e){var i,s,n;if(1<arguments.length)return this.options.values[t]=this._trimAlignValue(e),this._refreshValue(),void this._change(null,t);if(!arguments.length)return this._values();if(!k.isArray(t))return this._hasMultipleValues()?this._values(t):this.value();for(i=this.options.values,s=t,n=0;n<i.length;n+=1)i[n]=this._trimAlignValue(s[n]),this._change(null,n);this._refreshValue()},_setOption:function(t,e){var i,s=0;switch("range"===t&&!0===this.options.range&&("min"===e?(this.options.value=this._values(0),this.options.values=null):"max"===e&&(this.options.value=this._values(this.options.values.length-1),this.options.values=null)),k.isArray(this.options.values)&&(s=this.options.values.length),this._super(t,e),t){case"orientation":this._detectOrientation(),this._removeClass("ui-slider-horizontal ui-slider-vertical")._addClass("ui-slider-"+this.orientation),this._refreshValue(),this.options.range&&this._refreshRange(e),this.handles.css("horizontal"===e?"bottom":"left","");break;case"value":this._animateOff=!0,this._refreshValue(),this._change(null,0),this._animateOff=!1;break;case"values":for(this._animateOff=!0,this._refreshValue(),i=s-1;0<=i;i--)this._change(null,i);this._animateOff=!1;break;case"step":case"min":case"max":this._animateOff=!0,this._calculateNewMax(),this._refreshValue(),this._animateOff=!1;break;case"range":this._animateOff=!0,this._refresh(),this._animateOff=!1}},_setOptionDisabled:function(t){this._super(t),this._toggleClass(null,"ui-state-disabled",!!t)},_value:function(){var t=this.options.value;return t=this._trimAlignValue(t)},_values:function(t){var e,i,s;if(arguments.length)return e=this.options.values[t],this._trimAlignValue(e);if(this._hasMultipleValues()){for(i=this.options.values.slice(),s=0;s<i.length;s+=1)i[s]=this._trimAlignValue(i[s]);return i}return[]},_trimAlignValue:function(t){if(t<=this._valueMin())return this._valueMin();if(t>=this._valueMax())return this._valueMax();var e=0<this.options.step?this.options.step:1,i=(t-this._valueMin())%e,t=t-i;return 2*Math.abs(i)>=e&&(t+=0<i?e:-e),parseFloat(t.toFixed(5))},_calculateNewMax:function(){var t=this.options.max,e=this._valueMin(),i=this.options.step;(t=Math.round((t-e)/i)*i+e)>this.options.max&&(t-=i),this.max=parseFloat(t.toFixed(this._precision()))},_precision:function(){var t=this._precisionOf(this.options.step);return null!==this.options.min&&(t=Math.max(t,this._precisionOf(this.options.min))),t},_precisionOf:function(t){var e=t.toString(),t=e.indexOf(".");return-1===t?0:e.length-t-1},_valueMin:function(){return this.options.min},_valueMax:function(){return this.max},_refreshRange:function(t){"vertical"===t&&this.range.css({width:"",left:""}),"horizontal"===t&&this.range.css({height:"",bottom:""})},_refreshValue:function(){var e,i,t,s,n,o=this.options.range,a=this.options,r=this,l=!this._animateOff&&a.animate,h={};this._hasMultipleValues()?this.handles.each(function(t){i=(r.values(t)-r._valueMin())/(r._valueMax()-r._valueMin())*100,h["horizontal"===r.orientation?"left":"bottom"]=i+"%",k(this).stop(1,1)[l?"animate":"css"](h,a.animate),!0===r.options.range&&("horizontal"===r.orientation?(0===t&&r.range.stop(1,1)[l?"animate":"css"]({left:i+"%"},a.animate),1===t&&r.range[l?"animate":"css"]({width:i-e+"%"},{queue:!1,duration:a.animate})):(0===t&&r.range.stop(1,1)[l?"animate":"css"]({bottom:i+"%"},a.animate),1===t&&r.range[l?"animate":"css"]({height:i-e+"%"},{queue:!1,duration:a.animate}))),e=i}):(t=this.value(),s=this._valueMin(),n=this._valueMax(),i=n!==s?(t-s)/(n-s)*100:0,h["horizontal"===this.orientation?"left":"bottom"]=i+"%",this.handle.stop(1,1)[l?"animate":"css"](h,a.animate),"min"===o&&"horizontal"===this.orientation&&this.range.stop(1,1)[l?"animate":"css"]({width:i+"%"},a.animate),"max"===o&&"horizontal"===this.orientation&&this.range.stop(1,1)[l?"animate":"css"]({width:100-i+"%"},a.animate),"min"===o&&"vertical"===this.orientation&&this.range.stop(1,1)[l?"animate":"css"]({height:i+"%"},a.animate),"max"===o&&"vertical"===this.orientation&&this.range.stop(1,1)[l?"animate":"css"]({height:100-i+"%"},a.animate))},_handleEvents:{keydown:function(t){var e,i,s,n=k(t.target).data("ui-slider-handle-index");switch(t.keyCode){case k.ui.keyCode.HOME:case k.ui.keyCode.END:case k.ui.keyCode.PAGE_UP:case k.ui.keyCode.PAGE_DOWN:case k.ui.keyCode.UP:case k.ui.keyCode.RIGHT:case k.ui.keyCode.DOWN:case k.ui.keyCode.LEFT:if(t.preventDefault(),!this._keySliding&&(this._keySliding=!0,this._addClass(k(t.target),null,"ui-state-active"),!1===this._start(t,n)))return}switch(s=this.options.step,e=i=this._hasMultipleValues()?this.values(n):this.value(),t.keyCode){case k.ui.keyCode.HOME:i=this._valueMin();break;case k.ui.keyCode.END:i=this._valueMax();break;case k.ui.keyCode.PAGE_UP:i=this._trimAlignValue(e+(this._valueMax()-this._valueMin())/this.numPages);break;case k.ui.keyCode.PAGE_DOWN:i=this._trimAlignValue(e-(this._valueMax()-this._valueMin())/this.numPages);break;case k.ui.keyCode.UP:case k.ui.keyCode.RIGHT:if(e===this._valueMax())return;i=this._trimAlignValue(e+s);break;case k.ui.keyCode.DOWN:case k.ui.keyCode.LEFT:if(e===this._valueMin())return;i=this._trimAlignValue(e-s)}this._slide(t,n,i)},keyup:function(t){var e=k(t.target).data("ui-slider-handle-index");this._keySliding&&(this._keySliding=!1,this._stop(t,e),this._change(t,e),this._removeClass(k(t.target),null,"ui-state-active"))}}});k.widget("ui.tooltip",{version:"1.12.1",options:{classes:{"ui-tooltip":"ui-corner-all ui-widget-shadow"},content:function(){var t=k(this).attr("title")||"";return k("<a>").text(t).html()},hide:!0,items:"[title]:not([disabled])",position:{my:"left top+15",at:"left bottom",collision:"flipfit flip"},show:!0,track:!1,close:null,open:null},_addDescribedBy:function(t,e){var i=(t.attr("aria-describedby")||"").split(/\s+/);i.push(e),t.data("ui-tooltip-id",e).attr("aria-describedby",k.trim(i.join(" ")))},_removeDescribedBy:function(t){var e=t.data("ui-tooltip-id"),i=(t.attr("aria-describedby")||"").split(/\s+/),e=k.inArray(e,i);-1!==e&&i.splice(e,1),t.removeData("ui-tooltip-id"),(i=k.trim(i.join(" ")))?t.attr("aria-describedby",i):t.removeAttr("aria-describedby")},_create:function(){this._on({mouseover:"open",focusin:"open"}),this.tooltips={},this.parents={},this.liveRegion=k("<div>").attr({role:"log","aria-live":"assertive","aria-relevant":"additions"}).appendTo(this.document[0].body),this._addClass(this.liveRegion,null,"ui-helper-hidden-accessible"),this.disabledTitles=k([])},_setOption:function(t,e){var i=this;this._super(t,e),"content"===t&&k.each(this.tooltips,function(t,e){i._updateContent(e.element)})},_setOptionDisabled:function(t){this[t?"_disable":"_enable"]()},_disable:function(){var s=this;k.each(this.tooltips,function(t,e){var i=k.Event("blur");i.target=i.currentTarget=e.element[0],s.close(i,!0)}),this.disabledTitles=this.disabledTitles.add(this.element.find(this.options.items).addBack().filter(function(){var t=k(this);if(t.is("[title]"))return t.data("ui-tooltip-title",t.attr("title")).removeAttr("title")}))},_enable:function(){this.disabledTitles.each(function(){var t=k(this);t.data("ui-tooltip-title")&&t.attr("title",t.data("ui-tooltip-title"))}),this.disabledTitles=k([])},open:function(t){var i=this,e=k(t?t.target:this.element).closest(this.options.items);e.length&&!e.data("ui-tooltip-id")&&(e.attr("title")&&e.data("ui-tooltip-title",e.attr("title")),e.data("ui-tooltip-open",!0),t&&"mouseover"===t.type&&e.parents().each(function(){var t,e=k(this);e.data("ui-tooltip-open")&&((t=k.Event("blur")).target=t.currentTarget=this,i.close(t,!0)),e.attr("title")&&(e.uniqueId(),i.parents[this.id]={element:this,title:e.attr("title")},e.attr("title",""))}),this._registerCloseHandlers(t,e),this._updateContent(e,t))},_updateContent:function(e,i){var t=this.options.content,s=this,n=i?i.type:null;if("string"==typeof t||t.nodeType||t.jquery)return this._open(i,e,t);(t=t.call(e[0],function(t){s._delay(function(){e.data("ui-tooltip-open")&&(i&&(i.type=n),this._open(i,e,t))})}))&&this._open(i,e,t)},_open:function(t,e,i){var s,n,o,a=k.extend({},this.options.position);function r(t){a.of=t,n.is(":hidden")||n.position(a)}i&&((s=this._find(e))?s.tooltip.find(".ui-tooltip-content").html(i):(e.is("[title]")&&(t&&"mouseover"===t.type?e.attr("title",""):e.removeAttr("title")),s=this._tooltip(e),n=s.tooltip,this._addDescribedBy(e,n.attr("id")),n.find(".ui-tooltip-content").html(i),this.liveRegion.children().hide(),(i=k("<div>").html(n.find(".ui-tooltip-content").html())).removeAttr("name").find("[name]").removeAttr("name"),i.removeAttr("id").find("[id]").removeAttr("id"),i.appendTo(this.liveRegion),this.options.track&&t&&/^mouse/.test(t.type)?(this._on(this.document,{mousemove:r}),r(t)):n.position(k.extend({of:e},this.options.position)),n.hide(),this._show(n,this.options.show),this.options.track&&this.options.show&&this.options.show.delay&&(o=this.delayedShow=setInterval(function(){n.is(":visible")&&(r(a.of),clearInterval(o))},k.fx.interval)),this._trigger("open",t,{tooltip:n})))},_registerCloseHandlers:function(t,e){var i={keyup:function(t){t.keyCode===k.ui.keyCode.ESCAPE&&((t=k.Event(t)).currentTarget=e[0],this.close(t,!0))}};e[0]!==this.element[0]&&(i.remove=function(){this._removeTooltip(this._find(e).tooltip)}),t&&"mouseover"!==t.type||(i.mouseleave="close"),t&&"focusin"!==t.type||(i.focusout="close"),this._on(!0,e,i)},close:function(t){var e,i=this,s=k(t?t.currentTarget:this.element),n=this._find(s);n?(e=n.tooltip,n.closing||(clearInterval(this.delayedShow),s.data("ui-tooltip-title")&&!s.attr("title")&&s.attr("title",s.data("ui-tooltip-title")),this._removeDescribedBy(s),n.hiding=!0,e.stop(!0),this._hide(e,this.options.hide,function(){i._removeTooltip(k(this))}),s.removeData("ui-tooltip-open"),this._off(s,"mouseleave focusout keyup"),s[0]!==this.element[0]&&this._off(s,"remove"),this._off(this.document,"mousemove"),t&&"mouseleave"===t.type&&k.each(this.parents,function(t,e){k(e.element).attr("title",e.title),delete i.parents[t]}),n.closing=!0,this._trigger("close",t,{tooltip:e}),n.hiding||(n.closing=!1))):s.removeData("ui-tooltip-open")},_tooltip:function(t){var e=k("<div>").attr("role","tooltip"),i=k("<div>").appendTo(e),s=e.uniqueId().attr("id");return this._addClass(i,"ui-tooltip-content"),this._addClass(e,"ui-tooltip","ui-widget ui-widget-content"),e.appendTo(this._appendTo(t)),this.tooltips[s]={element:t,tooltip:e}},_find:function(t){t=t.data("ui-tooltip-id");return t?this.tooltips[t]:null},_removeTooltip:function(t){t.remove(),delete this.tooltips[t.attr("id")]},_appendTo:function(t){t=t.closest(".ui-front, dialog");return t.length||(t=this.document[0].body),t},_destroy:function(){var s=this;k.each(this.tooltips,function(t,e){var i=k.Event("blur"),e=e.element;i.target=i.currentTarget=e[0],s.close(i,!0),k("#"+t).remove(),e.data("ui-tooltip-title")&&(e.attr("title")||e.attr("title",e.data("ui-tooltip-title")),e.removeData("ui-tooltip-title"))}),this.liveRegion.remove()}}),!1!==k.uiBackCompat&&k.widget("ui.tooltip",k.ui.tooltip,{options:{tooltipClass:null},_tooltip:function(){var t=this._superApply(arguments);return this.options.tooltipClass&&t.tooltip.addClass(this.options.tooltipClass),t}});k.ui.tooltip;var y,w,I,z,S,P,E,N,O,H,A,W,F,R,L,Y,B,j,K,V,U,q="ui-effects-",X="ui-effects-style",G="ui-effects-animated",$=k;function J(t,e,i){var s=N[e.type]||{};return null==t?i||!e.def?null:e.def:(t=s.floor?~~t:parseFloat(t),isNaN(t)?e.def:s.mod?(t+s.mod)%s.mod:t<0?0:s.max<t?s.max:t)}function Q(s){var n=P(),o=n._rgba=[];return s=s.toLowerCase(),A(S,function(t,e){var i=e.re.exec(s),i=i&&e.parse(i),e=e.space||"rgba";if(i)return i=n[e](i),n[E[e].cache]=i[E[e].cache],o=n._rgba=i._rgba,!1}),o.length?("0,0,0,0"===o.join()&&y.extend(o,I.transparent),n):I[s]}function Z(t,e,i){return 6*(i=(i+1)%1)<1?t+(e-t)*i*6:2*i<1?e:3*i<2?t+(e-t)*(2/3-i)*6:t}function tt(t){var e,i,s=t.ownerDocument.defaultView?t.ownerDocument.defaultView.getComputedStyle(t,null):t.currentStyle,n={};if(s&&s.length&&s[0]&&s[s[0]])for(i=s.length;i--;)"string"==typeof s[e=s[i]]&&(n[k.camelCase(e)]=s[e]);else for(e in s)"string"==typeof s[e]&&(n[e]=s[e]);return n}function et(t,e,i,s){return k.isPlainObject(t)&&(t=(e=t).effect),t={effect:t},null==e&&(e={}),k.isFunction(e)&&(s=e,i=null,e={}),"number"!=typeof e&&!k.fx.speeds[e]||(s=i,i=e,e={}),k.isFunction(i)&&(s=i,i=null),e&&k.extend(t,e),i=i||e.duration,t.duration=k.fx.off?0:"number"==typeof i?i:i in k.fx.speeds?k.fx.speeds[i]:k.fx.speeds._default,t.complete=s||e.complete,t}function it(t){return!t||"number"==typeof t||k.fx.speeds[t]||("string"==typeof t&&!k.effects.effect[t]||(k.isFunction(t)||"object"==typeof t&&!t.effect))}function st(t,e){var i=e.outerWidth(),e=e.outerHeight(),t=/^rect\((-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto)\)$/.exec(t)||["",0,i,e,0];return{top:parseFloat(t[1])||0,right:"auto"===t[2]?i:parseFloat(t[2]),bottom:"auto"===t[3]?e:parseFloat(t[3]),left:parseFloat(t[4])||0}}k.effects={effect:{}},z=/^([\-+])=\s*(\d+\.?\d*)/,S=[{re:/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,parse:function(t){return[t[1],t[2],t[3],t[4]]}},{re:/rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,parse:function(t){return[2.55*t[1],2.55*t[2],2.55*t[3],t[4]]}},{re:/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,parse:function(t){return[parseInt(t[1],16),parseInt(t[2],16),parseInt(t[3],16)]}},{re:/#([a-f0-9])([a-f0-9])([a-f0-9])/,parse:function(t){return[parseInt(t[1]+t[1],16),parseInt(t[2]+t[2],16),parseInt(t[3]+t[3],16)]}},{re:/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,space:"hsla",parse:function(t){return[t[1],t[2]/100,t[3]/100,t[4]]}}],P=(y=$).Color=function(t,e,i,s){return new y.Color.fn.parse(t,e,i,s)},E={rgba:{props:{red:{idx:0,type:"byte"},green:{idx:1,type:"byte"},blue:{idx:2,type:"byte"}}},hsla:{props:{hue:{idx:0,type:"degrees"},saturation:{idx:1,type:"percent"},lightness:{idx:2,type:"percent"}}}},N={byte:{floor:!0,max:255},percent:{max:1},degrees:{mod:360,floor:!0}},O=P.support={},H=y("<p>")[0],A=y.each,H.style.cssText="background-color:rgba(1,1,1,.5)",O.rgba=-1<H.style.backgroundColor.indexOf("rgba"),A(E,function(t,e){e.cache="_"+t,e.props.alpha={idx:3,type:"percent",def:1}}),P.fn=y.extend(P.prototype,{parse:function(n,t,e,i){if(n===w)return this._rgba=[null,null,null,null],this;(n.jquery||n.nodeType)&&(n=y(n).css(t),t=w);var o=this,s=y.type(n),a=this._rgba=[];return t!==w&&(n=[n,t,e,i],s="array"),"string"===s?this.parse(Q(n)||I._default):"array"===s?(A(E.rgba.props,function(t,e){a[e.idx]=J(n[e.idx],e)}),this):"object"===s?(A(E,n instanceof P?function(t,e){n[e.cache]&&(o[e.cache]=n[e.cache].slice())}:function(t,i){var s=i.cache;A(i.props,function(t,e){if(!o[s]&&i.to){if("alpha"===t||null==n[t])return;o[s]=i.to(o._rgba)}o[s][e.idx]=J(n[t],e,!0)}),o[s]&&y.inArray(null,o[s].slice(0,3))<0&&(o[s][3]=1,i.from&&(o._rgba=i.from(o[s])))}),this):void 0},is:function(t){var n=P(t),o=!0,a=this;return A(E,function(t,e){var i,s=n[e.cache];return s&&(i=a[e.cache]||e.to&&e.to(a._rgba)||[],A(e.props,function(t,e){if(null!=s[e.idx])return o=s[e.idx]===i[e.idx]})),o}),o},_space:function(){var i=[],s=this;return A(E,function(t,e){s[e.cache]&&i.push(t)}),i.pop()},transition:function(t,a){var e=(h=P(t))._space(),i=E[e],t=0===this.alpha()?P("transparent"):this,r=t[i.cache]||i.to(t._rgba),l=r.slice(),h=h[i.cache];return A(i.props,function(t,e){var i=e.idx,s=r[i],n=h[i],o=N[e.type]||{};null!==n&&(null===s?l[i]=n:(o.mod&&(o.mod/2<n-s?s+=o.mod:o.mod/2<s-n&&(s-=o.mod)),l[i]=J((n-s)*a+s,e)))}),this[e](l)},blend:function(t){if(1===this._rgba[3])return this;var e=this._rgba.slice(),i=e.pop(),s=P(t)._rgba;return P(y.map(e,function(t,e){return(1-i)*s[e]+i*t}))},toRgbaString:function(){var t="rgba(",e=y.map(this._rgba,function(t,e){return null==t?2<e?1:0:t});return 1===e[3]&&(e.pop(),t="rgb("),t+e.join()+")"},toHslaString:function(){var t="hsla(",e=y.map(this.hsla(),function(t,e){return null==t&&(t=2<e?1:0),e&&e<3&&(t=Math.round(100*t)+"%"),t});return 1===e[3]&&(e.pop(),t="hsl("),t+e.join()+")"},toHexString:function(t){var e=this._rgba.slice(),i=e.pop();return t&&e.push(~~(255*i)),"#"+y.map(e,function(t){return 1===(t=(t||0).toString(16)).length?"0"+t:t}).join("")},toString:function(){return 0===this._rgba[3]?"transparent":this.toRgbaString()}}),P.fn.parse.prototype=P.fn,E.hsla.to=function(t){if(null==t[0]||null==t[1]||null==t[2])return[null,null,null,t[3]];var e=t[0]/255,i=t[1]/255,s=t[2]/255,n=t[3],o=Math.max(e,i,s),a=Math.min(e,i,s),r=o-a,l=o+a,t=.5*l,i=a===o?0:e===o?60*(i-s)/r+360:i===o?60*(s-e)/r+120:60*(e-i)/r+240,l=0==r?0:t<=.5?r/l:r/(2-l);return[Math.round(i)%360,l,t,null==n?1:n]},E.hsla.from=function(t){if(null==t[0]||null==t[1]||null==t[2])return[null,null,null,t[3]];var e=t[0]/360,i=t[1],s=t[2],t=t[3],i=s<=.5?s*(1+i):s+i-s*i,s=2*s-i;return[Math.round(255*Z(s,i,e+1/3)),Math.round(255*Z(s,i,e)),Math.round(255*Z(s,i,e-1/3)),t]},A(E,function(l,t){var o=t.props,a=t.cache,r=t.to,h=t.from;P.fn[l]=function(t){if(r&&!this[a]&&(this[a]=r(this._rgba)),t===w)return this[a].slice();var e,i=y.type(t),s="array"===i||"object"===i?t:arguments,n=this[a].slice();return A(o,function(t,e){t=s["object"===i?t:e.idx];null==t&&(t=n[e.idx]),n[e.idx]=J(t,e)}),h?((e=P(h(n)))[a]=n,e):P(n)},A(o,function(a,r){P.fn[a]||(P.fn[a]=function(t){var e,i=y.type(t),s="alpha"===a?this._hsla?"hsla":"rgba":l,n=this[s](),o=n[r.idx];return"undefined"===i?o:("function"===i&&(t=t.call(this,o),i=y.type(t)),null==t&&r.empty?this:("string"===i&&(e=z.exec(t))&&(t=o+parseFloat(e[2])*("+"===e[1]?1:-1)),n[r.idx]=t,this[s](n)))})})}),P.hook=function(t){t=t.split(" ");A(t,function(t,o){y.cssHooks[o]={set:function(t,e){var i,s,n="";if("transparent"!==e&&("string"!==y.type(e)||(i=Q(e)))){if(e=P(i||e),!O.rgba&&1!==e._rgba[3]){for(s="backgroundColor"===o?t.parentNode:t;(""===n||"transparent"===n)&&s&&s.style;)try{n=y.css(s,"backgroundColor"),s=s.parentNode}catch(t){}e=e.blend(n&&"transparent"!==n?n:"_default")}e=e.toRgbaString()}try{t.style[o]=e}catch(t){}}},y.fx.step[o]=function(t){t.colorInit||(t.start=P(t.elem,o),t.end=P(t.end),t.colorInit=!0),y.cssHooks[o].set(t.elem,t.start.transition(t.end,t.pos))}})},P.hook("backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color columnRuleColor outlineColor textDecorationColor textEmphasisColor"),y.cssHooks.borderColor={expand:function(i){var s={};return A(["Top","Right","Bottom","Left"],function(t,e){s["border"+e+"Color"]=i}),s}},I=y.Color.names={aqua:"#00ffff",black:"#000000",blue:"#0000ff",fuchsia:"#ff00ff",gray:"#808080",green:"#008000",lime:"#00ff00",maroon:"#800000",navy:"#000080",olive:"#808000",purple:"#800080",red:"#ff0000",silver:"#c0c0c0",teal:"#008080",white:"#ffffff",yellow:"#ffff00",transparent:[null,null,null,0],_default:"#ffffff"},L=["add","remove","toggle"],Y={border:1,borderBottom:1,borderColor:1,borderLeft:1,borderRight:1,borderTop:1,borderWidth:1,margin:1,padding:1},k.each(["borderLeftStyle","borderRightStyle","borderBottomStyle","borderTopStyle"],function(t,e){k.fx.step[e]=function(t){("none"!==t.end&&!t.setAttr||1===t.pos&&!t.setAttr)&&($.style(t.elem,e,t.end),t.setAttr=!0)}}),k.fn.addBack||(k.fn.addBack=function(t){return this.add(null==t?this.prevObject:this.prevObject.filter(t))}),k.effects.animateClass=function(n,t,e,i){var o=k.speed(t,e,i);return this.queue(function(){var i=k(this),t=i.attr("class")||"",e=(e=o.children?i.find("*").addBack():i).map(function(){return{el:k(this),start:tt(this)}}),s=function(){k.each(L,function(t,e){n[e]&&i[e+"Class"](n[e])})};s(),e=e.map(function(){return this.end=tt(this.el[0]),this.diff=function(t,e){var i,s,n={};for(i in e)s=e[i],t[i]!==s&&(Y[i]||!k.fx.step[i]&&isNaN(parseFloat(s))||(n[i]=s));return n}(this.start,this.end),this}),i.attr("class",t),e=e.map(function(){var t=this,e=k.Deferred(),i=k.extend({},o,{queue:!1,complete:function(){e.resolve(t)}});return this.el.animate(this.diff,i),e.promise()}),k.when.apply(k,e.get()).done(function(){s(),k.each(arguments,function(){var e=this.el;k.each(this.diff,function(t){e.css(t,"")})}),o.complete.call(i[0])})})},k.fn.extend({addClass:(R=k.fn.addClass,function(t,e,i,s){return e?k.effects.animateClass.call(this,{add:t},e,i,s):R.apply(this,arguments)}),removeClass:(F=k.fn.removeClass,function(t,e,i,s){return 1<arguments.length?k.effects.animateClass.call(this,{remove:t},e,i,s):F.apply(this,arguments)}),toggleClass:(W=k.fn.toggleClass,function(t,e,i,s,n){return"boolean"==typeof e||void 0===e?i?k.effects.animateClass.call(this,e?{add:t}:{remove:t},i,s,n):W.apply(this,arguments):k.effects.animateClass.call(this,{toggle:t},e,i,s)}),switchClass:function(t,e,i,s,n){return k.effects.animateClass.call(this,{add:e,remove:t},i,s,n)}}),k.expr&&k.expr.filters&&k.expr.filters.animated&&(k.expr.filters.animated=(B=k.expr.filters.animated,function(t){return!!k(t).data(G)||B(t)})),!1!==k.uiBackCompat&&k.extend(k.effects,{save:function(t,e){for(var i=0,s=e.length;i<s;i++)null!==e[i]&&t.data(q+e[i],t[0].style[e[i]])},restore:function(t,e){for(var i,s=0,n=e.length;s<n;s++)null!==e[s]&&(i=t.data(q+e[s]),t.css(e[s],i))},setMode:function(t,e){return"toggle"===e&&(e=t.is(":hidden")?"show":"hide"),e},createWrapper:function(i){if(i.parent().is(".ui-effects-wrapper"))return i.parent();var s={width:i.outerWidth(!0),height:i.outerHeight(!0),float:i.css("float")},t=k("<div></div>").addClass("ui-effects-wrapper").css({fontSize:"100%",background:"transparent",border:"none",margin:0,padding:0}),e={width:i.width(),height:i.height()},n=document.activeElement;try{n.id}catch(t){n=document.body}return i.wrap(t),i[0]!==n&&!k.contains(i[0],n)||k(n).trigger("focus"),t=i.parent(),"static"===i.css("position")?(t.css({position:"relative"}),i.css({position:"relative"})):(k.extend(s,{position:i.css("position"),zIndex:i.css("z-index")}),k.each(["top","left","bottom","right"],function(t,e){s[e]=i.css(e),isNaN(parseInt(s[e],10))&&(s[e]="auto")}),i.css({position:"relative",top:0,left:0,right:"auto",bottom:"auto"})),i.css(e),t.css(s).show()},removeWrapper:function(t){var e=document.activeElement;return t.parent().is(".ui-effects-wrapper")&&(t.parent().replaceWith(t),t[0]!==e&&!k.contains(t[0],e)||k(e).trigger("focus")),t}}),k.extend(k.effects,{version:"1.12.1",define:function(t,e,i){return i||(i=e,e="effect"),k.effects.effect[t]=i,k.effects.effect[t].mode=e,i},scaledDimensions:function(t,e,i){if(0===e)return{height:0,width:0,outerHeight:0,outerWidth:0};var s="horizontal"!==i?(e||100)/100:1,e="vertical"!==i?(e||100)/100:1;return{height:t.height()*e,width:t.width()*s,outerHeight:t.outerHeight()*e,outerWidth:t.outerWidth()*s}},clipToBox:function(t){return{width:t.clip.right-t.clip.left,height:t.clip.bottom-t.clip.top,left:t.clip.left,top:t.clip.top}},unshift:function(t,e,i){var s=t.queue();1<e&&s.splice.apply(s,[1,0].concat(s.splice(e,i))),t.dequeue()},saveStyle:function(t){t.data(X,t[0].style.cssText)},restoreStyle:function(t){t[0].style.cssText=t.data(X)||"",t.removeData(X)},mode:function(t,e){t=t.is(":hidden");return"toggle"===e&&(e=t?"show":"hide"),(t?"hide"===e:"show"===e)&&(e="none"),e},getBaseline:function(t,e){var i,s;switch(t[0]){case"top":i=0;break;case"middle":i=.5;break;case"bottom":i=1;break;default:i=t[0]/e.height}switch(t[1]){case"left":s=0;break;case"center":s=.5;break;case"right":s=1;break;default:s=t[1]/e.width}return{x:s,y:i}},createPlaceholder:function(t){var e,i=t.css("position"),s=t.position();return t.css({marginTop:t.css("marginTop"),marginBottom:t.css("marginBottom"),marginLeft:t.css("marginLeft"),marginRight:t.css("marginRight")}).outerWidth(t.outerWidth()).outerHeight(t.outerHeight()),/^(static|relative)/.test(i)&&(i="absolute",e=k("<"+t[0].nodeName+">").insertAfter(t).css({display:/^(inline|ruby)/.test(t.css("display"))?"inline-block":"block",visibility:"hidden",marginTop:t.css("marginTop"),marginBottom:t.css("marginBottom"),marginLeft:t.css("marginLeft"),marginRight:t.css("marginRight"),float:t.css("float")}).outerWidth(t.outerWidth()).outerHeight(t.outerHeight()).addClass("ui-effects-placeholder"),t.data(q+"placeholder",e)),t.css({position:i,left:s.left,top:s.top}),e},removePlaceholder:function(t){var e=q+"placeholder",i=t.data(e);i&&(i.remove(),t.removeData(e))},cleanUp:function(t){k.effects.restoreStyle(t),k.effects.removePlaceholder(t)},setTransition:function(s,t,n,o){return o=o||{},k.each(t,function(t,e){var i=s.cssUnit(e);0<i[0]&&(o[e]=i[0]*n+i[1])}),o}}),k.fn.extend({effect:function(){function t(t){var e=k(this),i=k.effects.mode(e,r)||o;e.data(G,!0),l.push(i),o&&("show"===i||i===o&&"hide"===i)&&e.show(),o&&"none"===i||k.effects.saveStyle(e),k.isFunction(t)&&t()}var s=et.apply(this,arguments),n=k.effects.effect[s.effect],o=n.mode,e=s.queue,i=e||"fx",a=s.complete,r=s.mode,l=[];return k.fx.off||!n?r?this[r](s.duration,a):this.each(function(){a&&a.call(this)}):!1===e?this.each(t).each(h):this.queue(i,t).queue(i,h);function h(t){var e=k(this);function i(){k.isFunction(a)&&a.call(e[0]),k.isFunction(t)&&t()}s.mode=l.shift(),!1===k.uiBackCompat||o?"none"===s.mode?(e[r](),i()):n.call(e[0],s,function(){e.removeData(G),k.effects.cleanUp(e),"hide"===s.mode&&e.hide(),i()}):(e.is(":hidden")?"hide"===r:"show"===r)?(e[r](),i()):n.call(e[0],s,i)}},show:(V=k.fn.show,function(t){if(it(t))return V.apply(this,arguments);var e=et.apply(this,arguments);return e.mode="show",this.effect.call(this,e)}),hide:(K=k.fn.hide,function(t){if(it(t))return K.apply(this,arguments);var e=et.apply(this,arguments);return e.mode="hide",this.effect.call(this,e)}),toggle:(j=k.fn.toggle,function(t){if(it(t)||"boolean"==typeof t)return j.apply(this,arguments);var e=et.apply(this,arguments);return e.mode="toggle",this.effect.call(this,e)}),cssUnit:function(t){var i=this.css(t),s=[];return k.each(["em","px","%","pt"],function(t,e){0<i.indexOf(e)&&(s=[parseFloat(i),e])}),s},cssClip:function(t){return t?this.css("clip","rect("+t.top+"px "+t.right+"px "+t.bottom+"px "+t.left+"px)"):st(this.css("clip"),this)},transfer:function(t,e){var i=k(this),s=k(t.to),n="fixed"===s.css("position"),o=k("body"),a=n?o.scrollTop():0,r=n?o.scrollLeft():0,o=s.offset(),o={top:o.top-a,left:o.left-r,height:s.innerHeight(),width:s.innerWidth()},s=i.offset(),l=k("<div class='ui-effects-transfer'></div>").appendTo("body").addClass(t.className).css({top:s.top-a,left:s.left-r,height:i.innerHeight(),width:i.innerWidth(),position:n?"fixed":"absolute"}).animate(o,t.duration,t.easing,function(){l.remove(),k.isFunction(e)&&e()})}}),k.fx.step.clip=function(t){t.clipInit||(t.start=k(t.elem).cssClip(),"string"==typeof t.end&&(t.end=st(t.end,t.elem)),t.clipInit=!0),k(t.elem).cssClip({top:t.pos*(t.end.top-t.start.top)+t.start.top,right:t.pos*(t.end.right-t.start.right)+t.start.right,bottom:t.pos*(t.end.bottom-t.start.bottom)+t.start.bottom,left:t.pos*(t.end.left-t.start.left)+t.start.left})},U={},k.each(["Quad","Cubic","Quart","Quint","Expo"],function(e,t){U[t]=function(t){return Math.pow(t,e+2)}}),k.extend(U,{Sine:function(t){return 1-Math.cos(t*Math.PI/2)},Circ:function(t){return 1-Math.sqrt(1-t*t)},Elastic:function(t){return 0===t||1===t?t:-Math.pow(2,8*(t-1))*Math.sin((80*(t-1)-7.5)*Math.PI/15)},Back:function(t){return t*t*(3*t-2)},Bounce:function(t){for(var e,i=4;t<((e=Math.pow(2,--i))-1)/11;);return 1/Math.pow(4,3-i)-7.5625*Math.pow((3*e-2)/22-t,2)}}),k.each(U,function(t,e){k.easing["easeIn"+t]=e,k.easing["easeOut"+t]=function(t){return 1-e(1-t)},k.easing["easeInOut"+t]=function(t){return t<.5?e(2*t)/2:1-e(-2*t+2)/2}});k.effects,k.effects.define("slide","show",function(t,e){var i,s,n=k(this),o={up:["bottom","top"],down:["top","bottom"],left:["right","left"],right:["left","right"]},a=t.mode,r=t.direction||"left",l="up"===r||"down"===r?"top":"left",h="up"===r||"left"===r,u=t.distance||n["top"==l?"outerHeight":"outerWidth"](!0),c={};k.effects.createPlaceholder(n),i=n.cssClip(),s=n.position()[l],c[l]=(h?-1:1)*u+s,c.clip=n.cssClip(),c.clip[o[r][1]]=c.clip[o[r][0]],"show"===a&&(n.cssClip(c.clip),n.css(l,c[l]),c.clip=i,c[l]=s),n.animate(c,{queue:!1,duration:t.duration,easing:t.easing,complete:e})})});/*!
 * jQuery UI Touch Punch 0.2.3
 *
 * Copyright 2011–2014, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
 !function(a){function f(a,b){if(!(a.originalEvent.touches.length>1)){a.preventDefault();var c=a.originalEvent.changedTouches[0],d=document.createEvent("MouseEvents");d.initMouseEvent(b,!0,!0,window,1,c.screenX,c.screenY,c.clientX,c.clientY,!1,!1,!1,!1,0,null),a.target.dispatchEvent(d)}}if(a.support.touch="ontouchend"in document,a.support.touch){var e,b=a.ui.mouse.prototype,c=b._mouseInit,d=b._mouseDestroy;b._touchStart=function(a){var b=this;!e&&b._mouseCapture(a.originalEvent.changedTouches[0])&&(e=!0,b._touchMoved=!1,f(a,"mouseover"),f(a,"mousemove"),f(a,"mousedown"))},b._touchMove=function(a){e&&(this._touchMoved=!0,f(a,"mousemove"))},b._touchEnd=function(a){e&&(f(a,"mouseup"),f(a,"mouseout"),this._touchMoved||f(a,"click"),e=!1)},b._mouseInit=function(){var b=this;b.element.bind({touchstart:a.proxy(b,"_touchStart"),touchmove:a.proxy(b,"_touchMove"),touchend:a.proxy(b,"_touchEnd")}),c.call(b)},b._mouseDestroy=function(){var b=this;b.element.unbind({touchstart:a.proxy(b,"_touchStart"),touchmove:a.proxy(b,"_touchMove"),touchend:a.proxy(b,"_touchEnd")}),d.call(b)}}}(jQuery);function finder_targetting_onchange(ele) {
  const targetBy = ele.value;

  $('[id^=tFe1_priceWrapper-]').hide();
  var priceFromWrapper = $('#tFe1_priceWrapper-priceFrom');
  var priceFromLabel = $('#tFe1_priceWrapper-priceFrom .inputLabel');
  var priceToWrapper = $('#tFe1_priceWrapper-priceTo');
  var priceToLabel = $('#tFe1_priceWrapper-priceTo .inputLabel');
  switch (targetBy) {
    case 'range':
      priceFromWrapper.show();
      priceToWrapper.show();
      priceFromLabel.text('Price from:');
      priceToLabel.text('Price to:');
      return;
    case 'gt':
      priceFromWrapper.show();
      priceFromLabel.text('Higher than:');
      return;

    case 'lt':
      priceToWrapper.show();
      priceToLabel.text('Lower than:');
      return;

    case 'single':
    default:
      priceFromWrapper.show();
      priceFromLabel.text('Target price:');
      return;

  }
}

var OP_FINDER_ENDPOINT = V3_API_PATH + '/finder';

function finder_getWriteVal() {
  var writeRadioResp = document.querySelector('input[name="tF_write"]:checked');
  return writeRadioResp && writeRadioResp.value === '1' ? 1 : 0;
}

function finder_find() {
  const $finderSubmit = $('#tF_submit');

  var symbol = $('#tFe0-symbol').val();
  var currentPrice = $('#tFe0-curPrice').val();
  var targetting = $('#finder_priceDirection').val()
  var priceFrom = $('#tFe1_input_price-from').val();
  var priceTo = $('#tFe1_input_price-to').val();
  var ivHist = $('#tFe0-ivHist').val();
  if (targetting === 'lt') {
    // hacks
    priceTo = priceFrom;
    priceFrom = '';
  }
  var datePref = $('[name=finder_dateStyle]:checked').val();
  var dateDate = $('#tFe1_input_date-date').val();
  var dateExp = $('#tFe1_input_expiry-expiry').val();
  var budgetCost = $('#tFe1_input_cost-cost').val();
  var strategies = {
    'option-purchase': $('#finder-strat-option-purchase').attr('checked') === 'checked' || $('#finder-strat-option-purchase').length === 0,
    'short-option': $('#finder-strat-short-option').attr('checked') === 'checked',
    'credit-spread': $('#finder-strat-credit-spread').attr('checked') === 'checked',
    'debit-spread': $('#finder-strat-debit-spread').attr('checked') === 'checked'
  };

  var sell = finder_getWriteVal();


  var errs = [];
  renderError('');
  if (!symbol) errs.push('Please enter a symbol');
  if (!currentPrice) errs.push('Please enter the current price');
  if (!priceFrom && !priceTo) errs.push('Please enter expected price');
  if (datePref === 'date' && !dateDate) errs.push('Please enter expected date');
  if (datePref !== 'date' && !dateExp) errs.push('Please enter expected date');
  if (errs.length > 0) {
    renderError(' - ' + errs.join('<br/> - '))
    return;
  }

  var payload = { 
    symbol: symbol,
    targetting: targetting,
    priceFrom: priceFrom,
    priceTo: priceTo,
    date: datePref === 'date' ? dateDate : dateExp,
    specificExpiry: datePref === 'expiry' ? '1' : '0',
    currentPrice: currentPrice,
    ivHist: ivHist,
    budgetCost: sell ? '' : budgetCost,
    dataFormat: 'v2',
    strategies: strategies,
    sell: sell
  }

  $.getJSON(OP_FINDER_ENDPOINT, payload, function(d) { finder_find_return(d, { sell: sell } ); } );
  $finderSubmit.attr('disabled', 'disabled');
  $finderSubmit.html(dotLoader);
  $finderSubmit.val('Finding...');

  $('.finder_results').html('<p style="text-align: center"><em>Finding you the best options</em></p>');
  $('.finder_results').addClass('translucentLoading');

  // set UI status
}

function renderError(errStr) {
  var rEle = $('#tFe1_results');
  rEle.html('');
  rEle.append('<p class="txt_error">' + errStr + '</p>')
}

function renderIn_single_option_ele(sEle, strat) {
  sEle.append('<h3>' + strat.title + ': ' +
    ucFirst(strat.legsById.option.act) + ' ' +
    (strat.legsById.option.num) + 'x ' +
    expDescFromYMD(strat.legsById.option.expiry) + ' ' +
    formatPrice(strat.legsById.option.strike) + ' ' +
    ucFirst(strat.legsById.option.opType) + ' @ ' +
formatPrice(strat.legsById.option.price) +
    '</h3>'
  );
}
function renderIn_spread_ele(sEle, strat) {
  sEle.append('<h3>' + strat.title + ': ' +
    (strat.legsById.long.num) + 'x ' +
    expDescFromYMD(strat.legsById.long.expiry) + ' ' +
    (strat.legsById.long.strike) + '/' +
    (strat.legsById.short.strike) + ' ' +
    ucFirst(strat.legsById.long.opType) + ' @ ' +
    formatPrice(strat.legsById.long.price - strat.legsById.short.price) +
    '</h3>'
  );
}

function renderIn_summary(oEle, outcome) {
  const crDr = outcome.init > 0 ? '(credit)' : '(debit)';
  oEle.append('<p>Entry cost: ' + formatPrice(Math.abs(outcome.init)) + ' ' + crDr + '</p>');
  oEle.append('<p>Maximum risk<sup style="font-size: xx-small;">1</sup>: ' +
    (outcome.maxRisk === null ? 'Infinite' : formatPrice(Math.max(0, -outcome.maxRisk))) +
  '</p>');
  if (outcome.netMargin) {
    oEle.append('<p>Est. net margin impact: ' + formatPrice(outcome.netMargin) +
      '</p>');
  }
  oEle.append('<p>Est. return<sup style="font-size: xx-small;">1</sup> at target price: ' + formatPrice(outcome.net) + ' ('+ 
    (!outcome.netMargin
      ? roundTo(outcome.roiMaxRisk * 100, 1) 
      : roundTo(outcome.roiMargin * 100, 1) 
    )
    +'%'+
      (!outcome.netMargin ? '' : '<sup style="font-size: xx-small;">2</sup>')
    +')</p>');
  if (outcome.netMargin) {
    oEle.append('<p>Est. net margin impact: ' + formatPrice(outcome.netMargin) +
    '</p>');
  }
  oEle.append('<p>Probability of profit: ' +
    (outcome.pop === null ? 'N/A' : roundTo(Math.max(0.99, outcome.pop * 100), 1)+"% <a href='#' onclick='alert(\"Probability of returning at least $0.01 at the time of expiry.  This figure is derived from 30 day Implied Volatility.\");return false;' class='help'>?</a></p>"));
}

var v2stratMap = {
  'long-call': 'long-call',
  'long-put': 'long-put',
  'short-call': 'short-call',
  'short-put': 'short-put',
  'bearish-call-credit-spread': 'credit-spread',
  'bearish-put-debit-spread': 'put-spread',
  'bullish-call-debit-spread': 'call-spread',
  'bullish-put-credit-spread': 'credit-spread'
}

function finder_add_and_open(outcomeIdx) {
  finder_add_to_calcs(outcomeIdx, { thenShow: true })
}
function finder_add_to_calcs(outcomeIdx, cfg) {
  if (!cfg) {
    cfg = { thenShow: false };
  }
  var spanEle = $('<span />', { class: 'loading' });
  var showCfg = { show: cfg.thenShow, spanEle: spanEle };
  spanEle.text('Opening calculation...');
  $('[data-outcome-id='+outcomeIdx+'] a.button').replaceWith(spanEle);

  var strat = ((outcomes[outcomeIdx] || {}).vars || {}).strat || {};
  var values = {
    'strat': v2stratMap[strat.metadata.stratKey],
    'underlying-symbol': $('#tFe0-symbol').val(),
    'underlying-curPrice': $('#tFe0-curPrice').val(),
    'underlying-marketPrice': $('#tFe0-marketPrice').val(),
    'underlying-lastPrice': $('#tFe0-lastPrice').val(),
    'underlying-ivHist': $('#tFe0-ivHist').val(),
    'graph-rangeAuto': '1',
    'graph-type': 'roiRisk',
    'graph-date': ''
  };
  Object.keys(strat.legsById).map(
    function(legId) {
      if (strat.legsById[legId].type === 'option') {
        values[legId + '-act'] = strat.legsById[legId].act;
        values[legId + '-price'] = strat.legsById[legId].price;
        values[legId + '-curPrice'] = strat.legsById[legId].curPrice;
        values[legId + '-num'] = strat.legsById[legId].num;
        values[legId + '-opType'] = strat.legsById[legId].opType[0];
        values[legId + '-expiry'] = strat.legsById[legId].expiry;
        values[legId + '-strike'] = strat.legsById[legId].strike;
        values[legId + '-iv'] = strat.legsById[legId].iv;
      }
    }
  );

  var rqId = ajaxRequest("adding calculation", 'newTab', values, doFinder_newTab_return, { values: values, showCfg: showCfg });
  // newTab(strat.stratKey, rqId);
}

function doFinder_newTab_return(reqData, data) {
  var values = Object.assign(
    reqData.values,
    { tabId: data.tabId, stratKey: reqData.values.strat }
  );
  var rqId = ajaxRequest("adding calculation", 'calculate', values, doFinder_calculation_return, { tabReturnData: data, showCfg: reqData.showCfg });
}

var tabsFromFinder = [];
function doFinder_calculation_return(reqData, data) {
  reqData.showCfg.spanEle.text(' (added)');
  reqData.showCfg.spanEle.removeClass('loading');
  var aEle = $('<a />', { class: 'button button--outline smallButton' });
  aEle.text('Open calculation');
  aEle.click(function (ev) {
    $('#strat_' + reqData.tabReturnData.tabId + '_button .jq_exclusive_switch_flash').click();
  });
  reqData.showCfg.spanEle.prepend(aEle);
  tabsFromFinder[reqData.tabReturnData.tabId] = true;
  newTab_return({}, reqData.tabReturnData, reqData.showCfg);
  doCalculation_return({ tab_num: reqData.tabReturnData.tabId }, data);
}

var outcomes;

function render_finder_results(_outcomes, meta) {
  var rEle = $('#tFe1_results');
  rEle.removeClass('translucentLoading');
  rEle.html('');
  outcomes = _outcomes || [];
  if (outcomes.length) {
    rEle.append('<h2 style="margin-bottom: 0.3em">Top 5 options</h2>');
    rEle.append('<p style="margin-bottom: 1em" class="minor">Sorted by % ROI of max risk (or % ROI initial collateral, for naked options)</p>');
    outcomes.map(
      function (outcome, i) {
        var oEle = $('<div />', { class: 'finder_result', 'data-outcome-id': i });
        var strat = ((outcome || {}).vars || {}).strat;
        if (!strat) return;
        
        if (['long-put', 'long-call', 'short-put', 'short-call'].indexOf(strat.metadata.stratKey) >= 0) renderIn_single_option_ele(oEle, strat);
        if (['bearish-call-credit-spread', 'bullish-put-credit-spread', 'bearish-put-debit-spread', 'bullish-call-debit-spread']
          .indexOf(strat.metadata.stratKey) >= 0) renderIn_spread_ele(oEle, strat);
        // else if – other strategies with multileg
        
        renderIn_summary(oEle, outcome);
        oEle.append(
          '<p class="finder__add-class"><a href="#" class="button smallButton button--outline" onclick="finder_add_and_open('+i+'); return false;">View detailed estimates</a></p>'
        );
        oEle.appendTo(rEle);
      }
    )
    rEle.append('<p class="minor"><sup>1</sup>Subject to changes in Implied Volatility for options with time left til expiry.</p>');
  } else {
    rEle.append('<p class="txt_error">Could not find any profitable call or put options for that target price and date.</p>')
  };
}

function finder_updateStratPref(ele){
  setCookie('finder_strat_' + ele.name, ele.checked ? '1' : '0', { expiry_days: 365 });
   ele.name
}

function finder_changeTargetPrice() {
  var targetPrice = $('#tFe1_input_price-from').val();
  var curPrice = $('#tFe0-curPrice').val();
  var dir = $('#finder_priceDirection').val();
  
  var targetIsAbove = parseFloat(targetPrice) > parseFloat(curPrice);
  if (dir === 'eq') {
    $('#finder_priceDirection').addClass('selectPlaceholder');
  } else {
    $('#finder_priceDirection').removeClass('selectPlaceholder');
  }
  if ((targetIsAbove && dir === 'lt') || (!targetIsAbove && dir === 'gt')) {
    var purchChecked = getCookie('finder_strat_option-purchase');
    var shortChecked = getCookie('finder_strat_short-option');
    $('#finder-strat-option-purchase').attr('checked', false).attr('disabled', 'disabled').parent().addClass('disabled');
    $('#finder-strat-short-option').attr('checked', false).attr('disabled', 'disabled').parent().addClass('disabled');
    setCookie('finder_strat_option-purchase', purchChecked, { expiry_days: 365 });
    setCookie('finder_strat_short-option', shortChecked, { expiry_days: 365 });
  } else {
    var purchChecked = getCookie('finder_strat_option-purchase');
    var shortChecked = getCookie('finder_strat_short-option');
    $('#finder-strat-option-purchase').attr('checked', purchChecked !== '0' ? 'checked' : false).attr('disabled', false).parent().removeClass('disabled');
    $('#finder-strat-short-option').attr('checked', shortChecked === '1' ? 'checked' : false).attr('disabled', false).parent().removeClass('disabled');
  }
  $('#finder_long_opType').text(targetIsAbove ? 'call' : 'put');
  $('#finder_short_opType').text(!targetIsAbove ? 'call' : 'put');
}

function finder_find_return(returnData, meta) {
  const $finderSubmit = $('#tF_submit');

  $finderSubmit.attr('disabled', false);
  $finderSubmit.html('Find options');

  // check for errors
  var outcomes = ((returnData || {}).data || {}).outcomes;
  if (outcomes) {
    render_finder_results(outcomes, meta);
  } else {
    addMsg('Options Finder is currently experiencing some issues');
  }
}

function finder_options_loaded(_, reqData, data){ 
  var expiries = Object.keys(opCache[reqData.symbol]).filter(function(xp) { return xp !== '_data_source'; });
  var selEl = $('#tFe1_input_expiry-expiry');
  selEl[0].innerHTML = '<option value="" disabled selected>—Select—</option>';
  expiries.forEach(function(xp) {
    selEl.append('<option value="'+xp+'">' + xp + '</option>');
  });

}

function finder_changeDateType(x) {
  $("input[name='finder_dateStyle'][value="+x+"]").click();
  if (x === 'expiry') {
    $('#tFe1_input_date-date').val('');
  } else if (x === 'date') {
    $('#tFe1_input_expiry-expiry').val('');
  }
  $('#tFe1_input_date-date, #tFe1_input_expiry-expiry').addClass('appearDisabled');
  $('#tFe1_input_'+x+'-'+x+'').removeClass('appearDisabled');
}

function finder_getDateFromExpiry() {
  $('#tFe1_input_date-date').val('');
  finder_changeDateType('expiry');
}

function finder_resetExpiryDate() {
  $('#tFe1_input_expiry-expiry').val('');
}

function finder_clear_form() {
  var symb = ($('#tFe0-symbol').val() || '').toUpperCase();
  $('#tFe1_input_price-from').val('');
  $('#tFe1_input_date-date').val('');
  finder_resetExpiryDate();
}

function finder_updatePreference() {
  var sell = finder_getWriteVal() === 1;
  $('#tFe1_input_cost-cost').attr('disabled', sell);
  sell
    ? $('#tF_budgetGroup').slideUp(100)
    : $('#tF_budgetGroup').slideDown(100)
  setCookie('finderShortPreferred', sell, {});
}
