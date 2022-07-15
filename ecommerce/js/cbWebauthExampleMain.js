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

const CHAIN_PORT_A = 58081; // For A development chain (starting Jan-Mar-May-Jul-Sep-Nov)
const CHAIN_PORT_B = 58082; // For B development chain (starting Feb-Apr-Jun-Aug-Oct-Dec)
                            // For production chain set to 58080 (not recommended for this demo as all data in production will be PERMANENT!).

const SELECTED_CHAIN = "A"; // NOTE: Set this to the development chain assigned to you.

const DEV_NODE_LIST = [
        "https://node1.connictro-blockchain.de:",
        "https://node2.connictro-blockchain.de:",
        "https://node3.connictro-blockchain.de:"
        ]
var gRandNode = null;
var gLanguage;
var gCookieContent;
var gResourceParam;

/*
 * This chooses a random blockchain node for some load balancing.
 * Until reloaded the node will stay the same.
 * Development service currently runs on 3 nodes.
 * Chains A and B both run on these nodes but on different ports.
 */
function chooseNode(_chain){
  var _numNodes = DEV_NODE_LIST.length;
  if (gRandNode == null){
    gRandNode = Math.floor(Math.random() * _numNodes);
  }
  var _chainPort = (_chain == 'a' || _chain == 'A') ? CHAIN_PORT_A: CHAIN_PORT_B;
  return (DEV_NODE_LIST[gRandNode] + _chainPort);
}

function parseUrlParameters(){
  //console.log("Entering parseUrlParameters");
  gResourceParam = GetParams['content'];
  gLanguage = GetParams['l'];

  if (gResourceParam == undefined ){
    var invalid_param_msg = (gLanguage == "de") ?
                              "<h3>Ung&uuml;ltiger Parameter</h3>Bitte angeben: content= (Dateiname angeforderter Inhalt)!<br>" :
                              "<h3>Invalid Parameter</h3>Must specify content= (requested file name)!<br>";
    writeToMain(invalid_param_msg);
    return false;
  }
  //console.log("Leaving parseUrlParameters");
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
  gCookieContent = _cookie;
}

function badLoginCallbackManual(){
  var _errMsg = (gLanguage == "de") ? "<h3>Fehler: Login fehlgeschlagen!</h3>Bitte versuchen Sie es erneut:<br>" : "<h3>ERROR: Login failed</h3>Please try again:<br>";
  loginScreen(_errMsg);
}

function badLoginCallbackAuto(){
  loginScreen("");
}

function goodLoginCallback(_newCredentials){
  gCookieContent.accessToken = _newCredentials.accessToken;
  gCookieContent.refreshToken = _newCredentials.refreshToken;
  gCookieContent.accessTokenExpires = _newCredentials.accessTokenExpires;
  gCookieContent.refreshTokenExpires = _newCredentials.refreshTokenExpires;
  setCookie(gCookieContent);

  // redirect back to demo PHP, now with credentials in the cookie.
  var newUrl = DEMO_SCRIPT_URL + gResourceParam;
  location.assign(newUrl);
}


function loginScreen(_errMsg){
  var _demo_signinpage = (_errMsg ? _errMsg : "");

  _demo_signinpage += (gLanguage == "de") ?
    "<h3>Web Authentisierung - Demo f&uuml;r gesch&uuml;tzte Inhalte</h3>" +
    "<b>Einloggen mittels Zertifikatsdatei:</b>&nbsp;" +
    "<input type=\"file\" id=\"loadCreds\" />"
     :
    "<h3>Web authentication - protected content demo</h3>" +
    "Sign in using certificate file:&nbsp;" +
    "<input type=\"file\" id=\"loadCreds\" />" ;
  writeToMain(_demo_signinpage);
  // As callback for the file selector use loginCredsSelected().

  $("#loadCreds").on('change', function (e) {
    //console.log("in eventlistener for file open button");
    openLocalFile(e.target.files, loginCredsSelected);
  });
}

function loginCredsSelectedAction(_clientKey, _encHash, _clientCertificate){
    doJustSignin(goodLoginCallback, badLoginCallbackManual, gCookieContent.nodeUrl, _clientKey, _encHash, _clientCertificate);
}

function checkRTValid(){
  if (!gCookieContent.refreshToken) return false;
  if (!checkTokenValid(gCookieContent.refreshTokenExpires)) return false;
  return true;
}

function loginPreCheck(){
  //console.log("Entering loginPreCheck");
  if (!parseUrlParameters()) return;
  readATCleanedCookie();

  if (checkRTValid()){
    doJustSigninRefresh(goodLoginCallback, badLoginCallbackAuto, gCookieContent.nodeUrl, gCookieContent.refreshToken);
  } else {
    badLoginCallbackAuto();
  }
  //console.log("Leaving loginPreCheck");
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    loginPreCheck();
  });

