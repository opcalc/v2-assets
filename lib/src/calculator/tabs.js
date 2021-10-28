var curTab;


function newTab(strat, rqId){
  if (window['viewStyle'] !== undefined && viewStyle !== 'full') {
    $('#top_but-calculator').hide();
  }

  rqId = rqId || ajaxRequest('creating new tab: '+strat, 'newTab', {strat:strat}, newTab_return, {strat:strat});

  $('.popup').dialog('close');

	$("[name='strat_tabs']").hide();
  $('#calcs_holder').append("<div class=\"jq_exclusive_target\" id=\"newTab_req"+rqId+"\" name=\"strat_tabs\"><span class=\"loading\">Loading</span></div>");

  return false;
}

function newTab_return(_reqData, data, cfg){
  cfg = Object.assign({ show: true }, cfg || {});

  if (data['strat-info'] != undefined && data['strat-info']['text'] != undefined){
    // ** track pageload via js **
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
  updateStratFormInsets(stratNo);

  if (tabsFromFinder && tabsFromFinder[stratNo]) {
    $('#strat_'+stratNo+' .breadcrumb').html(
      '<a href="/option-finder.html" onclick="switchToTabVisually(\'F\'); return false;">Option Finder Results</a> &gt;'
    );
  }

  if (dontPushRoute !== true && safeSelect(window, function(w) { return w.history.state.tabNo; }) !== stratNo) {
    pushTabToHistory(stratNo);
  }

  curTab = stratNo;
  ajaxRequest('activating tab', 'activateTab', {stratNo:stratNo}, function() {});
  
  updateStratAdStickiness();

	return false;
}

function closeTab(tabCloseBut){
  var tab = $(tabCloseBut).parent().parent();
  var nextTabBtn = $(tab).next();
  var prevTabBtn = $(tab).prev();
  var switchName= $('a:first', tab).attr('name');
	var colonLocation = switchName.indexOf(":");
	var targetId = switchName.substring(colonLocation+1);
  var stratNo = targetId.substring(6);
  $("#"+targetId+".jq_exclusive_target").remove();
  $(tab).remove();
  rq = ajaxRequest('closing tab', 'closeTab', {stratNo:stratNo}, function() {});

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

function closeCurrentTabs() {
  $('#tab_holder_tabs').removeClass('--show');
  $('#invisible_shield').hide();
  $('#invisible_shield').unbind('click', closeCurrentTabs);
}

function switchToTabVisually(tabNo) {
  if ($('#strat_'+tabNo).length > 0) {
    $('.stratTab.dialog_tab').removeClass('dialog_tab_selected');
    $('.stratContent').hide();
    $('#strat_'+tabNo+'_button').addClass('dialog_tab_selected');
    $('#strat_'+tabNo).show();
  }
}

function pushTabToHistory(newTabId) {
  if (window.history && window.history.pushState) {
    var routeData = getRouteData(newTabId);
    window.history.pushState({ tabNo: newTabId }, routeData.title, BASE_URL+routeData.url);
    $('head title').text(routeData.title)
  } else {
    document.location.hash = 'tab=' + newTabId;
  }
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

window.addEventListener("popstate", function(s){
  var tabNo = safeSelect(s, function(_s) { return _s.state.tabNo; }, false);
  if (tabNo !== false) {
    // showTab($('#strat_'+tabNo+'_button > div > a')[0], undefined, true);
    switchToTabVisually(tabNo);
  }
});

function updateStratFormInsets(tNo) {
  var article = $('#strat_'+tNo+' .stratArticle').attr('data-article');
  var stats = $('#strat_'+tNo+' .stratStats').attr('data-stats');
  $('#feedback_section').html(stats 
    ? decodeURIComponent(stats) + decodeURIComponent(statsCommon)
    : decodeURIComponent(statsDefaultContent)
  );
  $('#stratArticle').html(decodeURIComponent(article));
}

function refreshIntraStratAd(tabNo) {
  if (window.fusetag && window.fusetag.loadSlotById) {
    if (!$('#fuse-21977025922-'+tabNo).attr('data-fuse')) {
      $('#fuse-21977025922-'+tabNo).attr('data-fuse', '21977025922');
      window.fusetag.loadSlotById(21977025922, 'fuse-21977025922-'+tabNo);
    }
  }
}
