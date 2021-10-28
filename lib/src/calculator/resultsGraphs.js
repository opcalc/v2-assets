
function renderResults(tab_num, cfg){
  var noScroll = (cfg || {}).noScroll || false;
  $('#t'+tab_num+'_summary').html(
    "<h2>Estimated returns</h2>"+
      getSummary(results[tab_num])+
      getSharingCode(tab_num)+
      "");//returnData.results.summary.desc
  var graphInfo = renderGraph(results[tab_num], tab_num);
  $('#t'+tab_num+'_graph').html(graphInfo[0]);
  graphInfo[1] && graphInfo[1]();
  $('#strat_'+tab_num+' .results').show();

  // * fill modified vars
  for(var i in results[tab_num].vars){
    $('#strat_'+tab_num+' [name="'+i+'"]').val(results[tab_num].vars[i]);
  }
  // !!! ad code;

  initResults(tab_num);

  if (!noScroll) {
    $.scrollTo('#t'+tab_num+'_summary', 500);
  }
}

function getSummary(results){
  // this is duplicated as server-side-rendered function graph.inc.php:getSummaryHTML()
  var s = results.summary;

  var noDays;
  for (var i in results.risk)
    noDays = i;

  var filteredMaxRiskTime = !(typeof(s.maxrisk.time) == 'object' && s.maxrisk.time instanceof Array) 
    ? s.maxrisk.time 
    : removeArrayDupes(s.maxrisk.time);

  filteredMaxRiskTime = !(typeof(filteredMaxRiskTime) == 'object' && filteredMaxRiskTime instanceof Array) || filteredMaxRiskTime.length > 1
    ? filteredMaxRiskTime 
    : filteredMaxRiskTime[0];

  var filteredMaxProfitTime = !(typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array) 
    ? s.maxrisk.time 
    : removeArrayDupes(s.maxrisk.time);

  filteredMaxProfitTime = !(typeof(filteredMaxProfitTime) == 'object' && filteredMaxProfitTime instanceof Array) || filteredMaxProfitTime.length > 1
    ? filteredMaxProfitTime 
    : filteredMaxProfitTime[0];
  
  if (typeof(filteredMaxRiskTime) == 'object' && filteredMaxRiskTime instanceof Array)
    var maxRiskDays = ' on days '+descNumList(filteredMaxRiskTime);
  else if (filteredMaxRiskTime == noDays)
    var maxRiskDays = '';
  else if (filteredMaxRiskTime !== undefined)
    var maxRiskDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxrisk.time *60*60*24), -5);
  else
    var maxRiskDays = '';

  if (typeof(s.maxprofit.time) == 'object' && s.maxprofit.time instanceof Array)
    var maxProfitDays = ' on days '+descNumList(s.maxprofit.time);
  else if (s.maxprofit.time == noDays)
    var maxProfitDays = '';
  else if (s.maxprofit.time !== undefined)
    var maxProfitDays = ' on day '+date('jS M Y', parseInt(results.start_date)+(s.maxprofit.time *60*60*24), -5);//+s.maxprofit.time;
  else 
    var maxProfitDays = '';

  function spanRed($str, $strong) {
    return "<span style='color:#900;"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  function spanGreen($str, $strong) {
    return "<span style='color:#370;"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  function spanBlk($str, $strong) {
    return "<span style='"+($strong ? 'font-weight: bold;':'')+"'>"+$str+"</span>";
  }
  
  var mP = s.maxrisk.g > -results.initial.g;
  var fmtRisk = formatPrice(Math.abs(s.maxrisk.g + results.initial.g));
  var maxRiskString = (s.maxrisk.g === 'u'
    ? spanRed('infinite', true)+' <span class="minor">(on upside)</span>' 
    : (s.maxrisk.p === 'i' 
      ? spanRed(fmtRisk) + ' <span class="minor">(on upside)</span>' 
      : spanRed(
        '<span'+(mP ? ' style="color:#370;font-weight:bold;">+':'>')+
        fmtRisk+"</span>"
      ) + " <span class='minor'>(at "+(results.underlying_symb)+
      formatPrice(s.maxrisk.p)+maxRiskDays + ")</span>"
    )
    + (s.maxrisk.g + results.initial.g >= 0
      ? '<br/><span class="minor">(calculator found no risk.  This can be due to low or high implied volatility, or out of date prices)</span>'
      : ''
    ));
    
  var mPRoi = s.maxprofit.g === 'u' || s.maxprofit.g + results.initial.g <= 0  ? null 
    : s.maxrisk.g === 'u' ? 0
    : (s.maxprofit.g + results.initial.g) / -(s.maxrisk.g + results.initial.g);
  var mPRoiDesc = mPRoi === null ? null
    : roundTo(mPRoi*100, mPRoi*100 >= 10 ? 1 : 2) + '%';
  
  var daysColumns = Object.keys(results.data[Object.keys(results.data)[0]]);
  var timeTilExp = daysColumns[daysColumns.length - 1] / 365;
  var mPRoiAnn = mPRoi === null ? null : mPRoi / timeTilExp;
  var mPRoiAnnDesc = mPRoiAnn === null ? null
    : mPRoiAnn*100 > 100000 ? '+100000%'
    : roundTo(mPRoiAnn*100, mPRoiAnn >= 1 ? 0 : mPRoiAnn >= 0.1 ? 1 : 2) + '%';
  
  mP = s.maxprofit.g < -results.initial.g;
  var fmtProfit = formatPrice(Math.abs(s.maxprofit.g + results.initial.g));
  var maxProfitString = (s.maxprofit.g === 'u'
    ? spanBlk('infinite')+' <span class="minor">(on upside)</span>' 
    : (s.maxprofit.p === 'i' 
      ? spanBlk(fmtProfit) + ' <span class="minor">(on upside)</span>' 
      : spanBlk(
        '<span'+(mP ? ' style="color:#F00;">-':'>')+
          fmtProfit+
        "</span>"
      ) + " <span class='minor'>(at "+(results.underlying_symb)+
        formatPrice(s.maxprofit.p)+maxProfitDays + ")</span>"
    )
    + (s.maxprofit.g + results.initial.g <= 0 
      ? '<br/><span class="minor">(calculator found no positive profit.  This can be due to low or high implied volatility, or out of date prices)</span>'
      : ''
    ));

  var maxRoRString = mPRoiAnnDesc === null || s.maxprofit.g === 'u' || s.maxrisk.g === 'u' ? 'N/A'
    : mPRoiDesc+" ("+mPRoiAnnDesc+" ann.)";

  var hasPop = !!(s.PoP || {}).pop;
  var popString = hasPop ? roundTo((s.PoP || {}).pop * 100, 1)+'%' : '';

  for (var i in results.breakeven){}

  var beExpString = "$"+implode(", $", results.breakeven[i]);

  mP = results.initial.g < 0;
  var outlayString ='<span style="'+(mP ? 'color:#900;':'color:#370;')+'">'+
    formatPrice(Math.abs(results.initial.g))+"</span>"+
    "<span class='minor'>"+(mP? '': ' net credit') + "</span>";

  var summary =
    "<p class='asAt minor'>As at "+date("jS M Y", results.start_date)+" ("+results.underlying_symb+" "+formatPrice(results.underlying_current_price)+")</p>"+
    "<p>Entry " + (mP ? "cost" : "credit") +": "+outlayString+" <a href='#' class='subtle initDetail' onclick='showInitDetails(this); return false;'>see details</a></p>"+
    "<p><span class='hideTabPlus'>Max</span> <span class='hideMobile'>Maximum</span> risk: "+ maxRiskString+"</p>"+
    "<p><span class='hideTabPlus'>Max</span> <span class='hideMobile'>Maximum</span> return: "+maxProfitString+"</p>"+
    (!maxRoRString ? '' : '<p>Max return on risk: '+maxRoRString+'</p>')+
    "<p>Breakevens at expiry: "+beExpString+"</p>"+
    (hasPop ? "<p>Probability of profit: "+popString+" <a href='#' onclick='alert(\"Probability of returning at least $0.01 at the time of expiry.  This figure is derived from 30 day Implied Volatility.\");return false;' class='help'>?</a></p>" : "");

  return summary;
}


function renderGraph(graphData, t_no){
  graphData.graph_type = checkForceGraphType(graphData.graph_type, graphData);
  var afterNote = '';

  var dispVis = (graphData.graph_type || '').indexOf('riskGraph') === 0 ? 'line' : 'matrix';
  var preGraphTools = '';
  var ivChangeCurVal = parseFloat($('#t'+t_no+'_ivChange-val').val()) || 0;
  var initGraph = function() {
    $( '#t'+t_no+'_ivSlider' ).slider({
      value: ivChangeCurVal,
      min: -100,
      max: 100,
      create: function() {
      },
      slide: function( event, ui ) {
        $('#t'+t_no+'_ivChange--input').val(ui.value > 0 ? '+'+ui.value : ui.value);
        ivChangeChkUpdateNeeded(t_no);
      }
    });
  }
  preGraphTools += "<div style='display: flex; margin-bottom: 5px; margin-top: 5px;'>"+
  " <div class='fieldLabel' style='position: relative;'>"+
  "   <span class='inputLabelSmall' style='position: relative; z-index: 10;'>"+
  "     IV change"+
  '     <a href="#" onclick="alert(\'The expected increase or decrease in Implied Volatility.\\n\\nE.g. For stock with IV of 30, entering 10% here will show estimates for if the stock\\\'s IV increases to 33\');return false;" class="help">?</a>'+
  "   </span>"+
  "   <div style='position: relative; flex: 1; display: flex; align-items: center' onclick='ivChangeOnFocus("+t_no+")'>"+
  "     <select class='input noLeftMargin'><option>"+(ivChangeCurVal === 0 ? '±' : ivChangeCurVal > 0 ? '+' : '')+ivChangeCurVal+"%"+"</option></select>"+
  "     <div style='position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 3'></div>"+
  "   </div>"+
  "   <div class='id--ivChangePanel card jq_start_hidden' id='t"+t_no+"_ivChangeCard'"+
  "     style='position: absolute; top: -0.2rem; left: -0.3rem; padding: 1.3em 0.3rem 0.3rem; min-width: 4.2em; z-index: 3'"+
  "   >"+ 
  '   <span>'+
  '    <input class="input inputNumeric noLeftMargin" '+
  '     type="text" inputmode="decimal"'+
  "     style='width: 40px;'"+
  "     name='ivChange' id='t"+t_no+"_ivChange--input' "+
  "     oninput='ivChangeOnKeyup("+t_no+", event.target.value); ivChangeChkUpdateNeeded("+t_no+")'"+
  "    />%"+
  "   </span>"+
  "   <div class='ivSlider__ctnr'>"+
  "     <div class='ivSlider__notch-ctnr'>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -100)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>100"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -75)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>75"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -50)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>50"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-negative'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", -25)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>-</span>25"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-percent ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 0)'>"+
  "           ±0%"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 25)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>25"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 50)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>50"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 75)'>"+
  "          <span class='ivSlider__notch__plusMinusIndicator'>+</span>75"+
  "         </span>"+
  "       </span>"+
  "       <span class='ivSlider__notch ivSlider__notch--has-positive ivSlider__notch--large'>"+
  "         <span class='linkSubtle' onclick='ivSetVal("+t_no+", 100)'>"+
  "           <span class='ivSlider__notch__plusMinusIndicator'>+</span>100"+
  "         </span>"+
  "       </span>"+
  "     </div>"+
  '     <div id="t'+t_no+'_ivSlider" class="ivSlider__holder" style="width: 12rem">'+
  '       <div id="t'+t_no+'_ivSlider_custom-handle" class="ui-slider-handle">'+
  '         <div class="custSlider-rail" />'+
  '       </div>'+
  '     </div>'+
  "   </div>"+
  "   <a href='javascript:void(0)' "+
  "     id='t"+t_no+"_ivSlider--updateBtn' "+
  "     onclick='ivChangeUpdate("+t_no+")' "+
  "     style='padding: 0.2em 0; text-decoration: none; visibility: hidden'"+
  "   >"+
  "      "+
  "     <span style='text-decoration: underline'>Update Calculation</span>"+
  "     <img src='"+WEB_PATH_STATIC+"images/icon-refresh.svg' width='14' height='14' valign='bottom' />"+
  "   </a>"+
  " </div>"+
  "</div>"+
  "<div class='fieldLabel' style='margin-left: 10px;'>"+
  "  <span class='inputLabelSmall'>Chart style</span>"+
  "  <div class='graphVisTypeIconCtnr'>"+
  "    <span onclick=\"changeOutputType('vis', 'matrix');\" class='graphVisTypeIcon"+(dispVis === 'matrix' ? ' __active' : '')+"' name='graphVisTypeIcon--matrix'>"+
        '<svg width="38" height="38" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
          <path d="M15.5 3V15.5H3" stroke="currentColor" stroke-opacity="0.36"/>\
          <rect opacity="0.7" x="3" width="13" height="3" fill="currentColor"/>\
          <rect opacity="0.7" x="0.5" y="3.5" width="2" height="12" fill="currentColor" stroke="currentColor"/>\
          <rect opacity="0.55" width="4" height="3" transform="matrix(-1 0 0 1 15 3)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 11 3)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 7 3)" fill="currentColor"/>\
          <rect opacity="0.9" width="4" height="3" transform="matrix(-1 0 0 1 15 6)" fill="currentColor"/>\
          <rect opacity="0.4" width="4" height="3" transform="matrix(-1 0 0 1 11 6)" fill="currentColor"/>\
          <rect opacity="0.25" width="4" height="3" transform="matrix(-1 0 0 1 7 6)" fill="currentColor"/>\
          <rect opacity="0.55" width="4" height="3" transform="matrix(-1 0 0 1 15 9)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 11 9)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 7 9)" fill="currentColor"/>\
          <rect opacity="0.3" width="4" height="3" transform="matrix(-1 0 0 1 15 12)" fill="currentColor"/>\
          <rect opacity="0.12" width="4" height="3" transform="matrix(-1 0 0 1 11 12)" fill="currentColor"/>\
          <rect opacity="0.4" width="3" height="3" fill="currentColor"/>\
        </svg>'+
  "    </span>"+
  "    <span onclick=\"changeOutputType('vis', 'line');\" class='graphVisTypeIcon"+(dispVis === 'line' ? ' __active' : '')+"' style='padding: 2px' name='graphVisTypeIcon--line'>"+
        '<svg width="33" height="28" viewBox="0 0 33 28" fill="none" xmlns="http://www.w3.org/2000/svg">\
        <path opacity="0.23" d="M31.624 14.484H0.624023" stroke="black"/>\
        <path opacity="0.23" d="M16.124 0.984009L16.124 27.984" stroke="black"/>\
        <path opacity="0.3" d="M32.0125 11C15.7744 11 9.86959 19.1818 1.01245 20" stroke="currentColor"/>\
        <path d="M31.4958 6.5H13.4125L7.21251 24.5H0.495847" stroke="currentColor"/>\
        </svg>'+
  "    </span>"+
    "</div>"+
  "</div>"+
  "</div>";

  var output = '';
  
  output += '<div class="graphToolbar graphToolbar--riskGraph">'+preGraphTools+'</div>';
  if (graphData['graph_type'].substr(0, 9) == 'riskGraph'){
    output += '<div class="graphCtnr"><div class="google_chart_holder" style="height:500px;"></div></div>\n\
      <script>\n\
      renderRiskGraph(results['+t_no+'], '+t_no+');\n\
      </script>';

  }else{
    output += '<div class="graphCtnr">'
    output += getMatrixCode(graphData);
    output += "</div>";
    afterNote = "<p>Click a cell to view the trade's exit.</p>";
  }
  var stockRangeWidth = Math.min(Math.round(graphData.graph_priceMax || 0).toString().length + 5, 8);
  output += "<div style='display: flex; margin-top: 5px'>"+
    " <div class='fieldLabel'>"+
    "   <span class='inputLabelSmall'>Stock price range</span>"+
    '   <div>'+
    '     $<input data-app-inputset="priceRange" placeholder="auto" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" inputmode="decimal" '+
    "       id=\""+t_no+"_graph-priceMin-quick\" name=\"graph-priceMin-quick\" value=\""+roundTo(graphData.graph_priceMin, 2)+"\" "+
    "       onchange=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       onkeyup=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       class=\"inputWithDollar inputNumeric input\" style=\"width: "+stockRangeWidth+"ch\""+
    "       onblur=\"graphRangeChange('min', "+t_no+", event);\" />" +
    '     &hyphen;<input data-app-inputset="priceRange" placeholder="auto" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" inputmode="decimal" '+
    "       id=\""+t_no+"_graph-priceMax-quick\" name=\"graph-priceMax-quick\" value=\""+roundTo(graphData.graph_priceMax, 2)+"\" "+
    "       onchange=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       onkeyup=\"triggerListener('graphPriceRange', {ele_id:'t"+t_no+"_graph', tab_num:'"+t_no+"', ele_name:'graph'});\" "+
    "       class=\"inputWithDollar inputNumeric input\" style=\"width: "+stockRangeWidth+"ch\""+
    "       onblur=\"graphRangeChange('max', "+t_no+", event);\" />" +
    // "     <input type=\"hidden\" id=\"t"+t_no+"_graph-rangeAuto\" name=\"graph-rangeAuto\" value=\""+(graphData.graph_rangeAuto ? '1' : '0')+"\" />"+
    "     <input type=\"hidden\" id=\"t"+t_no+"_graph-rangeShouldUpdate\" name=\"graph-rangeShouldUpdate\" value=\"0\" />"+
    "   </div>"+
    "   <div id='t"+t_no+"_graph-rangeUpdate' style='visibility: hidden'>" +
    "     <a href='javascript:void(0)' onClick='updatePriceRange("+t_no+")') style='padding: 0.2em 0; text-decoration: none'><span style='text-decoration: underline'>Update price range</span>"+
    "       <img src='"+WEB_PATH_STATIC+"images/icon-refresh.svg' width='14' height='14' valign='bottom' /></a>" +
    "   </div>"+
    "</div>"+
    "<div class='fieldLabel' style='margin-left: 5px;'>"+
    "  <label class='inputLabelSmall'>Chart values <a href='#' onclick='alert(\"Changes how the trade is represented in the table or graph... \\n\\n% of maximum risk.: Percentage of the maximum risk of the trade, where -100 is the maximum risk, and 100 is 100% return compared to the maximum risk. \\n\\n% of entry: Percentage of the entry cost of the trade, where -100 is no return from your initial investment, and 100 is 100% return compared to the entry cost.  Note: if opening the trade results in a credit, % of maximum risk is used instead.\\n\\nDollar value: Profit or loss in net dollar value.\\n\\nOption/Spread value: shows the value of the purchased option, or the spread, without multiplying x100 for each contract.\");return false;' class='help'>?</a></label>"+
    "  <div>"+
    "    <select name='graph-typeChange' id='t"+t_no+"_graph-typeChange' class='input noLeftMargin' onchange='changeOutputType(\"val\", this);' style='margin-right:5px'>"+
    "       <option value='roiRisk'"+(graphData.graph_type == 'roiRisk' || graphData.graph_type == 'riskGraph' ? ' selected':'')+">% of maximum risk</option>"+
    "       <option value='roiInit'"+(graphData.graph_type == 'roiInit' || graphData.graph_type == 'riskGraphInit' ? ' selected':'')+">% of entry cost</option>"+
    "       <option value='price'"+(graphData.graph_type == 'price' || graphData.graph_type == 'riskGraphPrice' ? ' selected':'')+">$ Profit/loss</option>"+
    "       <option value='rawValue'"+(graphData.graph_type == 'rawValue' || graphData.graph_type == 'riskGraphRawValue' ? ' selected':'')+">Option/spread value</option>"+
    "       </optgroup>"+
    "    </select>"+
    "  </div>"+
    "</div>"+
    "</div>";

  output += afterNote;

  return [output, initGraph];
}


