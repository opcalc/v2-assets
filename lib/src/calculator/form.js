/**
 * Validate a strategy calculation form
 * 
 * @return {array} list of errors
 */
function validateCalcReq(values, strategyType){
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
  return errors;
}

/**
 * Highlight validation errors on a form
 */
function highlightValErrors(tNo, errors){
   var jQuerySelectors = '';
    for (var i in errors){
      if (errors[i].indexOf('-strike')>0 ||
         errors[i].indexOf('-opType')>0 ||
         errors[i].indexOf('-expiry')>0){
        var opName = errors[i].slice(0, errors[i].lastIndexOf('-'));
        jQuerySelectors += (i>0?', ':'')+'#strat_'+tNo+' [name="'+opName+'-option"] .panel_button';
      }else
        jQuerySelectors += (i>0?', ':'')+'#strat_'+tNo+' [name="'+errors[i]+'"]';
    }

    $(jQuerySelectors).each(function(){
      $(this).addClass('field_error');
    });
}

/**
 * Update stickiness of the right-handside ad, based on space available
 */
function updateStratAdStickiness() {
  var tNo = curTab;
  var adWidth = $('.ad.strat').innerWidth();
  var totalRoom = $('#content_holder_inner').innerWidth();
  var graphWidth = $('#t'+tNo+'_graph .graph').innerWidth() || $('#t'+tNo+'_graph .google_chart_holder').innerWidth();
  var summaryWidth = $('#t'+tNo+'_summary').innerWidth();
  var spacer = 15;
  
  var hasRoom = Math.max(graphWidth, summaryWidth) + adWidth + spacer < totalRoom;

  $('#content_right').css('height', $('#strat_'+tNo+'_form').innerHeight() - 
    (hasRoom ? 0 : $('#t'+tNo+'_graph').innerHeight())
  );
}

function hideLoaderShowGraph(tNo) {
  loadCtr.css('visibility', 'hidden');
  $('#t'+tNo+'_submit').text('Calculate');
  $('#t'+tNo+' .results').show();
}

function getTabNo(eleId) {
  var tNo = null;
  var tNoMatches = eleId.match(/^t(\d*?)e/);
  if (tNoMatches && tNoMatches.length === 2) 
    tNo = parseInt(tNoMatches[1], 10);

  return tNo;
}

$(document).ready(function observeAds() {
  if (typeof __ez !== 'undefined' && (__ez.template || {}).isOrig !== true) {
    $('[data-fuse]').remove();
  }
  var observer = typeof MutationObserver !== 'undefined' && new MutationObserver(onAdChange);
  observer.observe && $('.ad').each(function() {
    observer.observe(this, {subtree: true, childList: true});
    onAdChange([ { target: this }], true)
  });
});

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

function updatePriceRange(tNo) {
  $('#t'+tNo+'_graph-priceMin-val').val($('#'+tNo+'_graph-priceMin-quick').val());
  $('#t'+tNo+'_graph-priceMax-val').val($('#'+tNo+'_graph-priceMax-quick').val());
  $('#t'+tNo+'_submit').click();
}

function graphRangeChange(minOrMax, tNo, changeEvent) {
  if (changeEvent.relatedTarget && (changeEvent.relatedTarget.attributes['data-app-inputset'] || {}).value !== 'priceRange') {
    $('#t'+tNo+'_graph-rangeShouldUpdate').val('1');
  }
  $('#t'+tNo+'_graph-rangeShouldUpdate').val('0');
}

function changeOutputType(field, selectEleOrVal){
  var chartValue, dispVis;
  if (field === 'vis') {
    chartValue = $('#t'+curTab+'_graph-typeChange').val();
    dispVis = selectEleOrVal;
  } else if (field === 'val') {
    chartValue = initType = $(selectEleOrVal).val();
    dispVis = $('#t'+curTab+'_graph-type').val().indexOf('riskGraph') === 0 
      ? 'line' : 'matrix';
  }
  var type = ({
    matrix: {
      roiRisk: 'roiRisk',
      roiInit: 'roiInit',
      price: 'price',
      rawValue: 'rawValue',
    },
    line: {
      roiRisk: 'riskGraph',
      roiInit: 'riskGraphInit',
      price: 'riskGraphPrice',
      rawValue: 'riskGraphRawValue',
    }
  }[dispVis] || {})[chartValue] || 'roiRisk';

  $('#t'+curTab+'_graph [name=graphVisTypeIcon--'+dispVis+']').addClass('active');

  _opcGaq.push(['_trackEvent', 'Change Output type', type]);

  ajaxRequest('', 'updatePreferredDisplayType', { type: type }, function() {});

  var r = results[curTab];

  type = checkForceGraphType(type, r);

  results[curTab]['graph_type'] = type;
  $('#t'+curTab+'_graph-type').val(type);

  renderResults(curTab, { noScroll: true });
  updateStratAdStickiness();
}

function updatePreferredDisplayType(el) {
  if (el.value) {
    ajaxRequest('', 'updatePreferredDisplayType', { type: el.value }, function() {});
  }
}

/**
 * If the chosen 'chart values' (graphType) is not applicable for the nature of the trade, force the
 * graphType to fallback to something that makes sense
 */
function checkForceGraphType(type, results){
  var r = results;
  // real graph type...
  if (r.summary.maxrisk.g !== 'u' && r.summary.maxrisk.g + r.initial.g < 0){
    if (
      type == 'roiRisk' || 
      (type == 'roiInit' && r.initial.g >= 0)
    ) {
      if (type == 'roiInit' && r.initial.g >= 0)
        addMsg('Opening trade is a credit – Showing ROI on max risk');
      type = 'roiRisk';

    } else if (
      type == 'riskGraph' ||
      (type == 'riskGraphInit' && r.initial.g >= 0)
    ) {
      if (type == 'riskGraphInit' && r.initial.g >= 0)
        addMsg('Opening trade is a credit – Showing ROI on max risk');
      type = 'riskGraph';
    }

  } else if (r.summary.maxrisk.g === 'u' && r.initial.g < 0){ // Debit entry
    if (type == 'roiInit' || type == 'roiRisk'){
      if (type == 'roiRisk')
        addMsg('Max risk is unlimited – Showing ROI on initial cost')
      type = 'roiInit';
    } else if (type == 'riskGraph' || type == 'riskGraphInit') {
      if (type == 'riskGraph');
        addMsg('Max risk is unlimited – Showing ROI on initial cost')
      type = 'riskGraphInit';
    }

  } else if (r.initial.g >= 0) { // Credit entry
    if (['riskGraph', 'roiRisk'].includes(type)) {
      addMsg('Max risk is unlimited – Showing values as $P/L');
    } else if (['riskGraphInit', 'roiInit'].includes(type)) {
      addMsg('Opening trade is a credit – Showing values as $P/L');
    }
    if (['riskGraph', 'riskGraphInit'].includes(type)) {
      type = 'riskGraphPrice';
    }else if (['roiRisk', 'roiInit'].includes(type)) {
      type = 'price';
    }
  }
  return type;
}
