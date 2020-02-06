function openSMSurvey() {
  $('#sm-survey-wrapper').fadeIn(100);
  $('.survey-teaser').fadeOut(100);
  setCookie('survey_completed', true, { expiry_days: 365 });
}
function closeSMSurvey() {
  $('#sm-survey-wrapper').fadeOut(100);
}