function initResults(tNo){
  $('#t'+tNo+'_graph').prepend('<div class="popup" id="t'+tNo+'_graph-detail"></div>');

  var ww = $(window).width(),
      wh = $(window).height();

  var dialogOptions = {
    autoOpen:false,
    position: { at: 'right top' },
    dialogClass: "detailPopup",
    title:'Detail',
    maxHeight: 300,
    minHeight: 120,
    width: (ww < 450 ? ww : 450),
    draggable: viewStyle !== 'mobile',
    create: function (event) {
      $(event.target).parent().css('position', 'fixed');
      $(event.target).parent().css('bottom', '0 !important');
    }
  };
  if (viewStyle == 'mobile'){
    dialogOptions.width = ww;
    dialogOptions.resizable = false;
    dialogOptions.position = { at: 'center bottom' };
  }

  try {
    $('#t'+tNo+'_graph-detail').dialog("close");
  } catch (e) {}
  $('#t'+tNo+'_graph-detail').dialog(dialogOptions);

  $('th.t:last-child').hover(
    function(){
      $(this).addClass('hover');
      $(this).append("<div class='hover'>At&nbsp;expiry</div>");

    },
    function(){
      $(this).removeClass('hover');
      $('.hover', this).remove();
    }
  );

  // ** Matrix cell interaction
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
      $('#t'+tNo+'_graph-detail').html(getCellSummary(curTab, results[curTab]['data'][x][t]));
      return false;
    })
  });
}

