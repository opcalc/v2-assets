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

  var symbol = $('#tFe0-symbol').val();
  var currentPrice = $('#tFe0-curPrice').val();
  var targetting = $('#tFe1_input_targetting-targetting').val();
  var priceFrom = $('#tFe1_input_price-from').val();
  var priceTo = $('#tFe1_input_price-to').val();
  var date = $('#tFe1_input_date-date').val();

  var payload = { 
    symbol: symbol,
    targetting: targetting,
    priceFrom: priceFrom,
    priceTo: priceTo,
    date: date,
    currentPrice: currentPrice,
    dataFormat: 'v2'
  }

  $.getJSON(OP_FINDER_ENDPOINT, payload, finder_find_return);
  $finderSubmit.attr('disabled', 'disabled');
  $finderSubmit.val('Finding...');

  // set UI status
}

function renderIn_single_option_ele(sEle, strat) {
  sEle.append(
    '<p>' +
    ucFirst(strat.legsById.option.act) + ' ' +
    expDescFromYMD(strat.legsById.option.expiry) + ' ' +
    formatPrice(strat.legsById.option.strike) + ' ' +
    ucFirst(strat.legsById.option.opType) + ' @ ' +
    formatPrice(strat.legsById.option.price) +
    '</p>'
  );
}

function renderIn_summary(oEle, outcome) {
  const crDr = outcome.init > 0 ? '(credit)' : '(debit)';
  oEle.append('<p>Entry cost: ' + formatPrice(Math.abs(outcome.init)) + ' ' + crDr + '</p>');
  oEle.append('<p>Maximum risk: ' + formatPrice(Math.abs(outcome.maxRisk)) + '</p>');
  oEle.append('<p>Est. return* at target price: ' + formatPrice(outcome.net) + ' ('+ roundTo(outcome.roiMaxRisk * 100, 1) +'%)</p>');
}

function finder_add_to_calcs(outcomeIdx) {
  var spanEle = $('<span />', { class: 'loading' });
  var showCfg = { show: false, spanEle: spanEle };
  spanEle.text('Adding calculation...');
  var aEle = $('<a />', {
    class: 'subtle',
    href: '#'
  });
  // aEle.text('(Show)');
  // aEle.click(function(ev) {
  //   showCfg.show = true;
  //   aEle.replaceWith('<span>Loading</span>');
  //   return false;
  // });
  // spanEle.append(aEle);
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

function doFinder_calculation_return(reqData, data) {
  reqData.showCfg.spanEle.text('Calculation added: ');
  reqData.showCfg.spanEle.removeClass('loading');
  var aEle = $('<a />', { href: '#', class: 'subtle' });
  aEle.text('Open tab');
  aEle.click(function (ev) {
    $('#strat_' + reqData.tabReturnData.tabId + '_button .jq_exclusive_switch').click();
  });
  reqData.showCfg.spanEle.append(aEle);
  newTab_return({}, reqData.tabReturnData, reqData.showCfg);
  doCalculation_return({ tab_num: reqData.tabReturnData.tabId }, data);
}

var outcomes;

function render_finder_results(_outcomes) {
  var rEle = $('#tFe1_results');
  rEle.html('');
  outcomes = _outcomes || [];
  if (outcomes.length) rEle.append(
    '<h2>Best options</h2>'
  );
  outcomes.map(
    function (outcome, i) {
      var oEle = $('<div />', { class: 'finder_result', 'data-outcome-id': i });
      var strat = ((outcome || {}).vars || {}).strat;
      if (!strat) return;

      oEle.append('<h3>' + strat.title + '</h3>');
      if (['long-put', 'long-call'].indexOf(strat.stratKey >= 0)) renderIn_single_option_ele(oEle, strat);
      // else if – other strategies with multileg
      
      renderIn_summary(oEle, outcome);
      oEle.append('<p class="finder__add-class"><a href="#" class="subtle" onclick="finder_add_to_calcs('+i+'); return false;">Add to my calculations</a></p>');

      oEle.appendTo(rEle);
    }
  )
  rEle.append('<p class="minor">*Subject to changes in Implied Volatility for options with time left til expiry</p>');
}

function finder_find_return(returnData) {
  const $finderSubmit = $('#tF_submit');

  $finderSubmit.attr('disabled', false);
  $finderSubmit.val('Find options');

  // check for errors
  var outcomes = ((returnData || {}).data || {}).outcomes;
  if (outcomes) {
    render_finder_results(outcomes);
  } else {
    addMsg('Could not get best options at this time');
  }
}
