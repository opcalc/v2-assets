function getMatrixCode(graphData, ) {
  var output = '<table class="graph" cellpadding="1" cellspacing="0">';
  var c = 0;
  var disCol = '';
  var disVal = '';
  var xCls, thr, thr2='', tdr, colDate, colDateM;
  var thrMonth = date('m', graphData.start_date);
  var thrSpan = 0;
  var xLast;

  var strikes = Object.keys(graphData.data).sort(function(a, b) {
    // descending
    var fa = parseFloat(a);
    var fb = parseFloat(b);
    return fa > fb ? -1 : fa < fb ? 1 : 0;
  });

  // var numDates = graphData.data[strikes[0]].length;
  // output += '<tr><td colspan="'+(numDates + 2)+'">' + pre + '</td></tr>';

  for (var xi = 0; xi < strikes.length; xi++) {
    var x = strikes[xi];

    if (c==0){
      thr = [[graphData.start_date, 0]];
      thr2 = '<tr><th>'+graphData.underlying_symb+'</th>';
    }

    var xRc = (xLast != undefined && xLast > graphData.underlying_current_price && x < graphData.underlying_current_price) ?
      "curPriceAbove" :
      (roundTo(x,2) == roundTo(graphData.underlying_current_price, 2) ? 'curPriceRow':'');


    tdr="<tr name='"+x+"'"+(xRc != '' ? " class='"+xRc+"'":'')+"><th class='x'>"+x+'</th>';

    var lastTs = Object.keys(graphData.data[x]);
    var lastT = lastTs[lastTs.length - 1];

    for (var t in graphData.data[x]){
      if (c==0){
        colDate = parseInt(graphData.start_date,10) + (3600*24) * t;
        colDateM = date('m', colDate);
        if (colDateM == thrMonth){
          thr[thr.length-1][1]++;
        }else{
          thr.push([colDate, 1]);
          thrMonth = colDateM;
        }

        if (t == lastT) {
          thr2 += '<th class="t z'+((thr.length-1)%2 +1)+'" name="'+t+'">Exp</th>';
          thr2 += '<th class="pct">+/-%</th>';
        } else {
          thr2 += '<th class="t z'+((thr.length-1)%2 +1)+'" name="'+t+'">'+date('j', colDate)+'</th>';
        }
      }

      // * round/format text to fit
      disVal = fmtNumToFit(getDisValByType(graphData, graphData.data[x][t].g));
      disCol = colorByDis(disVal, graphData.data[x][t].g, graphData);

      xCls = '';
      // * class/style
      if ((disVal.length ? disVal : disVal.toString()).length >= 4)// >= 1000 || disVal <= -100)
        xCls += ' four_digit';
        
      if ((disVal.length ? disVal : disVal.toString()).length >= 5)// >= 1000 || disVal <= -100)
        xCls += ' five_digit';

      tdr += "<td name='t"+t+"-x"+x+"' class='d"+xCls+" "+disCol+"'>"+(disVal)+'</td>';

      if (t == lastT) {
        tdr += '<td class="pct">' + roundTo(100 * (x - graphData.underlying_current_price) / graphData.underlying_current_price, 2, true) + '%</td>';
      }

      xLast = x;
      // !!! class+='p95t100' etc

    }

    if (c==0){
      output += "<tr><th>&nbsp;</th>"
      for(var i in thr){
        if (thr[i][1] > 0) {
          output += "<th colspan='"+(thr[i][1])+"' align='center' class='z"+((i%2) +1)+"'>"+date("M",thr[i][0])+"</th>";
        }
      }
      output += '<td>&nbsp;</td>';
      output += "</tr>";
      thr2 += '</tr>';

      output += thr2
    }

    tdr += "</tr>";
    output += tdr;

    c++;
  }
  output += '</table>';

  return output;
}