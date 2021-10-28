function jq_exclusive_switch(switchObj, time, switchType, flash){
	if (switchType == undefined) switchType = '';
	else switchType = switchType+"_";
	var switchName= switchObj.attr('name');
	var colonLocation = switchName.indexOf(":");
	var targetNames = switchName.substring(0, colonLocation);
	var targetId = switchName.substring(colonLocation+1);	
  
  var target = $("#"+targetId+".jq_exclusive_"+switchType+"target");
	var aSwitch = $(switchObj[0]);
  if (array_includes(['tablet', 'mobile'], viewStyle) && target.attr('data-switch-toggle')) {
		setTimeout(
			function() {
				target.toggle(time);
				if (aSwitch.hasClass('_-selected')) {
					aSwitch.removeClass('_-selected');
				} else {
					aSwitch.addClass('_-selected');
				}
				if (typeof updateStratAdStickiness !== 'undefined') updateStratAdStickiness();
			},
			flash ? 100 : 0
		);
	} else {
		setTimeout(
			function() {
				target.show(time);
				if (typeof updateStratAdStickiness !== 'undefined') updateStratAdStickiness();
			},
			flash ? 100 : 0
		);
	}
	$(".jq_exclusive_"+switchType+"target").filter("[name='"+targetNames+"']").not(target).hide(time);

	var parentObj = switchObj.parents('.dialog_tab, .unique_switch');
	if (parentObj.is(".dialog_tab")){ // ** tabs - change tab styles
		parentObj.siblings().removeClass('dialog_tab_selected');
		parentObj.siblings().addClass('dialog_tab');
		parentObj.addClass('dialog_tab_selected');
	}else if (parentObj.is(".unique_switch")){ // ** undefined, generic tab styles.  Left undefined incase page/course specific tabs desired
		parentObj.siblings().removeClass('unique_switch_selected');
		parentObj.siblings().addClass('unique_switch');
		parentObj.addClass('unique_switch_selected');
	}
return false;
}

function init_funcs(cfg){
	$('.jq_exclusive_switch').click(function() {
		return jq_exclusive_switch($(this), 0);
	});
	$('.jq_exclusive_switch_flash').click(function() {
		return jq_exclusive_switch($(this), 0, undefined, true);
	});
	// ** .jq_exclusive_slide_switch = 200ms hide/show
	$('.jq_exclusive_slide_switch').click(function() {
		return jq_exclusive_switch($(this), 100, 'slide');
	});
	$("#msg").ajaxError(function(event, request, settings, thrownError){
	});
}

$.fn.extend({getTH: function(){
  var col = $(this).prevAll().length;
  var headerObj = $(this).parents('table').find('td, th').eq(col);
  
  return headerObj;
}});

$.fn.extend({getRowTH: function(){
  var headerObj = $(this).parents('tr').find('th').eq(0);

  return headerObj;
}});

function viewMore(t){
  $(".more", $(t.currentTarget).parent()).slideToggle(100);
  if ($(this).hasClass("expanded"))
    $(t.currentTarget).removeClass("expanded");
  else
    $(t.currentTarget).addClass("expanded");
  return false;
}

function expandFollowElement(ele) {
  var nextEle = $(ele).next();
  var expandedIndicator = $('span', ele);
  if (nextEle.css('display') === 'block') {
    nextEle.slideUp(100);
    expandedIndicator.text('+ ');
  } else {
    nextEle.slideDown(100);
    expandedIndicator.text('– ');
  }
}
