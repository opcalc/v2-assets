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
    var rqId = ajaxRequest('getting price: '+stock, 'getStockPrice', {stock:stock}, getPrice_return, {eleId:data.eleId, button:data.button, stock:stock});
  }
}
var underlying_symb = [];
function getPrice_return(reqData, returnData){
  $(reqData.button).removeClass("loading").html("");
  if (returnData.status == REQ_ERROR){
    inputError(returnData.desc);
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

    var bestPrice = parseFloat(returnData.price.last) > 0
      ? returnData.price.last
      : (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2;

    // !!! add bid/ask/last to subtle-links
    if ($('#'+reqData.eleId+'-price').val() === "")
      $('#'+reqData.eleId+'-price').val(bestPrice);
    $('#'+reqData.eleId+'-curPrice').val(bestPrice);
    //$('#'+reqData.eleId+'-curPriceDisp').val(returnData.price.last);
    if ($('#'+reqData.eleId+'-curPrice').length > 0 && $('#'+reqData.eleId+'-curPrice').get(0).onchange)
      $('#'+reqData.eleId+'-curPrice').get(0).onchange();

    //triggerListener('underlying_price', {tab_num: curTab, ele_id:reqData.eleId});
 }
}

function getOptions(data){
  var stock = $('#'+data.uEleId+"-symbol").val();
  $('#'+data.eleId+"-option .panel_button").addClass('loading');
  if (stock === ""){
    //inputError("Please enter a stock symbol");
  }else{
    // ** look through requests and add some data if a get_options data call is already out ***
    var reqData = {stock:stock, uEleId:data.uEleId, eleId:data.eleId};
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

var opCache = {}; // * cache for a symbol's options
function getOptions_return(reqData, returnData){
  $('#'+reqData.eleId+"-option .panel_button").removeClass('loading');
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
    var stock = reqData.stock;
    if (returnData.symbol_correction !== undefined) {
      $('#'+reqData.eleId+'-symbol').val(returnData.symbol_correction.toUpperCase());
      stock = returnData.symbol_correction.toUpperCase();
    }
    opCache[stock] = returnData.options;
    if (reqData.showSelect){
      optionSelect(reqData);
    }
  }
  var tNo = reqData.eleId.slice(1, reqData.eleId.indexOf('e'));
  triggerListener('option_data', { tab_num: tNo, symbol: stock });
}

function optionSelect(data){
  var symb = $('#'+data.uEleId+'-symbol').val();
  var uPrice = $('#'+data.uEleId+'-curPrice').val();
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

      $(opEle).html(loadingHtml);
      var code = optionsSelectCode({'eleId':data.eleId, 'underlying_price':uPrice, 'opType':oType, 'opAct':oAct}, opCache[symb]); // 'underlying':symb,

      $(opEle).dialog('open');
      opEle.html(code);
      initOptionsSelector({'eleId':data.eleId, 'uEleId':data.uEleId, 'stock':symb});
    }else if (opCache[symb] == REQ_ERROR){
      inputError('Options not found for that symbol.', 'verbose');
      //alert('Options not found for that symbol.');

    }else if (!data.showSelect){
      // !!! it might just still be a-comin' back... should we wait, or shoot another request... if we do two then optionSelect could get triggered twice
      getOptions({showSelect:true, eleId:data.eleId, defaultType:data.defaultType, uEleId: data.uEleId});
      $(opEle).dialog('open');
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
function doCalculation(tNo, sType){
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
    inputError("Please complete the fields below...");
    highlightValErrors(tNo, errors);

  }else{
    // ** in new tab
    if ($('#t'+tNo+'_graph-newTab').attr('checked')){

      if (typeof fromClose !== 'undefined'){
        _opcGaq.push(['_trackEvent', 'Tabs', 'Re-calc in new tab']);
      }
      var rqId = ajaxRequest("calculating results", 'calculate', values, doCalculation_return, {tab_num:tNo});
      newTab(false, rqId);
      $.scrollTo('#top_menu', 500);
      
      // ** in current tab
    }else{
      $('#t'+tNo+'_submit').attr('disabled','disabled');
      $('#t'+tNo+'_submit').attr('value','Calculating...');
      $('#t'+tNo+'_graph-newTab_holder').css('display','');
      $('#strat_'+tNo+' .results').hide();
      
      showAds_timeLeft = showAds_timeDur;
      showAds_timeDur = Math.max(min_adShow_time, showAds_timeDur - 1);
      
      $('.loading-wrapper', loadCtr).replaceWith(loadingHtml);
      loadCtr.show();
      $.scrollTo('#load-anchor', 500);

      shownAds = true;

      if (showAds_timeLeft > 0){
        loadCtr.addClass('load-timeout');
        clearInterval(showAds_intId);
        showAds_intId = setInterval(function() {
          updateShowCountdown(tNo);
        }, 1000);
      }

      $('.popup').dialog('close');
      $('#t'+tNo+'_graph').html("");
      ajaxRequest("calcuating results", 'calculate', values, doCalculation_return, {tab_num:tNo});
    }
  }
}

function updateShowCountdown(tNo){
  if (showAds_timeLeft <= 1){
    clearInterval(showAds_intId);
    if (loadCtr.hasClass('load-timeout')) {
      loadCtr.removeClass('load-timeout');
    } else {
      hideLoaderShowGraph(tNo);
    }
  }else{
    showAds_timeLeft = Math.max(0, showAds_timeLeft - 1);
    $('#loading-ctnr .showResultsBut .time-left').html("("+showAds_timeLeft+")");
  }
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
  loadCtr.hide();
  $('#t'+tNo+'_submit').attr('value','Calculate');
  $('.results').show();
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

function doCalculation_return(reqData, returnData){
  $('#t'+reqData.tab_num+'_submit').removeAttr('disabled');
  $('#t'+reqData.tab_num+'_graph-newTab_holder').css('display','');
  $('#t'+reqData.tab_num+'_graph-priceMin').val(roundTo(stripNonNumeric(returnData.results.graph_priceMin), 2));
  $('#t'+reqData.tab_num+'_graph-priceMax').val(roundTo(stripNonNumeric(returnData.results.graph_priceMax), 2));
  $('#t'+reqData.tab_num+'_graph-rangeAuto').val(returnData.results.graph_rangeAuto ? '1' : '0');

	var stillLoading = loadCtr.hasClass('load-timeout');
  if (stillLoading) {
    loadCtr.removeClass('load-timeout');
  } else {
    hideLoaderShowGraph(reqData.tab_num)
  }

  if (returnData.newTab != undefined){
    // ~~~ bit dodgy - new tab calc.  Uses newTab_return function to add a new copy of the old tab (and
    // trigger relevant scripts!) then moves the old results bit to the new one, and deletes the old.
    var oldResults = $('#strat_'+reqData.tab_num+' .results');
    var oldTab = $('#strat_'+reqData.tab_num);
    $('#strat_'+reqData.tab_num).attr('id', '#strat_'+reqData.tab_num+"-old");

    returnData.oldTab.tabId = reqData.tab_num;
    newTab_return(reqData, returnData.oldTab);
    $('#strat_'+reqData.tab_num+' .results').replaceWith(oldResults);
    
    if (stillLoading) {
      $('#t'+returnData.newTab.tabId+'results').hide();
    }
    oldTab.remove();

    reqData.tab_num = returnData.newTab.tabId; // this doesn't get used in newTab_return, but does below
    newTab_return(reqData, returnData.newTab);

    /* alt method, didn't work.  for (var varName in returnData.oldTab.vars){
       $("#strat_"+reqData.tab_num+" input[name='"+varName+"']").val(returnData.oldTab.vars[varName]);
     }*/

    // !!!  ******* THE below works alright, but leaves out the graph divs.  Best would be to not get rid
    // of them, that way anything rendered would remain
    /*$('#strat_'+reqData.tab_num+'').html(returnData.oldTab.code);
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

    if (showAds_timeLeft > 2){
      $('#loading-ctnr .loading').replaceWith(
        "<a href='#' onclick='hideLoaderShowGraph("+reqData.tab_num+"); renderResults("+reqData.tab_num+"); return false;' class='showResultsBut'>Show results <span class='time-left'>("+showAds_timeLeft+")</span></a>"
      );
    }
    renderResults(reqData.tab_num);
  }
  //alert(obj2str(reqData));
}

function renderResults(tab_num){
  $('#t'+tab_num+'_summary').html(
    "<h2>Estimated returns</h2>"+
      getSummary(results[tab_num])+
      getSharingCode(tab_num)+
      "");//returnData.results.summary.desc
  $('#t'+tab_num+'_graph').html(renderGraph(results[tab_num], tab_num));
  $('#strat_'+tab_num+' .results').show();

  // * fill modified vars
  for(var i in results[tab_num].vars){
    $('#strat_'+tab_num+' [name="'+i+'"]').val(results[tab_num].vars[i]);
  }
  // !!! ad code;

  initResults(tab_num);

  $.scrollTo('#t'+tab_num+'_summary', 500);
}
function getSharingCode(tab_num){
  return "<div class='shareHolder'>\n\
  <span>Share this on:</span>\n\
  <div class='shareMenu'>\n\
    <a href='#' onclick='loadShare({type:\"fb\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Share this calculation on facebook' class='facebook shareIcon'>Facebook</a>\n\
    <a href='#' onclick='loadShare({type:\"tw\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Tweet this calculation on twitter' class='twitter shareIcon'>Tweet this</a>\n\
	<a href='#' onclick='loadShare({type:\"gg\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Share this calculation on google plus' class='google shareIcon'>Google plus share</a>\n\
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
    tDate = opDates[i];
  //for(var tDate in data){
    if (true == selectedMonth || tDate == selectedMonth){
      if (selectMonth = (new Date().getTime()/1000) < timeFromYMD(tDate))
        selectMonth = true
      else{
        selectMonth = false;
        selectedMonth = true; // show next date that is in future
      }
    }else
      selectMonth = false;

    dateStr = tDate.length == 10 ? dateFromYMD('jS&\\nb\\sp;M'+(date('y') != dateFromYMD('y',tDate) ? '&\\nb\\sp;Y':''), tDate) :
       tDate.length == 7 ? dateFromYMD('M'+(date('y') != dateFromYMD('y',tDate+"-15") ? '&\\nb\\sp;Y':''), tDate+"-15") : '';

    if (dateStr !== "")
    monthTabsCode.push("<a href='#' class='options_date_link"+
        (selectMonth? ' options_date_link_active':'')+
        (data[tDate] == null ? ' options_date_link_unfilled':'')+
        "' name=\""+tDate+"\">" + dateStr +"</a>");//[[format date and js actions]];

    if (data[tDate] == null || !selectMonth){
      optionsCode += "<div class='options_set "+(selectMonth?'options_set_active ':'')+tDate+"' name='"+tDate+"'>\r\n</div>";
    }else
      optionsCode += optionsSelectMonthCode(
          {sData:sData, selectMonth:selectMonth, tDate:tDate, tDateData:data[tDate]});


    if (true == selectMonth){selectMonth = false;selectedMonth = false;}
  }
  optionsCode = "<div class='dates'>"+ monthTabsCode.join(" | ")+"</div>"+optionsCode+"</div>";
  return optionsCode;

}

function optionsSelectMonthCode(cfg){
  var optionsMonCode = ''
  var selectMonth = cfg.selectMonth;
  var tDate = cfg.tDate;
  var tDateData = cfg.tDateData;
  var sData = cfg.sData;

  optionsMonCode += "<div class='options_set "+(selectMonth?'options_set_active ':'')+tDate+"' name='"+tDate+"'>\r\n"+
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
        //(!in_array(tDateData.c[strike].b, ['N']) && !in_array(tDateData.c[strike].a, ['N']) ?
        //  "<a href='#'>"+avgPrice([tDateData.c[strike].b,tDateData.c[strike].a])+"</a>" : "-")+
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
      //(!in_array(tDateData.p[strike].b, ['N']) && !in_array(tDateData.p[strike].a, ['N']) ?
      //  "<a href='#'>"+avgPrice([tDateData.p[strike].b,tDateData.p[strike].a])+"</a>" : "-")+
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

  /*var len = strikes.length;

  //for (strike in strikeInfo){
  for (i = 0; i < len; i++) {
    strike = strikes[i];
    optionsMonCode += '<tr name="'+strike+'" class="'+(parseFloat(strike) < parseFloat(sData.underlying_price) ? 'itm':'otm')+'">'+
        (strikeInfo[strike].c ? strikeInfo[strike].c : "<td class='c'>-</td><td class='c'>-</td><td class='c'>-</td>") +
        "<td class='s'>"+strike+"</td>" +
        (strikeInfo[strike].p ? strikeInfo[strike].p : "<td class='p'>-</td><td class='p'>-</td><td class='p'>-</td>") +
      '</tr>';
  }*/

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
    var rqId = ajaxRequest('getting options: '+data.stock+' for '+month, 'getOptions', {stock:data.stock, month:month}, getMonthsOptions_return, {'stock':data.stock, 'eleId':data.eleId, 'month':month, 'uEleId':data.uEleId});
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
    $('#'+data.eleId+'-opDesc').html(expDescFromYMD(exp)+' $'+strike+' '+(opType == 'c'?'Call':'Put'));
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

google.load("visualization", "1", {packages:["corechart"]});

function renderRiskGraph(graphData, t_no){
  setTimeout(function() {
    renderRiskGraph_1(graphData, t_no);
  }, 20);
}
function renderRiskGraph_1(graphData, t_no){
    var lineGraphData = ['header_place_holder'];
    var uPrice = results[t_no]['underlying_current_price'];

    var timeCount, x, vMax = -100000, vMin = 100000, tVal,
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
      chartArea: {width: showYear ? "69%" : "75%", left:90, top:20, height:"85%"},
      vAxis:{
        viewWindow: {
          max: vMax + ((vMax-vMin) * .1),
          min: vMin - ((vMax-vMin) * .1)
        },
        title:(array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? 'Dollars' : 'Percent'),
        format: array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? '$#,###.##' : '#.##\'%\'',
        viewWindowMode: 'maximized'
      },
      hAxis:{ title:"Underlying price", format: "$#,###.##" }
    };

    if (!array_includes(['price', 'riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type)){
      options.vAxis.minValue = -110;
    }

    var data = google.visualization.arrayToDataTable(lineGraphData);
    for(var i = 0; i < timeIndex.length; i++){
      data.setColumnProperty(i+1, 'time', timeIndex[i]);
    }
      data.setColumnProperty(lineGraphData[0].length-1, 'current', true);

    results[t_no].riskChartData = data;
    results[t_no].riskChart = new google.visualization.LineChart($("#t"+t_no+"_graph .google_chart_holder")[0]);
    google.visualization.events.addListener(results[t_no].riskChart, "select",
          function(event) {
            //data.sort([{column: event.column, desc: !event.ascending}]);
            //chart.draw(view);
            var selection = results[t_no].riskChart.getSelection();
            if (selection.length > 0 && selection[0].row != undefined){
              var selected = selection[0];
              if (results[t_no].riskChartData.getColumnProperty(selected.column, 'current') == true) return false;

              var dateSelected = results[t_no].riskChartData[0]
              var date = results[t_no].riskChartData.getColumnLabel(selected['column']);
              var t = results[t_no].riskChartData.getColumnProperty(selected.column, 'time');
              var strike = roundTo(results[t_no].riskChartData.getValue(selected['row'], 0), 2, true, false);

              $('#t'+t_no+'_graph-detail').html('').dialog('option','title','Detail: $'+strike+ " on " +date);
              if (viewStyle == 'mobile'){
                var ww = $(window).width(),
                    wh = $(window).height();
                $('#t'+t_no+'_graph-detail').dialog('option',
                  {width: ww-5,
                   height:wh-5});
              }
              $('#t'+t_no+'_graph-detail').html('').dialog('open');
              $('#t'+t_no+'_graph-detail').html(getCellSummary(curTab, results[curTab]['data'][strike][t]));
            }
          });
    results[t_no].riskChart.draw(data, options);

}

function renderGraph(graphData, t_no){
  graphData.graph_type = checkForceGraphType(graphData.graph_type, graphData);

  if (graphData['graph_type'].substr(0, 9) == 'riskGraph'){

    var output = '<div class="google_chart_holder" style="height:500px;"></div>\n\
      <script>\n\
      renderRiskGraph(results['+t_no+'], '+t_no+');\n\
      </script>';

  }else{

  var output = '<table class="graph" cellpadding="1" cellspacing="0">';
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

  for (var xi = 0; xi < strikes.length; xi++) {
    var x = strikes[xi];

    if (c==0){
      thr = [[graphData.start_date, 0]];
      thr2 = '<tr><th>&nbsp;</th>';
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
        tdr += '<td class="pct">' + roundTo(100 * (x - graphData.underlying_current_price) / graphData.underlying_current_price, 1, true) + '%</td>';
      }

      xLast = x;
      // !!! class+='p95t100' etc

    }

    if (c==0){
      output += "<tr><th>&nbsp;</th>"
      for(var i in thr){
        output += "<th colspan='"+(thr[i][1])+"' align='center' class='z"+((i%2) +1)+"'>"+date("M",thr[i][0])+"</th>";
      }
      output += "</tr>";
      thr2 += '</tr>';

      output += thr2
    }

    tdr += "</tr>";
    output += tdr;

    c++;
  }

  output += "</table><p><strong style='color:#400;'>Click on a figure</strong> for a breakdown of the trade's exit.</p>";

 /* <p>Figures are "+
      (graphData.graph_type == 'price' ? 'in dollar value: <strong>net profit or loss.</strong>' :
      (graphData.graph_type == 'roiRisk' ? ' <strong>percent (%) return</strong> of the maximum risk of the trade (-100 is maximum risk)' :
      (graphData.graph_type == 'roiInit' ? ' <strong>percent (%) return</strong> of the initial outlay of the trade (-100 is initial outlay)' : '')))
      +"</p>";*/

  }
  output += "<div class='inputWrapper inputselect'><label class='inputLabel' for='t"+t_no+"_graphChanger-type'>Change output type:</label>\
<span class='input'>\
<select name='graph-typeChange' id='t"+t_no+"_graph-typeChange' class='input' onchange='changeOutputType(this);' >\
	<optgroup label='Table'>\
	<option value='roiRisk'"+(graphData.graph_type == 'roiRisk' ? ' selected':'')+">% of maximum risk</option>\
	<option value='roiInit'"+(graphData.graph_type == 'roiInit' ? ' selected':'')+">% of entry cost</option>\
	<option value='price'"+(graphData.graph_type == 'price' ? ' selected':'')+">Profit/loss (dollar value)</option>\
	<option value='rawValue'"+(graphData.graph_type == 'rawValue' ? ' selected':'')+">Option/spread value</option>\
	</optgroup>"+
  //*
  "\
	<optgroup label='Graph'>\
	<option value='riskGraph'"+(graphData.graph_type == 'riskGraph' ? ' selected':'')+">% of maximum risk</option>\
	<option value='riskGraphInit'"+(graphData.graph_type == 'riskGraphInit' ? ' selected':'')+">% of entry cost</option>\
	<option value='riskGraphPrice'"+(graphData.graph_type == 'riskGraphPrice' ? ' selected':'')+">Profit/loss (dollar value)</option>\
	<!-- option value='riskGraphRawValue'"+(graphData.graph_type == 'riskGraphRawValue' ? ' selected':'')+">Option/spread value</--option-->\
	</optgroup>"+ //*/
"</select><a href='#' onclick='alert(\"Changes how the trade is represented in the table or graph... \\n\\n% of maximum risk.: Percentage of the maximum risk of the trade, where -100 is the maximum risk, and 100 is 100% return compared to the maximum risk. \\n\\n% of entry: Percentage of the entry cost of the trade, where -100 is no return from your initial investment, and 100 is 100% return compared to the entry cost.  Note: if opening the trade results in a credit, % of maximum risk is used instead.\\n\\nDollar value: Profit or loss in net dollar value.\\n\\nOption/Spread value: shows the value of the purchased option, or the spread, without multiplying x100 for each contract.\");return false;' class='help'>?</a>\n\
</div>";

  return output;
}

function changeOutputType(selectEle){
  var type = initType = $(selectEle).val();
  _opcGaq.push(['_trackEvent', 'Change Output type', type]);

  ajaxRequest('', 'updatePreferredDisplayType', { type: type }, function() {});

  var r = results[curTab];

  type = checkForceGraphType(type, r);

  results[curTab]['graph_type'] = type;
  $('#t'+curTab+'_graph-type').val(type);

  renderResults(curTab);
}

function updatePreferredDisplayType(el) {
  if (el.value) {
    ajaxRequest('', 'updatePreferredDisplayType', { type: el.value }, function() {});
  }
}

function checkForceGraphType(type, r){
  // real graph type...
  if (r.summary.maxrisk.g !== 'u' && r.summary.maxrisk.g + r.initial.g < 0){
    if ((type == 'roiRisk' ||
          (type == 'roiInit' && r.initial.g >= 0)))
      type = 'roiRisk';
    else if ((type == 'riskGraph' ||
          (type == 'riskGraphInit' && r.initial.g >= 0)))
      type = 'riskGraph';

  }else if (r.initial.g < 0){
    if (type == 'roiInit' || type == 'roiRisk')
      type = 'roiInit';
    else if (type == 'riskGraph' || type == 'riskGraphInit')
      type = 'riskGraphInit';
  }else{
    if (type.substr(0, 9) == 'riskGraph'){
      type = 'riskGraphPrice';
    }else
      type = 'price';
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
      return 'p'+Math.max(-100,Math.min(200,Math.round(20*(graphData.initial.g + g)/(graphData.summary.maxprofit.g - graphData.initial.g))*5));
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
  var s = results.summary;

  var noDays;
  for (var i in results.risk)
    noDays = i;


  // !!! graph display values (roi / dollars)
  if (typeof(s.maxrisk.time) == 'object' && s.maxrisk.time instanceof Array)
    var maxRiskDays = ' on days '+descNumList(s.maxrisk.time);
  else if (s.maxrisk.time == noDays)
    var maxRiskDays = ' at expiry';
  else
    var maxRiskDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxrisk.time *60*60*24), -5);
  //nyDateFromTime('jS M Y',$results['start_date']+(($s['maxrisk']['time']) * 60*60*24 ));

  if (typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array)
    var maxProfitDays = ' on days '+descNumList(s.maxprofit.time);
  else if (s.maxprofit.time == noDays)
    var maxProfitDays = ' at expiry';
  else
    var maxProfitDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxprofit.time *60*60*24), -5);//+s.maxprofit.time;

  var mP = s.maxrisk.g > -results.initial.g;
  var maxRiskString = (s.maxrisk.g == 'u' ? 'infinite on upside' :
    '<span'+(mP ? ' style="font-weight:bold;">+':'>')+
     formatPrice(Math.abs(s.maxrisk.g + results.initial.g))+"</span> at a price of "+
     formatPrice(s.maxrisk.p)+maxRiskDays)+(s.maxrisk.g + results.initial.g >= 0? '<br/><span class="minor">(calculator found no risk.  This can be due to low or high implied volatility, or out of date prices)</span>':'');

  mP = s.maxprofit.g < -results.initial.g;
  var maxProfitString = (s.maxprofit.g == 'u' ? 'infinite on upside' :
    '<span'+(mP ? ' style="color:#F00;">-':'>')+
    formatPrice(Math.abs(s.maxprofit.g + results.initial.g))+"</span> at a price of "+
    formatPrice(s.maxprofit.p)+maxProfitDays)+(s.maxprofit.g + results.initial.g <= 0 ? '<br/><span class="minor">(calculator found no positive profit.  This can be due to low or high implied volatility, or out of date prices)</span>':'');

  for (var i in results.breakeven){}

  var beExpString = "$"+implode(", $", results.breakeven[i]);

  mP = results.initial.g < 0;
  var outlayString ='<span style="'+(mP ? 'color:#900;':'font-weight:bold;')+'">'+formatPrice(Math.abs(results.initial.g))+"</span>"+(mP? ' (net debit)': ' (net credit)');

  var summary =
    "<h3>"+results.underlying_symb+" at $"+roundTo(results.underlying_current_price,2,true)+" on "+date("jS M Y", results.start_date)+"</h3>"+
    "<p>Entry cost: "+outlayString+" <a href='#' class='subtle initDetail' onclick='showInitDetails(this); return false;'>see details</a></p>"+
    "<p>Maximum risk: "+ maxRiskString+"</p>"+
    "<p>Maximum return: "+maxProfitString+"</p>"+
    "<p>Breakevens at expiry: "+beExpString+"</p>";

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
    $('#t'+localEle.tab_num+'_graph-date').val('(today)');
    $('#t'+localEle.tab_num+'_graph-priceMin').val('');
    $('#t'+localEle.tab_num+'_graph-priceMax').val('');
  }
}

function initResults(tNo){
  $('#t'+tNo+'_graph').prepend('<div class="popup" id="t'+tNo+'_graph-detail"></div>');

  var ww = $(window).width(),
      wh = $(window).height();

  var dialogOptions = {
        autoOpen:false,
        position:['right','top'],
        dialogClass: viewStyle == 'mobile' ? null : 'detailPopup',
        title:'Detail',
        maxHeight: 300,
        height: (300 > wh ? wh : 300),
        width: (450 > ww ? ww : 450),
        draggable:true
      };
  if (viewStyle == 'mobile'){
    dialogOptions.width = ww;
    dialogOptions.height = wh;
    dialogOptions.position = ['left','top'];
  }

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
  var str='<table class="trade_summary" cellpadding="1" cellspacing="0"><tr><th>Trades to '+(isInit?'open':'close')+' position</th><th>No.</th><th>Price</th><th>Total</th></tr>'
  for(i = 0; i<lines.length; i++)
    str+= "<tr><td align='left'>"+lines[i][0]+" "+lines[i][2]+"</td><td align='right'>"+lines[i][1]+"</td><td align='right'>$"+lines[i][3]+"</td><td align='right'>$"+lines[i][4]+"</td></tr>";


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
  $('#strat_F').length && $('.id-optionFinder').click(function() {
    $('#calcs_holder .jq_exclusive_target').hide();
    $('#top_but-calculator').hide();
    $("#top_menu .dialog_tab").removeClass("dialog_tab_selected");
    $("#top_menu .dialog_tab:not(.id-optionFinder)").removeClass("--active");
    $("#top_menu .dialog_tab.id-optionFinder").addClass("--active");
    $('#tab_holder_tabs .dialog_tab').removeClass('dialog_tab_selected');
    $('#tab_holder_tabs #strat_F_button').addClass('dialog_tab_selected');
    $('#strat_F').show();
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
          $('.ui-widget-overlay').fadeTo(0, 0.5).hide().fadeIn();
        },
        //maxHeight: wh-50,
        position: ['right-25', 'center'],
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
    dialogOptions.position = ['left','top'];
  }
  $('#'+eleId+'-option_selector').dialog(dialogOptions);
}

function ele_option_listen(tCall, foreignEle, localEle){
  // underlying symbol changed?  remove price, and option strike
  if (tCall == 'underlying_symbol'){
		$('#'+localEle.ele_id+'-price').val('');
		$('#'+localEle.ele_id+'-strike').val('');
		$('#'+localEle.ele_id+'-expiry').val('');
		$('#'+localEle.ele_id+'-option_selector').html(loadingHtml);
    $('#'+localEle.ele_id+'-opDesc').text('');
    $('#'+localEle.ele_id+'-iv').val('(auto)');
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
    $('#'+localEle.ele_id+'-iv').val('(auto)');
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

function getElementCode_stockAndUnderlying_js(tCall, foreignEle, localEle){
  if (tCall == 'underlying_symbol'){
    $('#'+localEle.ele_id+'-price').val('');
    $('#'+localEle.ele_id+'-curPrice').val('');
    //$('#'+localEle.ele_id+'-curPriceDisp').val('');
    getPrice({eleId:localEle.ele_id, button:localEle.ele_id+'-loading'});
    triggerListener('underlying_price', foreignEle);
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
  getElementCode_stockAndUnderlying_js(tCall, foreignEle, localEle);
 }
function ele_underlying_listen(tCall, foreignEle, localEle){
  getElementCode_stockAndUnderlying_js(tCall, foreignEle, localEle);
}

function graph_price_range_listen(tCall, foreignEle, meta) {
  $('#t'+meta['tab_num']+'_graph-rangeAuto').val('0');
}

$(window).scroll(function () {
  if (window['viewStyle'] !== undefined && viewStyle == 'full'){
    var winScrollTop = $(window).scrollTop();
    var contentHolderOffsetTop = $('#content_holder').offset().top;

    if (contentHolderOffsetTop < winScrollTop){
      var mainHeight = $('#main').outerHeight();
      var tabHolderHeight = $('#tab_holder').outerHeight();
      var ccTabOffset = winScrollTop - contentHolderOffsetTop;
      var ccHeightDelta = mainHeight - tabHolderHeight;

      if (ccTabOffset < ccHeightDelta) {
        $('#tab_holder').css({ position: "fixed", top: "0" });
        $('#content_holder').css({
          'margin-left': '170px',
          'min-height': tabHolderHeight+'px'
        });
      } else {
        var marginTop = Math.min(
          ccTabOffset,
          ccHeightDelta
        );
        $('#tab_holder').css({ position: "relative", top: marginTop });
        $('#content_holder').css({ "margin-left": "0" });
      }
      //if ($('#tab_holder').offset().top + $('#tab_holder').height() <
      //      $('#main').offset().top + $('#main').height()){

        //$(window).scrollTop() - $('#content_holder').offset().top);
      //}
      // ^^ this scrolls on forever
      //$('#tab_holder').addClass("fixed");
    }else{
      //$('#tab_holder').removeClass("fixed");
      $('#tab_holder').css({ position: "relative", top: "0" });
      $('#content_holder').css({ "margin-left": "0" });
    }
  }
  return true;
});
