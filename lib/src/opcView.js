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
  $('#calcs_holder').append("<div class=\"jq_exclusive_target\" id=\"newTab_req"+rqId+"\" name=\"strat_tabs\"><p><span class=\"loading\">Loading</span></p></div>");

  return false;
}
function newTab_return(reqData, data, cfg){
  cfg = Object.assign({ show: true }, cfg || {});

  if (data['strat-info'] != undefined && data['strat-info']['text'] != undefined){
    // ** track ajax load **
    _opcGaq.push(['_trackPageview', '/calculator/'+data['strat-info']['name']+'.html']);
    var code = "<li class=\"stratTab dialog_tab\"name=\"strat_tabs:strat_"+data['tabId']+"\" id=\"strat_"+data['tabId']+"_button\">"+
        "<div><a href=\"#\" name=\"strat_tabs:strat_"+data['tabId']+"\" class=\"jq_exclusive_switch_flash name\" onclick=\"showTab(this); return false;\">New "+data['strat-info']['text']+"</a> "+
        "<a href='#' class='close_x' onclick=\"return closeTab(this);\" title='close'>X</a>"+
        "<img src='"+WEB_PATH_STATIC+"images/tab-fade-top.gif' class='tab_fade_top'/>"+
        "<img src='"+WEB_PATH_STATIC+"images/tab-fade-bot.gif' class='tab_fade_bot'/></div></li>"

    $('#tab_holder_tabs').prepend(code);
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

  //text = text.replace("'", "\\'");
  //level = level.replace("'", "\\'");
  $("#status_messages").append("<div class='msg txt_"+level+"' style='display:none;'>"+text+" <a href='#close' class='close_x' title='close' onclick='return closeMsg(this);'>x</a></div>");
  $("#status_messages").show();
  $("#status_messages .msg:last").delay(500).hide().slideDown(500).delay(5000).slideUp(1000, function(){
    var msgHolder = $(this).parent();
    $(this).remove();
    if ($(".msg", msgHolder).length == 0) msgHolder.show().slideUp(200).fadeOut();
  });
}
function closeMsg(self){
  $(self).parent().clearQueue().slideUp(1000, function(){
    var msgHolder = $(this).parent();
    $(this).remove();
    if ($(".msg", msgHolder).length == 0) msgHolder.show().slideUp(200).fadeOut();
  });
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
