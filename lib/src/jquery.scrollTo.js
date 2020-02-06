/**
 * jQuery.ScrollTo - Easy element scrolling using jQuery.
 * Copyright (c) 2007-2009 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 5/25/2009
 * @author Ariel Flesler
 * @version 1.4.2
 *
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 */
(function($){
  $.scrollTo = function(s, t) {
    var curScrollY = $('html').scrollTop();
    var elePosY = $(s).offset().top;
    var winHeight = $(window).innerHeight();

    var scrollToY
    if (elePosY < curScrollY) {
      scrollToY = elePosY;
    } else if (elePosY < curScrollY + (winHeight * 2/3)) {
      scrollToY = false;
    } else {
      scrollToY = elePosY - (winHeight * (1/3));
    }
    if (scrollToY !== false) {
      $('html, body').animate({
        scrollTop: scrollToY
      }, t === undefined ? 500 : t);
    }
  }
})(jQuery);
