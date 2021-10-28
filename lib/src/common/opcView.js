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
