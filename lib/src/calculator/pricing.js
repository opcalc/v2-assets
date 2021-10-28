var priceCache = {};

function getPrice(data){
  var stock = $('#'+data.eleId+'-symbol').val();
  if (stock === ""){
    // addMsg("Please enter a stock symbol");
  }else{
    getPriceButtonEleOrSelector = typeof(data.button) === 'string'
      ? '#'+data.button
      : data.button;
    $(getPriceButtonEleOrSelector).addClass("loading").html("Loading");
    var reqData = { button: getPriceButtonEleOrSelector, uEleId: data.eleId, eleId: data.eleId, stock: stock };

    // ** For Canadian stocks, use the v3 API
    if (isToStock(stock)) {
      if (data.showSelect) {
        reqData.showSelect = true;
      }
      getV3priceData(stock, reqData, true);
      return;

    // ** US stock
    } else {
      var rqId = ajaxRequest('getting price: '+stock, 'getStockPrice', {stock:stock}, getPrice_return, reqData);
      getOptions(reqData);
    }  
  }
}

function getPrice_return(reqData, returnData){
  $(reqData.button).removeClass("loading").html("");

  if (returnData.status == REQ_ERROR){
    addMsg(returnData.desc || "No prices found");
    if (returnData.data_status == 4) _opcGaq.push(['_trackEvent', 'Symbol not found', reqData.stock]);

  }else if (returnData.status == REQ_OK){
    // Normalise stock code
    var stock = reqData.stock;
    if (returnData.symbol_correction !== undefined) {
      $('#'+reqData.eleId+'-symbol').val(returnData.symbol_correction.toUpperCase());
      stock = returnData.symbol_correction.toUpperCase();
    }
    _opcGaq.push(['_trackEvent', 'Symbol search', (stock || '').toLowerCase()]);
    priceCache[stock] = returnData.price;

    // Update fields
    var bestPrice = roundTo(parseFloat(returnData.price.last) > 0
      ? returnData.price.last
      : (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2, 2);
    var marketPrice = roundTo(returnData.price.bid > 0 && returnData.price.ask > 0 
      ? (parseFloat(returnData.price.bid) + parseFloat(returnData.price.ask)) / 2
      : returnData.price.last, 2);
    var ivHist = parseFloat(returnData.price.ivHist) > 0
    ? parseFloat(returnData.price.ivHist)
    : null;

    if ($('#'+reqData.eleId+'-price').val() === "") {
      $('#'+reqData.eleId+'-price').val(bestPrice);
    }
    $('#'+reqData.eleId+'-curPrice').val(bestPrice);
    $('#'+reqData.eleId+'-lastPrice').val(bestPrice);
    $('#'+reqData.eleId+'-marketPrice').val(marketPrice);
    $('#'+reqData.eleId+'-ivHist').val(ivHist);
    $('#'+reqData.eleId+'-updatePriceTime').val(Math.floor(Date.now() / 1000));
    if ($('#'+reqData.eleId+'-curPrice').length > 0 && $('#'+reqData.eleId+'-curPrice').get(0).onchange){
      $('#'+reqData.eleId+'-curPrice').get(0).onchange(); 
    }

    // ** Update option selector dialog if it's already been opened
    if (isDialogOpen()) {
      refreshOpenOptionSelector(getTabNo(reqData.eleId));
    }
 }
}

function isToStock(stock) {
  return stock.indexOf('.to') === stock.length - 3 && stock.length >= 4;
}

function getOptions(data){
  var stock = $('#'+data.uEleId+"-symbol").val().trim();
  var reqData = {stock:stock, uEleId:data.uEleId, eleId:data.eleId};
  if (stock === ""){
    //addMsg("Please enter a stock symbol");

  // ** For Canadian stocks, use the v3 API
  } else if (isToStock(stock)) {
    if (data.showSelect) {
      reqData.showSelect = true;
    }
    getV3priceData(stock, reqData);
    return;
  }else{
    // ** look through requests and add some data if a get_options data call is already out
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
    var rqId = ajaxRequest('getting options: '+stock, 'getOptions', {stock:stock}, getOptions_return, reqData);
  }
}

 // * Cache for a option data, keyed by stock code
var opCache = {};
function getOptions_return(reqData, returnData){
  $('#'+reqData.eleId+"-option .panel_button").removeClass('loading');
  // var tNo = reqData.eleId.slice(1, reqData.eleId.indexOf('e'));
  var tNo = getTabNo(reqData.eleId);

  if (returnData.status == REQ_ERROR){
    opCache[reqData.stock] = REQ_ERROR;
    addMsg(returnData.desc || 'Options not found');
    _opcGaq.push(['_trackEvent', 'Options not found', reqData.stock]);

    // * User has opened the Option Selector and is seeing the loading symbol
    if (reqData.showSelect){
      $('#'+reqData.eleId+'-option_selector').dialog('close');
    }
  }else if (returnData.status == REQ_OK){
    var allOpLegs = $('#strat_'+tNo+'_form input[name$="-expiry"]')
    allOpLegs.each(function(_i, e) {
      var opName = $(e).attr('name').substr(0, $(e).attr('name').length - 7);
      var expiry = $(e).val();
      var strike = $('#strat_'+tNo+'_form input[name="'+opName+'-strike"]').val();
      var opType = $('#strat_'+tNo+'_form select[name="'+opName+'-opType"]').val();
    
      var newPricing = (((returnData.options || {})[expiry] || {})[opType] || {})[strike];
      if (newPricing) {
        var $curPrice = $('#strat_'+tNo+'_form input[name="'+opName+'-curPrice"]');
        var oldCurPrice = parseFloat($curPrice.val());
        var newCurPrice = getBestPrice(newPricing);
        $('#strat_'+tNo+'_form input[name="'+opName+'-curPrice"]').val(newCurPrice);
        if (oldCurPrice !== newCurPrice) {
          $('#strat_'+tNo+'_form input[name="'+opName+'-iv"]').val('');
        }
      }
    });

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
  triggerListener('option_data', { tab_num: tNo, symbol: stock });
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

function getV3priceData(stock, reqData, includePriceUpdate) {
  $.getJSON(V3_API_PATH + '/price/' + stock).always(function(d) {
    if (!d || !d.data || !d.data.result === 'SUCCESS') {
      addMsg('Prices not found');
      $('#'+reqData.eleId+"-loading").hide();
      return;
    }
    var options = d.data.options;
    var newOptions = sortChainOptions(options);
    getOptions_return(
      reqData,
      {
        status: REQ_OK,
        options: newOptions
      }
    );
    if (includePriceUpdate) {
      getPrice_return(
        reqData,
        {
          status: REQ_OK,
          price: d.data.stock
        }
      );
    }
  });
}
