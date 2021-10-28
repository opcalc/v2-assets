function addMsg(text, level){
  if (level == undefined) level = 'error';

  if (level == 'verbose'){ alert(text); return false; }

  $("#status_messages").append("<div class='msg txt_"+level+" __showing'>"+text+" <a href='#close' class='close_x' title='close' onclick='return closeMsg(this);'>&times;</a></div>");
  var msg = $("#status_messages .msg:last").eq(0)
  setTimeout(function() {
    $(msg).removeClass('__showing')
  }, 400);
  setTimeout(function() {
    closeMsg(undefined, msg);
  }, 3000);
}

function closeMsg(closeX, msg) {
  var msg = msg || $(closeX).parent();
  $(msg).addClass('__hiding');
  setTimeout(function() {
    $(msg).remove();
  }, 400);
}
