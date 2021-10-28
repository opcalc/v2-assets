function getLoadingHtml(t){
  return "<span class='loading-wrapper'><em class='loading'>"+t+"</em></span>";
}
var loadingHtml = getLoadingHtml('Loading');

var dotLoader = '<div class="loaderDotCtnr">' +
  '<span class="loaderDot loaderDot--white" /><span class="loaderDot loaderDot--white loaderDot--2" /><span class="loaderDot loaderDot--white loaderDot--3" />'+
  '</div>';

var results = [];
var underlying_symb = [];

function isDialogOpen() {
  return $('.ui-widget-overlay').css('display') === 'block';
}

function avgPrice(ar){
  var i;
  var accum = 0;
  for(i = 0; i < ar.length; i++){
    accum += parseFloat(ar[i]);
  }
  return (Math.round(accum/ar.length*100)/100).toFixed(2);
}

function getBestPrice(pricing) {
  if (parseFloat(pricing.b) && parseFloat(pricing.a)) {
    return (parseFloat(pricing.b) + parseFloat(pricing.a)) / 2;
  } else return parseFloat(pricing.l);
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

function fmtNumToFit(disVal){
  if (isNaN(disVal)) return "N/A";
  if (disVal >= 100 || disVal <= -10) disVal = roundTo(disVal);
  else if (disVal >= 10 || (disVal > -10 && disVal < 0)) disVal = roundTo(disVal, 1);
  else if (disVal < 10) disVal = roundTo(disVal, 2);
  if (disVal <= -1000 && disVal > -10000) disVal = "<span class='neg'>-</span>"+(-disVal);
  if (Math.abs(disVal) >= 10000) disVal = roundTo(disVal / 1000,1)+"K";
  return disVal
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
  $('#strat_F').length && $('#top_menu .id-optionFinder, #strat_F_button').click(function() {
    $('#calcs_holder .jq_exclusive_target').hide();
    $('#top_but-calculator').hide();
    $("#top_menu .dialog_tab").removeClass("dialog_tab_selected");
    $("#top_menu .dialog_tab:not(.id-optionFinder)").removeClass("--active");
    $("#top_menu .dialog_tab.id-optionFinder").addClass("--active");
    $('#tab_holder_tabs .dialog_tab').removeClass('dialog_tab_selected');
    $('#strat_F_button').addClass('dialog_tab_selected');
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

  updateStratAdStickiness();
});
