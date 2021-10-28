
function ivChangeOnFocus(t_no) {
  // reset inputs to current value
  var savedVal = parseFloat($('#t'+t_no+'_ivChange-val').val());
  $('#t'+t_no+'_ivChange--input').val(savedVal > 0 ? '+' + savedVal : savedVal);
  $("#t"+t_no+"_ivSlider").slider('value', savedVal);
  $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'hidden');

  $("#t"+t_no+"_ivChangeCard").fadeIn(100);
  var clickHandle;
  clickHandle = function(e) {
    if (e.target.id !== "t"+t_no+"_ivChangeCard" && !$(e.target).parents("#t"+t_no+"_ivChangeCard").length) {
      $("#t"+t_no+"_ivChangeCard").fadeOut(100);
      $(document).off('click', clickHandle);
    }
  };
  setTimeout(function() {
    $(document).on('click', clickHandle);
    $('#t'+t_no+'_ivChange--input').focus();
  }, 30);
}

function ivChangeOnKeyup(t_no, val, noUpdateSlider) {
  if (!noUpdateSlider) {
    $("#t"+t_no+"_ivSlider").slider('value', parseFloat(val));
  }
}

function ivSetVal(t_no, val) {
  var fmtVal = val > 0 ? '+' + val : val;
  $("#t"+t_no+"_ivSlider").slider('value', val);
  $("#t"+t_no+"_ivChange--input").val(fmtVal);
  ivChangeChkUpdateNeeded(t_no);
}

function ivChangeChkUpdateNeeded(t_no) {
  var newVal = $('#t'+t_no+'_ivChange--input').val();
  var curVal = $('#t'+t_no+'_ivChange-val').val();
  if (parseFloat(newVal || '0') !== parseFloat(curVal || '0')) {
    $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'visible');
  } else { 
    $("#t"+t_no+"_ivSlider--updateBtn").css('visibility', 'hidden');
  }
}
function ivChangeUpdate(t_no) {
  $('#t'+t_no+'_ivChange-val').val(
    parseFloat($('#t'+t_no+'_ivChange--input').val()) || '0'
  );
  $('#t'+t_no+'_submit').click();
}
