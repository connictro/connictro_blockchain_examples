/*
 * Connictro Blockchain - Web Authentication Example - Client login
 *
 * Reason for logging from client browser is to relieve content server from that task (put as few load on the content server as possible).
 *
 * This module is called in end user MO context, if login failed (never logged in or access token expired).
 * It relies on a cookie "url_and_node_tokens" containing node URL and the token object returned from Connictro Blockchain node.
 * (the cookie can be missing if logging in the first time, or from a private browser session).
 * Should the cookie contain valid content, check for an expired access token, in this case try to refresh using the refresh token.
 * Otherwise present the login window, accepting a credentials JSON (which itself contains clientKey, encHash and clientCertificate).
 * Unlike UI dashboard, don't offer to enter these separately.
 * After successful login, this will set the cookie as described above, redirect back to the webauth demo PHP,
 * and passing the content we received as parameter - to actually show the requested content.
 * Node URL is determined automatically with a constant pointing to the selected chain (development A or B).
 * --> Set this in your demo, according to the development chain assigned to you.
 *
 *
 * Copyright (C) 2022 Connictro GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

const COOKIE_NAME = "url_and_node_tokens";
const DEMO_SCRIPT_URL = "https://www.connictro.de/bc-examples/cb_webauth_demo.php?content=";
const EMPTY_COOKIE = { nodeUrl: "", accessToken: "", refreshToken: "", accessTokenExpires: "", refreshTokenExpires: ""};

const SELECTED_CHAIN = "?"; /* NOTE: "?" will determine the current demo chain by month.
                             * For your own work, please set this instead to to the development chain assigned to you
                             * (A or B), or to "P" if intended to use on the production blockchain.
                             */
var mCookieContent;
var mResourceParam;
var mEncHash;
var mSelectedCredsArray;
var mSelectedSignInActive = false;


function parseUrlParametersWebauth(){
  //console.log("Entering parseUrlParametersWebauth");
  mResourceParam = GetParams['content'];
  gLanguage = GetParams['l'];

  if (mResourceParam == undefined ){
    var invalid_param_msg = (gLanguage == "de") ?
                              "<h3>Ung&uuml;ltiger Parameter</h3>Bitte angeben: content= (Dateiname angeforderter Inhalt)!<br>" :
                              "<h3>Invalid Parameter</h3>Must specify content= (requested file name)!<br>";
    writeToMain(invalid_param_msg);
    return false;
  }
  //console.log("Leaving parseUrlParametersWebauth");
  return true;
}
function readCookie(){
  var _creds_str = Cookies.get(COOKIE_NAME);
  return (_creds_str) ? JSON.parse(_creds_str) : EMPTY_COOKIE;
}

function setCookie(_cookie) {
  var _ckstore_str = JSON.stringify(_cookie);
  const secck = Cookies.withAttributes({
    path: '/',
    secure: true,
    SameSite: "Strict"
  });
  secck.set(COOKIE_NAME, _ckstore_str);
}

function readATCleanedCookie(){
  var _cookie = readCookie();
  if (_cookie.nodeUrl == ""){
    _cookie.nodeUrl = chooseNode(SELECTED_CHAIN);
  }
  _cookie.accessToken = "";
  _cookie.accessTokenExpires = "";
  mCookieContent = _cookie;
}

function badLoginCallbackManual(){
  var _errMsg = (gLanguage == "de") ? "<h3>Fehler: Login fehlgeschlagen!</h3>Bitte versuchen Sie es erneut:<br>" : "<h3>ERROR: Login failed</h3>Please try again:<br>";
  loginScreen(_errMsg);
}

function badLoginCallbackAuto(){
  loginScreen("");
}

function goodLoginCallback(_newCredentials){
  mCookieContent.accessToken = _newCredentials.accessToken;
  mCookieContent.refreshToken = _newCredentials.refreshToken;
  mCookieContent.accessTokenExpires = _newCredentials.accessTokenExpires;
  mCookieContent.refreshTokenExpires = _newCredentials.refreshTokenExpires;
  setCookie(mCookieContent);

  // redirect back to demo PHP, now with credentials in the cookie.
  var newUrl = DEMO_SCRIPT_URL + mResourceParam;
  location.assign(newUrl);
}

function handleCookieConsent(){
  //console.log("Entering handleCookieConsent");
  var consent_granted = $('#cookieConsent').prop('checked');
  document.getElementById("loadCreds").disabled = !consent_granted;

  var multi_picker_id = document.getElementById("signInKeyPicker");
  if (multi_picker_id != null){
    multi_picker_id.disabled = !consent_granted;

    if (mSelectedSignInActive){
      document.getElementById("selectedSignIn").disabled = !consent_granted;
    }
  }
  //console.log("Entering handleCookieConsent");
}

