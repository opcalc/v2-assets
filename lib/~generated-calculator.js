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
    getOptions({ uEleId: data.eleId, eleId: data.eleId, stock:stock });
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
    var marketPrice = returnData.price.bid > 0 && returnData.price.ask > 0 
      ? (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2
      : returnData.price.last;

    // !!! add bid/ask/last to subtle-links
    if ($('#'+reqData.eleId+'-price').val() === "") {
      $('#'+reqData.eleId+'-price').val(bestPrice);
    }
    $('#'+reqData.eleId+'-curPrice').val(bestPrice);
    $('#'+reqData.eleId+'-lastPrice').val(bestPrice);
    $('#'+reqData.eleId+'-marketPrice').val(marketPrice);
    //$('#'+reqData.eleId+'-curPriceDisp').val(returnData.price.last);
    if ($('#'+reqData.eleId+'-curPrice').length > 0 && $('#'+reqData.eleId+'-curPrice').get(0).onchange){
      $('#'+reqData.eleId+'-curPrice').get(0).onchange(); 
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

function getV3priceData(stock, reqData) {
  $.getJSON(V3_API_PATH + '/price/' + stock, function(d) {
    if (!d || !d.data || !d.data.result === 'SUCCESS') {
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
  });
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
    opCache[stock] = sortChainOptions(returnData.options);
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

if (google && google.load) google.load("visualization", "1", {packages:["corechart"]});

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
    if (!google || !google.visualization) return;
     
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
        if (thr[i][1] > 0) {
          output += "<th colspan='"+(thr[i][1])+"' align='center' class='z"+((i%2) +1)+"'>"+date("M",thr[i][0])+"</th>";
        }
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
  var s = results.summary;

  var noDays;
  for (var i in results.risk)
    noDays = i;


  // !!! graph display values (roi / dollars)
  if (typeof(s.maxrisk.time) == 'object' && s.maxrisk.time instanceof Array)
    var maxRiskDays = ' on days '+descNumList(s.maxrisk.time);
  else if (s.maxrisk.time == noDays)
    var maxRiskDays = ' at expiry';
  else if (s.maxrisk.time !== undefined)
    var maxRiskDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxrisk.time *60*60*24), -5);
  else
    var maxRiskDays = '';
  //nyDateFromTime('jS M Y',$results['start_date']+(($s['maxrisk']['time']) * 60*60*24 ));

  if (typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array)
    var maxProfitDays = ' on days '+descNumList(s.maxprofit.time);
  else if (s.maxprofit.time == noDays)
    var maxProfitDays = ' at expiry';
  else if (s.maxprofit.time !== undefined)
    var maxProfitDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxprofit.time *60*60*24), -5);//+s.maxprofit.time;
  else 
    var maxProfitDays = '';

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
  $('#strat_F').length && $('#top_menu .id-optionFinder').click(function() {
    $('#calcs_holder .jq_exclusive_target').hide();
    $('#top_but-calculator').hide();
    $("#top_menu .dialog_tab").removeClass("dialog_tab_selected");
    $("#top_menu .dialog_tab:not(.id-optionFinder)").removeClass("--active");
    $("#top_menu .dialog_tab.id-optionFinder").addClass("--active");
    $('#tab_holder_tabs .dialog_tab').removeClass('dialog_tab_selected');
    $('#tab_holder_tabs #strat_F_button').addClass('dialog_tab_selected');
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
        var isTxn = isTransitionalTheme();
        $('#content_holder').css({
          'margin-left': isTxn ? '168px' : '170px',
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
/*! jQuery UI - v1.10.0 - 2013-02-03
* http://jqueryui.com
* Includes: jquery.ui.core.js, jquery.ui.widget.js, jquery.ui.mouse.js, jquery.ui.position.js, jquery.ui.draggable.js, jquery.ui.resizable.js, jquery.ui.button.js, jquery.ui.datepicker.js, jquery.ui.dialog.js, jquery.ui.effect.js, jquery.ui.effect-fade.js
* Copyright (c) 2013 jQuery Foundation and other contributors Licensed MIT */

(function(e,t){function i(t,n){var r,i,o,u=t.nodeName.toLowerCase();return"area"===u?(r=t.parentNode,i=r.name,!t.href||!i||r.nodeName.toLowerCase()!=="map"?!1:(o=e("img[usemap=#"+i+"]")[0],!!o&&s(o))):(/input|select|textarea|button|object/.test(u)?!t.disabled:"a"===u?t.href||n:n)&&s(t)}function s(t){return e.expr.filters.visible(t)&&!e(t).parents().addBack().filter(function(){return e.css(this,"visibility")==="hidden"}).length}var n=0,r=/^ui-id-\d+$/;e.ui=e.ui||{};if(e.ui.version)return;e.extend(e.ui,{version:"1.10.0",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}}),e.fn.extend({_focus:e.fn.focus,focus:function(t,n){return typeof t=="number"?this.each(function(){var r=this;setTimeout(function(){e(r).focus(),n&&n.call(r)},t)}):this._focus.apply(this,arguments)},scrollParent:function(){var t;return e.ui.ie&&/(static|relative)/.test(this.css("position"))||/absolute/.test(this.css("position"))?t=this.parents().filter(function(){return/(relative|absolute|fixed)/.test(e.css(this,"position"))&&/(auto|scroll)/.test(e.css(this,"overflow")+e.css(this,"overflow-y")+e.css(this,"overflow-x"))}).eq(0):t=this.parents().filter(function(){return/(auto|scroll)/.test(e.css(this,"overflow")+e.css(this,"overflow-y")+e.css(this,"overflow-x"))}).eq(0),/fixed/.test(this.css("position"))||!t.length?e(document):t},zIndex:function(n){if(n!==t)return this.css("zIndex",n);if(this.length){var r=e(this[0]),i,s;while(r.length&&r[0]!==document){i=r.css("position");if(i==="absolute"||i==="relative"||i==="fixed"){s=parseInt(r.css("zIndex"),10);if(!isNaN(s)&&s!==0)return s}r=r.parent()}}return 0},uniqueId:function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++n)})},removeUniqueId:function(){return this.each(function(){r.test(this.id)&&e(this).removeAttr("id")})}}),e.extend(e.expr[":"],{data:e.expr.createPseudo?e.expr.createPseudo(function(t){return function(n){return!!e.data(n,t)}}):function(t,n,r){return!!e.data(t,r[3])},focusable:function(t){return i(t,!isNaN(e.attr(t,"tabindex")))},tabbable:function(t){var n=e.attr(t,"tabindex"),r=isNaN(n);return(r||n>=0)&&i(t,!r)}}),e("<a>").outerWidth(1).jquery||e.each(["Width","Height"],function(n,r){function u(t,n,r,s){return e.each(i,function(){n-=parseFloat(e.css(t,"padding"+this))||0,r&&(n-=parseFloat(e.css(t,"border"+this+"Width"))||0),s&&(n-=parseFloat(e.css(t,"margin"+this))||0)}),n}var i=r==="Width"?["Left","Right"]:["Top","Bottom"],s=r.toLowerCase(),o={innerWidth:e.fn.innerWidth,innerHeight:e.fn.innerHeight,outerWidth:e.fn.outerWidth,outerHeight:e.fn.outerHeight};e.fn["inner"+r]=function(n){return n===t?o["inner"+r].call(this):this.each(function(){e(this).css(s,u(this,n)+"px")})},e.fn["outer"+r]=function(t,n){return typeof t!="number"?o["outer"+r].call(this,t):this.each(function(){e(this).css(s,u(this,t,!0,n)+"px")})}}),e.fn.addBack||(e.fn.addBack=function(e){return this.add(e==null?this.prevObject:this.prevObject.filter(e))}),e("<a>").data("a-b","a").removeData("a-b").data("a-b")&&(e.fn.removeData=function(t){return function(n){return arguments.length?t.call(this,e.camelCase(n)):t.call(this)}}(e.fn.removeData)),e.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()),e.support.selectstart="onselectstart"in document.createElement("div"),e.fn.extend({disableSelection:function(){return this.bind((e.support.selectstart?"selectstart":"mousedown")+".ui-disableSelection",function(e){e.preventDefault()})},enableSelection:function(){return this.unbind(".ui-disableSelection")}}),e.extend(e.ui,{plugin:{add:function(t,n,r){var i,s=e.ui[t].prototype;for(i in r)s.plugins[i]=s.plugins[i]||[],s.plugins[i].push([n,r[i]])},call:function(e,t,n){var r,i=e.plugins[t];if(!i||!e.element[0].parentNode||e.element[0].parentNode.nodeType===11)return;for(r=0;r<i.length;r++)e.options[i[r][0]]&&i[r][1].apply(e.element,n)}},hasScroll:function(t,n){if(e(t).css("overflow")==="hidden")return!1;var r=n&&n==="left"?"scrollLeft":"scrollTop",i=!1;return t[r]>0?!0:(t[r]=1,i=t[r]>0,t[r]=0,i)}})})(jQuery);(function(e,t){var n=0,r=Array.prototype.slice,i=e.cleanData;e.cleanData=function(t){for(var n=0,r;(r=t[n])!=null;n++)try{e(r).triggerHandler("remove")}catch(s){}i(t)},e.widget=function(t,n,r){var i,s,o,u,a={},f=t.split(".")[0];t=t.split(".")[1],i=f+"-"+t,r||(r=n,n=e.Widget),e.expr[":"][i.toLowerCase()]=function(t){return!!e.data(t,i)},e[f]=e[f]||{},s=e[f][t],o=e[f][t]=function(e,t){if(!this._createWidget)return new o(e,t);arguments.length&&this._createWidget(e,t)},e.extend(o,s,{version:r.version,_proto:e.extend({},r),_childConstructors:[]}),u=new n,u.options=e.widget.extend({},u.options),e.each(r,function(t,r){if(!e.isFunction(r)){a[t]=r;return}a[t]=function(){var e=function(){return n.prototype[t].apply(this,arguments)},i=function(e){return n.prototype[t].apply(this,e)};return function(){var t=this._super,n=this._superApply,s;return this._super=e,this._superApply=i,s=r.apply(this,arguments),this._super=t,this._superApply=n,s}}()}),o.prototype=e.widget.extend(u,{widgetEventPrefix:s?u.widgetEventPrefix:t},a,{constructor:o,namespace:f,widgetName:t,widgetFullName:i}),s?(e.each(s._childConstructors,function(t,n){var r=n.prototype;e.widget(r.namespace+"."+r.widgetName,o,n._proto)}),delete s._childConstructors):n._childConstructors.push(o),e.widget.bridge(t,o)},e.widget.extend=function(n){var i=r.call(arguments,1),s=0,o=i.length,u,a;for(;s<o;s++)for(u in i[s])a=i[s][u],i[s].hasOwnProperty(u)&&a!==t&&(e.isPlainObject(a)?n[u]=e.isPlainObject(n[u])?e.widget.extend({},n[u],a):e.widget.extend({},a):n[u]=a);return n},e.widget.bridge=function(n,i){var s=i.prototype.widgetFullName||n;e.fn[n]=function(o){var u=typeof o=="string",a=r.call(arguments,1),f=this;return o=!u&&a.length?e.widget.extend.apply(null,[o].concat(a)):o,u?this.each(function(){var r,i=e.data(this,s);if(!i)return e.error("cannot call methods on "+n+" prior to initialization; "+"attempted to call method '"+o+"'");if(!e.isFunction(i[o])||o.charAt(0)==="_")return e.error("no such method '"+o+"' for "+n+" widget instance");r=i[o].apply(i,a);if(r!==i&&r!==t)return f=r&&r.jquery?f.pushStack(r.get()):r,!1}):this.each(function(){var t=e.data(this,s);t?t.option(o||{})._init():e.data(this,s,new i(o,this))}),f}},e.Widget=function(){},e.Widget._childConstructors=[],e.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{disabled:!1,create:null},_createWidget:function(t,r){r=e(r||this.defaultElement||this)[0],this.element=e(r),this.uuid=n++,this.eventNamespace="."+this.widgetName+this.uuid,this.options=e.widget.extend({},this.options,this._getCreateOptions(),t),this.bindings=e(),this.hoverable=e(),this.focusable=e(),r!==this&&(e.data(r,this.widgetFullName,this),this._on(!0,this.element,{remove:function(e){e.target===r&&this.destroy()}}),this.document=e(r.style?r.ownerDocument:r.document||r),this.window=e(this.document[0].defaultView||this.document[0].parentWindow)),this._create(),this._trigger("create",null,this._getCreateEventData()),this._init()},_getCreateOptions:e.noop,_getCreateEventData:e.noop,_create:e.noop,_init:e.noop,destroy:function(){this._destroy(),this.element.unbind(this.eventNamespace).removeData(this.widgetName).removeData(this.widgetFullName).removeData(e.camelCase(this.widgetFullName)),this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName+"-disabled "+"ui-state-disabled"),this.bindings.unbind(this.eventNamespace),this.hoverable.removeClass("ui-state-hover"),this.focusable.removeClass("ui-state-focus")},_destroy:e.noop,widget:function(){return this.element},option:function(n,r){var i=n,s,o,u;if(arguments.length===0)return e.widget.extend({},this.options);if(typeof n=="string"){i={},s=n.split("."),n=s.shift();if(s.length){o=i[n]=e.widget.extend({},this.options[n]);for(u=0;u<s.length-1;u++)o[s[u]]=o[s[u]]||{},o=o[s[u]];n=s.pop();if(r===t)return o[n]===t?null:o[n];o[n]=r}else{if(r===t)return this.options[n]===t?null:this.options[n];i[n]=r}}return this._setOptions(i),this},_setOptions:function(e){var t;for(t in e)this._setOption(t,e[t]);return this},_setOption:function(e,t){return this.options[e]=t,e==="disabled"&&(this.widget().toggleClass(this.widgetFullName+"-disabled ui-state-disabled",!!t).attr("aria-disabled",t),this.hoverable.removeClass("ui-state-hover"),this.focusable.removeClass("ui-state-focus")),this},enable:function(){return this._setOption("disabled",!1)},disable:function(){return this._setOption("disabled",!0)},_on:function(t,n,r){var i,s=this;typeof t!="boolean"&&(r=n,n=t,t=!1),r?(n=i=e(n),this.bindings=this.bindings.add(n)):(r=n,n=this.element,i=this.widget()),e.each(r,function(r,o){function u(){if(!t&&(s.options.disabled===!0||e(this).hasClass("ui-state-disabled")))return;return(typeof o=="string"?s[o]:o).apply(s,arguments)}typeof o!="string"&&(u.guid=o.guid=o.guid||u.guid||e.guid++);var a=r.match(/^(\w+)\s*(.*)$/),f=a[1]+s.eventNamespace,l=a[2];l?i.delegate(l,f,u):n.bind(f,u)})},_off:function(e,t){t=(t||"").split(" ").join(this.eventNamespace+" ")+this.eventNamespace,e.unbind(t).undelegate(t)},_delay:function(e,t){function n(){return(typeof e=="string"?r[e]:e).apply(r,arguments)}var r=this;return setTimeout(n,t||0)},_hoverable:function(t){this.hoverable=this.hoverable.add(t),this._on(t,{mouseenter:function(t){e(t.currentTarget).addClass("ui-state-hover")},mouseleave:function(t){e(t.currentTarget).removeClass("ui-state-hover")}})},_focusable:function(t){this.focusable=this.focusable.add(t),this._on(t,{focusin:function(t){e(t.currentTarget).addClass("ui-state-focus")},focusout:function(t){e(t.currentTarget).removeClass("ui-state-focus")}})},_trigger:function(t,n,r){var i,s,o=this.options[t];r=r||{},n=e.Event(n),n.type=(t===this.widgetEventPrefix?t:this.widgetEventPrefix+t).toLowerCase(),n.target=this.element[0],s=n.originalEvent;if(s)for(i in s)i in n||(n[i]=s[i]);return this.element.trigger(n,r),!(e.isFunction(o)&&o.apply(this.element[0],[n].concat(r))===!1||n.isDefaultPrevented())}},e.each({show:"fadeIn",hide:"fadeOut"},function(t,n){e.Widget.prototype["_"+t]=function(r,i,s){typeof i=="string"&&(i={effect:i});var o,u=i?i===!0||typeof i=="number"?n:i.effect||n:t;i=i||{},typeof i=="number"&&(i={duration:i}),o=!e.isEmptyObject(i),i.complete=s,i.delay&&r.delay(i.delay),o&&e.effects&&e.effects.effect[u]?r[t](i):u!==t&&r[u]?r[u](i.duration,i.easing,s):r.queue(function(n){e(this)[t](),s&&s.call(r[0]),n()})}})})(jQuery);(function(e,t){var n=!1;e(document).mouseup(function(){n=!1}),e.widget("ui.mouse",{version:"1.10.0",options:{cancel:"input,textarea,button,select,option",distance:1,delay:0},_mouseInit:function(){var t=this;this.element.bind("mousedown."+this.widgetName,function(e){return t._mouseDown(e)}).bind("click."+this.widgetName,function(n){if(!0===e.data(n.target,t.widgetName+".preventClickEvent"))return e.removeData(n.target,t.widgetName+".preventClickEvent"),n.stopImmediatePropagation(),!1}),this.started=!1},_mouseDestroy:function(){this.element.unbind("."+this.widgetName),this._mouseMoveDelegate&&e(document).unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate)},_mouseDown:function(t){if(n)return;this._mouseStarted&&this._mouseUp(t),this._mouseDownEvent=t;var r=this,i=t.which===1,s=typeof this.options.cancel=="string"&&t.target.nodeName?e(t.target).closest(this.options.cancel).length:!1;if(!i||s||!this._mouseCapture(t))return!0;this.mouseDelayMet=!this.options.delay,this.mouseDelayMet||(this._mouseDelayTimer=setTimeout(function(){r.mouseDelayMet=!0},this.options.delay));if(this._mouseDistanceMet(t)&&this._mouseDelayMet(t)){this._mouseStarted=this._mouseStart(t)!==!1;if(!this._mouseStarted)return t.preventDefault(),!0}return!0===e.data(t.target,this.widgetName+".preventClickEvent")&&e.removeData(t.target,this.widgetName+".preventClickEvent"),this._mouseMoveDelegate=function(e){return r._mouseMove(e)},this._mouseUpDelegate=function(e){return r._mouseUp(e)},e(document).bind("mousemove."+this.widgetName,this._mouseMoveDelegate).bind("mouseup."+this.widgetName,this._mouseUpDelegate),t.preventDefault(),n=!0,!0},_mouseMove:function(t){return e.ui.ie&&(!document.documentMode||document.documentMode<9)&&!t.button?this._mouseUp(t):this._mouseStarted?(this._mouseDrag(t),t.preventDefault()):(this._mouseDistanceMet(t)&&this._mouseDelayMet(t)&&(this._mouseStarted=this._mouseStart(this._mouseDownEvent,t)!==!1,this._mouseStarted?this._mouseDrag(t):this._mouseUp(t)),!this._mouseStarted)},_mouseUp:function(t){return e(document).unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate),this._mouseStarted&&(this._mouseStarted=!1,t.target===this._mouseDownEvent.target&&e.data(t.target,this.widgetName+".preventClickEvent",!0),this._mouseStop(t)),!1},_mouseDistanceMet:function(e){return Math.max(Math.abs(this._mouseDownEvent.pageX-e.pageX),Math.abs(this._mouseDownEvent.pageY-e.pageY))>=this.options.distance},_mouseDelayMet:function(){return this.mouseDelayMet},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return!0}})})(jQuery);(function(e,t){function h(e,t,n){return[parseInt(e[0],10)*(l.test(e[0])?t/100:1),parseInt(e[1],10)*(l.test(e[1])?n/100:1)]}function p(t,n){return parseInt(e.css(t,n),10)||0}function d(t){var n=t[0];return n.nodeType===9?{width:t.width(),height:t.height(),offset:{top:0,left:0}}:e.isWindow(n)?{width:t.width(),height:t.height(),offset:{top:t.scrollTop(),left:t.scrollLeft()}}:n.preventDefault?{width:0,height:0,offset:{top:n.pageY,left:n.pageX}}:{width:t.outerWidth(),height:t.outerHeight(),offset:t.offset()}}e.ui=e.ui||{};var n,r=Math.max,i=Math.abs,s=Math.round,o=/left|center|right/,u=/top|center|bottom/,a=/[\+\-]\d+%?/,f=/^\w+/,l=/%$/,c=e.fn.position;e.position={scrollbarWidth:function(){if(n!==t)return n;var r,i,s=e("<div style='display:block;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"),o=s.children()[0];return e("body").append(s),r=o.offsetWidth,s.css("overflow","scroll"),i=o.offsetWidth,r===i&&(i=s[0].clientWidth),s.remove(),n=r-i},getScrollInfo:function(t){var n=t.isWindow?"":t.element.css("overflow-x"),r=t.isWindow?"":t.element.css("overflow-y"),i=n==="scroll"||n==="auto"&&t.width<t.element[0].scrollWidth,s=r==="scroll"||r==="auto"&&t.height<t.element[0].scrollHeight;return{width:i?e.position.scrollbarWidth():0,height:s?e.position.scrollbarWidth():0}},getWithinInfo:function(t){var n=e(t||window),r=e.isWindow(n[0]);return{element:n,isWindow:r,offset:n.offset()||{left:0,top:0},scrollLeft:n.scrollLeft(),scrollTop:n.scrollTop(),width:r?n.width():n.outerWidth(),height:r?n.height():n.outerHeight()}}},e.fn.position=function(t){if(!t||!t.of)return c.apply(this,arguments);t=e.extend({},t);var n,l,v,m,g,y,b=e(t.of),w=e.position.getWithinInfo(t.within),E=e.position.getScrollInfo(w),S=(t.collision||"flip").split(" "),x={};return y=d(b),b[0].preventDefault&&(t.at="left top"),l=y.width,v=y.height,m=y.offset,g=e.extend({},m),e.each(["my","at"],function(){var e=(t[this]||"").split(" "),n,r;e.length===1&&(e=o.test(e[0])?e.concat(["center"]):u.test(e[0])?["center"].concat(e):["center","center"]),e[0]=o.test(e[0])?e[0]:"center",e[1]=u.test(e[1])?e[1]:"center",n=a.exec(e[0]),r=a.exec(e[1]),x[this]=[n?n[0]:0,r?r[0]:0],t[this]=[f.exec(e[0])[0],f.exec(e[1])[0]]}),S.length===1&&(S[1]=S[0]),t.at[0]==="right"?g.left+=l:t.at[0]==="center"&&(g.left+=l/2),t.at[1]==="bottom"?g.top+=v:t.at[1]==="center"&&(g.top+=v/2),n=h(x.at,l,v),g.left+=n[0],g.top+=n[1],this.each(function(){var o,u,a=e(this),f=a.outerWidth(),c=a.outerHeight(),d=p(this,"marginLeft"),y=p(this,"marginTop"),T=f+d+p(this,"marginRight")+E.width,N=c+y+p(this,"marginBottom")+E.height,C=e.extend({},g),k=h(x.my,a.outerWidth(),a.outerHeight());t.my[0]==="right"?C.left-=f:t.my[0]==="center"&&(C.left-=f/2),t.my[1]==="bottom"?C.top-=c:t.my[1]==="center"&&(C.top-=c/2),C.left+=k[0],C.top+=k[1],e.support.offsetFractions||(C.left=s(C.left),C.top=s(C.top)),o={marginLeft:d,marginTop:y},e.each(["left","top"],function(r,i){e.ui.position[S[r]]&&e.ui.position[S[r]][i](C,{targetWidth:l,targetHeight:v,elemWidth:f,elemHeight:c,collisionPosition:o,collisionWidth:T,collisionHeight:N,offset:[n[0]+k[0],n[1]+k[1]],my:t.my,at:t.at,within:w,elem:a})}),t.using&&(u=function(e){var n=m.left-C.left,s=n+l-f,o=m.top-C.top,u=o+v-c,h={target:{element:b,left:m.left,top:m.top,width:l,height:v},element:{element:a,left:C.left,top:C.top,width:f,height:c},horizontal:s<0?"left":n>0?"right":"center",vertical:u<0?"top":o>0?"bottom":"middle"};l<f&&i(n+s)<l&&(h.horizontal="center"),v<c&&i(o+u)<v&&(h.vertical="middle"),r(i(n),i(s))>r(i(o),i(u))?h.important="horizontal":h.important="vertical",t.using.call(this,e,h)}),a.offset(e.extend(C,{using:u}))})},e.ui.position={fit:{left:function(e,t){var n=t.within,i=n.isWindow?n.scrollLeft:n.offset.left,s=n.width,o=e.left-t.collisionPosition.marginLeft,u=i-o,a=o+t.collisionWidth-s-i,f;t.collisionWidth>s?u>0&&a<=0?(f=e.left+u+t.collisionWidth-s-i,e.left+=u-f):a>0&&u<=0?e.left=i:u>a?e.left=i+s-t.collisionWidth:e.left=i:u>0?e.left+=u:a>0?e.left-=a:e.left=r(e.left-o,e.left)},top:function(e,t){var n=t.within,i=n.isWindow?n.scrollTop:n.offset.top,s=t.within.height,o=e.top-t.collisionPosition.marginTop,u=i-o,a=o+t.collisionHeight-s-i,f;t.collisionHeight>s?u>0&&a<=0?(f=e.top+u+t.collisionHeight-s-i,e.top+=u-f):a>0&&u<=0?e.top=i:u>a?e.top=i+s-t.collisionHeight:e.top=i:u>0?e.top+=u:a>0?e.top-=a:e.top=r(e.top-o,e.top)}},flip:{left:function(e,t){var n=t.within,r=n.offset.left+n.scrollLeft,s=n.width,o=n.isWindow?n.scrollLeft:n.offset.left,u=e.left-t.collisionPosition.marginLeft,a=u-o,f=u+t.collisionWidth-s-o,l=t.my[0]==="left"?-t.elemWidth:t.my[0]==="right"?t.elemWidth:0,c=t.at[0]==="left"?t.targetWidth:t.at[0]==="right"?-t.targetWidth:0,h=-2*t.offset[0],p,d;if(a<0){p=e.left+l+c+h+t.collisionWidth-s-r;if(p<0||p<i(a))e.left+=l+c+h}else if(f>0){d=e.left-t.collisionPosition.marginLeft+l+c+h-o;if(d>0||i(d)<f)e.left+=l+c+h}},top:function(e,t){var n=t.within,r=n.offset.top+n.scrollTop,s=n.height,o=n.isWindow?n.scrollTop:n.offset.top,u=e.top-t.collisionPosition.marginTop,a=u-o,f=u+t.collisionHeight-s-o,l=t.my[1]==="top",c=l?-t.elemHeight:t.my[1]==="bottom"?t.elemHeight:0,h=t.at[1]==="top"?t.targetHeight:t.at[1]==="bottom"?-t.targetHeight:0,p=-2*t.offset[1],d,v;a<0?(v=e.top+c+h+p+t.collisionHeight-s-r,e.top+c+h+p>a&&(v<0||v<i(a))&&(e.top+=c+h+p)):f>0&&(d=e.top-t.collisionPosition.marginTop+c+h+p-o,e.top+c+h+p>f&&(d>0||i(d)<f)&&(e.top+=c+h+p))}},flipfit:{left:function(){e.ui.position.flip.left.apply(this,arguments),e.ui.position.fit.left.apply(this,arguments)},top:function(){e.ui.position.flip.top.apply(this,arguments),e.ui.position.fit.top.apply(this,arguments)}}},function(){var t,n,r,i,s,o=document.getElementsByTagName("body")[0],u=document.createElement("div");t=document.createElement(o?"div":"body"),r={visibility:"hidden",width:0,height:0,border:0,margin:0,background:"none"},o&&e.extend(r,{position:"absolute",left:"-1000px",top:"-1000px"});for(s in r)t.style[s]=r[s];t.appendChild(u),n=o||document.documentElement,n.insertBefore(t,n.firstChild),u.style.cssText="position: absolute; left: 10.7432222px;",i=e(u).offset().left,e.support.offsetFractions=i>10&&i<11,t.innerHTML="",n.removeChild(t)}()})(jQuery);(function(e,t){e.widget("ui.draggable",e.ui.mouse,{version:"1.10.0",widgetEventPrefix:"drag",options:{addClasses:!0,appendTo:"parent",axis:!1,connectToSortable:!1,containment:!1,cursor:"auto",cursorAt:!1,grid:!1,handle:!1,helper:"original",iframeFix:!1,opacity:!1,refreshPositions:!1,revert:!1,revertDuration:500,scope:"default",scroll:!0,scrollSensitivity:20,scrollSpeed:20,snap:!1,snapMode:"both",snapTolerance:20,stack:!1,zIndex:!1,drag:null,start:null,stop:null},_create:function(){this.options.helper==="original"&&!/^(?:r|a|f)/.test(this.element.css("position"))&&(this.element[0].style.position="relative"),this.options.addClasses&&this.element.addClass("ui-draggable"),this.options.disabled&&this.element.addClass("ui-draggable-disabled"),this._mouseInit()},_destroy:function(){this.element.removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled"),this._mouseDestroy()},_mouseCapture:function(t){var n=this.options;return this.helper||n.disabled||e(t.target).closest(".ui-resizable-handle").length>0?!1:(this.handle=this._getHandle(t),this.handle?(e(n.iframeFix===!0?"iframe":n.iframeFix).each(function(){e("<div class='ui-draggable-iframeFix' style='background: #fff;'></div>").css({width:this.offsetWidth+"px",height:this.offsetHeight+"px",position:"absolute",opacity:"0.001",zIndex:1e3}).css(e(this).offset()).appendTo("body")}),!0):!1)},_mouseStart:function(t){var n=this.options;return this.helper=this._createHelper(t),this.helper.addClass("ui-draggable-dragging"),this._cacheHelperProportions(),e.ui.ddmanager&&(e.ui.ddmanager.current=this),this._cacheMargins(),this.cssPosition=this.helper.css("position"),this.scrollParent=this.helper.scrollParent(),this.offset=this.positionAbs=this.element.offset(),this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left},e.extend(this.offset,{click:{left:t.pageX-this.offset.left,top:t.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()}),this.originalPosition=this.position=this._generatePosition(t),this.originalPageX=t.pageX,this.originalPageY=t.pageY,n.cursorAt&&this._adjustOffsetFromHelper(n.cursorAt),n.containment&&this._setContainment(),this._trigger("start",t)===!1?(this._clear(),!1):(this._cacheHelperProportions(),e.ui.ddmanager&&!n.dropBehaviour&&e.ui.ddmanager.prepareOffsets(this,t),this._mouseDrag(t,!0),e.ui.ddmanager&&e.ui.ddmanager.dragStart(this,t),!0)},_mouseDrag:function(t,n){this.position=this._generatePosition(t),this.positionAbs=this._convertPositionTo("absolute");if(!n){var r=this._uiHash();if(this._trigger("drag",t,r)===!1)return this._mouseUp({}),!1;this.position=r.position}if(!this.options.axis||this.options.axis!=="y")this.helper[0].style.left=this.position.left+"px";if(!this.options.axis||this.options.axis!=="x")this.helper[0].style.top=this.position.top+"px";return e.ui.ddmanager&&e.ui.ddmanager.drag(this,t),!1},_mouseStop:function(t){var n,r=this,i=!1,s=!1;e.ui.ddmanager&&!this.options.dropBehaviour&&(s=e.ui.ddmanager.drop(this,t)),this.dropped&&(s=this.dropped,this.dropped=!1),n=this.element[0];while(n&&(n=n.parentNode))n===document&&(i=!0);return!i&&this.options.helper==="original"?!1:(this.options.revert==="invalid"&&!s||this.options.revert==="valid"&&s||this.options.revert===!0||e.isFunction(this.options.revert)&&this.options.revert.call(this.element,s)?e(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){r._trigger("stop",t)!==!1&&r._clear()}):this._trigger("stop",t)!==!1&&this._clear(),!1)},_mouseUp:function(t){return e("div.ui-draggable-iframeFix").each(function(){this.parentNode.removeChild(this)}),e.ui.ddmanager&&e.ui.ddmanager.dragStop(this,t),e.ui.mouse.prototype._mouseUp.call(this,t)},cancel:function(){return this.helper.is(".ui-draggable-dragging")?this._mouseUp({}):this._clear(),this},_getHandle:function(t){var n=!this.options.handle||!e(this.options.handle,this.element).length?!0:!1;return e(this.options.handle,this.element).find("*").addBack().each(function(){this===t.target&&(n=!0)}),n},_createHelper:function(t){var n=this.options,r=e.isFunction(n.helper)?e(n.helper.apply(this.element[0],[t])):n.helper==="clone"?this.element.clone().removeAttr("id"):this.element;return r.parents("body").length||r.appendTo(n.appendTo==="parent"?this.element[0].parentNode:n.appendTo),r[0]!==this.element[0]&&!/(fixed|absolute)/.test(r.css("position"))&&r.css("position","absolute"),r},_adjustOffsetFromHelper:function(t){typeof t=="string"&&(t=t.split(" ")),e.isArray(t)&&(t={left:+t[0],top:+t[1]||0}),"left"in t&&(this.offset.click.left=t.left+this.margins.left),"right"in t&&(this.offset.click.left=this.helperProportions.width-t.right+this.margins.left),"top"in t&&(this.offset.click.top=t.top+this.margins.top),"bottom"in t&&(this.offset.click.top=this.helperProportions.height-t.bottom+this.margins.top)},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var t=this.offsetParent.offset();this.cssPosition==="absolute"&&this.scrollParent[0]!==document&&e.contains(this.scrollParent[0],this.offsetParent[0])&&(t.left+=this.scrollParent.scrollLeft(),t.top+=this.scrollParent.scrollTop());if(this.offsetParent[0]===document.body||this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()==="html"&&e.ui.ie)t={top:0,left:0};return{top:t.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:t.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if(this.cssPosition==="relative"){var e=this.element.position();return{top:e.top-(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:e.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.element.css("marginLeft"),10)||0,top:parseInt(this.element.css("marginTop"),10)||0,right:parseInt(this.element.css("marginRight"),10)||0,bottom:parseInt(this.element.css("marginBottom"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var t,n,r,i=this.options;i.containment==="parent"&&(i.containment=this.helper[0].parentNode);if(i.containment==="document"||i.containment==="window")this.containment=[i.containment==="document"?0:e(window).scrollLeft()-this.offset.relative.left-this.offset.parent.left,i.containment==="document"?0:e(window).scrollTop()-this.offset.relative.top-this.offset.parent.top,(i.containment==="document"?0:e(window).scrollLeft())+e(i.containment==="document"?document:window).width()-this.helperProportions.width-this.margins.left,(i.containment==="document"?0:e(window).scrollTop())+(e(i.containment==="document"?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];if(!/^(document|window|parent)$/.test(i.containment)&&i.containment.constructor!==Array){n=e(i.containment),r=n[0];if(!r)return;t=e(r).css("overflow")!=="hidden",this.containment=[(parseInt(e(r).css("borderLeftWidth"),10)||0)+(parseInt(e(r).css("paddingLeft"),10)||0),(parseInt(e(r).css("borderTopWidth"),10)||0)+(parseInt(e(r).css("paddingTop"),10)||0),(t?Math.max(r.scrollWidth,r.offsetWidth):r.offsetWidth)-(parseInt(e(r).css("borderLeftWidth"),10)||0)-(parseInt(e(r).css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left-this.margins.right,(t?Math.max(r.scrollHeight,r.offsetHeight):r.offsetHeight)-(parseInt(e(r).css("borderTopWidth"),10)||0)-(parseInt(e(r).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top-this.margins.bottom],this.relative_container=n}else i.containment.constructor===Array&&(this.containment=i.containment)},_convertPositionTo:function(t,n){n||(n=this.position);var r=t==="absolute"?1:-1,i=this.cssPosition!=="absolute"||this.scrollParent[0]!==document&&!!e.contains(this.scrollParent[0],this.offsetParent[0])?this.scrollParent:this.offsetParent,s=/(html|body)/i.test(i[0].tagName);return{top:n.top+this.offset.relative.top*r+this.offset.parent.top*r-(this.cssPosition==="fixed"?-this.scrollParent.scrollTop():s?0:i.scrollTop())*r,left:n.left+this.offset.relative.left*r+this.offset.parent.left*r-(this.cssPosition==="fixed"?-this.scrollParent.scrollLeft():s?0:i.scrollLeft())*r}},_generatePosition:function(t){var n,r,i,s,o=this.options,u=this.cssPosition!=="absolute"||this.scrollParent[0]!==document&&!!e.contains(this.scrollParent[0],this.offsetParent[0])?this.scrollParent:this.offsetParent,a=/(html|body)/i.test(u[0].tagName),f=t.pageX,l=t.pageY;return this.originalPosition&&(this.containment&&(this.relative_container?(r=this.relative_container.offset(),n=[this.containment[0]+r.left,this.containment[1]+r.top,this.containment[2]+r.left,this.containment[3]+r.top]):n=this.containment,t.pageX-this.offset.click.left<n[0]&&(f=n[0]+this.offset.click.left),t.pageY-this.offset.click.top<n[1]&&(l=n[1]+this.offset.click.top),t.pageX-this.offset.click.left>n[2]&&(f=n[2]+this.offset.click.left),t.pageY-this.offset.click.top>n[3]&&(l=n[3]+this.offset.click.top)),o.grid&&(i=o.grid[1]?this.originalPageY+Math.round((l-this.originalPageY)/o.grid[1])*o.grid[1]:this.originalPageY,l=n?i-this.offset.click.top>=n[1]||i-this.offset.click.top>n[3]?i:i-this.offset.click.top>=n[1]?i-o.grid[1]:i+o.grid[1]:i,s=o.grid[0]?this.originalPageX+Math.round((f-this.originalPageX)/o.grid[0])*o.grid[0]:this.originalPageX,f=n?s-this.offset.click.left>=n[0]||s-this.offset.click.left>n[2]?s:s-this.offset.click.left>=n[0]?s-o.grid[0]:s+o.grid[0]:s)),{top:l-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+(this.cssPosition==="fixed"?-this.scrollParent.scrollTop():a?0:u.scrollTop()),left:f-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+(this.cssPosition==="fixed"?-this.scrollParent.scrollLeft():a?0:u.scrollLeft())}},_clear:function(){this.helper.removeClass("ui-draggable-dragging"),this.helper[0]!==this.element[0]&&!this.cancelHelperRemoval&&this.helper.remove(),this.helper=null,this.cancelHelperRemoval=!1},_trigger:function(t,n,r){return r=r||this._uiHash(),e.ui.plugin.call(this,t,[n,r]),t==="drag"&&(this.positionAbs=this._convertPositionTo("absolute")),e.Widget.prototype._trigger.call(this,t,n,r)},plugins:{},_uiHash:function(){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs}}}),e.ui.plugin.add("draggable","connectToSortable",{start:function(t,n){var r=e(this).data("ui-draggable"),i=r.options,s=e.extend({},n,{item:r.element});r.sortables=[],e(i.connectToSortable).each(function(){var n=e.data(this,"ui-sortable");n&&!n.options.disabled&&(r.sortables.push({instance:n,shouldRevert:n.options.revert}),n.refreshPositions(),n._trigger("activate",t,s))})},stop:function(t,n){var r=e(this).data("ui-draggable"),i=e.extend({},n,{item:r.element});e.each(r.sortables,function(){this.instance.isOver?(this.instance.isOver=0,r.cancelHelperRemoval=!0,this.instance.cancelHelperRemoval=!1,this.shouldRevert&&(this.instance.options.revert=!0),this.instance._mouseStop(t),this.instance.options.helper=this.instance.options._helper,r.options.helper==="original"&&this.instance.currentItem.css({top:"auto",left:"auto"})):(this.instance.cancelHelperRemoval=!1,this.instance._trigger("deactivate",t,i))})},drag:function(t,n){var r=e(this).data("ui-draggable"),i=this;e.each(r.sortables,function(){var s=!1,o=this;this.instance.positionAbs=r.positionAbs,this.instance.helperProportions=r.helperProportions,this.instance.offset.click=r.offset.click,this.instance._intersectsWith(this.instance.containerCache)&&(s=!0,e.each(r.sortables,function(){return this.instance.positionAbs=r.positionAbs,this.instance.helperProportions=r.helperProportions,this.instance.offset.click=r.offset.click,this!==o&&this.instance._intersectsWith(this.instance.containerCache)&&e.ui.contains(o.instance.element[0],this.instance.element[0])&&(s=!1),s})),s?(this.instance.isOver||(this.instance.isOver=1,this.instance.currentItem=e(i).clone().removeAttr("id").appendTo(this.instance.element).data("ui-sortable-item",!0),this.instance.options._helper=this.instance.options.helper,this.instance.options.helper=function(){return n.helper[0]},t.target=this.instance.currentItem[0],this.instance._mouseCapture(t,!0),this.instance._mouseStart(t,!0,!0),this.instance.offset.click.top=r.offset.click.top,this.instance.offset.click.left=r.offset.click.left,this.instance.offset.parent.left-=r.offset.parent.left-this.instance.offset.parent.left,this.instance.offset.parent.top-=r.offset.parent.top-this.instance.offset.parent.top,r._trigger("toSortable",t),r.dropped=this.instance.element,r.currentItem=r.element,this.instance.fromOutside=r),this.instance.currentItem&&this.instance._mouseDrag(t)):this.instance.isOver&&(this.instance.isOver=0,this.instance.cancelHelperRemoval=!0,this.instance.options.revert=!1,this.instance._trigger("out",t,this.instance._uiHash(this.instance)),this.instance._mouseStop(t,!0),this.instance.options.helper=this.instance.options._helper,this.instance.currentItem.remove(),this.instance.placeholder&&this.instance.placeholder.remove(),r._trigger("fromSortable",t),r.dropped=!1)})}}),e.ui.plugin.add("draggable","cursor",{start:function(){var t=e("body"),n=e(this).data("ui-draggable").options;t.css("cursor")&&(n._cursor=t.css("cursor")),t.css("cursor",n.cursor)},stop:function(){var t=e(this).data("ui-draggable").options;t._cursor&&e("body").css("cursor",t._cursor)}}),e.ui.plugin.add("draggable","opacity",{start:function(t,n){var r=e(n.helper),i=e(this).data("ui-draggable").options;r.css("opacity")&&(i._opacity=r.css("opacity")),r.css("opacity",i.opacity)},stop:function(t,n){var r=e(this).data("ui-draggable").options;r._opacity&&e(n.helper).css("opacity",r._opacity)}}),e.ui.plugin.add("draggable","scroll",{start:function(){var t=e(this).data("ui-draggable");t.scrollParent[0]!==document&&t.scrollParent[0].tagName!=="HTML"&&(t.overflowOffset=t.scrollParent.offset())},drag:function(t){var n=e(this).data("ui-draggable"),r=n.options,i=!1;if(n.scrollParent[0]!==document&&n.scrollParent[0].tagName!=="HTML"){if(!r.axis||r.axis!=="x")n.overflowOffset.top+n.scrollParent[0].offsetHeight-t.pageY<r.scrollSensitivity?n.scrollParent[0].scrollTop=i=n.scrollParent[0].scrollTop+r.scrollSpeed:t.pageY-n.overflowOffset.top<r.scrollSensitivity&&(n.scrollParent[0].scrollTop=i=n.scrollParent[0].scrollTop-r.scrollSpeed);if(!r.axis||r.axis!=="y")n.overflowOffset.left+n.scrollParent[0].offsetWidth-t.pageX<r.scrollSensitivity?n.scrollParent[0].scrollLeft=i=n.scrollParent[0].scrollLeft+r.scrollSpeed:t.pageX-n.overflowOffset.left<r.scrollSensitivity&&(n.scrollParent[0].scrollLeft=i=n.scrollParent[0].scrollLeft-r.scrollSpeed)}else{if(!r.axis||r.axis!=="x")t.pageY-e(document).scrollTop()<r.scrollSensitivity?i=e(document).scrollTop(e(document).scrollTop()-r.scrollSpeed):e(window).height()-(t.pageY-e(document).scrollTop())<r.scrollSensitivity&&(i=e(document).scrollTop(e(document).scrollTop()+r.scrollSpeed));if(!r.axis||r.axis!=="y")t.pageX-e(document).scrollLeft()<r.scrollSensitivity?i=e(document).scrollLeft(e(document).scrollLeft()-r.scrollSpeed):e(window).width()-(t.pageX-e(document).scrollLeft())<r.scrollSensitivity&&(i=e(document).scrollLeft(e(document).scrollLeft()+r.scrollSpeed))}i!==!1&&e.ui.ddmanager&&!r.dropBehaviour&&e.ui.ddmanager.prepareOffsets(n,t)}}),e.ui.plugin.add("draggable","snap",{start:function(){var t=e(this).data("ui-draggable"),n=t.options;t.snapElements=[],e(n.snap.constructor!==String?n.snap.items||":data(ui-draggable)":n.snap).each(function(){var n=e(this),r=n.offset();this!==t.element[0]&&t.snapElements.push({item:this,width:n.outerWidth(),height:n.outerHeight(),top:r.top,left:r.left})})},drag:function(t,n){var r,i,s,o,u,a,f,l,c,h,p=e(this).data("ui-draggable"),d=p.options,v=d.snapTolerance,m=n.offset.left,g=m+p.helperProportions.width,y=n.offset.top,b=y+p.helperProportions.height;for(c=p.snapElements.length-1;c>=0;c--){u=p.snapElements[c].left,a=u+p.snapElements[c].width,f=p.snapElements[c].top,l=f+p.snapElements[c].height;if(!(u-v<m&&m<a+v&&f-v<y&&y<l+v||u-v<m&&m<a+v&&f-v<b&&b<l+v||u-v<g&&g<a+v&&f-v<y&&y<l+v||u-v<g&&g<a+v&&f-v<b&&b<l+v)){p.snapElements[c].snapping&&p.options.snap.release&&p.options.snap.release.call(p.element,t,e.extend(p._uiHash(),{snapItem:p.snapElements[c].item})),p.snapElements[c].snapping=!1;continue}d.snapMode!=="inner"&&(r=Math.abs(f-b)<=v,i=Math.abs(l-y)<=v,s=Math.abs(u-g)<=v,o=Math.abs(a-m)<=v,r&&(n.position.top=p._convertPositionTo("relative",{top:f-p.helperProportions.height,left:0}).top-p.margins.top),i&&(n.position.top=p._convertPositionTo("relative",{top:l,left:0}).top-p.margins.top),s&&(n.position.left=p._convertPositionTo("relative",{top:0,left:u-p.helperProportions.width}).left-p.margins.left),o&&(n.position.left=p._convertPositionTo("relative",{top:0,left:a}).left-p.margins.left)),h=r||i||s||o,d.snapMode!=="outer"&&(r=Math.abs(f-y)<=v,i=Math.abs(l-b)<=v,s=Math.abs(u-m)<=v,o=Math.abs(a-g)<=v,r&&(n.position.top=p._convertPositionTo("relative",{top:f,left:0}).top-p.margins.top),i&&(n.position.top=p._convertPositionTo("relative",{top:l-p.helperProportions.height,left:0}).top-p.margins.top),s&&(n.position.left=p._convertPositionTo("relative",{top:0,left:u}).left-p.margins.left),o&&(n.position.left=p._convertPositionTo("relative",{top:0,left:a-p.helperProportions.width}).left-p.margins.left)),!p.snapElements[c].snapping&&(r||i||s||o||h)&&p.options.snap.snap&&p.options.snap.snap.call(p.element,t,e.extend(p._uiHash(),{snapItem:p.snapElements[c].item})),p.snapElements[c].snapping=r||i||s||o||h}}}),e.ui.plugin.add("draggable","stack",{start:function(){var t,n=e(this).data("ui-draggable").options,r=e.makeArray(e(n.stack)).sort(function(t,n){return(parseInt(e(t).css("zIndex"),10)||0)-(parseInt(e(n).css("zIndex"),10)||0)});if(!r.length)return;t=parseInt(r[0].style.zIndex,10)||0,e(r).each(function(e){this.style.zIndex=t+e}),this[0].style.zIndex=t+r.length}}),e.ui.plugin.add("draggable","zIndex",{start:function(t,n){var r=e(n.helper),i=e(this).data("ui-draggable").options;r.css("zIndex")&&(i._zIndex=r.css("zIndex")),r.css("zIndex",i.zIndex)},stop:function(t,n){var r=e(this).data("ui-draggable").options;r._zIndex&&e(n.helper).css("zIndex",r._zIndex)}})})(jQuery);(function(e,t){function n(e){return parseInt(e,10)||0}function r(e){return!isNaN(parseInt(e,10))}e.widget("ui.resizable",e.ui.mouse,{version:"1.10.0",widgetEventPrefix:"resize",options:{alsoResize:!1,animate:!1,animateDuration:"slow",animateEasing:"swing",aspectRatio:!1,autoHide:!1,containment:!1,ghost:!1,grid:!1,handles:"e,s,se",helper:!1,maxHeight:null,maxWidth:null,minHeight:10,minWidth:10,zIndex:90,resize:null,start:null,stop:null},_create:function(){var t,n,r,i,s,o=this,u=this.options;this.element.addClass("ui-resizable"),e.extend(this,{_aspectRatio:!!u.aspectRatio,aspectRatio:u.aspectRatio,originalElement:this.element,_proportionallyResizeElements:[],_helper:u.helper||u.ghost||u.animate?u.helper||"ui-resizable-helper":null}),this.element[0].nodeName.match(/canvas|textarea|input|select|button|img/i)&&(this.element.wrap(e("<div class='ui-wrapper' style='overflow: hidden;'></div>").css({position:this.element.css("position"),width:this.element.outerWidth(),height:this.element.outerHeight(),top:this.element.css("top"),left:this.element.css("left")})),this.element=this.element.parent().data("ui-resizable",this.element.data("ui-resizable")),this.elementIsWrapper=!0,this.element.css({marginLeft:this.originalElement.css("marginLeft"),marginTop:this.originalElement.css("marginTop"),marginRight:this.originalElement.css("marginRight"),marginBottom:this.originalElement.css("marginBottom")}),this.originalElement.css({marginLeft:0,marginTop:0,marginRight:0,marginBottom:0}),this.originalResizeStyle=this.originalElement.css("resize"),this.originalElement.css("resize","none"),this._proportionallyResizeElements.push(this.originalElement.css({position:"static",zoom:1,display:"block"})),this.originalElement.css({margin:this.originalElement.css("margin")}),this._proportionallyResize()),this.handles=u.handles||(e(".ui-resizable-handle",this.element).length?{n:".ui-resizable-n",e:".ui-resizable-e",s:".ui-resizable-s",w:".ui-resizable-w",se:".ui-resizable-se",sw:".ui-resizable-sw",ne:".ui-resizable-ne",nw:".ui-resizable-nw"}:"e,s,se");if(this.handles.constructor===String){this.handles==="all"&&(this.handles="n,e,s,w,se,sw,ne,nw"),t=this.handles.split(","),this.handles={};for(n=0;n<t.length;n++)r=e.trim(t[n]),s="ui-resizable-"+r,i=e("<div class='ui-resizable-handle "+s+"'></div>"),i.css({zIndex:u.zIndex}),"se"===r&&i.addClass("ui-icon ui-icon-gripsmall-diagonal-se"),this.handles[r]=".ui-resizable-"+r,this.element.append(i)}this._renderAxis=function(t){var n,r,i,s;t=t||this.element;for(n in this.handles){this.handles[n].constructor===String&&(this.handles[n]=e(this.handles[n],this.element).show()),this.elementIsWrapper&&this.originalElement[0].nodeName.match(/textarea|input|select|button/i)&&(r=e(this.handles[n],this.element),s=/sw|ne|nw|se|n|s/.test(n)?r.outerHeight():r.outerWidth(),i=["padding",/ne|nw|n/.test(n)?"Top":/se|sw|s/.test(n)?"Bottom":/^e$/.test(n)?"Right":"Left"].join(""),t.css(i,s),this._proportionallyResize());if(!e(this.handles[n]).length)continue}},this._renderAxis(this.element),this._handles=e(".ui-resizable-handle",this.element).disableSelection(),this._handles.mouseover(function(){o.resizing||(this.className&&(i=this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i)),o.axis=i&&i[1]?i[1]:"se")}),u.autoHide&&(this._handles.hide(),e(this.element).addClass("ui-resizable-autohide").mouseenter(function(){if(u.disabled)return;e(this).removeClass("ui-resizable-autohide"),o._handles.show()}).mouseleave(function(){if(u.disabled)return;o.resizing||(e(this).addClass("ui-resizable-autohide"),o._handles.hide())})),this._mouseInit()},_destroy:function(){this._mouseDestroy();var t,n=function(t){e(t).removeClass("ui-resizable ui-resizable-disabled ui-resizable-resizing").removeData("resizable").removeData("ui-resizable").unbind(".resizable").find(".ui-resizable-handle").remove()};return this.elementIsWrapper&&(n(this.element),t=this.element,this.originalElement.css({position:t.css("position"),width:t.outerWidth(),height:t.outerHeight(),top:t.css("top"),left:t.css("left")}).insertAfter(t),t.remove()),this.originalElement.css("resize",this.originalResizeStyle),n(this.originalElement),this},_mouseCapture:function(t){var n,r,i=!1;for(n in this.handles){r=e(this.handles[n])[0];if(r===t.target||e.contains(r,t.target))i=!0}return!this.options.disabled&&i},_mouseStart:function(t){var r,i,s,o=this.options,u=this.element.position(),a=this.element;return this.resizing=!0,/absolute/.test(a.css("position"))?a.css({position:"absolute",top:a.css("top"),left:a.css("left")}):a.is(".ui-draggable")&&a.css({position:"absolute",top:u.top,left:u.left}),this._renderProxy(),r=n(this.helper.css("left")),i=n(this.helper.css("top")),o.containment&&(r+=e(o.containment).scrollLeft()||0,i+=e(o.containment).scrollTop()||0),this.offset=this.helper.offset(),this.position={left:r,top:i},this.size=this._helper?{width:a.outerWidth(),height:a.outerHeight()}:{width:a.width(),height:a.height()},this.originalSize=this._helper?{width:a.outerWidth(),height:a.outerHeight()}:{width:a.width(),height:a.height()},this.originalPosition={left:r,top:i},this.sizeDiff={width:a.outerWidth()-a.width(),height:a.outerHeight()-a.height()},this.originalMousePosition={left:t.pageX,top:t.pageY},this.aspectRatio=typeof o.aspectRatio=="number"?o.aspectRatio:this.originalSize.width/this.originalSize.height||1,s=e(".ui-resizable-"+this.axis).css("cursor"),e("body").css("cursor",s==="auto"?this.axis+"-resize":s),a.addClass("ui-resizable-resizing"),this._propagate("start",t),!0},_mouseDrag:function(t){var n,r=this.helper,i={},s=this.originalMousePosition,o=this.axis,u=this.position.top,a=this.position.left,f=this.size.width,l=this.size.height,c=t.pageX-s.left||0,h=t.pageY-s.top||0,p=this._change[o];if(!p)return!1;n=p.apply(this,[t,c,h]),this._updateVirtualBoundaries(t.shiftKey);if(this._aspectRatio||t.shiftKey)n=this._updateRatio(n,t);return n=this._respectSize(n,t),this._updateCache(n),this._propagate("resize",t),this.position.top!==u&&(i.top=this.position.top+"px"),this.position.left!==a&&(i.left=this.position.left+"px"),this.size.width!==f&&(i.width=this.size.width+"px"),this.size.height!==l&&(i.height=this.size.height+"px"),r.css(i),!this._helper&&this._proportionallyResizeElements.length&&this._proportionallyResize(),e.isEmptyObject(i)||this._trigger("resize",t,this.ui()),!1},_mouseStop:function(t){this.resizing=!1;var n,r,i,s,o,u,a,f=this.options,l=this;return this._helper&&(n=this._proportionallyResizeElements,r=n.length&&/textarea/i.test(n[0].nodeName),i=r&&e.ui.hasScroll(n[0],"left")?0:l.sizeDiff.height,s=r?0:l.sizeDiff.width,o={width:l.helper.width()-s,height:l.helper.height()-i},u=parseInt(l.element.css("left"),10)+(l.position.left-l.originalPosition.left)||null,a=parseInt(l.element.css("top"),10)+(l.position.top-l.originalPosition.top)||null,f.animate||this.element.css(e.extend(o,{top:a,left:u})),l.helper.height(l.size.height),l.helper.width(l.size.width),this._helper&&!f.animate&&this._proportionallyResize()),e("body").css("cursor","auto"),this.element.removeClass("ui-resizable-resizing"),this._propagate("stop",t),this._helper&&this.helper.remove(),!1},_updateVirtualBoundaries:function(e){var t,n,i,s,o,u=this.options;o={minWidth:r(u.minWidth)?u.minWidth:0,maxWidth:r(u.maxWidth)?u.maxWidth:Infinity,minHeight:r(u.minHeight)?u.minHeight:0,maxHeight:r(u.maxHeight)?u.maxHeight:Infinity};if(this._aspectRatio||e)t=o.minHeight*this.aspectRatio,i=o.minWidth/this.aspectRatio,n=o.maxHeight*this.aspectRatio,s=o.maxWidth/this.aspectRatio,t>o.minWidth&&(o.minWidth=t),i>o.minHeight&&(o.minHeight=i),n<o.maxWidth&&(o.maxWidth=n),s<o.maxHeight&&(o.maxHeight=s);this._vBoundaries=o},_updateCache:function(e){this.offset=this.helper.offset(),r(e.left)&&(this.position.left=e.left),r(e.top)&&(this.position.top=e.top),r(e.height)&&(this.size.height=e.height),r(e.width)&&(this.size.width=e.width)},_updateRatio:function(e){var t=this.position,n=this.size,i=this.axis;return r(e.height)?e.width=e.height*this.aspectRatio:r(e.width)&&(e.height=e.width/this.aspectRatio),i==="sw"&&(e.left=t.left+(n.width-e.width),e.top=null),i==="nw"&&(e.top=t.top+(n.height-e.height),e.left=t.left+(n.width-e.width)),e},_respectSize:function(e){var t=this._vBoundaries,n=this.axis,i=r(e.width)&&t.maxWidth&&t.maxWidth<e.width,s=r(e.height)&&t.maxHeight&&t.maxHeight<e.height,o=r(e.width)&&t.minWidth&&t.minWidth>e.width,u=r(e.height)&&t.minHeight&&t.minHeight>e.height,a=this.originalPosition.left+this.originalSize.width,f=this.position.top+this.size.height,l=/sw|nw|w/.test(n),c=/nw|ne|n/.test(n);return o&&(e.width=t.minWidth),u&&(e.height=t.minHeight),i&&(e.width=t.maxWidth),s&&(e.height=t.maxHeight),o&&l&&(e.left=a-t.minWidth),i&&l&&(e.left=a-t.maxWidth),u&&c&&(e.top=f-t.minHeight),s&&c&&(e.top=f-t.maxHeight),!e.width&&!e.height&&!e.left&&e.top?e.top=null:!e.width&&!e.height&&!e.top&&e.left&&(e.left=null),e},_proportionallyResize:function(){if(!this._proportionallyResizeElements.length)return;var e,t,n,r,i,s=this.helper||this.element;for(e=0;e<this._proportionallyResizeElements.length;e++){i=this._proportionallyResizeElements[e];if(!this.borderDif){this.borderDif=[],n=[i.css("borderTopWidth"),i.css("borderRightWidth"),i.css("borderBottomWidth"),i.css("borderLeftWidth")],r=[i.css("paddingTop"),i.css("paddingRight"),i.css("paddingBottom"),i.css("paddingLeft")];for(t=0;t<n.length;t++)this.borderDif[t]=(parseInt(n[t],10)||0)+(parseInt(r[t],10)||0)}i.css({height:s.height()-this.borderDif[0]-this.borderDif[2]||0,width:s.width()-this.borderDif[1]-this.borderDif[3]||0})}},_renderProxy:function(){var t=this.element,n=this.options;this.elementOffset=t.offset(),this._helper?(this.helper=this.helper||e("<div style='overflow:hidden;'></div>"),this.helper.addClass(this._helper).css({width:this.element.outerWidth()-1,height:this.element.outerHeight()-1,position:"absolute",left:this.elementOffset.left+"px",top:this.elementOffset.top+"px",zIndex:++n.zIndex}),this.helper.appendTo("body").disableSelection()):this.helper=this.element},_change:{e:function(e,t){return{width:this.originalSize.width+t}},w:function(e,t){var n=this.originalSize,r=this.originalPosition;return{left:r.left+t,width:n.width-t}},n:function(e,t,n){var r=this.originalSize,i=this.originalPosition;return{top:i.top+n,height:r.height-n}},s:function(e,t,n){return{height:this.originalSize.height+n}},se:function(t,n,r){return e.extend(this._change.s.apply(this,arguments),this._change.e.apply(this,[t,n,r]))},sw:function(t,n,r){return e.extend(this._change.s.apply(this,arguments),this._change.w.apply(this,[t,n,r]))},ne:function(t,n,r){return e.extend(this._change.n.apply(this,arguments),this._change.e.apply(this,[t,n,r]))},nw:function(t,n,r){return e.extend(this._change.n.apply(this,arguments),this._change.w.apply(this,[t,n,r]))}},_propagate:function(t,n){e.ui.plugin.call(this,t,[n,this.ui()]),t!=="resize"&&this._trigger(t,n,this.ui())},plugins:{},ui:function(){return{originalElement:this.originalElement,element:this.element,helper:this.helper,position:this.position,size:this.size,originalSize:this.originalSize,originalPosition:this.originalPosition}}}),e.ui.plugin.add("resizable","animate",{stop:function(t){var n=e(this).data("ui-resizable"),r=n.options,i=n._proportionallyResizeElements,s=i.length&&/textarea/i.test(i[0].nodeName),o=s&&e.ui.hasScroll(i[0],"left")?0:n.sizeDiff.height,u=s?0:n.sizeDiff.width,a={width:n.size.width-u,height:n.size.height-o},f=parseInt(n.element.css("left"),10)+(n.position.left-n.originalPosition.left)||null,l=parseInt(n.element.css("top"),10)+(n.position.top-n.originalPosition.top)||null;n.element.animate(e.extend(a,l&&f?{top:l,left:f}:{}),{duration:r.animateDuration,easing:r.animateEasing,step:function(){var r={width:parseInt(n.element.css("width"),10),height:parseInt(n.element.css("height"),10),top:parseInt(n.element.css("top"),10),left:parseInt(n.element.css("left"),10)};i&&i.length&&e(i[0]).css({width:r.width,height:r.height}),n._updateCache(r),n._propagate("resize",t)}})}}),e.ui.plugin.add("resizable","containment",{start:function(){var t,r,i,s,o,u,a,f=e(this).data("ui-resizable"),l=f.options,c=f.element,h=l.containment,p=h instanceof e?h.get(0):/parent/.test(h)?c.parent().get(0):h;if(!p)return;f.containerElement=e(p),/document/.test(h)||h===document?(f.containerOffset={left:0,top:0},f.containerPosition={left:0,top:0},f.parentData={element:e(document),left:0,top:0,width:e(document).width(),height:e(document).height()||document.body.parentNode.scrollHeight}):(t=e(p),r=[],e(["Top","Right","Left","Bottom"]).each(function(e,i){r[e]=n(t.css("padding"+i))}),f.containerOffset=t.offset(),f.containerPosition=t.position(),f.containerSize={height:t.innerHeight()-r[3],width:t.innerWidth()-r[1]},i=f.containerOffset,s=f.containerSize.height,o=f.containerSize.width,u=e.ui.hasScroll(p,"left")?p.scrollWidth:o,a=e.ui.hasScroll(p)?p.scrollHeight:s,f.parentData={element:p,left:i.left,top:i.top,width:u,height:a})},resize:function(t){var n,r,i,s,o=e(this).data("ui-resizable"),u=o.options,a=o.containerOffset,f=o.position,l=o._aspectRatio||t.shiftKey,c={top:0,left:0},h=o.containerElement;h[0]!==document&&/static/.test(h.css("position"))&&(c=a),f.left<(o._helper?a.left:0)&&(o.size.width=o.size.width+(o._helper?o.position.left-a.left:o.position.left-c.left),l&&(o.size.height=o.size.width/o.aspectRatio),o.position.left=u.helper?a.left:0),f.top<(o._helper?a.top:0)&&(o.size.height=o.size.height+(o._helper?o.position.top-a.top:o.position.top),l&&(o.size.width=o.size.height*o.aspectRatio),o.position.top=o._helper?a.top:0),o.offset.left=o.parentData.left+o.position.left,o.offset.top=o.parentData.top+o.position.top,n=Math.abs((o._helper?o.offset.left-c.left:o.offset.left-c.left)+o.sizeDiff.width),r=Math.abs((o._helper?o.offset.top-c.top:o.offset.top-a.top)+o.sizeDiff.height),i=o.containerElement.get(0)===o.element.parent().get(0),s=/relative|absolute/.test(o.containerElement.css("position")),i&&s&&(n-=o.parentData.left),n+o.size.width>=o.parentData.width&&(o.size.width=o.parentData.width-n,l&&(o.size.height=o.size.width/o.aspectRatio)),r+o.size.height>=o.parentData.height&&(o.size.height=o.parentData.height-r,l&&(o.size.width=o.size.height*o.aspectRatio))},stop:function(){var t=e(this).data("ui-resizable"),n=t.options,r=t.containerOffset,i=t.containerPosition,s=t.containerElement,o=e(t.helper),u=o.offset(),a=o.outerWidth()-t.sizeDiff.width,f=o.outerHeight()-t.sizeDiff.height;t._helper&&!n.animate&&/relative/.test(s.css("position"))&&e(this).css({left:u.left-i.left-r.left,width:a,height:f}),t._helper&&!n.animate&&/static/.test(s.css("position"))&&e(this).css({left:u.left-i.left-r.left,width:a,height:f})}}),e.ui.plugin.add("resizable","alsoResize",{start:function(){var t=e(this).data("ui-resizable"),n=t.options,r=function(t){e(t).each(function(){var t=e(this);t.data("ui-resizable-alsoresize",{width:parseInt(t.width(),10),height:parseInt(t.height(),10),left:parseInt(t.css("left"),10),top:parseInt(t.css("top"),10)})})};typeof n.alsoResize=="object"&&!n.alsoResize.parentNode?n.alsoResize.length?(n.alsoResize=n.alsoResize[0],r(n.alsoResize)):e.each(n.alsoResize,function(e){r(e)}):r(n.alsoResize)},resize:function(t,n){var r=e(this).data("ui-resizable"),i=r.options,s=r.originalSize,o=r.originalPosition,u={height:r.size.height-s.height||0,width:r.size.width-s.width||0,top:r.position.top-o.top||0,left:r.position.left-o.left||0},a=function(t,r){e(t).each(function(){var t=e(this),i=e(this).data("ui-resizable-alsoresize"),s={},o=r&&r.length?r:t.parents(n.originalElement[0]).length?["width","height"]:["width","height","top","left"];e.each(o,function(e,t){var n=(i[t]||0)+(u[t]||0);n&&n>=0&&(s[t]=n||null)}),t.css(s)})};typeof i.alsoResize=="object"&&!i.alsoResize.nodeType?e.each(i.alsoResize,function(e,t){a(e,t)}):a(i.alsoResize)},stop:function(){e(this).removeData("resizable-alsoresize")}}),e.ui.plugin.add("resizable","ghost",{start:function(){var t=e(this).data("ui-resizable"),n=t.options,r=t.size;t.ghost=t.originalElement.clone(),t.ghost.css({opacity:.25,display:"block",position:"relative",height:r.height,width:r.width,margin:0,left:0,top:0}).addClass("ui-resizable-ghost").addClass(typeof n.ghost=="string"?n.ghost:""),t.ghost.appendTo(t.helper)},resize:function(){var t=e(this).data("ui-resizable");t.ghost&&t.ghost.css({position:"relative",height:t.size.height,width:t.size.width})},stop:function(){var t=e(this).data("ui-resizable");t.ghost&&t.helper&&t.helper.get(0).removeChild(t.ghost.get(0))}}),e.ui.plugin.add("resizable","grid",{resize:function(){var t=e(this).data("ui-resizable"),n=t.options,r=t.size,i=t.originalSize,s=t.originalPosition,o=t.axis,u=typeof n.grid=="number"?[n.grid,n.grid]:n.grid,a=u[0]||1,f=u[1]||1,l=Math.round((r.width-i.width)/a)*a,c=Math.round((r.height-i.height)/f)*f,h=i.width+l,p=i.height+c,d=n.maxWidth&&n.maxWidth<h,v=n.maxHeight&&n.maxHeight<p,m=n.minWidth&&n.minWidth>h,g=n.minHeight&&n.minHeight>p;n.grid=u,m&&(h+=a),g&&(p+=f),d&&(h-=a),v&&(p-=f),/^(se|s|e)$/.test(o)?(t.size.width=h,t.size.height=p):/^(ne)$/.test(o)?(t.size.width=h,t.size.height=p,t.position.top=s.top-c):/^(sw)$/.test(o)?(t.size.width=h,t.size.height=p,t.position.left=s.left-l):(t.size.width=h,t.size.height=p,t.position.top=s.top-c,t.position.left=s.left-l)}})})(jQuery);(function(e,t){var n,r,i,s,o="ui-button ui-widget ui-state-default ui-corner-all",u="ui-state-hover ui-state-active ",a="ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon-primary ui-button-text-icon-secondary ui-button-text-only",f=function(){var t=e(this).find(":ui-button");setTimeout(function(){t.button("refresh")},1)},l=function(t){var n=t.name,r=t.form,i=e([]);return n&&(n=n.replace(/'/g,"\\'"),r?i=e(r).find("[name='"+n+"']"):i=e("[name='"+n+"']",t.ownerDocument).filter(function(){return!this.form})),i};e.widget("ui.button",{version:"1.10.0",defaultElement:"<button>",options:{disabled:null,text:!0,label:null,icons:{primary:null,secondary:null}},_create:function(){this.element.closest("form").unbind("reset"+this.eventNamespace).bind("reset"+this.eventNamespace,f),typeof this.options.disabled!="boolean"?this.options.disabled=!!this.element.prop("disabled"):this.element.prop("disabled",this.options.disabled),this._determineButtonType(),this.hasTitle=!!this.buttonElement.attr("title");var t=this,u=this.options,a=this.type==="checkbox"||this.type==="radio",c=a?"":"ui-state-active",h="ui-state-focus";u.label===null&&(u.label=this.type==="input"?this.buttonElement.val():this.buttonElement.html()),this._hoverable(this.buttonElement),this.buttonElement.addClass(o).attr("role","button").bind("mouseenter"+this.eventNamespace,function(){if(u.disabled)return;this===n&&e(this).addClass("ui-state-active")}).bind("mouseleave"+this.eventNamespace,function(){if(u.disabled)return;e(this).removeClass(c)}).bind("click"+this.eventNamespace,function(e){u.disabled&&(e.preventDefault(),e.stopImmediatePropagation())}),this.element.bind("focus"+this.eventNamespace,function(){t.buttonElement.addClass(h)}).bind("blur"+this.eventNamespace,function(){t.buttonElement.removeClass(h)}),a&&(this.element.bind("change"+this.eventNamespace,function(){if(s)return;t.refresh()}),this.buttonElement.bind("mousedown"+this.eventNamespace,function(e){if(u.disabled)return;s=!1,r=e.pageX,i=e.pageY}).bind("mouseup"+this.eventNamespace,function(e){if(u.disabled)return;if(r!==e.pageX||i!==e.pageY)s=!0})),this.type==="checkbox"?this.buttonElement.bind("click"+this.eventNamespace,function(){if(u.disabled||s)return!1}):this.type==="radio"?this.buttonElement.bind("click"+this.eventNamespace,function(){if(u.disabled||s)return!1;e(this).addClass("ui-state-active"),t.buttonElement.attr("aria-pressed","true");var n=t.element[0];l(n).not(n).map(function(){return e(this).button("widget")[0]}).removeClass("ui-state-active").attr("aria-pressed","false")}):(this.buttonElement.bind("mousedown"+this.eventNamespace,function(){if(u.disabled)return!1;e(this).addClass("ui-state-active"),n=this,t.document.one("mouseup",function(){n=null})}).bind("mouseup"+this.eventNamespace,function(){if(u.disabled)return!1;e(this).removeClass("ui-state-active")}).bind("keydown"+this.eventNamespace,function(t){if(u.disabled)return!1;(t.keyCode===e.ui.keyCode.SPACE||t.keyCode===e.ui.keyCode.ENTER)&&e(this).addClass("ui-state-active")}).bind("keyup"+this.eventNamespace+" blur"+this.eventNamespace,function(){e(this).removeClass("ui-state-active")}),this.buttonElement.is("a")&&this.buttonElement.keyup(function(t){t.keyCode===e.ui.keyCode.SPACE&&e(this).click()})),this._setOption("disabled",u.disabled),this._resetButton()},_determineButtonType:function(){var e,t,n;this.element.is("[type=checkbox]")?this.type="checkbox":this.element.is("[type=radio]")?this.type="radio":this.element.is("input")?this.type="input":this.type="button",this.type==="checkbox"||this.type==="radio"?(e=this.element.parents().last(),t="label[for='"+this.element.attr("id")+"']",this.buttonElement=e.find(t),this.buttonElement.length||(e=e.length?e.siblings():this.element.siblings(),this.buttonElement=e.filter(t),this.buttonElement.length||(this.buttonElement=e.find(t))),this.element.addClass("ui-helper-hidden-accessible"),n=this.element.is(":checked"),n&&this.buttonElement.addClass("ui-state-active"),this.buttonElement.prop("aria-pressed",n)):this.buttonElement=this.element},widget:function(){return this.buttonElement},_destroy:function(){this.element.removeClass("ui-helper-hidden-accessible"),this.buttonElement.removeClass(o+" "+u+" "+a).removeAttr("role").removeAttr("aria-pressed").html(this.buttonElement.find(".ui-button-text").html()),this.hasTitle||this.buttonElement.removeAttr("title")},_setOption:function(e,t){this._super(e,t);if(e==="disabled"){t?this.element.prop("disabled",!0):this.element.prop("disabled",!1);return}this._resetButton()},refresh:function(){var t=this.element.is("input, button")?this.element.is(":disabled"):this.element.hasClass("ui-button-disabled");t!==this.options.disabled&&this._setOption("disabled",t),this.type==="radio"?l(this.element[0]).each(function(){e(this).is(":checked")?e(this).button("widget").addClass("ui-state-active").attr("aria-pressed","true"):e(this).button("widget").removeClass("ui-state-active").attr("aria-pressed","false")}):this.type==="checkbox"&&(this.element.is(":checked")?this.buttonElement.addClass("ui-state-active").attr("aria-pressed","true"):this.buttonElement.removeClass("ui-state-active").attr("aria-pressed","false"))},_resetButton:function(){if(this.type==="input"){this.options.label&&this.element.val(this.options.label);return}var t=this.buttonElement.removeClass(a),n=e("<span></span>",this.document[0]).addClass("ui-button-text").html(this.options.label).appendTo(t.empty()).text(),r=this.options.icons,i=r.primary&&r.secondary,s=[];r.primary||r.secondary?(this.options.text&&s.push("ui-button-text-icon"+(i?"s":r.primary?"-primary":"-secondary")),r.primary&&t.prepend("<span class='ui-button-icon-primary ui-icon "+r.primary+"'></span>"),r.secondary&&t.append("<span class='ui-button-icon-secondary ui-icon "+r.secondary+"'></span>"),this.options.text||(s.push(i?"ui-button-icons-only":"ui-button-icon-only"),this.hasTitle||t.attr("title",e.trim(n)))):s.push("ui-button-text-only"),t.addClass(s.join(" "))}}),e.widget("ui.buttonset",{version:"1.10.0",options:{items:"button, input[type=button], input[type=submit], input[type=reset], input[type=checkbox], input[type=radio], a, :data(ui-button)"},_create:function(){this.element.addClass("ui-buttonset")},_init:function(){this.refresh()},_setOption:function(e,t){e==="disabled"&&this.buttons.button("option",e,t),this._super(e,t)},refresh:function(){var t=this.element.css("direction")==="rtl";this.buttons=this.element.find(this.options.items).filter(":ui-button").button("refresh").end().not(":ui-button").button().end().map(function(){return e(this).button("widget")[0]}).removeClass("ui-corner-all ui-corner-left ui-corner-right").filter(":first").addClass(t?"ui-corner-right":"ui-corner-left").end().filter(":last").addClass(t?"ui-corner-left":"ui-corner-right").end().end()},_destroy:function(){this.element.removeClass("ui-buttonset"),this.buttons.map(function(){return e(this).button("widget")[0]}).removeClass("ui-corner-left ui-corner-right").end().button("destroy")}})})(jQuery);(function(e,t){function s(){this._curInst=null,this._keyEvent=!1,this._disabledInputs=[],this._datepickerShowing=!1,this._inDialog=!1,this._mainDivId="ui-datepicker-div",this._inlineClass="ui-datepicker-inline",this._appendClass="ui-datepicker-append",this._triggerClass="ui-datepicker-trigger",this._dialogClass="ui-datepicker-dialog",this._disableClass="ui-datepicker-disabled",this._unselectableClass="ui-datepicker-unselectable",this._currentClass="ui-datepicker-current-day",this._dayOverClass="ui-datepicker-days-cell-over",this.regional=[],this.regional[""]={closeText:"Done",prevText:"Prev",nextText:"Next",currentText:"Today",monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayNamesMin:["Su","Mo","Tu","We","Th","Fr","Sa"],weekHeader:"Wk",dateFormat:"mm/dd/yy",firstDay:0,isRTL:!1,showMonthAfterYear:!1,yearSuffix:""},this._defaults={showOn:"focus",showAnim:"fadeIn",showOptions:{},defaultDate:null,appendText:"",buttonText:"...",buttonImage:"",buttonImageOnly:!1,hideIfNoPrevNext:!1,navigationAsDateFormat:!1,gotoCurrent:!1,changeMonth:!1,changeYear:!1,yearRange:"c-10:c+10",showOtherMonths:!1,selectOtherMonths:!1,showWeek:!1,calculateWeek:this.iso8601Week,shortYearCutoff:"+10",minDate:null,maxDate:null,duration:"fast",beforeShowDay:null,beforeShow:null,onSelect:null,onChangeMonthYear:null,onClose:null,numberOfMonths:1,showCurrentAtPos:0,stepMonths:1,stepBigMonths:12,altField:"",altFormat:"",constrainInput:!0,showButtonPanel:!1,autoSize:!1,disabled:!1},e.extend(this._defaults,this.regional[""]),this.dpDiv=o(e("<div id='"+this._mainDivId+"' class='ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"))}function o(t){var n="button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a";return t.delegate(n,"mouseout",function(){e(this).removeClass("ui-state-hover"),this.className.indexOf("ui-datepicker-prev")!==-1&&e(this).removeClass("ui-datepicker-prev-hover"),this.className.indexOf("ui-datepicker-next")!==-1&&e(this).removeClass("ui-datepicker-next-hover")}).delegate(n,"mouseover",function(){e.datepicker._isDisabledDatepicker(i.inline?t.parent()[0]:i.input[0])||(e(this).parents(".ui-datepicker-calendar").find("a").removeClass("ui-state-hover"),e(this).addClass("ui-state-hover"),this.className.indexOf("ui-datepicker-prev")!==-1&&e(this).addClass("ui-datepicker-prev-hover"),this.className.indexOf("ui-datepicker-next")!==-1&&e(this).addClass("ui-datepicker-next-hover"))})}function u(t,n){e.extend(t,n);for(var r in n)n[r]==null&&(t[r]=n[r]);return t}e.extend(e.ui,{datepicker:{version:"1.10.0"}});var n="datepicker",r=(new Date).getTime(),i;e.extend(s.prototype,{markerClassName:"hasDatepicker",maxRows:4,_widgetDatepicker:function(){return this.dpDiv},setDefaults:function(e){return u(this._defaults,e||{}),this},_attachDatepicker:function(t,n){var r,i,s;r=t.nodeName.toLowerCase(),i=r==="div"||r==="span",t.id||(this.uuid+=1,t.id="dp"+this.uuid),s=this._newInst(e(t),i),s.settings=e.extend({},n||{}),r==="input"?this._connectDatepicker(t,s):i&&this._inlineDatepicker(t,s)},_newInst:function(t,n){var r=t[0].id.replace(/([^A-Za-z0-9_\-])/g,"\\\\$1");return{id:r,input:t,selectedDay:0,selectedMonth:0,selectedYear:0,drawMonth:0,drawYear:0,inline:n,dpDiv:n?o(e("<div class='"+this._inlineClass+" ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>")):this.dpDiv}},_connectDatepicker:function(t,r){var i=e(t);r.append=e([]),r.trigger=e([]);if(i.hasClass(this.markerClassName))return;this._attachments(i,r),i.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).keyup(this._doKeyUp),this._autoSize(r),e.data(t,n,r),r.settings.disabled&&this._disableDatepicker(t)},_attachments:function(t,n){var r,i,s,o=this._get(n,"appendText"),u=this._get(n,"isRTL");n.append&&n.append.remove(),o&&(n.append=e("<span class='"+this._appendClass+"'>"+o+"</span>"),t[u?"before":"after"](n.append)),t.unbind("focus",this._showDatepicker),n.trigger&&n.trigger.remove(),r=this._get(n,"showOn"),(r==="focus"||r==="both")&&t.focus(this._showDatepicker);if(r==="button"||r==="both")i=this._get(n,"buttonText"),s=this._get(n,"buttonImage"),n.trigger=e(this._get(n,"buttonImageOnly")?e("<img/>").addClass(this._triggerClass).attr({src:s,alt:i,title:i}):e("<button type='button'></button>").addClass(this._triggerClass).html(s?e("<img/>").attr({src:s,alt:i,title:i}):i)),t[u?"before":"after"](n.trigger),n.trigger.click(function(){return e.datepicker._datepickerShowing&&e.datepicker._lastInput===t[0]?e.datepicker._hideDatepicker():e.datepicker._datepickerShowing&&e.datepicker._lastInput!==t[0]?(e.datepicker._hideDatepicker(),e.datepicker._showDatepicker(t[0])):e.datepicker._showDatepicker(t[0]),!1})},_autoSize:function(e){if(this._get(e,"autoSize")&&!e.inline){var t,n,r,i,s=new Date(2009,11,20),o=this._get(e,"dateFormat");o.match(/[DM]/)&&(t=function(e){n=0,r=0;for(i=0;i<e.length;i++)e[i].length>n&&(n=e[i].length,r=i);return r},s.setMonth(t(this._get(e,o.match(/MM/)?"monthNames":"monthNamesShort"))),s.setDate(t(this._get(e,o.match(/DD/)?"dayNames":"dayNamesShort"))+20-s.getDay())),e.input.attr("size",this._formatDate(e,s).length)}},_inlineDatepicker:function(t,r){var i=e(t);if(i.hasClass(this.markerClassName))return;i.addClass(this.markerClassName).append(r.dpDiv),e.data(t,n,r),this._setDate(r,this._getDefaultDate(r),!0),this._updateDatepicker(r),this._updateAlternate(r),r.settings.disabled&&this._disableDatepicker(t),r.dpDiv.css("display","block")},_dialogDatepicker:function(t,r,i,s,o){var a,f,l,c,h,p=this._dialogInst;return p||(this.uuid+=1,a="dp"+this.uuid,this._dialogInput=e("<input type='text' id='"+a+"' style='position: absolute; top: -100px; width: 0px;'/>"),this._dialogInput.keydown(this._doKeyDown),e("body").append(this._dialogInput),p=this._dialogInst=this._newInst(this._dialogInput,!1),p.settings={},e.data(this._dialogInput[0],n,p)),u(p.settings,s||{}),r=r&&r.constructor===Date?this._formatDate(p,r):r,this._dialogInput.val(r),this._pos=o?o.length?o:[o.pageX,o.pageY]:null,this._pos||(f=document.documentElement.clientWidth,l=document.documentElement.clientHeight,c=document.documentElement.scrollLeft||document.body.scrollLeft,h=document.documentElement.scrollTop||document.body.scrollTop,this._pos=[f/2-100+c,l/2-150+h]),this._dialogInput.css("left",this._pos[0]+20+"px").css("top",this._pos[1]+"px"),p.settings.onSelect=i,this._inDialog=!0,this.dpDiv.addClass(this._dialogClass),this._showDatepicker(this._dialogInput[0]),e.blockUI&&e.blockUI(this.dpDiv),e.data(this._dialogInput[0],n,p),this},_destroyDatepicker:function(t){var r,i=e(t),s=e.data(t,n);if(!i.hasClass(this.markerClassName))return;r=t.nodeName.toLowerCase(),e.removeData(t,n),r==="input"?(s.append.remove(),s.trigger.remove(),i.removeClass(this.markerClassName).unbind("focus",this._showDatepicker).unbind("keydown",this._doKeyDown).unbind("keypress",this._doKeyPress).unbind("keyup",this._doKeyUp)):(r==="div"||r==="span")&&i.removeClass(this.markerClassName).empty()},_enableDatepicker:function(t){var r,i,s=e(t),o=e.data(t,n);if(!s.hasClass(this.markerClassName))return;r=t.nodeName.toLowerCase();if(r==="input")t.disabled=!1,o.trigger.filter("button").each(function(){this.disabled=!1}).end().filter("img").css({opacity:"1.0",cursor:""});else if(r==="div"||r==="span")i=s.children("."+this._inlineClass),i.children().removeClass("ui-state-disabled"),i.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!1);this._disabledInputs=e.map(this._disabledInputs,function(e){return e===t?null:e})},_disableDatepicker:function(t){var r,i,s=e(t),o=e.data(t,n);if(!s.hasClass(this.markerClassName))return;r=t.nodeName.toLowerCase();if(r==="input")t.disabled=!0,o.trigger.filter("button").each(function(){this.disabled=!0}).end().filter("img").css({opacity:"0.5",cursor:"default"});else if(r==="div"||r==="span")i=s.children("."+this._inlineClass),i.children().addClass("ui-state-disabled"),i.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!0);this._disabledInputs=e.map(this._disabledInputs,function(e){return e===t?null:e}),this._disabledInputs[this._disabledInputs.length]=t},_isDisabledDatepicker:function(e){if(!e)return!1;for(var t=0;t<this._disabledInputs.length;t++)if(this._disabledInputs[t]===e)return!0;return!1},_getInst:function(t){try{return e.data(t,n)}catch(r){throw"Missing instance data for this datepicker"}},_optionDatepicker:function(n,r,i){var s,o,a,f,l=this._getInst(n);if(arguments.length===2&&typeof r=="string")return r==="defaults"?e.extend({},e.datepicker._defaults):l?r==="all"?e.extend({},l.settings):this._get(l,r):null;s=r||{},typeof r=="string"&&(s={},s[r]=i),l&&(this._curInst===l&&this._hideDatepicker(),o=this._getDateDatepicker(n,!0),a=this._getMinMaxDate(l,"min"),f=this._getMinMaxDate(l,"max"),u(l.settings,s),a!==null&&s.dateFormat!==t&&s.minDate===t&&(l.settings.minDate=this._formatDate(l,a)),f!==null&&s.dateFormat!==t&&s.maxDate===t&&(l.settings.maxDate=this._formatDate(l,f)),"disabled"in s&&(s.disabled?this._disableDatepicker(n):this._enableDatepicker(n)),this._attachments(e(n),l),this._autoSize(l),this._setDate(l,o),this._updateAlternate(l),this._updateDatepicker(l))},_changeDatepicker:function(e,t,n){this._optionDatepicker(e,t,n)},_refreshDatepicker:function(e){var t=this._getInst(e);t&&this._updateDatepicker(t)},_setDateDatepicker:function(e,t){var n=this._getInst(e);n&&(this._setDate(n,t),this._updateDatepicker(n),this._updateAlternate(n))},_getDateDatepicker:function(e,t){var n=this._getInst(e);return n&&!n.inline&&this._setDateFromField(n,t),n?this._getDate(n):null},_doKeyDown:function(t){var n,r,i,s=e.datepicker._getInst(t.target),o=!0,u=s.dpDiv.is(".ui-datepicker-rtl");s._keyEvent=!0;if(e.datepicker._datepickerShowing)switch(t.keyCode){case 9:e.datepicker._hideDatepicker(),o=!1;break;case 13:return i=e("td."+e.datepicker._dayOverClass+":not(."+e.datepicker._currentClass+")",s.dpDiv),i[0]&&e.datepicker._selectDay(t.target,s.selectedMonth,s.selectedYear,i[0]),n=e.datepicker._get(s,"onSelect"),n?(r=e.datepicker._formatDate(s),n.apply(s.input?s.input[0]:null,[r,s])):e.datepicker._hideDatepicker(),!1;case 27:e.datepicker._hideDatepicker();break;case 33:e.datepicker._adjustDate(t.target,t.ctrlKey?-e.datepicker._get(s,"stepBigMonths"):-e.datepicker._get(s,"stepMonths"),"M");break;case 34:e.datepicker._adjustDate(t.target,t.ctrlKey?+e.datepicker._get(s,"stepBigMonths"):+e.datepicker._get(s,"stepMonths"),"M");break;case 35:(t.ctrlKey||t.metaKey)&&e.datepicker._clearDate(t.target),o=t.ctrlKey||t.metaKey;break;case 36:(t.ctrlKey||t.metaKey)&&e.datepicker._gotoToday(t.target),o=t.ctrlKey||t.metaKey;break;case 37:(t.ctrlKey||t.metaKey)&&e.datepicker._adjustDate(t.target,u?1:-1,"D"),o=t.ctrlKey||t.metaKey,t.originalEvent.altKey&&e.datepicker._adjustDate(t.target,t.ctrlKey?-e.datepicker._get(s,"stepBigMonths"):-e.datepicker._get(s,"stepMonths"),"M");break;case 38:(t.ctrlKey||t.metaKey)&&e.datepicker._adjustDate(t.target,-7,"D"),o=t.ctrlKey||t.metaKey;break;case 39:(t.ctrlKey||t.metaKey)&&e.datepicker._adjustDate(t.target,u?-1:1,"D"),o=t.ctrlKey||t.metaKey,t.originalEvent.altKey&&e.datepicker._adjustDate(t.target,t.ctrlKey?+e.datepicker._get(s,"stepBigMonths"):+e.datepicker._get(s,"stepMonths"),"M");break;case 40:(t.ctrlKey||t.metaKey)&&e.datepicker._adjustDate(t.target,7,"D"),o=t.ctrlKey||t.metaKey;break;default:o=!1}else t.keyCode===36&&t.ctrlKey?e.datepicker._showDatepicker(this):o=!1;o&&(t.preventDefault(),t.stopPropagation())},_doKeyPress:function(t){var n,r,i=e.datepicker._getInst(t.target);if(e.datepicker._get(i,"constrainInput"))return n=e.datepicker._possibleChars(e.datepicker._get(i,"dateFormat")),r=String.fromCharCode(t.charCode==null?t.keyCode:t.charCode),t.ctrlKey||t.metaKey||r<" "||!n||n.indexOf(r)>-1},_doKeyUp:function(t){var n,r=e.datepicker._getInst(t.target);if(r.input.val()!==r.lastVal)try{n=e.datepicker.parseDate(e.datepicker._get(r,"dateFormat"),r.input?r.input.val():null,e.datepicker._getFormatConfig(r)),n&&(e.datepicker._setDateFromField(r),e.datepicker._updateAlternate(r),e.datepicker._updateDatepicker(r))}catch(i){}return!0},_showDatepicker:function(t){t=t.target||t,t.nodeName.toLowerCase()!=="input"&&(t=e("input",t.parentNode)[0]);if(e.datepicker._isDisabledDatepicker(t)||e.datepicker._lastInput===t)return;var n,r,i,s,o,a,f;n=e.datepicker._getInst(t),e.datepicker._curInst&&e.datepicker._curInst!==n&&(e.datepicker._curInst.dpDiv.stop(!0,!0),n&&e.datepicker._datepickerShowing&&e.datepicker._hideDatepicker(e.datepicker._curInst.input[0])),r=e.datepicker._get(n,"beforeShow"),i=r?r.apply(t,[t,n]):{};if(i===!1)return;u(n.settings,i),n.lastVal=null,e.datepicker._lastInput=t,e.datepicker._setDateFromField(n),e.datepicker._inDialog&&(t.value=""),e.datepicker._pos||(e.datepicker._pos=e.datepicker._findPos(t),e.datepicker._pos[1]+=t.offsetHeight),s=!1,e(t).parents().each(function(){return s|=e(this).css("position")==="fixed",!s}),o={left:e.datepicker._pos[0],top:e.datepicker._pos[1]},e.datepicker._pos=null,n.dpDiv.empty(),n.dpDiv.css({position:"absolute",display:"block",top:"-1000px"}),e.datepicker._updateDatepicker(n),o=e.datepicker._checkOffset(n,o,s),n.dpDiv.css({position:e.datepicker._inDialog&&e.blockUI?"static":s?"fixed":"absolute",display:"none",left:o.left+"px",top:o.top+"px"}),n.inline||(a=e.datepicker._get(n,"showAnim"),f=e.datepicker._get(n,"duration"),n.dpDiv.zIndex(e(t).zIndex()+1),e.datepicker._datepickerShowing=!0,e.effects&&e.effects.effect[a]?n.dpDiv.show(a,e.datepicker._get(n,"showOptions"),f):n.dpDiv[a||"show"](a?f:null),n.input.is(":visible")&&!n.input.is(":disabled")&&n.input.focus(),e.datepicker._curInst=n)},_updateDatepicker:function(t){this.maxRows=4,i=t,t.dpDiv.empty().append(this._generateHTML(t)),this._attachHandlers(t),t.dpDiv.find("."+this._dayOverClass+" a").mouseover();var n,r=this._getNumberOfMonths(t),s=r[1],o=17;t.dpDiv.removeClass("ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4").width(""),s>1&&t.dpDiv.addClass("ui-datepicker-multi-"+s).css("width",o*s+"em"),t.dpDiv[(r[0]!==1||r[1]!==1?"add":"remove")+"Class"]("ui-datepicker-multi"),t.dpDiv[(this._get(t,"isRTL")?"add":"remove")+"Class"]("ui-datepicker-rtl"),t===e.datepicker._curInst&&e.datepicker._datepickerShowing&&t.input&&t.input.is(":visible")&&!t.input.is(":disabled")&&t.input[0]!==document.activeElement&&t.input.focus(),t.yearshtml&&(n=t.yearshtml,setTimeout(function(){n===t.yearshtml&&t.yearshtml&&t.dpDiv.find("select.ui-datepicker-year:first").replaceWith(t.yearshtml),n=t.yearshtml=null},0))},_getBorders:function(e){var t=function(e){return{thin:1,medium:2,thick:3}[e]||e};return[parseFloat(t(e.css("border-left-width"))),parseFloat(t(e.css("border-top-width")))]},_checkOffset:function(t,n,r){var i=t.dpDiv.outerWidth(),s=t.dpDiv.outerHeight(),o=t.input?t.input.outerWidth():0,u=t.input?t.input.outerHeight():0,a=document.documentElement.clientWidth+(r?0:e(document).scrollLeft()),f=document.documentElement.clientHeight+(r?0:e(document).scrollTop());return n.left-=this._get(t,"isRTL")?i-o:0,n.left-=r&&n.left===t.input.offset().left?e(document).scrollLeft():0,n.top-=r&&n.top===t.input.offset().top+u?e(document).scrollTop():0,n.left-=Math.min(n.left,n.left+i>a&&a>i?Math.abs(n.left+i-a):0),n.top-=Math.min(n.top,n.top+s>f&&f>s?Math.abs(s+u):0),n},_findPos:function(t){var n,r=this._getInst(t),i=this._get(r,"isRTL");while(t&&(t.type==="hidden"||t.nodeType!==1||e.expr.filters.hidden(t)))t=t[i?"previousSibling":"nextSibling"];return n=e(t).offset(),[n.left,n.top]},_hideDatepicker:function(t){var r,i,s,o,u=this._curInst;if(!u||t&&u!==e.data(t,n))return;this._datepickerShowing&&(r=this._get(u,"showAnim"),i=this._get(u,"duration"),s=function(){e.datepicker._tidyDialog(u)},e.effects&&(e.effects.effect[r]||e.effects[r])?u.dpDiv.hide(r,e.datepicker._get(u,"showOptions"),i,s):u.dpDiv[r==="slideDown"?"slideUp":r==="fadeIn"?"fadeOut":"hide"](r?i:null,s),r||s(),this._datepickerShowing=!1,o=this._get(u,"onClose"),o&&o.apply(u.input?u.input[0]:null,[u.input?u.input.val():"",u]),this._lastInput=null,this._inDialog&&(this._dialogInput.css({position:"absolute",left:"0",top:"-100px"}),e.blockUI&&(e.unblockUI(),e("body").append(this.dpDiv))),this._inDialog=!1)},_tidyDialog:function(e){e.dpDiv.removeClass(this._dialogClass).unbind(".ui-datepicker-calendar")},_checkExternalClick:function(t){if(!e.datepicker._curInst)return;var n=e(t.target),r=e.datepicker._getInst(n[0]);(n[0].id!==e.datepicker._mainDivId&&n.parents("#"+e.datepicker._mainDivId).length===0&&!n.hasClass(e.datepicker.markerClassName)&&!n.closest("."+e.datepicker._triggerClass).length&&e.datepicker._datepickerShowing&&(!e.datepicker._inDialog||!e.blockUI)||n.hasClass(e.datepicker.markerClassName)&&e.datepicker._curInst!==r)&&e.datepicker._hideDatepicker()},_adjustDate:function(t,n,r){var i=e(t),s=this._getInst(i[0]);if(this._isDisabledDatepicker(i[0]))return;this._adjustInstDate(s,n+(r==="M"?this._get(s,"showCurrentAtPos"):0),r),this._updateDatepicker(s)},_gotoToday:function(t){var n,r=e(t),i=this._getInst(r[0]);this._get(i,"gotoCurrent")&&i.currentDay?(i.selectedDay=i.currentDay,i.drawMonth=i.selectedMonth=i.currentMonth,i.drawYear=i.selectedYear=i.currentYear):(n=new Date,i.selectedDay=n.getDate(),i.drawMonth=i.selectedMonth=n.getMonth(),i.drawYear=i.selectedYear=n.getFullYear()),this._notifyChange(i),this._adjustDate(r)},_selectMonthYear:function(t,n,r){var i=e(t),s=this._getInst(i[0]);s["selected"+(r==="M"?"Month":"Year")]=s["draw"+(r==="M"?"Month":"Year")]=parseInt(n.options[n.selectedIndex].value,10),this._notifyChange(s),this._adjustDate(i)},_selectDay:function(t,n,r,i){var s,o=e(t);if(e(i).hasClass(this._unselectableClass)||this._isDisabledDatepicker(o[0]))return;s=this._getInst(o[0]),s.selectedDay=s.currentDay=e("a",i).html(),s.selectedMonth=s.currentMonth=n,s.selectedYear=s.currentYear=r,this._selectDate(t,this._formatDate(s,s.currentDay,s.currentMonth,s.currentYear))},_clearDate:function(t){var n=e(t);this._selectDate(n,"")},_selectDate:function(t,n){var r,i=e(t),s=this._getInst(i[0]);n=n!=null?n:this._formatDate(s),s.input&&s.input.val(n),this._updateAlternate(s),r=this._get(s,"onSelect"),r?r.apply(s.input?s.input[0]:null,[n,s]):s.input&&s.input.trigger("change"),s.inline?this._updateDatepicker(s):(this._hideDatepicker(),this._lastInput=s.input[0],typeof s.input[0]!="object"&&s.input.focus(),this._lastInput=null)},_updateAlternate:function(t){var n,r,i,s=this._get(t,"altField");s&&(n=this._get(t,"altFormat")||this._get(t,"dateFormat"),r=this._getDate(t),i=this.formatDate(n,r,this._getFormatConfig(t)),e(s).each(function(){e(this).val(i)}))},noWeekends:function(e){var t=e.getDay();return[t>0&&t<6,""]},iso8601Week:function(e){var t,n=new Date(e.getTime());return n.setDate(n.getDate()+4-(n.getDay()||7)),t=n.getTime(),n.setMonth(0),n.setDate(1),Math.floor(Math.round((t-n)/864e5)/7)+1},parseDate:function(t,n,r){if(t==null||n==null)throw"Invalid arguments";n=typeof n=="object"?n.toString():n+"";if(n==="")return null;var i,s,o,u=0,a=(r?r.shortYearCutoff:null)||this._defaults.shortYearCutoff,f=typeof a!="string"?a:(new Date).getFullYear()%100+parseInt(a,10),l=(r?r.dayNamesShort:null)||this._defaults.dayNamesShort,c=(r?r.dayNames:null)||this._defaults.dayNames,h=(r?r.monthNamesShort:null)||this._defaults.monthNamesShort,p=(r?r.monthNames:null)||this._defaults.monthNames,d=-1,v=-1,m=-1,g=-1,y=!1,b,w=function(e){var n=i+1<t.length&&t.charAt(i+1)===e;return n&&i++,n},E=function(e){var t=w(e),r=e==="@"?14:e==="!"?20:e==="y"&&t?4:e==="o"?3:2,i=new RegExp("^\\d{1,"+r+"}"),s=n.substring(u).match(i);if(!s)throw"Missing number at position "+u;return u+=s[0].length,parseInt(s[0],10)},S=function(t,r,i){var s=-1,o=e.map(w(t)?i:r,function(e,t){return[[t,e]]}).sort(function(e,t){return-(e[1].length-t[1].length)});e.each(o,function(e,t){var r=t[1];if(n.substr(u,r.length).toLowerCase()===r.toLowerCase())return s=t[0],u+=r.length,!1});if(s!==-1)return s+1;throw"Unknown name at position "+u},x=function(){if(n.charAt(u)!==t.charAt(i))throw"Unexpected literal at position "+u;u++};for(i=0;i<t.length;i++)if(y)t.charAt(i)==="'"&&!w("'")?y=!1:x();else switch(t.charAt(i)){case"d":m=E("d");break;case"D":S("D",l,c);break;case"o":g=E("o");break;case"m":v=E("m");break;case"M":v=S("M",h,p);break;case"y":d=E("y");break;case"@":b=new Date(E("@")),d=b.getFullYear(),v=b.getMonth()+1,m=b.getDate();break;case"!":b=new Date((E("!")-this._ticksTo1970)/1e4),d=b.getFullYear(),v=b.getMonth()+1,m=b.getDate();break;case"'":w("'")?x():y=!0;break;default:x()}if(u<n.length){o=n.substr(u);if(!/^\s+/.test(o))throw"Extra/unparsed characters found in date: "+o}d===-1?d=(new Date).getFullYear():d<100&&(d+=(new Date).getFullYear()-(new Date).getFullYear()%100+(d<=f?0:-100));if(g>-1){v=1,m=g;do{s=this._getDaysInMonth(d,v-1);if(m<=s)break;v++,m-=s}while(!0)}b=this._daylightSavingAdjust(new Date(d,v-1,m));if(b.getFullYear()!==d||b.getMonth()+1!==v||b.getDate()!==m)throw"Invalid date";return b},ATOM:"yy-mm-dd",COOKIE:"D, dd M yy",ISO_8601:"yy-mm-dd",RFC_822:"D, d M y",RFC_850:"DD, dd-M-y",RFC_1036:"D, d M y",RFC_1123:"D, d M yy",RFC_2822:"D, d M yy",RSS:"D, d M y",TICKS:"!",TIMESTAMP:"@",W3C:"yy-mm-dd",_ticksTo1970:(718685+Math.floor(492.5)-Math.floor(19.7)+Math.floor(4.925))*24*60*60*1e7,formatDate:function(e,t,n){if(!t)return"";var r,i=(n?n.dayNamesShort:null)||this._defaults.dayNamesShort,s=(n?n.dayNames:null)||this._defaults.dayNames,o=(n?n.monthNamesShort:null)||this._defaults.monthNamesShort,u=(n?n.monthNames:null)||this._defaults.monthNames,a=function(t){var n=r+1<e.length&&e.charAt(r+1)===t;return n&&r++,n},f=function(e,t,n){var r=""+t;if(a(e))while(r.length<n)r="0"+r;return r},l=function(e,t,n,r){return a(e)?r[t]:n[t]},c="",h=!1;if(t)for(r=0;r<e.length;r++)if(h)e.charAt(r)==="'"&&!a("'")?h=!1:c+=e.charAt(r);else switch(e.charAt(r)){case"d":c+=f("d",t.getDate(),2);break;case"D":c+=l("D",t.getDay(),i,s);break;case"o":c+=f("o",Math.round(((new Date(t.getFullYear(),t.getMonth(),t.getDate())).getTime()-(new Date(t.getFullYear(),0,0)).getTime())/864e5),3);break;case"m":c+=f("m",t.getMonth()+1,2);break;case"M":c+=l("M",t.getMonth(),o,u);break;case"y":c+=a("y")?t.getFullYear():(t.getYear()%100<10?"0":"")+t.getYear()%100;break;case"@":c+=t.getTime();break;case"!":c+=t.getTime()*1e4+this._ticksTo1970;break;case"'":a("'")?c+="'":h=!0;break;default:c+=e.charAt(r)}return c},_possibleChars:function(e){var t,n="",r=!1,i=function(n){var r=t+1<e.length&&e.charAt(t+1)===n;return r&&t++,r};for(t=0;t<e.length;t++)if(r)e.charAt(t)==="'"&&!i("'")?r=!1:n+=e.charAt(t);else switch(e.charAt(t)){case"d":case"m":case"y":case"@":n+="0123456789";break;case"D":case"M":return null;case"'":i("'")?n+="'":r=!0;break;default:n+=e.charAt(t)}return n},_get:function(e,n){return e.settings[n]!==t?e.settings[n]:this._defaults[n]},_setDateFromField:function(e,t){if(e.input.val()===e.lastVal)return;var n=this._get(e,"dateFormat"),r=e.lastVal=e.input?e.input.val():null,i=this._getDefaultDate(e),s=i,o=this._getFormatConfig(e);try{s=this.parseDate(n,r,o)||i}catch(u){r=t?"":r}e.selectedDay=s.getDate(),e.drawMonth=e.selectedMonth=s.getMonth(),e.drawYear=e.selectedYear=s.getFullYear(),e.currentDay=r?s.getDate():0,e.currentMonth=r?s.getMonth():0,e.currentYear=r?s.getFullYear():0,this._adjustInstDate(e)},_getDefaultDate:function(e){return this._restrictMinMax(e,this._determineDate(e,this._get(e,"defaultDate"),new Date))},_determineDate:function(t,n,r){var i=function(e){var t=new Date;return t.setDate(t.getDate()+e),t},s=function(n){try{return e.datepicker.parseDate(e.datepicker._get(t,"dateFormat"),n,e.datepicker._getFormatConfig(t))}catch(r){}var i=(n.toLowerCase().match(/^c/)?e.datepicker._getDate(t):null)||new Date,s=i.getFullYear(),o=i.getMonth(),u=i.getDate(),a=/([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g,f=a.exec(n);while(f){switch(f[2]||"d"){case"d":case"D":u+=parseInt(f[1],10);break;case"w":case"W":u+=parseInt(f[1],10)*7;break;case"m":case"M":o+=parseInt(f[1],10),u=Math.min(u,e.datepicker._getDaysInMonth(s,o));break;case"y":case"Y":s+=parseInt(f[1],10),u=Math.min(u,e.datepicker._getDaysInMonth(s,o))}f=a.exec(n)}return new Date(s,o,u)},o=n==null||n===""?r:typeof n=="string"?s(n):typeof n=="number"?isNaN(n)?r:i(n):new Date(n.getTime());return o=o&&o.toString()==="Invalid Date"?r:o,o&&(o.setHours(0),o.setMinutes(0),o.setSeconds(0),o.setMilliseconds(0)),this._daylightSavingAdjust(o)},_daylightSavingAdjust:function(e){return e?(e.setHours(e.getHours()>12?e.getHours()+2:0),e):null},_setDate:function(e,t,n){var r=!t,i=e.selectedMonth,s=e.selectedYear,o=this._restrictMinMax(e,this._determineDate(e,t,new Date));e.selectedDay=e.currentDay=o.getDate(),e.drawMonth=e.selectedMonth=e.currentMonth=o.getMonth(),e.drawYear=e.selectedYear=e.currentYear=o.getFullYear(),(i!==e.selectedMonth||s!==e.selectedYear)&&!n&&this._notifyChange(e),this._adjustInstDate(e),e.input&&e.input.val(r?"":this._formatDate(e))},_getDate:function(e){var t=!e.currentYear||e.input&&e.input.val()===""?null:this._daylightSavingAdjust(new Date(e.currentYear,e.currentMonth,e.currentDay));return t},_attachHandlers:function(t){var n=this._get(t,"stepMonths"),i="#"+t.id.replace(/\\\\/g,"\\");t.dpDiv.find("[data-handler]").map(function(){var t={prev:function(){window["DP_jQuery_"+r].datepicker._adjustDate(i,-n,"M")},next:function(){window["DP_jQuery_"+r].datepicker._adjustDate(i,+n,"M")},hide:function(){window["DP_jQuery_"+r].datepicker._hideDatepicker()},today:function(){window["DP_jQuery_"+r].datepicker._gotoToday(i)},selectDay:function(){return window["DP_jQuery_"+r].datepicker._selectDay(i,+this.getAttribute("data-month"),+this.getAttribute("data-year"),this),!1},selectMonth:function(){return window["DP_jQuery_"+r].datepicker._selectMonthYear(i,this,"M"),!1},selectYear:function(){return window["DP_jQuery_"+r].datepicker._selectMonthYear(i,this,"Y"),!1}};e(this).bind(this.getAttribute("data-event"),t[this.getAttribute("data-handler")])})},_generateHTML:function(e){var t,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N,C,k,L,A,O,M,_,D,P,H,B,j,F,I,q=new Date,R=this._daylightSavingAdjust(new Date(q.getFullYear(),q.getMonth(),q.getDate())),U=this._get(e,"isRTL"),z=this._get(e,"showButtonPanel"),W=this._get(e,"hideIfNoPrevNext"),X=this._get(e,"navigationAsDateFormat"),V=this._getNumberOfMonths(e),$=this._get(e,"showCurrentAtPos"),J=this._get(e,"stepMonths"),K=V[0]!==1||V[1]!==1,Q=this._daylightSavingAdjust(e.currentDay?new Date(e.currentYear,e.currentMonth,e.currentDay):new Date(9999,9,9)),G=this._getMinMaxDate(e,"min"),Y=this._getMinMaxDate(e,"max"),Z=e.drawMonth-$,et=e.drawYear;Z<0&&(Z+=12,et--);if(Y){t=this._daylightSavingAdjust(new Date(Y.getFullYear(),Y.getMonth()-V[0]*V[1]+1,Y.getDate())),t=G&&t<G?G:t;while(this._daylightSavingAdjust(new Date(et,Z,1))>t)Z--,Z<0&&(Z=11,et--)}e.drawMonth=Z,e.drawYear=et,n=this._get(e,"prevText"),n=X?this.formatDate(n,this._daylightSavingAdjust(new Date(et,Z-J,1)),this._getFormatConfig(e)):n,r=this._canAdjustMonth(e,-1,et,Z)?"<a class='ui-datepicker-prev ui-corner-all' data-handler='prev' data-event='click' title='"+n+"'><span class='ui-icon ui-icon-circle-triangle-"+(U?"e":"w")+"'>"+n+"</span></a>":W?"":"<a class='ui-datepicker-prev ui-corner-all ui-state-disabled' title='"+n+"'><span class='ui-icon ui-icon-circle-triangle-"+(U?"e":"w")+"'>"+n+"</span></a>",i=this._get(e,"nextText"),i=X?this.formatDate(i,this._daylightSavingAdjust(new Date(et,Z+J,1)),this._getFormatConfig(e)):i,s=this._canAdjustMonth(e,1,et,Z)?"<a class='ui-datepicker-next ui-corner-all' data-handler='next' data-event='click' title='"+i+"'><span class='ui-icon ui-icon-circle-triangle-"+(U?"w":"e")+"'>"+i+"</span></a>":W?"":"<a class='ui-datepicker-next ui-corner-all ui-state-disabled' title='"+i+"'><span class='ui-icon ui-icon-circle-triangle-"+(U?"w":"e")+"'>"+i+"</span></a>",o=this._get(e,"currentText"),u=this._get(e,"gotoCurrent")&&e.currentDay?Q:R,o=X?this.formatDate(o,u,this._getFormatConfig(e)):o,a=e.inline?"":"<button type='button' class='ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all' data-handler='hide' data-event='click'>"+this._get(e,"closeText")+"</button>",f=z?"<div class='ui-datepicker-buttonpane ui-widget-content'>"+(U?a:"")+(this._isInRange(e,u)?"<button type='button' class='ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all' data-handler='today' data-event='click'>"+o+"</button>":"")+(U?"":a)+"</div>":"",l=parseInt(this._get(e,"firstDay"),10),l=isNaN(l)?0:l,c=this._get(e,"showWeek"),h=this._get(e,"dayNames"),p=this._get(e,"dayNamesMin"),d=this._get(e,"monthNames"),v=this._get(e,"monthNamesShort"),m=this._get(e,"beforeShowDay"),g=this._get(e,"showOtherMonths"),y=this._get(e,"selectOtherMonths"),b=this._getDefaultDate(e),w="",E;for(S=0;S<V[0];S++){x="",this.maxRows=4;for(T=0;T<V[1];T++){N=this._daylightSavingAdjust(new Date(et,Z,e.selectedDay)),C=" ui-corner-all",k="";if(K){k+="<div class='ui-datepicker-group";if(V[1]>1)switch(T){case 0:k+=" ui-datepicker-group-first",C=" ui-corner-"+(U?"right":"left");break;case V[1]-1:k+=" ui-datepicker-group-last",C=" ui-corner-"+(U?"left":"right");break;default:k+=" ui-datepicker-group-middle",C=""}k+="'>"}k+="<div class='ui-datepicker-header ui-widget-header ui-helper-clearfix"+C+"'>"+(/all|left/.test(C)&&S===0?U?s:r:"")+(/all|right/.test(C)&&S===0?U?r:s:"")+this._generateMonthYearHeader(e,Z,et,G,Y,S>0||T>0,d,v)+"</div><table class='ui-datepicker-calendar'><thead>"+"<tr>",L=c?"<th class='ui-datepicker-week-col'>"+this._get(e,"weekHeader")+"</th>":"";for(E=0;E<7;E++)A=(E+l)%7,L+="<th"+((E+l+6)%7>=5?" class='ui-datepicker-week-end'":"")+">"+"<span title='"+h[A]+"'>"+p[A]+"</span></th>";k+=L+"</tr></thead><tbody>",O=this._getDaysInMonth(et,Z),et===e.selectedYear&&Z===e.selectedMonth&&(e.selectedDay=Math.min(e.selectedDay,O)),M=(this._getFirstDayOfMonth(et,Z)-l+7)%7,_=Math.ceil((M+O)/7),D=K?this.maxRows>_?this.maxRows:_:_,this.maxRows=D,P=this._daylightSavingAdjust(new Date(et,Z,1-M));for(H=0;H<D;H++){k+="<tr>",B=c?"<td class='ui-datepicker-week-col'>"+this._get(e,"calculateWeek")(P)+"</td>":"";for(E=0;E<7;E++)j=m?m.apply(e.input?e.input[0]:null,[P]):[!0,""],F=P.getMonth()!==Z,I=F&&!y||!j[0]||G&&P<G||Y&&P>Y,B+="<td class='"+((E+l+6)%7>=5?" ui-datepicker-week-end":"")+(F?" ui-datepicker-other-month":"")+(P.getTime()===N.getTime()&&Z===e.selectedMonth&&e._keyEvent||b.getTime()===P.getTime()&&b.getTime()===N.getTime()?" "+this._dayOverClass:"")+(I?" "+this._unselectableClass+" ui-state-disabled":"")+(F&&!g?"":" "+j[1]+(P.getTime()===Q.getTime()?" "+this._currentClass:"")+(P.getTime()===R.getTime()?" ui-datepicker-today":""))+"'"+((!F||g)&&j[2]?" title='"+j[2]+"'":"")+(I?"":" data-handler='selectDay' data-event='click' data-month='"+P.getMonth()+"' data-year='"+P.getFullYear()+"'")+">"+(F&&!g?"&#xa0;":I?"<span class='ui-state-default'>"+P.getDate()+"</span>":"<a class='ui-state-default"+(P.getTime()===R.getTime()?" ui-state-highlight":"")+(P.getTime()===Q.getTime()?" ui-state-active":"")+(F?" ui-priority-secondary":"")+"' href='#'>"+P.getDate()+"</a>")+"</td>",P.setDate(P.getDate()+1),P=this._daylightSavingAdjust(P);k+=B+"</tr>"}Z++,Z>11&&(Z=0,et++),k+="</tbody></table>"+(K?"</div>"+(V[0]>0&&T===V[1]-1?"<div class='ui-datepicker-row-break'></div>":""):""),x+=k}w+=x}return w+=f,e._keyEvent=!1,w},_generateMonthYearHeader:function(e,t,n,r,i,s,o,u){var a,f,l,c,h,p,d,v,m=this._get(e,"changeMonth"),g=this._get(e,"changeYear"),y=this._get(e,"showMonthAfterYear"),b="<div class='ui-datepicker-title'>",w="";if(s||!m)w+="<span class='ui-datepicker-month'>"+o[t]+"</span>";else{a=r&&r.getFullYear()===n,f=i&&i.getFullYear()===n,w+="<select class='ui-datepicker-month' data-handler='selectMonth' data-event='change'>";for(l=0;l<12;l++)(!a||l>=r.getMonth())&&(!f||l<=i.getMonth())&&(w+="<option value='"+l+"'"+(l===t?" selected='selected'":"")+">"+u[l]+"</option>");w+="</select>"}y||(b+=w+(s||!m||!g?"&#xa0;":""));if(!e.yearshtml){e.yearshtml="";if(s||!g)b+="<span class='ui-datepicker-year'>"+n+"</span>";else{c=this._get(e,"yearRange").split(":"),h=(new Date).getFullYear(),p=function(e){var t=e.match(/c[+\-].*/)?n+parseInt(e.substring(1),10):e.match(/[+\-].*/)?h+parseInt(e,10):parseInt(e,10);return isNaN(t)?h:t},d=p(c[0]),v=Math.max(d,p(c[1]||"")),d=r?Math.max(d,r.getFullYear()):d,v=i?Math.min(v,i.getFullYear()):v,e.yearshtml+="<select class='ui-datepicker-year' data-handler='selectYear' data-event='change'>";for(;d<=v;d++)e.yearshtml+="<option value='"+d+"'"+(d===n?" selected='selected'":"")+">"+d+"</option>";e.yearshtml+="</select>",b+=e.yearshtml,e.yearshtml=null}}return b+=this._get(e,"yearSuffix"),y&&(b+=(s||!m||!g?"&#xa0;":"")+w),b+="</div>",b},_adjustInstDate:function(e,t,n){var r=e.drawYear+(n==="Y"?t:0),i=e.drawMonth+(n==="M"?t:0),s=Math.min(e.selectedDay,this._getDaysInMonth(r,i))+(n==="D"?t:0),o=this._restrictMinMax(e,this._daylightSavingAdjust(new Date(r,i,s)));e.selectedDay=o.getDate(),e.drawMonth=e.selectedMonth=o.getMonth(),e.drawYear=e.selectedYear=o.getFullYear(),(n==="M"||n==="Y")&&this._notifyChange(e)},_restrictMinMax:function(e,t){var n=this._getMinMaxDate(e,"min"),r=this._getMinMaxDate(e,"max"),i=n&&t<n?n:t;return r&&i>r?r:i},_notifyChange:function(e){var t=this._get(e,"onChangeMonthYear");t&&t.apply(e.input?e.input[0]:null,[e.selectedYear,e.selectedMonth+1,e])},_getNumberOfMonths:function(e){var t=this._get(e,"numberOfMonths");return t==null?[1,1]:typeof t=="number"?[1,t]:t},_getMinMaxDate:function(e,t){return this._determineDate(e,this._get(e,t+"Date"),null)},_getDaysInMonth:function(e,t){return 32-this._daylightSavingAdjust(new Date(e,t,32)).getDate()},_getFirstDayOfMonth:function(e,t){return(new Date(e,t,1)).getDay()},_canAdjustMonth:function(e,t,n,r){var i=this._getNumberOfMonths(e),s=this._daylightSavingAdjust(new Date(n,r+(t<0?t:i[0]*i[1]),1));return t<0&&s.setDate(this._getDaysInMonth(s.getFullYear(),s.getMonth())),this._isInRange(e,s)},_isInRange:function(e,t){var n,r,i=this._getMinMaxDate(e,"min"),s=this._getMinMaxDate(e,"max"),o=null,u=null,a=this._get(e,"yearRange");return a&&(n=a.split(":"),r=(new Date).getFullYear(),o=parseInt(n[0],10)+r,u=parseInt(n[1],10)+r),(!i||t.getTime()>=i.getTime())&&(!s||t.getTime()<=s.getTime())&&(!o||t.getFullYear()>=o)&&(!u||t.getFullYear()<=u)},_getFormatConfig:function(e){var t=this._get(e,"shortYearCutoff");return t=typeof t!="string"?t:(new Date).getFullYear()%100+parseInt(t,10),{shortYearCutoff:t,dayNamesShort:this._get(e,"dayNamesShort"),dayNames:this._get(e,"dayNames"),monthNamesShort:this._get(e,"monthNamesShort"),monthNames:this._get(e,"monthNames")}},_formatDate:function(e,t,n,r){t||(e.currentDay=e.selectedDay,e.currentMonth=e.selectedMonth,e.currentYear=e.selectedYear);var i=t?typeof t=="object"?t:this._daylightSavingAdjust(new Date(r,n,t)):this._daylightSavingAdjust(new Date(e.currentYear,e.currentMonth,e.currentDay));return this.formatDate(this._get(e,"dateFormat"),i,this._getFormatConfig(e))}}),e.fn.datepicker=function(t){if(!this.length)return this;e.datepicker.initialized||(e(document).mousedown(e.datepicker._checkExternalClick),e.datepicker.initialized=!0),e("#"+e.datepicker._mainDivId).length===0&&e("body").append(e.datepicker.dpDiv);var n=Array.prototype.slice.call(arguments,1);return typeof t!="string"||t!=="isDisabled"&&t!=="getDate"&&t!=="widget"?t==="option"&&arguments.length===2&&typeof arguments[1]=="string"?e.datepicker["_"+t+"Datepicker"].apply(e.datepicker,[this[0]].concat(n)):this.each(function(){typeof t=="string"?e.datepicker["_"+t+"Datepicker"].apply(e.datepicker,[this].concat(n)):e.datepicker._attachDatepicker(this,t)}):e.datepicker["_"+t+"Datepicker"].apply(e.datepicker,[this[0]].concat(n))},e.datepicker=new s,e.datepicker.initialized=!1,e.datepicker.uuid=(new Date).getTime(),e.datepicker.version="1.10.0",window["DP_jQuery_"+r]=e})(jQuery);(function(e,t){var n={buttons:!0,height:!0,maxHeight:!0,maxWidth:!0,minHeight:!0,minWidth:!0,width:!0},r={maxHeight:!0,maxWidth:!0,minHeight:!0,minWidth:!0};e.widget("ui.dialog",{version:"1.10.0",options:{appendTo:"body",autoOpen:!0,buttons:[],closeOnEscape:!0,closeText:"close",dialogClass:"",draggable:!0,hide:null,height:"auto",maxHeight:null,maxWidth:null,minHeight:150,minWidth:150,modal:!1,position:{my:"center",at:"center",of:window,collision:"fit",using:function(t){var n=e(this).css(t).offset().top;n<0&&e(this).css("top",t.top-n)}},resizable:!0,show:null,title:null,width:300,beforeClose:null,close:null,drag:null,dragStart:null,dragStop:null,focus:null,open:null,resize:null,resizeStart:null,resizeStop:null},_create:function(){this.originalCss={display:this.element[0].style.display,width:this.element[0].style.width,minHeight:this.element[0].style.minHeight,maxHeight:this.element[0].style.maxHeight,height:this.element[0].style.height},this.originalPosition={parent:this.element.parent(),index:this.element.parent().children().index(this.element)},this.originalTitle=this.element.attr("title"),this.options.title=this.options.title||this.originalTitle,this._createWrapper(),this.element.show().removeAttr("title").addClass("ui-dialog-content ui-widget-content").appendTo(this.uiDialog),this._createTitlebar(),this._createButtonPane(),this.options.draggable&&e.fn.draggable&&this._makeDraggable(),this.options.resizable&&e.fn.resizable&&this._makeResizable(),this._isOpen=!1},_init:function(){this.options.autoOpen&&this.open()},_appendTo:function(){var t=this.options.appendTo;return t&&(t.jquery||t.nodeType)?e(t):this.document.find(t||"body").eq(0)},_destroy:function(){var e,t=this.originalPosition;this._destroyOverlay(),this.element.removeUniqueId().removeClass("ui-dialog-content ui-widget-content").css(this.originalCss).detach(),this.uiDialog.stop(!0,!0).remove(),this.originalTitle&&this.element.attr("title",this.originalTitle),e=t.parent.children().eq(t.index),e.length&&e[0]!==this.element[0]?e.before(this.element):t.parent.append(this.element)},widget:function(){return this.uiDialog},disable:e.noop,enable:e.noop,close:function(t){var n=this;if(!this._isOpen||this._trigger("beforeClose",t)===!1)return;this._isOpen=!1,this._destroyOverlay(),this.opener.filter(":focusable").focus().length||e(this.document[0].activeElement).blur(),this._hide(this.uiDialog,this.options.hide,function(){n._trigger("close",t)})},isOpen:function(){return this._isOpen},moveToTop:function(){this._moveToTop()},_moveToTop:function(e,t){var n=!!this.uiDialog.nextAll(":visible").insertBefore(this.uiDialog).length;return n&&!t&&this._trigger("focus",e),n},open:function(){if(this._isOpen){this._moveToTop()&&this._focusTabbable();return}this.opener=e(this.document[0].activeElement),this._size(),this._position(),this._createOverlay(),this._moveToTop(null,!0),this._show(this.uiDialog,this.options.show),this._focusTabbable(),this._isOpen=!0,this._trigger("open"),this._trigger("focus")},_focusTabbable:function(){var e=this.element.find("[autofocus]");e.length||(e=this.element.find(":tabbable")),e.length||(e=this.uiDialogButtonPane.find(":tabbable")),e.length||(e=this.uiDialogTitlebarClose.filter(":tabbable")),e.length||(e=this.uiDialog),e.eq(0).focus()},_keepFocus:function(t){function n(){var t=this.document[0].activeElement,n=this.uiDialog[0]===t||e.contains(this.uiDialog[0],t);n||this._focusTabbable()}t.preventDefault(),n.call(this),this._delay(n)},_createWrapper:function(){this.uiDialog=e("<div>").addClass("ui-dialog ui-widget ui-widget-content ui-corner-all ui-front "+this.options.dialogClass).hide().attr({tabIndex:-1,role:"dialog"}).appendTo(this._appendTo()),this._on(this.uiDialog,{keydown:function(t){if(this.options.closeOnEscape&&!t.isDefaultPrevented()&&t.keyCode&&t.keyCode===e.ui.keyCode.ESCAPE){t.preventDefault(),this.close(t);return}if(t.keyCode!==e.ui.keyCode.TAB)return;var n=this.uiDialog.find(":tabbable"),r=n.filter(":first"),i=n.filter(":last");t.target!==i[0]&&t.target!==this.uiDialog[0]||!!t.shiftKey?(t.target===r[0]||t.target===this.uiDialog[0])&&t.shiftKey&&(i.focus(1),t.preventDefault()):(r.focus(1),t.preventDefault())},mousedown:function(e){this._moveToTop(e)&&this._focusTabbable()}}),this.element.find("[aria-describedby]").length||this.uiDialog.attr({"aria-describedby":this.element.uniqueId().attr("id")})},_createTitlebar:function(){var t;this.uiDialogTitlebar=e("<div>").addClass("ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix").prependTo(this.uiDialog),this._on(this.uiDialogTitlebar,{mousedown:function(t){e(t.target).closest(".ui-dialog-titlebar-close")||this.uiDialog.focus()}}),this.uiDialogTitlebarClose=e("<button></button>").button({label:this.options.closeText,icons:{primary:"ui-icon-closethick"},text:!1}).addClass("ui-dialog-titlebar-close").appendTo(this.uiDialogTitlebar),this._on(this.uiDialogTitlebarClose,{click:function(e){e.preventDefault(),this.close(e)}}),t=e("<span>").uniqueId().addClass("ui-dialog-title").prependTo(this.uiDialogTitlebar),this._title(t),this.uiDialog.attr({"aria-labelledby":t.attr("id")})},_title:function(e){this.options.title||e.html("&#160;"),e.text(this.options.title)},_createButtonPane:function(){this.uiDialogButtonPane=e("<div>").addClass("ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"),this.uiButtonSet=e("<div>").addClass("ui-dialog-buttonset").appendTo(this.uiDialogButtonPane),this._createButtons()},_createButtons:function(){var t=this,n=this.options.buttons;this.uiDialogButtonPane.remove(),this.uiButtonSet.empty();if(e.isEmptyObject(n)){this.uiDialog.removeClass("ui-dialog-buttons");return}e.each(n,function(n,r){var i,s;r=e.isFunction(r)?{click:r,text:n}:r,r=e.extend({type:"button"},r),i=r.click,r.click=function(){i.apply(t.element[0],arguments)},s={icons:r.icons,text:r.showText},delete r.icons,delete r.showText,e("<button></button>",r).button(s).appendTo(t.uiButtonSet)}),this.uiDialog.addClass("ui-dialog-buttons"),this.uiDialogButtonPane.appendTo(this.uiDialog)},_makeDraggable:function(){function r(e){return{position:e.position,offset:e.offset}}var t=this,n=this.options;this.uiDialog.draggable({cancel:".ui-dialog-content, .ui-dialog-titlebar-close",handle:".ui-dialog-titlebar",containment:"document",start:function(n,i){e(this).addClass("ui-dialog-dragging"),t._trigger("dragStart",n,r(i))},drag:function(e,n){t._trigger("drag",e,r(n))},stop:function(i,s){n.position=[s.position.left-t.document.scrollLeft(),s.position.top-t.document.scrollTop()],e(this).removeClass("ui-dialog-dragging"),t._trigger("dragStop",i,r(s))}})},_makeResizable:function(){function o(e){return{originalPosition:e.originalPosition,originalSize:e.originalSize,position:e.position,size:e.size}}var t=this,n=this.options,r=n.resizable,i=this.uiDialog.css("position"),s=typeof r=="string"?r:"n,e,s,w,se,sw,ne,nw";this.uiDialog.resizable({cancel:".ui-dialog-content",containment:"document",alsoResize:this.element,maxWidth:n.maxWidth,maxHeight:n.maxHeight,minWidth:n.minWidth,minHeight:this._minHeight(),handles:s,start:function(n,r){e(this).addClass("ui-dialog-resizing"),t._trigger("resizeStart",n,o(r))},resize:function(e,n){t._trigger("resize",e,o(n))},stop:function(r,i){n.height=e(this).height(),n.width=e(this).width(),e(this).removeClass("ui-dialog-resizing"),t._trigger("resizeStop",r,o(i))}}).css("position",i)},_minHeight:function(){var e=this.options;return e.height==="auto"?e.minHeight:Math.min(e.minHeight,e.height)},_position:function(){var e=this.uiDialog.is(":visible");e||this.uiDialog.show(),this.uiDialog.position(this.options.position),e||this.uiDialog.hide()},_setOptions:function(t){var i=this,s=!1,o={};e.each(t,function(e,t){i._setOption(e,t),e in n&&(s=!0),e in r&&(o[e]=t)}),s&&(this._size(),this._position()),this.uiDialog.is(":data(ui-resizable)")&&this.uiDialog.resizable("option",o)},_setOption:function(e,t){var n,r,i=this.uiDialog;e==="dialogClass"&&i.removeClass(this.options.dialogClass).addClass(t);if(e==="disabled")return;this._super(e,t),e==="appendTo"&&this.uiDialog.appendTo(this._appendTo()),e==="buttons"&&this._createButtons(),e==="closeText"&&this.uiDialogTitlebarClose.button({label:""+t}),e==="draggable"&&(n=i.is(":data(ui-draggable)"),n&&!t&&i.draggable("destroy"),!n&&t&&this._makeDraggable()),e==="position"&&this._position(),e==="resizable"&&(r=i.is(":data(ui-resizable)"),r&&!t&&i.resizable("destroy"),r&&typeof t=="string"&&i.resizable("option","handles",t),!r&&t!==!1&&this._makeResizable()),e==="title"&&this._title(this.uiDialogTitlebar.find(".ui-dialog-title"))},_size:function(){var e,t,n,r=this.options;this.element.show().css({width:"auto",minHeight:0,maxHeight:"none",height:0}),r.minWidth>r.width&&(r.width=r.minWidth),e=this.uiDialog.css({height:"auto",width:r.width}).outerHeight(),t=Math.max(0,r.minHeight-e),n=typeof r.maxHeight=="number"?Math.max(0,r.maxHeight-e):"none",r.height==="auto"?this.element.css({minHeight:t,maxHeight:n,height:"auto"}):this.element.height(Math.max(0,r.height-e)),this.uiDialog.is(":data(ui-resizable)")&&this.uiDialog.resizable("option","minHeight",this._minHeight())},_createOverlay:function(){if(!this.options.modal)return;e.ui.dialog.overlayInstances||this._delay(function(){e.ui.dialog.overlayInstances&&this._on(this.document,{focusin:function(t){e(t.target).closest(".ui-dialog").length||(t.preventDefault(),e(".ui-dialog:visible:last .ui-dialog-content").data("ui-dialog")._focusTabbable())}})}),this.overlay=e("<div>").addClass("ui-widget-overlay ui-front").appendTo(this.document[0].body),this._on(this.overlay,{mousedown:"_keepFocus"}),e.ui.dialog.overlayInstances++},_destroyOverlay:function(){if(!this.options.modal)return;e.ui.dialog.overlayInstances--,e.ui.dialog.overlayInstances||this._off(this.document,"focusin"),this.overlay.remove()}}),e.ui.dialog.overlayInstances=0,e.uiBackCompat!==!1&&e.widget("ui.dialog",e.ui.dialog,{_position:function(){var t=this.options.position,n=[],r=[0,0],i;if(t){if(typeof t=="string"||typeof t=="object"&&"0"in t)n=t.split?t.split(" "):[t[0],t[1]],n.length===1&&(n[1]=n[0]),e.each(["left","top"],function(e,t){+n[e]===n[e]&&(r[e]=n[e],n[e]=t)}),t={my:n[0]+(r[0]<0?r[0]:"+"+r[0])+" "+n[1]+(r[1]<0?r[1]:"+"+r[1]),at:n.join(" ")};t=e.extend({},e.ui.dialog.prototype.options.position,t)}else t=e.ui.dialog.prototype.options.position;i=this.uiDialog.is(":visible"),i||this.uiDialog.show(),this.uiDialog.position(t),i||this.uiDialog.hide()}})})(jQuery);jQuery.effects||function(e,t){var n="ui-effects-";e.effects={effect:{}},function(e,t){function h(e,t,n){var r=u[t.type]||{};return e==null?n||!t.def?null:t.def:(e=r.floor?~~e:parseFloat(e),isNaN(e)?t.def:r.mod?(e+r.mod)%r.mod:0>e?0:r.max<e?r.max:e)}function p(t){var n=s(),r=n._rgba=[];return t=t.toLowerCase(),c(i,function(e,i){var s,u=i.re.exec(t),a=u&&i.parse(u),f=i.space||"rgba";if(a)return s=n[f](a),n[o[f].cache]=s[o[f].cache],r=n._rgba=s._rgba,!1}),r.length?(r.join()==="0,0,0,0"&&e.extend(r,l.transparent),n):l[t]}function d(e,t,n){return n=(n+1)%1,n*6<1?e+(t-e)*n*6:n*2<1?t:n*3<2?e+(t-e)*(2/3-n)*6:e}var n="backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color columnRuleColor outlineColor textDecorationColor textEmphasisColor",r=/^([\-+])=\s*(\d+\.?\d*)/,i=[{re:/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,parse:function(e){return[e[1],e[2],e[3],e[4]]}},{re:/rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,parse:function(e){return[e[1]*2.55,e[2]*2.55,e[3]*2.55,e[4]]}},{re:/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,parse:function(e){return[parseInt(e[1],16),parseInt(e[2],16),parseInt(e[3],16)]}},{re:/#([a-f0-9])([a-f0-9])([a-f0-9])/,parse:function(e){return[parseInt(e[1]+e[1],16),parseInt(e[2]+e[2],16),parseInt(e[3]+e[3],16)]}},{re:/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,space:"hsla",parse:function(e){return[e[1],e[2]/100,e[3]/100,e[4]]}}],s=e.Color=function(t,n,r,i){return new e.Color.fn.parse(t,n,r,i)},o={rgba:{props:{red:{idx:0,type:"byte"},green:{idx:1,type:"byte"},blue:{idx:2,type:"byte"}}},hsla:{props:{hue:{idx:0,type:"degrees"},saturation:{idx:1,type:"percent"},lightness:{idx:2,type:"percent"}}}},u={"byte":{floor:!0,max:255},percent:{max:1},degrees:{mod:360,floor:!0}},a=s.support={},f=e("<p>")[0],l,c=e.each;f.style.cssText="background-color:rgba(1,1,1,.5)",a.rgba=f.style.backgroundColor.indexOf("rgba")>-1,c(o,function(e,t){t.cache="_"+e,t.props.alpha={idx:3,type:"percent",def:1}}),s.fn=e.extend(s.prototype,{parse:function(n,r,i,u){if(n===t)return this._rgba=[null,null,null,null],this;if(n.jquery||n.nodeType)n=e(n).css(r),r=t;var a=this,f=e.type(n),d=this._rgba=[];r!==t&&(n=[n,r,i,u],f="array");if(f==="string")return this.parse(p(n)||l._default);if(f==="array")return c(o.rgba.props,function(e,t){d[t.idx]=h(n[t.idx],t)}),this;if(f==="object")return n instanceof s?c(o,function(e,t){n[t.cache]&&(a[t.cache]=n[t.cache].slice())}):c(o,function(t,r){var i=r.cache;c(r.props,function(e,t){if(!a[i]&&r.to){if(e==="alpha"||n[e]==null)return;a[i]=r.to(a._rgba)}a[i][t.idx]=h(n[e],t,!0)}),a[i]&&e.inArray(null,a[i].slice(0,3))<0&&(a[i][3]=1,r.from&&(a._rgba=r.from(a[i])))}),this},is:function(e){var t=s(e),n=!0,r=this;return c(o,function(e,i){var s,o=t[i.cache];return o&&(s=r[i.cache]||i.to&&i.to(r._rgba)||[],c(i.props,function(e,t){if(o[t.idx]!=null)return n=o[t.idx]===s[t.idx],n})),n}),n},_space:function(){var e=[],t=this;return c(o,function(n,r){t[r.cache]&&e.push(n)}),e.pop()},transition:function(e,t){var n=s(e),r=n._space(),i=o[r],a=this.alpha()===0?s("transparent"):this,f=a[i.cache]||i.to(a._rgba),l=f.slice();return n=n[i.cache],c(i.props,function(e,r){var i=r.idx,s=f[i],o=n[i],a=u[r.type]||{};if(o===null)return;s===null?l[i]=o:(a.mod&&(o-s>a.mod/2?s+=a.mod:s-o>a.mod/2&&(s-=a.mod)),l[i]=h((o-s)*t+s,r))}),this[r](l)},blend:function(t){if(this._rgba[3]===1)return this;var n=this._rgba.slice(),r=n.pop(),i=s(t)._rgba;return s(e.map(n,function(e,t){return(1-r)*i[t]+r*e}))},toRgbaString:function(){var t="rgba(",n=e.map(this._rgba,function(e,t){return e==null?t>2?1:0:e});return n[3]===1&&(n.pop(),t="rgb("),t+n.join()+")"},toHslaString:function(){var t="hsla(",n=e.map(this.hsla(),function(e,t){return e==null&&(e=t>2?1:0),t&&t<3&&(e=Math.round(e*100)+"%"),e});return n[3]===1&&(n.pop(),t="hsl("),t+n.join()+")"},toHexString:function(t){var n=this._rgba.slice(),r=n.pop();return t&&n.push(~~(r*255)),"#"+e.map(n,function(e){return e=(e||0).toString(16),e.length===1?"0"+e:e}).join("")},toString:function(){return this._rgba[3]===0?"transparent":this.toRgbaString()}}),s.fn.parse.prototype=s.fn,o.hsla.to=function(e){if(e[0]==null||e[1]==null||e[2]==null)return[null,null,null,e[3]];var t=e[0]/255,n=e[1]/255,r=e[2]/255,i=e[3],s=Math.max(t,n,r),o=Math.min(t,n,r),u=s-o,a=s+o,f=a*.5,l,c;return o===s?l=0:t===s?l=60*(n-r)/u+360:n===s?l=60*(r-t)/u+120:l=60*(t-n)/u+240,u===0?c=0:f<=.5?c=u/a:c=u/(2-a),[Math.round(l)%360,c,f,i==null?1:i]},o.hsla.from=function(e){if(e[0]==null||e[1]==null||e[2]==null)return[null,null,null,e[3]];var t=e[0]/360,n=e[1],r=e[2],i=e[3],s=r<=.5?r*(1+n):r+n-r*n,o=2*r-s;return[Math.round(d(o,s,t+1/3)*255),Math.round(d(o,s,t)*255),Math.round(d(o,s,t-1/3)*255),i]},c(o,function(n,i){var o=i.props,u=i.cache,a=i.to,f=i.from;s.fn[n]=function(n){a&&!this[u]&&(this[u]=a(this._rgba));if(n===t)return this[u].slice();var r,i=e.type(n),l=i==="array"||i==="object"?n:arguments,p=this[u].slice();return c(o,function(e,t){var n=l[i==="object"?e:t.idx];n==null&&(n=p[t.idx]),p[t.idx]=h(n,t)}),f?(r=s(f(p)),r[u]=p,r):s(p)},c(o,function(t,i){if(s.fn[t])return;s.fn[t]=function(s){var o=e.type(s),u=t==="alpha"?this._hsla?"hsla":"rgba":n,a=this[u](),f=a[i.idx],l;return o==="undefined"?f:(o==="function"&&(s=s.call(this,f),o=e.type(s)),s==null&&i.empty?this:(o==="string"&&(l=r.exec(s),l&&(s=f+parseFloat(l[2])*(l[1]==="+"?1:-1))),a[i.idx]=s,this[u](a)))}})}),s.hook=function(t){var n=t.split(" ");c(n,function(t,n){e.cssHooks[n]={set:function(t,r){var i,o,u="";if(r!=="transparent"&&(e.type(r)!=="string"||(i=p(r)))){r=s(i||r);if(!a.rgba&&r._rgba[3]!==1){o=n==="backgroundColor"?t.parentNode:t;while((u===""||u==="transparent")&&o&&o.style)try{u=e.css(o,"backgroundColor"),o=o.parentNode}catch(f){}r=r.blend(u&&u!=="transparent"?u:"_default")}r=r.toRgbaString()}try{t.style[n]=r}catch(f){}}},e.fx.step[n]=function(t){t.colorInit||(t.start=s(t.elem,n),t.end=s(t.end),t.colorInit=!0),e.cssHooks[n].set(t.elem,t.start.transition(t.end,t.pos))}})},s.hook(n),e.cssHooks.borderColor={expand:function(e){var t={};return c(["Top","Right","Bottom","Left"],function(n,r){t["border"+r+"Color"]=e}),t}},l=e.Color.names={aqua:"#00ffff",black:"#000000",blue:"#0000ff",fuchsia:"#ff00ff",gray:"#808080",green:"#008000",lime:"#00ff00",maroon:"#800000",navy:"#000080",olive:"#808000",purple:"#800080",red:"#ff0000",silver:"#c0c0c0",teal:"#008080",white:"#ffffff",yellow:"#ffff00",transparent:[null,null,null,0],_default:"#ffffff"}}(jQuery),function(){function i(t){var n,r,i=t.ownerDocument.defaultView?t.ownerDocument.defaultView.getComputedStyle(t,null):t.currentStyle,s={};if(i&&i.length&&i[0]&&i[i[0]]){r=i.length;while(r--)n=i[r],typeof i[n]=="string"&&(s[e.camelCase(n)]=i[n])}else for(n in i)typeof i[n]=="string"&&(s[n]=i[n]);return s}function s(t,n){var i={},s,o;for(s in n)o=n[s],t[s]!==o&&!r[s]&&(e.fx.step[s]||!isNaN(parseFloat(o)))&&(i[s]=o);return i}var n=["add","remove","toggle"],r={border:1,borderBottom:1,borderColor:1,borderLeft:1,borderRight:1,borderTop:1,borderWidth:1,margin:1,padding:1};e.each(["borderLeftStyle","borderRightStyle","borderBottomStyle","borderTopStyle"],function(t,n){e.fx.step[n]=function(e){if(e.end!=="none"&&!e.setAttr||e.pos===1&&!e.setAttr)jQuery.style(e.elem,n,e.end),e.setAttr=!0}}),e.fn.addBack||(e.fn.addBack=function(e){return this.add(e==null?this.prevObject:this.prevObject.filter(e))}),e.effects.animateClass=function(t,r,o,u){var a=e.speed(r,o,u);return this.queue(function(){var r=e(this),o=r.attr("class")||"",u,f=a.children?r.find("*").addBack():r;f=f.map(function(){var t=e(this);return{el:t,start:i(this)}}),u=function(){e.each(n,function(e,n){t[n]&&r[n+"Class"](t[n])})},u(),f=f.map(function(){return this.end=i(this.el[0]),this.diff=s(this.start,this.end),this}),r.attr("class",o),f=f.map(function(){var t=this,n=e.Deferred(),r=e.extend({},a,{queue:!1,complete:function(){n.resolve(t)}});return this.el.animate(this.diff,r),n.promise()}),e.when.apply(e,f.get()).done(function(){u(),e.each(arguments,function(){var t=this.el;e.each(this.diff,function(e){t.css(e,"")})}),a.complete.call(r[0])})})},e.fn.extend({_addClass:e.fn.addClass,addClass:function(t,n,r,i){return n?e.effects.animateClass.call(this,{add:t},n,r,i):this._addClass(t)},_removeClass:e.fn.removeClass,removeClass:function(t,n,r,i){return n?e.effects.animateClass.call(this,{remove:t},n,r,i):this._removeClass(t)},_toggleClass:e.fn.toggleClass,toggleClass:function(n,r,i,s,o){return typeof r=="boolean"||r===t?i?e.effects.animateClass.call(this,r?{add:n}:{remove:n},i,s,o):this._toggleClass(n,r):e.effects.animateClass.call(this,{toggle:n},r,i,s)},switchClass:function(t,n,r,i,s){return e.effects.animateClass.call(this,{add:n,remove:t},r,i,s)}})}(),function(){function r(t,n,r,i){e.isPlainObject(t)&&(n=t,t=t.effect),t={effect:t},n==null&&(n={}),e.isFunction(n)&&(i=n,r=null,n={});if(typeof n=="number"||e.fx.speeds[n])i=r,r=n,n={};return e.isFunction(r)&&(i=r,r=null),n&&e.extend(t,n),r=r||n.duration,t.duration=e.fx.off?0:typeof r=="number"?r:r in e.fx.speeds?e.fx.speeds[r]:e.fx.speeds._default,t.complete=i||n.complete,t}function i(t){return!t||typeof t=="number"||e.fx.speeds[t]?!0:typeof t=="string"&&!e.effects.effect[t]}e.extend(e.effects,{version:"1.10.0",save:function(e,t){for(var r=0;r<t.length;r++)t[r]!==null&&e.data(n+t[r],e[0].style[t[r]])},restore:function(e,r){var i,s;for(s=0;s<r.length;s++)r[s]!==null&&(i=e.data(n+r[s]),i===t&&(i=""),e.css(r[s],i))},setMode:function(e,t){return t==="toggle"&&(t=e.is(":hidden")?"show":"hide"),t},getBaseline:function(e,t){var n,r;switch(e[0]){case"top":n=0;break;case"middle":n=.5;break;case"bottom":n=1;break;default:n=e[0]/t.height}switch(e[1]){case"left":r=0;break;case"center":r=.5;break;case"right":r=1;break;default:r=e[1]/t.width}return{x:r,y:n}},createWrapper:function(t){if(t.parent().is(".ui-effects-wrapper"))return t.parent();var n={width:t.outerWidth(!0),height:t.outerHeight(!0),"float":t.css("float")},r=e("<div></div>").addClass("ui-effects-wrapper").css({fontSize:"100%",background:"transparent",border:"none",margin:0,padding:0}),i={width:t.width(),height:t.height()},s=document.activeElement;try{s.id}catch(o){s=document.body}return t.wrap(r),(t[0]===s||e.contains(t[0],s))&&e(s).focus(),r=t.parent(),t.css("position")==="static"?(r.css({position:"relative"}),t.css({position:"relative"})):(e.extend(n,{position:t.css("position"),zIndex:t.css("z-index")}),e.each(["top","left","bottom","right"],function(e,r){n[r]=t.css(r),isNaN(parseInt(n[r],10))&&(n[r]="auto")}),t.css({position:"relative",top:0,left:0,right:"auto",bottom:"auto"})),t.css(i),r.css(n).show()},removeWrapper:function(t){var n=document.activeElement;return t.parent().is(".ui-effects-wrapper")&&(t.parent().replaceWith(t),(t[0]===n||e.contains(t[0],n))&&e(n).focus()),t},setTransition:function(t,n,r,i){return i=i||{},e.each(n,function(e,n){var s=t.cssUnit(n);s[0]>0&&(i[n]=s[0]*r+s[1])}),i}}),e.fn.extend({effect:function(){function o(n){function u(){e.isFunction(i)&&i.call(r[0]),e.isFunction(n)&&n()}var r=e(this),i=t.complete,o=t.mode;(r.is(":hidden")?o==="hide":o==="show")?u():s.call(r[0],t,u)}var t=r.apply(this,arguments),n=t.mode,i=t.queue,s=e.effects.effect[t.effect];return e.fx.off||!s?n?this[n](t.duration,t.complete):this.each(function(){t.complete&&t.complete.call(this)}):i===!1?this.each(o):this.queue(i||"fx",o)},_show:e.fn.show,show:function(e){if(i(e))return this._show.apply(this,arguments);var t=r.apply(this,arguments);return t.mode="show",this.effect.call(this,t)},_hide:e.fn.hide,hide:function(e){if(i(e))return this._hide.apply(this,arguments);var t=r.apply(this,arguments);return t.mode="hide",this.effect.call(this,t)},__toggle:e.fn.toggle,toggle:function(t){if(i(t)||typeof t=="boolean"||e.isFunction(t))return this.__toggle.apply(this,arguments);var n=r.apply(this,arguments);return n.mode="toggle",this.effect.call(this,n)},cssUnit:function(t){var n=this.css(t),r=[];return e.each(["em","px","%","pt"],function(e,t){n.indexOf(t)>0&&(r=[parseFloat(n),t])}),r}})}(),function(){var t={};e.each(["Quad","Cubic","Quart","Quint","Expo"],function(e,n){t[n]=function(t){return Math.pow(t,e+2)}}),e.extend(t,{Sine:function(e){return 1-Math.cos(e*Math.PI/2)},Circ:function(e){return 1-Math.sqrt(1-e*e)},Elastic:function(e){return e===0||e===1?e:-Math.pow(2,8*(e-1))*Math.sin(((e-1)*80-7.5)*Math.PI/15)},Back:function(e){return e*e*(3*e-2)},Bounce:function(e){var t,n=4;while(e<((t=Math.pow(2,--n))-1)/11);return 1/Math.pow(4,3-n)-7.5625*Math.pow((t*3-2)/22-e,2)}}),e.each(t,function(t,n){e.easing["easeIn"+t]=n,e.easing["easeOut"+t]=function(e){return 1-n(1-e)},e.easing["easeInOut"+t]=function(e){return e<.5?n(e*2)/2:1-n(e*-2+2)/2}})}()}(jQuery);(function(e,t){e.effects.effect.fade=function(t,n){var r=e(this),i=e.effects.setMode(r,t.mode||"toggle");r.animate({opacity:i},{queue:!1,duration:t.duration,easing:t.easing,complete:n})}})(jQuery);


$.ui.dialog.prototype._oldinit = $.ui.dialog.prototype._init;
$.ui.dialog.prototype._init = function() {
  $(this.element).parent().css('position', 'fixed');
  $(this.element).dialog("option",{
    resizeStop: function(event,ui) {
      var position = [(Math.floor(ui.position.left) - $(window).scrollLeft()),
        (Math.floor(ui.position.top) - $(window).scrollTop())];
      $(event.target).parent().css('position', 'fixed');
      // $(event.target).parent().dialog('option','position',position);
      // removed parent() according to hai's comment (I didn't test it)
      $(event.target).dialog('option','position',position);
      return true;
    }
  });
  this._oldinit();
};function finder_targetting_onchange(ele) {
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
  $('.finder_results').text('');

  var symbol = $('#tFe0-symbol').val();
  var currentPrice = $('#tFe0-curPrice').val();
  var targetting = $('#finder_priceDirection').val()
  var priceFrom = $('#tFe1_input_price-from').val();
  var priceTo = $('#tFe1_input_price-to').val();
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
    budgetCost: sell ? '' : budgetCost,
    dataFormat: 'v2',
    strategies: strategies,
    sell: sell
  }

  $.getJSON(OP_FINDER_ENDPOINT, payload, function(d) { finder_find_return(d, { sell: sell } ); } );
  $finderSubmit.attr('disabled', 'disabled');
  $finderSubmit.val('Finding...');

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
    'graph-rangeAuto': '1',
    'graph-type': 'roiRisk',
    'graph-date': '(today)'
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
    { tabId: data.tabId }
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
  $finderSubmit.val('Find options');

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
