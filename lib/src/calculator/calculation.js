/**
 * Send form values to the API to make a calculation
 */
function doCalculation(tNo, strategyType, cfg){
  if (!cfg) cfg = {};
  if (cfg.replaceWithLoader === undefined) {
    cfg.replaceWithLoader = false;
  }
  loadCtr = $('#loading-ctnr');
  $('.field_error').removeClass('field_error');

  var values = {};
  $.each($('#strat_'+tNo+' form').serializeArray(), function(i, field) {
      values[field.name] = field.value;
  });
  values.tabId = tNo;

  var errors = validateCalcReq(values, strategyType);
  if ($('#t'+tNo+'_agree_tc').length > 0 && $('#t'+tNo+'_agree_tc').attr('checked') === undefined){
    if (errors === false) errors = [];
    errors.push('agree_tc_label');
  }
  if (errors && errors.length){
    addMsg("Please complete all required fields");
    highlightValErrors(tNo, errors);

  }else{
    var hasPreviouslyRenderedResults = ($('#t'+tNo+'_graph').html() || '').length > 0;
    var replaceWithLoader = cfg['replaceWithLoader'] || !hasPreviouslyRenderedResults;
    
    // ** Copy calculation to new tab
    if (!$('#t'+tNo+'_graph-newTab').attr('checked')){
      $('#t'+tNo+'_submit').addClass('button--disabled');
      $('#strat_'+tNo+' .submitInputs').addClass('submitInputs--loading');
      $('#strat_'+tNo+' .results').css('opacity', 0.4);
      if (replaceWithLoader) {
        $('#strat_'+tNo+' .summary .hint').html('<span class="loading">Calculating results</span>');
        $.scrollTo('#load-anchor', 500);
      }

      $('.popup').dialog('close');
      ajaxRequest("calcuating results", 'calculate', values, doCalculation_return, {tab_num:tNo, noScroll: !replaceWithLoader});
    
    // ** Replace current tab's calculation
    }else{

      if (typeof fromClose !== 'undefined'){
        _opcGaq.push(['_trackEvent', 'Tabs', 'Re-calc in new tab']);
      }
      var rqId = ajaxRequest("calculating results", 'calculate', values, doCalculation_return, {tab_num:tNo, noScroll: false });
      newTab(false, rqId);
      $.scrollTo('#top_menu', 500);
    }
  }
}

function doCalculation_return(reqData, returnData){
  if ((returnData.results.messages || []).length) {
    returnData.results.messages.forEach(function(m) { addMsg(m); });
  }

  // ** Update visuals
  $('#strat_'+reqData.tab_num+'_form').addClass('formComplete');
  $('#strat_'+reqData.tab_num+' .submitInputs').removeClass('submitInputs--loading');
  $('#strat_'+reqData.tab_num+' .results').css('opacity', 1);
  $('#t'+reqData.tab_num+'_submit').removeClass('button--disabled');
  $('#t'+reqData.tab_num+'_graph-newTab_holder').css('display','');

  // ** Update any form values returned from server
  $('#'+reqData.tab_num+'_graph-priceMin-quick').val(roundTo(stripNonNumeric(returnData.results.graph_priceMin), 2));
  $('#t'+reqData.tab_num+'_graph-priceMin-val').val(roundTo(stripNonNumeric(returnData.results.graph_priceMin), 2));
  $('#'+reqData.tab_num+'_graph-priceMax-quick').val(roundTo(stripNonNumeric(returnData.results.graph_priceMax), 2));
  $('#t'+reqData.tab_num+'_graph-priceMax-val').val(roundTo(stripNonNumeric(returnData.results.graph_priceMax), 2));
  $('#t'+reqData.tab_num+'_graph-rangeAuto').val(returnData.results.graph_rangeAuto ? '1' : '0');
  updateStratAdStickiness();

  // ** Create calculation copy in new tab
  if (returnData.newTab != undefined){
    var oldResultsReference = $('#strat_'+reqData.tab_num+' .results');
    var oldTabReference = $('#strat_'+reqData.tab_num);
    $('#strat_'+reqData.tab_num).attr('id', 'strat_'+reqData.tab_num+"-to-remove");

    // Create a new tab with the original calculation's form values, and correctly initialise scripts
    returnData.oldTab.tabId = reqData.tab_num;
    newTab_return(reqData, returnData.oldTab, { show: false });
    $('#strat_'+reqData.tab_num+' .results').replaceWith(oldResultsReference);
    
    // Remove the original calculation tab (since it has the form values that should be in the new tab)
    oldTabReference.remove();

    // Create the new calculation tab
    reqData.tab_num = returnData.newTab.tabId; // this doesn't get used in newTab_return, but does below
    newTab_return(reqData, returnData.newTab);
  }

  if (returnData.status == REQ_ERROR){
    addMsg(returnData.desc);
    $('#t'+reqData.tab_num+'_summary').html("");

  }else if (returnData.status == REQ_OK){
    results[reqData.tab_num] = returnData.results;

    _opcGaq.push([
      '_trackEvent',
      'Calculation: '+returnData.results.strat,
       returnData.results.underlying_symb,
       returnData.tab_desc_long.desc.substring(returnData.results.underlying_symb.length+1)
    ]);

    // Update the tab's button with the name of the calculation
    $('#strat_'+reqData.tab_num+'_button .name').html(returnData.tab_desc.desc+"<br/><span class='minor'>"+returnData.tab_desc.type+"</span>");

    renderResults(reqData.tab_num, { noScroll: reqData.noScroll || false });
  }
}
