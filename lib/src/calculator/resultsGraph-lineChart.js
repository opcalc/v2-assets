
function loadCharts() {
  google.charts.load('current', {'packages':['corechart']});
}
$(document).ready(function() {
  var firstCheckTime = Date.now();
  var chartInterval = setInterval(
    function() {
      var timeNow = Date.now();
      var chartsCanBeLoaded = typeof google !== 'undefined' && typeof google.charts !== 'undefined';
      if (chartsCanBeLoaded) {
        loadCharts();
      }
      if (chartsCanBeLoaded || (timeNow - firstCheckTime) > 5000) {
        clearInterval(chartInterval);
      }
    },
    250
  );
})

function renderRiskGraph(graphData, t_no){
  function haveChartsLoaded() {
    return typeof google !== 'undefined' && typeof google.visualization  !== 'undefined' && typeof google.visualization.arrayToDataTable  !== 'undefined' && typeof google.visualization.LineChart !== 'undefined';
  }
  if (haveChartsLoaded()) {
    setTimeout(function() {
      renderRiskGraph_1(graphData, t_no);
    }, 5)
    return;
  }
  var firstCheckTime = Date.now();
  var graphInterval = setInterval(
    function() {
      var timeNow = Date.now();
      var chartsLoaded = haveChartsLoaded();
      if (chartsLoaded || (timeNow - firstCheckTime) > 5000) {
        clearInterval(graphInterval);
      }
      if (chartsLoaded) {
        renderRiskGraph_1(graphData, t_no);
      }
    },
    250
  );
}