function getCellSummary(tNo, d, isInit){
  var lines = [];// array of arrays [act, number, desc, each, total (absolute)]
  var desc, opType, exp, symb, o, amt, buyMult, num, price;
  var total = 0;

  if (d['S'] != undefined){
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
}
  if (d['O'] != undefined){
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
}
  if (d['C'] != undefined){
    for(var i in d['C']){
      o = d['C'][i];
      amt = o.T;
      var adesc = o.a === 'buy' ? 'Cash held' : 'Cash released';
      total += amt;
      lines.push([adesc, "", "", undefined, roundTo(amt,2,true,false)]);
    }
  }
  var str='<table class="trade_summary" cellpadding="1" cellspacing="0"><tr><th>Trades to '+(isInit?'open':'close')+' position</th><th>No.</th><th>Price</th><th>Total</th></tr>'
  for(i = 0; i<lines.length; i++){
    str+= "<tr><td align='left'>"+ucFirst(lines[i][0])+" "+lines[i][2]+"</td><td align='right'>"+lines[i][1]+"</td><td align='right'>"+(lines[i][3] ? "$"+lines[i][3] : "")+"</td><td align='right'>$"+lines[i][4]+"</td></tr>";
  }
  str+= (lines.length > 1 ? "<tr class='subtotal'><td align='left'>Total"+(isInit?"":" (closing trade)")+"</td><td colspan='3' align='right'>$"+roundTo(total,2,true,false)+"</td></tr>" : "");

  if (isInit !== true){
    var grandTotal = results[tNo].initial.g + total;
    str +=
      "<tr class='init'><td align='left'>Entry cost</td><td colspan='3' align='right'>$"+roundTo(results[tNo].initial.g,2,true,false)+"</td></tr>"+
      "<tr class='total'><td align='left'>Total</td><td colspan='3' align='right'>$"+roundTo(grandTotal,2,true,false)+"</td></tr>";
  }
  return str+"</table>";
}