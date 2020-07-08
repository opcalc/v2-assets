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

function finder_find() {
  const $finderSubmit = $('#tF_submit');
  $('.finder_results').text('');

  var symbol = $('#tFe0-symbol').val();
  var currentPrice = $('#tFe0-curPrice').val();
  var targetting = $('#tFe1_input_targetting-targetting').val();
  var priceFrom = $('#tFe1_input_price-from').val();
  var priceTo = $('#tFe1_input_price-to').val();
  var date = $('#tFe1_input_date-date').val();
  var dateExp = $('#tF_expirySelector select').val();
  var budgetCost = $('#tFe1_input_cost-cost').val();
  var budgetExclExp = true; //!!$('#tFe1_input_cost-exclude-expensive').attr('checked');

  var writeRadioResp = document.querySelector('input[name="tF_write"]:checked');
  var sell = writeRadioResp && writeRadioResp.value === '1' ? 1 : 0;

  var errs = [];
  renderError('');
  if (!symbol) errs.push('Please enter a symbol');
  if (!currentPrice) errs.push('Please enter the current price');
  if (!priceFrom) errs.push('Please enter a target price');
  if (!date && !dateExp) errs.push('Please enter a target date');
  if (errs.length > 0) {
    renderError(' - ' + errs.join('<br/> - '))
    return;
  }

  var payload = { 
    symbol: symbol,
    targetting: targetting,
    priceFrom: priceFrom,
    priceTo: priceTo,
    date: dateExp !== '' ? dateExp : date,
    currentPrice: currentPrice,
    budgetCost: budgetCost,
    budgetExclExp: budgetExclExp,
    dataFormat: 'v2',
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

function renderIn_summary(oEle, outcome) {
  const crDr = outcome.init > 0 ? '(credit)' : '(debit)';
  oEle.append('<p>Entry cost: ' + formatPrice(Math.abs(outcome.init)) + ' ' + crDr + '</p>');
  oEle.append('<p>Maximum risk: ' +
    (outcome.maxRisk === null ? 'Infinite' : formatPrice(Math.max(0, -outcome.maxRisk))) +
  '</p>');
  if (outcome.netMargin) {
    oEle.append('<p>Est. net margin impact: ' + formatPrice(outcome.netMargin) +
      '</p>');
  }
  oEle.append('<p>Est. return<sup>1</sup> at target price: ' + formatPrice(outcome.net) + ' ('+ 
    (outcome.maxRisk
      ? roundTo(outcome.roiMaxRisk * 100, 1) 
      : roundTo(outcome.roiMargin * 100, 1) 
    )
    +'%'+
      (outcome.maxRisk ? '' : '<sup>2</sup>')
    +')</p>');
}

function finder_add_to_calcs(outcomeIdx) {
  var spanEle = $('<span />', { class: 'loading' });
  var showCfg = { show: false, spanEle: spanEle };
  spanEle.text('Adding calculation...');
  $('[data-outcome-id='+outcomeIdx+'] a.subtle').replaceWith(spanEle);

  var strat = ((outcomes[outcomeIdx] || {}).vars || {}).strat || {};
  var values = {
    'strat': strat.stratKey,
    'underlying-symbol': $('#tFe0-symbol').val(),
    'underlying-curPrice': $('#tFe0-curPrice').val(),
    'option-act': strat.legsById.option.act,
    'option-price': strat.legsById.option.price,
    'option-curPrice': strat.legsById.option.price,
    'option-num': strat.legsById.option.num,
    'option-opType': strat.legsById.option.opType[0],
    'option-expiry': strat.legsById.option.expiry,
    'option-strike': strat.legsById.option.strike,
    'option-iv': strat.legsById.option.iv,
    'graph-rangeAuto': '1',
    'graph-type': 'roiRisk',
    'graph-date': '(today)'
  };

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

window.addEventListener("hashchange", function(){
  if (window.location.pathname === '/option-finder.html' && window.location.hash === '') {
    $('#calcs_holder .jq_exclusive_target').hide();
    $('#strat_F').show();
  }
});

function doFinder_calculation_return(reqData, data) {
  reqData.showCfg.spanEle.text('Calculation added: ');
  reqData.showCfg.spanEle.removeClass('loading');
  var aEle = $('<a />', { href: '#tab=' + reqData.tabReturnData.tabId, class: 'subtle' });
  aEle.text('Open tab');
  aEle.click(function (ev) {
    $('#strat_' + reqData.tabReturnData.tabId + '_button .jq_exclusive_switch').click();
  });
  reqData.showCfg.spanEle.append(aEle);
  newTab_return({}, reqData.tabReturnData, reqData.showCfg);
  doCalculation_return({ tab_num: reqData.tabReturnData.tabId }, data);
}

var outcomes;

function render_finder_results(_outcomes, meta) {
  var rEle = $('#tFe1_results');
  rEle.html('');
  outcomes = _outcomes || [];
  if (outcomes.length) {
    rEle.append('<h2>Best options</h2>');
    outcomes.map(
      function (outcome, i) {
        var oEle = $('<div />', { class: 'finder_result', 'data-outcome-id': i });
        var strat = ((outcome || {}).vars || {}).strat;
        if (!strat) return;
        
        if (['long-put', 'long-call'].indexOf(strat.stratKey >= 0)) renderIn_single_option_ele(oEle, strat);
        // else if – other strategies with multileg
        
        renderIn_summary(oEle, outcome);
        oEle.append('<p class="finder__add-class"><a href="#" class="subtle" onclick="finder_add_to_calcs('+i+'); return false;">Add to my calculations</a></p>');
        
        oEle.appendTo(rEle);
      }
    )
    rEle.append('<p class="minor"><sup>1</sup>Subject to changes in Implied Volatility for options with time left til expiry.</p>');
    if (meta.sell) {
      rEle.append('<p class="minor"><sup>2</sup>Losses can significantly exceed the margin held.</p>');
    }
  } else {
    rEle.append('<p class="txt_error">Could not find any profitable call or put options for that target price and date.</p>')
  };
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
    addMsg('Could not get best options at this time');
  }
}

function finder_options_loaded(_, reqData, data){ 
  var selOpt = $('#tF_expirySelector select option[value=""]').text('Use expiry');
  var expiries = Object.keys(opCache[reqData.symbol]).filter(function(xp) { return xp !== '_data_source'; });
  var selEl = $('#tF_expirySelector select');
  expiries.forEach(function(xp) {
    selEl.append('<option value="'+xp+'">' + xp + '</option>');
  });

}

function finder_getDateFromExpiry() {
  $('#tFe1_input_date-date').val('');
}

function finder_resetExpiryDate() {
  $('#tF_expirySelector select').val('');
}
