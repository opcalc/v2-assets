
function getSharingCode(tab_num){
  return "<div class='shareHolder'>\n\
  <span>Share this on:</span>\n\
  <div class='shareMenu'>\n\
    <a href='#' onclick='loadShare({type:\"fb\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Share this calculation on facebook' class='facebook shareIcon'>Facebook</a>\n\
    <a href='#' onclick='loadShare({type:\"tw\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Tweet this calculation on twitter' class='twitter shareIcon'>Tweet this</a>\n\
    or <a href='#' onclick='loadShare({type:\"link\", tab_num:"+tab_num+", link_ele:this}); return false;' title='Short-link' class='link'>Get short-link to share</a>\n\
  </div>\n\
  <div class='sharePanel'></div>\n\
</div>";
}
function loadShare(cfg){
  if (cfg.type == 'link'){
    $(cfg.link_ele).parent().addClass('active').addClass(cfg.type);
    var sharePanel = $('.sharePanel', $(cfg.link_ele).parent().parent());
    sharePanel.show();
  }
  if (results[cfg.tab_num]['link_code'] != undefined){
    cfg.link_code = results[cfg.tab_num]['link_code'];
    //!!! send request to update the saved tab
    showShare(cfg);
  }else{
    if (cfg.type == 'link'){
      sharePanel.html("<P>"+getLoadingHtml('Getting link')+"</P>");
      var rqId = ajaxRequest("getting share link", 'linkCode', {'tab_num':cfg.tab_num}, loadShare_return, cfg);
    }else
      window.open(WEB_PATH+'share.html?m='+cfg.type+'&t='+cfg.tab_num, 'share', "width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes");
  }
}

function loadShare_return(reqData, returnData){
  results[reqData.tab_num]['link_code'] = returnData.link_code;
  $(reqData.addThis_ele).click();
  reqData.link_code = returnData.link_code
  showShare(reqData);
}

function showShare(cfg){
  var strat_text = {
    'covered-call':'Covered Call',
    'long-call':'Long call',
    'short-call':'Naked call',
    'long-put':'Long put',
    'short-put':'Naked put',
    'call-spread':'Call Spread',
    'put-spread':'Put Spread',
    'calendar-spread':'Calendar Spread',
    'straddle':'Straddle',
    'collar':'Collar',
    'iron-condor':'Iron Condor',
    'butterfly':'Butterfly'
  };
  var promoTxt = [['Check out this ',''],['',' is looking good'],['This ',' is worth watching'],['',' worth keeping an eye on'],
    ['Nice ','']]; //,['1. ',', 2. ???, 3. Profit']
  var rnd = Math.floor(Math.random() * promoTxt.length);
  var txt = promoTxt[rnd][0] + results[curTab].underlying_symb+' '+strat_text[results[curTab].strat] +promoTxt[rnd][1];

  var sharePanel = $('.sharePanel', $(cfg.link_ele).parent().parent());
  var shareLink, blockedText;
  if (cfg.type == 'fb'){
    shareLink = 'https://www.facebook.com/sharer.php?u='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code);
    //blockedText = 'Share this calculation on facebook';
  }
  else if (cfg.type == 'tw'){
   shareLink = 'https://twitter.com/intent/tweet?status='+encodeURIComponent(txt)+': '+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code)+'+via+@opcalc&url='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code)+'&via=opcalc';
    //blockedText = 'Tweet this calculation on twitter';
  }
  else if (cfg.type == 'link'){
    sharePanel.html("<P>"+'Copy this link to share via email, forums or other sharing services:</p><p><input type="text" style="font-weight:bold; width:100%;" value="'+BASE_SHORT_URL+WEB_PATH+cfg.link_code+'"/></p>');
  }
  else if (cfg.type == 'gg'){
   shareLink = 'https://plus.google.com/share?url='+encodeURIComponent(BASE_SHORT_URL+WEB_PATH+cfg.link_code);
  }

  if (shareLink){
    var oWin = window.open(shareLink, 'share', "width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes");
    //sharePanel.html("<P>"+'Popup blocked? Use this link: <a href="'+shareLink+'" target="_blank" onclick="window.open(\''+shareLink+'\', \'share\', \'width=650,height=400,left=100,top=100,scrollbars=yes,resizable=yes\'); return false;">'+blockedText+'</a></p>');
  }
}

function getLinkBut(self){
  return $('.linkBox', $(self).parent()).slideDown();
}
function closeLinkBox(self){
  return $(self).parent().slideUp();
}