function renderRiskGraph_1(graphData, t_no){
    var lineGraphData = ['header_place_holder'];
    var uPrice = results[t_no]['underlying_current_price'];

    var timeCount, x, vMax = -10000000, vMin = 10000000, tVal,
        colorPalette = [
          '#ff8888', '#ffcc00', '#88ff88', '#66ffff', '#8888ff', '#ff66ff',
          '#996666', '#999944', '#669966', '#449999', '#666699', '#994499'
        ];
        tHeader = ['Strike'],
        header = false,
        dataLine = [],
        dataStr = '',
        colors = [],
        tColor = 0, tColor2 = 0,
        tTimeLen = false,
        graphTimeScale = false,
        timeIndex = [],
        dataIdx = index_assoc_array(graphData.data),
        graphPriceMin = false;

    // var stratScale = Object.keys(graphData.initial.O).reduce(
    //   function(min, oName) {
    //     if (parseInt(graphData.initial.O[oName].n, 10) < min)
    //       return parseInt(graphData.initial.O[oName].n, 10);
    //     return min;
    //   },
    //   1000000000
    // ) || 1;
    var isDebit = graphData.initial.g < 0
    if (isDebit) {
      tHeader.push("(Stock comparison)");
      colors.push("#18357F");
    }
    var showYear = false;
    for(var i in dataIdx) if (dataIdx.hasOwnProperty(i)){
      x = dataIdx[i];
      if (graphPriceMin === false) graphPriceMin = parseFloat(x);
      //graphData.data) if (graphData.data.hasOwnProperty(x)){
      dataLine = [parseFloat(x)];
      if (isDebit) {
        dataLine.push(parseFloat(roundTo(getDisValByType(graphData, -graphData.initial.g + ((parseFloat(x) - uPrice) * (-graphData.initial.g / uPrice))),2)));
      }
      timeCount = 0;

      if (false === header){
        var years = {};
        for(var t in graphData.data[x]) if (graphData.data[x].hasOwnProperty(t)){
          years[date('Y', (parseInt(graphData.start_date,10) + (3600*24) * t))] = 1;
        }
        if (Object.keys && (Object.keys(years) || []).length > 1) showYear = true;
      }
      for(var t in graphData.data[x]) if (graphData.data[x].hasOwnProperty(t)){
        if (false === tTimeLen){ // find out the max time
          for(var tt in graphData.data[x]) if (graphData.data[x].hasOwnProperty(tt) &&
            (tTimeLen < parseInt(tt,10) || tTimeLen === false)) tTimeLen = parseInt(tt,10);

          if (tTimeLen / graphData.time_scale > 10){
            // can't show them all
            graphTimeScale = graphData.time_scale * Math.ceil(tTimeLen / (10 * graphData.time_scale));
          }else graphTimeScale = 1;
        }
        if ((tTimeLen - t) % graphTimeScale == 0){
          // if (first time through) put the date as the data header row
          if (false === header){
            tHeader.push(date('j M' + (showYear ? ' y' : ''), (parseInt(graphData.start_date,10) + (3600*24) * t)));
            // tColor = 204-Math.round(204 * t / tTimeLen);
            // tColor = "00"+(tColor.toString(16));
            // tColor = tColor.substr(tColor.length-2, 2);
            // tColor2 = 204+Math.round(51 * t / tTimeLen);
            // tColor2 = "00"+(tColor2.toString(16));
            // tColor2 = tColor2.substr(tColor2.length-2, 2);
            // colors.push("#"+tColor+tColor+tColor2.toString(16));
            colors.push(timeCount == 0 ? '#cccccc' : colorPalette[(timeCount-1) % colorPalette.length]);
            timeIndex.push(t);
          }
          var tVal = parseFloat(roundTo(getDisValByType(graphData, graphData.data[x][t].g),2));
          dataLine.push(tVal);
          if (tVal > vMax) vMax = tVal;
          if (tVal < vMin) vMin = tVal;
              // / (graphData.graph_type == 'riskGraphPrice'? 1 : 100); // if it's in percent, make it decimal
          timeCount++;
        }
      }
      lineGraphData.push(dataLine);
      if (false === header) header = tHeader;
    }
    header.push('Current');
    colors.push('#666666');
    lineGraphData.push([parseFloat(uPrice)]);
    lineGraphData[lineGraphData.length - 1][header.length - 1] = vMin - ((vMax-vMin) * .1);
    lineGraphData.push([parseFloat(uPrice)]);
    lineGraphData[lineGraphData.length - 1][header.length - 1] = vMax + ((vMax-vMin) * .1);
    lineGraphData[0] = header;
    for (i = 1; i < lineGraphData.length - 2; i++)
      lineGraphData[i][lineGraphData[i].length] = null;
    // Don't show data for interim dates for current date line, or for breakeven 0 line
    for (i = 1; i < lineGraphData[0].length - 1; i++){
      lineGraphData[lineGraphData.length-1][i] = null;
      lineGraphData[lineGraphData.length-2][i] = null;
    }
    var seriesData = {};
    seriesData[timeCount-1] = {lineWidth:2};
    if (isDebit) {
      seriesData[0] = { lineDashStyle: [6, 4] };
    }


    var options = {
      colors: colors,
      lineWidth: 1,
      series: seriesData,
      reverseCategories: false,
      chartArea: {width: isMobile() ? '83%' : showYear ? "69%" : "75%", left: isMobile() ? 70 : 90, top:20, height:"85%"},
      vAxis:{
        viewWindow: {
          max: vMax + ((vMax-vMin) * .1),
          min: vMin - ((vMax-vMin) * .1)
        },
        title:(array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? 'Dollars' : 'Percent'),
        format: array_includes(['riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type) ? '$#,###.##' : '#.##\'%\'',
        viewWindowMode: 'maximized'
      },
      hAxis:{ title: graphData.underlying_symb, format: "$#,###.##" },
      legend: isMobile() ? { position: 'bottom', alignment: 'start' } : {}
    };

    if (!array_includes(['price', 'riskGraphPrice', 'riskGraphRawValue'], graphData.graph_type)){
      options.vAxis.minValue = -110;
    }

    var data = google.visualization.arrayToDataTable(lineGraphData);
    for(var i = 0; i < timeIndex.length; i++){
      data.setColumnProperty(i+2, 'time', timeIndex[i]);
    }
    data.setColumnProperty(lineGraphData[0].length-1, 'current', true);
    data.setColumnProperty(1, 'comparison', true);

    results[t_no].riskChartData = data;
    results[t_no].riskChart = new google.visualization.LineChart($("#t"+t_no+"_graph .google_chart_holder")[0]);
    google.visualization.events.addListener(results[t_no].riskChart, "select",
          function(event) {
            //data.sort([{column: event.column, desc: !event.ascending}]);
            //chart.draw(view);
            var selection = results[t_no].riskChart.getSelection();
            if (selection.length > 0 && selection[0].row != undefined){
              var selected = selection[0];
              if (
                results[t_no].riskChartData.getColumnProperty(selected.column, 'current') == true ||
                results[t_no].riskChartData.getColumnProperty(selected.column, 'comparison') == true
              ) {
                return false;
              }

              var dateSelected = results[t_no].riskChartData[0]
              var date = results[t_no].riskChartData.getColumnLabel(selected.column);
              var t = results[t_no].riskChartData.getColumnProperty(selected.column, 'time');
              var strike = roundTo(results[t_no].riskChartData.getValue(selected['row'], 0), 2, true, false);

              $('#t'+t_no+'_graph-detail').html('').dialog('option','title','Detail: $'+strike+ " on " +date);
              if (viewStyle == 'mobile'){
                var ww = $(window).width(),
                    wh = $(window).height();
                // $('#t'+t_no+'_graph-detail').dialog('option',
                //   {width: ww-5,
                //    height:wh-5});
              }
              $('#t'+t_no+'_graph-detail').html('').dialog('open');
              $('#t'+t_no+'_graph-detail').html(getCellSummary(curTab, results[curTab]['data'][strike][t]));
            }
          });
    results[t_no].riskChart.draw(data, options);
}
