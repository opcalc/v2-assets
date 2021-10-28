
function ele_option_listen(tCall, foreignEle, localEle){
  // underlying symbol changed?  remove price, and option strike
  if (tCall == 'underlying_symbol'){
		$('#'+localEle.ele_id+'-price').val('');
		$('#'+localEle.ele_id+'-marketPrice').val('');
		$('#'+localEle.ele_id+'-lastPrice').val('');
		$('#'+localEle.ele_id+'-strike').val('');
		$('#'+localEle.ele_id+'-expiry').val('');
		$('#'+localEle.ele_id+'-option_selector').html(loadingHtml);
    $('#'+localEle.ele_id+'-opDesc').text('');
    $('#'+localEle.ele_id+'-opDesc').removeClass('option-description--has-content');
    $('#'+localEle.ele_id+'-option .select-button--full').removeClass('select-button--hidden');
    $('#'+localEle.ele_id+'-option .select-button--compressed').addClass('select-button--hidden');
    $('#'+localEle.ele_id+'-iv').val('');
    // not sure if this call is needed:
    getOptions({eleId:localEle.ele_id, uEleId:foreignEle.ele_id});
	}
  else if (tCall == 'underlying_num'){
    var contracts = Math.round(parseInt($('#'+foreignEle.ele_id+'-num').val())/100);
    if (isNaN(contracts)) contracts = '';
		$('#'+localEle.ele_id+'-num').val(contracts);
	}
  else if (tCall == 'option_num'){
    if (localEle.linked_ele != undefined && localEle.linked_ele == foreignEle.ele_name){
      var updateIt = localEle.strict || $('#'+localEle.ele_id+'-num').val() == localEle.default_num;
      if (updateIt)
        $('#'+localEle.ele_id+'-num').val($('#'+foreignEle.ele_id+'-num').val()*localEle.link_ratio);
    }
  }
  else if (tCall == 'option'){
    $('#'+localEle.ele_id+'-iv').val('');
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

function ele_stockAndUnderling_listen(tCall, foreignEle, localEle){
  if (tCall == 'underlying_symbol'){
    $('#'+localEle.ele_id+'-price').val('');
    $('#'+localEle.ele_id+'-curPrice').val('');
    $('#'+localEle.ele_id+'-marketPrice').val('');
    $('#'+localEle.ele_id+'-lastPrice').val('');
    $('#'+localEle.ele_id+'-ivHist').val('');
    $('#'+localEle.ele_id+'-updatePriceTime').val('');
    //$('#'+localEle.ele_id+'-curPriceDisp').val('');
    getPrice({eleId:localEle.ele_id, button:localEle.ele_id+'-loading'});
    triggerListener('underlying_price', foreignEle);
  } else if (tCall == 'underlying_price') {
    console.log('*')
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
  ele_stockAndUnderling_listen(tCall, foreignEle, localEle);
 }
function ele_underlying_listen(tCall, foreignEle, localEle){
  ele_stockAndUnderling_listen(tCall, foreignEle, localEle);
}

function graph_price_range_listen(tCall, foreignEle, meta) {
  $('#t'+meta['tab_num']+'_graph-rangeAuto').val('0');
  $('#t'+meta['tab_num']+'_graph-rangeShouldUpdate').val('1');
  $('#t'+meta['tab_num']+'_graph-rangeUpdate').css('visibility', 'visible');
}

function graph_listen(tCall, foreignEle, localEle){
  if (tCall == 'underlying_symbol'){
    $('#t'+localEle.tab_num+'_graph-date').val('');
    $('#t'+localEle.tab_num+'_graph-priceMin-val').val('');
    $('#t'+localEle.tab_num+'_graph-priceMax-val').val('');
    $('#'+localEle.tab_num+'_graph-priceMin-quick').val('');
    $('#'+localEle.tab_num+'_graph-priceMax-quick').val('');
  }
}
