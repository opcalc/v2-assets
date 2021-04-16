function finder_targetting_onchange(ele) {
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
    'debit-spread': $('#finder-strat-debit-spread').attr('checked') === 'checked',
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
    $('#finder-strat-option-purchase').attr('checked', purchChecked === '1' ? 'checked' : false).attr('disabled', false).parent().removeClass('disabled');
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
  finder_getDateFromExpiry();
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