function handleMultiCredsSelection(){
  //console.log("Entering handleMultiCredsSelection");
  var _clientCertificate = "";
  var _selectedKey = $('#signInKeyPicker').val();
  for (var i=0; i<mSelectedCredsArray.length; i++){
    if (mSelectedCredsArray[i].clientKey == _selectedKey){
      _clientCertificate = mSelectedCredsArray[i].clientCertificate;
      break;
    }
  }
  loginCredsSelectedAction(_selectedKey, mEncHash, _clientCertificate);
  //console.log("Entering handleMultiCredsSelection");
}

function loginScreen(_errMsg){
  var _demo_signinpage = (_errMsg ? _errMsg : "");

  var demo_title_text = (gLanguage == "de") ? "Web Authentisierung - Demo f&uuml;r gesch&uuml;tzte Inhalte" : "Web authentication - protected content demo";
  var demo_signin_text = (gLanguage == "de") ? "Einloggen mittels Zertifikatsdatei" : "Sign in using certificate file";
  var demo_cookie_consent_text = (gLanguage == "de") ? "Zustimmung zu technisch notwendigen Cookies erteilen" : "Consent to technically necessary cookies";
  var demo_cookie_notrackinfo = (gLanguage == "de") ?
      "(Nur das geladene Zertifikat wird im Cookie gespeichert - Wir setzen keine Tracking-Mechanismen ein!)" :
      "(Only the loaded certificate will be stored in the cookie - We're not using any tracking mechanisms!)";

  _demo_signinpage +=
    "<h3>" + demo_title_text + "</h3>" +
    "<b>" + demo_cookie_consent_text + ":</b>&nbsp;<input type=\"checkbox\" id=\"cookieConsent\">&nbsp;&nbsp;" +
    demo_cookie_notrackinfo + "<br><br>" +
    "<b>" + demo_signin_text + ":</b>&nbsp;" +
    "<input type=\"file\" id=\"loadCreds\" />";
  _demo_signinpage += "<div id=\"selectMultiCreds\"></div>"
  writeToMain(_demo_signinpage);
  document.getElementById("loadCreds").disabled = true;

  // As callback for the file selector use loginCredsSelected().
  $("#loadCreds").on('change', function (e) {
    //console.log("in eventlistener for file open button");
    openLocalFile(e.target.files, loginCredsSelected);
  });
  $("#cookieConsent").click(function (e) {
    handleCookieConsent();
  });
}

function loginCredsMultipleAction(_encHash, _selectedCredsArray){
  //console.log("Entering loginCredsMultipleAction");
  /* If a credentials fiel with multiple sign-in keys was selected, draw a selection option with handlers.
   * Final sign-in will happen if a selection has been made and the handleMultiCredsSelection is called by
   * clicking on the "Sign in" button.
   */
  var _htmlMultiKeySelect = (gLanguage == "de") ? "<h3>Mehrere Zertifikate enthalten - bitte ausw&auml;hlen</h3>" : "<h3>Detected multiple certificates - please select</h3>";
  var select_key_text = (gLanguage == "de") ? "W&auml;hlen Sie bitte das Zertifikat aus" : "Please select the certificate";
  var sign_in_text = (gLanguage == "de") ? "Einloggen" : "Sign in";
  _htmlMultiKeySelect += "<select id=\"signInKeyPicker\" class=\"browser-default\">" +
                          "<option value=\"\" disabled selected>" + select_key_text + "</option>";

  for (var i=0; i<_selectedCredsArray.length; i++){
    _htmlMultiKeySelect += "<option value=\"" + _selectedCredsArray[i].clientKey + "\">" + _selectedCredsArray[i].clientKey + "</option>";
  }
  _htmlMultiKeySelect += "</select><br><br><button id=\"selectedSignIn\" type=\"submit\" name=\"selectedSignIn\">" + sign_in_text + "</button>";

  mEncHash = _encHash;
  mSelectedCredsArray = _selectedCredsArray;
  writeToSection("selectMultiCreds", _htmlMultiKeySelect);
  document.getElementById("selectedSignIn").disabled = true;

  $("#signInKeyPicker").on('change', function (e) {
    document.getElementById("selectedSignIn").disabled = false;
    mSelectedSignInActive = true;
  });

  $("#selectedSignIn").click(function (e) {
    e.preventDefault();
    handleMultiCredsSelection();
  });
  //console.log("Leaving loginCredsMultipleAction");
}

function loginCredsSelectedAction(_clientKey, _encHash, _clientCertificate){
    doJustSignin(goodLoginCallback, badLoginCallbackManual, mCookieContent.nodeUrl, _clientKey, _encHash, _clientCertificate);
}

function checkRTValid(){
  if (!mCookieContent.refreshToken) return false;
  if (!checkTokenValid(mCookieContent.refreshTokenExpires)) return false;
  return true;
}

function loginPreCheck(){
  //console.log("Entering loginPreCheck");
  if (!parseUrlParametersWebauth()) return;
  readATCleanedCookie();

  if (checkRTValid()){
    doJustSigninRefresh(goodLoginCallback, badLoginCallbackAuto, mCookieContent.nodeUrl, mCookieContent.refreshToken);
  } else {
    badLoginCallbackAuto();
  }
  //console.log("Leaving loginPreCheck");
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    loginPreCheck();
  });

