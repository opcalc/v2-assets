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
