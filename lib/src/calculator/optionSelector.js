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
      addMsg('Options not found for that symbol.', 'verbose');
      //alert('Options not found for that symbol.');

    }else if (!data.showSelect){
      // !!! it might just still be a-comin' back... should we wait, or shoot another request... if we do two then optionSelect could get triggered twice
      getOptions({showSelect:true, eleId:data.eleId, defaultType:data.defaultType, uEleId: data.uEleId});
      $(opEle).dialog('open');
      opEle.html(loadingHtml);
    }

  }else{
    addMsg('Enter an underlying symbol in the "Symbol" field above before trying to select options');
  }

  return false;
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

function getMonthsOptions_return(reqData, returnData){
  var monthCode = '';
  var optionsCode = '';

  var uPrice = $('#'+reqData.uEleId+'-curPrice').val();
  var oType = $('#'+reqData.eleId+'-opType').val();
  var oAct = $('#'+reqData.eleId+'-act').val();

  delete(opCache[reqData.stock][reqData.month]);

  var firstMonth = true;
  var dateStr;
  var monthYmd;
  var monthCodeArr = [];

  var opDates = [];
  for (var tDate in returnData['options'])
    opDates.push(tDate);

  opDates.sort();

  for(var i = 0; i < opDates.length; i++){
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
