
function showInitDetails(link){
  var tNo = $(link).parents(".stratContent").attr('id')
  tNo = tNo.substr(6, tNo.lastIndexOf('_'));

  $('#t'+tNo+'_graph-detail').html('').dialog('option','title','Detail: Entry cost');
  if (viewStyle == 'mobile'){
    var ww = $(window).width(),
        wh = $(window).height();
    // $('#t'+tNo+'_graph-detail').dialog('option', {width: ww-5, height:wh-5});
  }
  $('#t'+tNo+'_graph-detail').html('').dialog('open');
  $('#t'+tNo+'_graph-detail').html(getCellSummary(tNo, results[tNo]['initial'], true));
}
