/*
 * Helpers for Connictro Blockchain Permit/Voucher Example
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

const CHAIN_PORT_P = 58080; // Production blockchain - only use for productive purposes, not for demos/testing.
const CHAIN_PORT_A = 58081; // 58081 is the default port for A development chain (reset in Jan-Mar-May-Jul-Sep-Nov)
const CHAIN_PORT_B = 58082; // For B development chain (reset Feb-Apr-Jun-Aug-Oct-Dec) set to 58082.

const DEV_NODE_LIST = [
        "https://node1.connictro-blockchain.de:",
        "https://node2.connictro-blockchain.de:",
        "https://node3.connictro-blockchain.de:"
        ]
const PROD_NODE_LIST = [
        "https://node1.connictro-blockchain.de:",
        "https://node2.connictro-blockchain.de:",
        "https://node3.connictro-blockchain.de:",
        "https://node4.connictro-blockchain.de:",
        "https://node5.connictro-blockchain.de:"
        ]

const API_REFRESH_BEFORE_EXPIRE_MILLISECONDS = 30000;

const life_states_de = ["ung&uuml;ltig", "zur&uuml;ckgegeben", "abgelaufen", "g&uuml;ltig!", "wartet auf Pairing", "wartet auf Validierung", "noch nicht aktiv (bereitgestellt)", "noch nicht aktiv"];
const life_states_en = ["invalid", "returned", "expired", "valid", "waiting for pairing", "waiting for validation", "not yet active (provisioned)", "not yet active"];

var gShowingHistory = false; // for demos showing/hiding a history or report section. Tracks wheter the section is shown or not.
var gRandNode = null;
var gLanguage;
var gShowCallback;
var gHideCallback;
var gAreaSectionId;

/* ===============================================================================================
 * Connictro Blockchain service API handling
 * ===============================================================================================
 */

/*
 * Sign in/ Sign out:
 */
function doSignin(_server, _clientKey, _encHash, _clientCertificate){
  return new Promise((resolve, reject) => {
    //console.log("Entering doSignin, URL: " + _server + "'/cbv1/mos/signin?clientKey=" + _clientKey + "&encHash=" + _encHash + "&clientCertificate=" + _clientCertificate);
    $.ajax({
      type: 'post',
      url: _server + '/cbv1/mos/signin?' + jQuery.param({ clientKey: _clientKey, encHash: _encHash, clientCertificate: _clientCertificate }),
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      success: function (response) {
          //console.log(response);
          var _ck = { server: _server,
                      clientKey: _clientKey,
                      accessToken: response.accessToken,
                      accessTokenExpires: response.accessTokenExpires,
                      refreshToken: response.refreshToken,
                      refreshTokenExpires: response.refreshTokenExpires,
                      moFields: null,
                      moAssets: null
                    }
          //console.log("Resolving doSignin (success)");
          resolve(_ck);
      },
      error: function (response) {
          //console.log(response);
          //console.log("Resolving doSignin (failure)");
          reject(null);
      }
    });
  });
}

function doSigninRefresh(_server, _refreshToken){
  return new Promise((resolve, reject) => {
    //console.log("Entering doSigninRefresh, URL: " + _server + "'/cbv1/mos/signin?refreshToken=" + _refreshToken);
    $.ajax({
      type: 'post',
      url: _server + '/cbv1/mos/signin?refreshToken=' + _refreshToken,
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      success: function (response) {
          //console.log(response);
          //console.log("Resolving doSigninRefresh (success)");
          resolve(response);
      },
      error: function (response) {
          //console.log(response);
          //console.log("Resolving doSigninRefresh (failure)");
          reject(null);
      }
    });
  });
}

function doSignout(_ck){
  return new Promise((resolve, reject) => {
    //console.log("Entering doSignout");
    var _token = _ck.accessToken;
    var _server = _ck.server;
    $.ajax({
        type: 'post',
        headers: {accessToken: _token},
        url: _server + '/cbv1/mos/signout',
        success: function (response) {
          //console.log("Resolving doSignout (success)");
          resolve();
        },
        error: function (response) {
          //console.log(response);
          //console.log("Rejecting doSignout (failure)");
          reject();
        }
     });
  });
}

/* Reads own MO fields
 */
function readOwnMoFieldsRaw(_ck){
  return new Promise((resolve, reject) => {
    //console.log("Entering readOwnMoFieldsRaw");
    var _at = _ck.accessToken;
    var _server = _ck.server;
    $.ajax({
      type: 'get',
      headers: {accessToken: _at},
      url: _server + '/cbv1/mos/0',
      success: function (response) {
          //console.log(response);
          _ck.moFields = response;
          //console.log("Resolving readOwnMoFieldsRaw (true)");
          resolve(_ck);
      },
      error: function (response) {
          //console.log("Error message getting own mo Fields: ", response);
          //console.log("Rejecting readOwnMoFieldsRaw (false)");
          reject(null);
      }
   });
  });
}

/* Reads foreign MO's single field or asset, specifying if history (for asset) is needed
 * Passing "allAssets" as field name retrieves all assets as returned by the node.
 */
function readForeignMoSingleFieldOrAssetRaw(_ck, _clientKey, _fieldOrAssetName, _needHistory){
  return new Promise((resolve, reject) => {
    //console.log("Entering readForeignMoSingleFieldOrAssetRaw");
    var _at = _ck.accessToken;
    var _server = _ck.server;
    var _historyQueryParam = (_needHistory) ? "?history=true" : "";
    $.ajax({
      type: 'get',
      headers: {accessToken: _at},
      url: _server + '/cbv1/mos/' + _clientKey + '/' + _fieldOrAssetName + _historyQueryParam,
      success: function (response) {
          //console.log(response);
          //console.log("Resolving readForeignMoSingleFieldOrAssetRaw");
          resolve(response);
      },
      error: function (response) {
          if (response.status == 404) {
            //console.log("No field/asset present for " + _ck.clientKey);
            //console.log("Resolving readForeignMoSingleFieldOrAssetRaw (not found)");
            resolve(null);
            return;
          } else {
            //console.log("Rejecting readForeignMoSingleFieldOrAssetRaw");
            reject(null);
          }
      }
   });
 });
}

/* Reads own MO assets (w/o history)
 */
function readOwnMoAssetsRaw(_ck, _needHistory){
  return new Promise((resolve, reject) => {
    //console.log("Entering readOwnMoAssetsRaw");
    var _at = _ck.accessToken;
    var _server = _ck.server;
    var _historyQueryParam = (_needHistory) ? "?history=true" : "";
    $.ajax({
      type: 'get',
      headers: {accessToken: _at},
      url: _server + '/cbv1/mos/0/allAssets' + _historyQueryParam,
      success: function (response) {
          //console.log(response);
          _ck.moAssets = response;
          //console.log("Resolving readOwnMoAssetsRaw (true)");
          resolve(_ck);
      },
      error: function (response) {
          if (response.status == 404) {
            //console.log("No assets present for " + _ck.clientKey);
            //console.log("Resolving readOwnMoAssets (false)");
            resolve(null);
            return;
          } else {
            //console.log("Rejecting readOwnMoAssetsRaw");
            reject(null);
          }
      }
   });
 });
}



/* Update own MO - fields or single asset (only deduction is possible in this API).
 */
function updateOwnMoRaw(_ck, _queryParams, _asset, _requestBodyStr){
  return new Promise((resolve, reject) => {
    //console.log("Entering updateOwnMoRaw");
    var _at = _ck.accessToken;
    var _server = _ck.server;
    var _assetStrRaw = (_asset != null) ? ("/" + _asset) : "";
    var _assetStr = _assetStrRaw.replace(/#/g, "%40");
    //console.log("url is: " + _server + '/cbv1/mos/0' + _assetStr + "?" + jQuery.param(_queryParams));

    $.ajax({
      type: 'put',
      headers: {accessToken: _at},
      url: _server + '/cbv1/mos/0' + _assetStr + "?" + jQuery.param(_queryParams),
      data: _requestBodyStr,
      success: function (response) {
        var final_response = (response === undefined) ? "" : response;
          //console.log("Response from node for updateMo:");
          //console.log(final_response);
          //console.log("Resolving updateOwnMoRaw");
          resolve(final_response);
      },
      error: function (response) {
        console.log("Error updating MO");
        reject(null);
      }
   });
 });
}

/* Reads dependent MO list (Submos) of specified key. This API is available for (Sub-)Licensees only.
 */
function readSubmosRaw(_ck, _clientKey){
  return new Promise((resolve, reject) => {
    //console.log("Entering readSubmosRaw");
    if (_clientKey === undefined){
      _clientKey = _ck.clientKey;
    }
    var _target = (_ck.clientKey == _clientKey) ? '0' : _clientKey;
    var _at = _ck.accessToken;
    var _server = _ck.server;
    $.ajax({
      type: 'get',
      headers: {accessToken: _at},
      url: _server + '/cbv1/mos/' + _target + '/submos',
      success: function (response) {
          //console.log(response);
          //console.log("Resolving readSubmosRaw");
          resolve(response);
      },
      error: function (response) {
        if (response.status == 404) {
          //console.log("No submos present for " + _clientKey);
          //console.log("Resolving readSubmosRaw (not found)");
          resolve("");
          return;
        } else {
          console.log("Error reading MO dependents of " + _clientKey + ", error message:" + response);
          reject(null);
        }
      }
   });
 });
}


/* ===============================================================================================
 * All-in-one helper functions
 * ===============================================================================================
 */

/* Just sign in without reading MO (for web auth demo), in credentials and refreh versions. */
async function doJustSignin(_successCallback, _failureCallback, _server, _clientKey, _encHash, _clientCertificate){
  //console.log("Entering doJustSignin");
  var _ck;
  try {
    _ck = await doSignin(_server, _clientKey, _encHash, _clientCertificate);
    //console.log("Sign in successful");
  } catch (err) {
    //console.log("Leaving doJustSignin (promise failed)");
    _failureCallback();
    return;
  }
  //console.log("Leaving doJustSignin, dumping _ck:");
  //console.log(_ck)
  _successCallback(_ck);
}

async function doJustSigninRefresh(_successCallback, _failureCallback, _server, _refreshToken){
  //console.log("Entering doJustSigninRefresh");
  var _ck;
  try {
    _creds = await doSigninRefresh(_server, _refreshToken);
    //console.log("Sign in successful");
  } catch (err) {
    //console.log("Leaving doJustSigninRefresh (promise failed)");
    _failureCallback();
    return;
  }
  //console.log("Leaving doJustSigninRefresh, dumping _creds:");
  //console.log(_creds)
  _successCallback(_creds);
}

/* All-in-one for just reading: Sign in, read own MO fields + assets (with or without history)
 * NOTE: For this demo we always do a new signin. To optimize performance for a real application
 *       it is OK to sign in only once (and refresh sign-in if necessary - the Dashboard UI does it this way)
 *       For increased security however (like in this demo) sign out invalidates the received token.
 */
async function doSigninAndReadMo(_successCallback, _failureCallback, _server, _clientKey, _encHash, _clientCertificate, _needHistory){
  //console.log("Entering doSigninAndReadMo");
  var _ck;
  try {
    _ck = await doSignin(_server, _clientKey, _encHash, _clientCertificate);
    //console.log("Sign in successful");
    // Now we have successfully signed in (otherwise ending up in the error branch). Read MO fields & assets.
    await readOwnMoFieldsRaw(_ck);
    await readOwnMoAssetsRaw(_ck, _needHistory);
    //console.log("Read fields + assets successful");
  } catch (err) {
    //console.log("Leaving doSigninAndReadMo (promise failed)");
    _failureCallback();
    return null;
  }

  //console.log("Leaving doSigninAndReadMo, dumping _ck:");
  //console.log(_ck)
  _successCallback(_ck);
  return _ck;
}

/* Helper for voucher exapmle: read asset balance
 */
function extractBalance(_ck, _assetName){
  for (var i=0; i<_ck.moAssets.allAssetsWithTransaction.length;i++){
    var splitAssetName = _ck.moAssets.allAssetsWithTransaction[i].assetName.split('#');
    if (splitAssetName[0] == _assetName){
      return _ck.moAssets.allAssetsWithTransaction[i].assetCurrentBalance;
    }
  }
  return null;
}

/* Helper for voucher and company-internal exapmles: read asset history
 */
function extractHistory(_ck, _assetName){
  for (var i=0; i<_ck.moAssets.allAssetsWithTransaction.length;i++){
    var splitAssetName = _ck.moAssets.allAssetsWithTransaction[i].assetName.split('#');
    if (splitAssetName[0] == _assetName){
      return _ck.moAssets.allAssetsWithTransaction[i].transactionHistoryList;
    }
  }
  return null;
}

/* Helper for voucher example: Update asset balance in existing _ck object
 */
function updateAssetBalance(_ck, _assetName, _nodeResponse){
  //console.log("Entering updateAssetBalance for asset: " + _assetName + " dumps of _ck and node response:");
  //console.log(_ck);
  //console.log(_nodeResponse);
  // Determine which of the assets matches the name (without domain), in destination (_ck) and source (node response)
  var _targetIndex = null;
  var _sourceIndex = null;
  for (var i=0; i<_ck.moAssets.allAssetsWithTransaction.length;i++){
    var splitAssetName = _ck.moAssets.allAssetsWithTransaction[i].assetName.split('#');
    if (splitAssetName[0] == _assetName){
      _targetIndex = i;
      break;
    }
  }
  for (var i=0; i<_nodeResponse.moAssets.assetsRemainingBalance.length;i++){
    var splitAssetName = _nodeResponse.moAssets.assetsRemainingBalance[i].assetName.split('#');
    if (splitAssetName[0] == _assetName){
      _sourceIndex = i;
      break;
    }
  }

  if (_targetIndex != null && _sourceIndex != null){
    _ck.moAssets.allAssetsWithTransaction[_targetIndex].assetCurrentBalance = _nodeResponse.moAssets.assetsRemainingBalance[_sourceIndex].assetCurrentBalance;
  }
  //console.log("Leaving updateAssetBalance");
}

async function doBurnAsset(_waitMsgId, _assetName, _txRecord, _ck, _lang, _mustAlwaysWait){
  //console.log("Entering doBurnAsset");

  var tx_record_object = {name:"transactionRecord",value:_txRecord};
  // make sure we wait for finalization if either value will be fully depleted (1 or fewer), or life is affected.
  var vBalance = extractBalance(_ck, "value");
  var defer_object = ((vBalance > 1 && _assetName == "value") && !_mustAlwaysWait) ? {name:"deferTransactionCompletion",value: true} : "";
  var qp =  [ defer_object, tx_record_object]; // note we don't write fieldVal, so the deduction defaults to 1 in this demo.
  if ((vBalance <= 1 || _assetName != "value") || _mustAlwaysWait) {
    var waitmsg = (_lang == "de") ?
                    "<h3 style=\"color:red;\">Warte auf Finalisierung...</h3>" :
                    "<h3 style=\"color:red;\">Waiting for finalization...</h3>";
    $(_waitMsgId).append(waitmsg);
  }
  //console.log("Leaving doBurnAsset, transferring control to updateOwnMoRaw");
  return await updateOwnMoRaw(_ck, qp, _assetName, "");
}

/* All-in-one to modify a field. Requires already being signed in.
 */
async function doModifyField(_waitMsgId, _fieldName, _newFieldValue, _successCallback, _failureCallback, _ck, _lang){
  //console.log("Entering doModifyField");
  var qp = [{name:"fieldVal",value:_newFieldValue}];

  var waitmsg = (_lang == "de") ?
                    "<h3 style=\"color:red;\">Warte auf Finalisierung...</h3>" :
                    "<h3 style=\"color:red;\">Waiting for finalization...</h3>";
  $(_waitMsgId).append(waitmsg);
  try {
    var nodeResponse = await updateOwnMoRaw(_ck, qp, _fieldName, "");
  } catch (err){
    _failureCallback();
    return null;
  }
  //console.log("Leaving doModifyField, dumping _ck:");
  //console.log(_ck)
  _successCallback(_ck);
  return null;
}

async function doReadOwnDependents(_successCallback, _failureCallback, _ck){
  //console.log("Entering doReadOwnDependents");
  try {
    var nodeResponse = await readSubmosRaw(_ck);
    _successCallback(_ck, nodeResponse);
  } catch (err){
    _failureCallback();
  }
  //console.log("Leaving doReadOwnDependents");
}

/* All-in-one for voucher example: Sign in, decrement value by 1, read own MO fields + assets (w/o history)
 * NOTE: For this demo we always do a new signin. To optimize performance for a real application
 *       it is OK to sign in only once (and refresh sign-in if necessary - the Dashboard UI does it this way)
 *       For increased security however (like in this demo) sign out invalidates the received token.
 */
async function doSigninConsumeAndReadMo(_waitMsgId, _assetName, _txRecord, _successCallback, _failureCallback, _server, _clientKey, _encHash, _clientCertificate, _lang){
  //console.log("Entering doSigninConsumeAndReadMo");
  var _ck;
  try {
    _ck = await doSignin(_server, _clientKey, _encHash, _clientCertificate);
    //console.log("Sign in successful");
    // Now we have successfully signed in (otherwise ending up in the error branch). Read MO fields & assets.
    await readOwnMoFieldsRaw(_ck);
    //console.log("Read fields successful");
    await readOwnMoAssetsRaw(_ck, false);
    //console.log("Read assets successful");

    var vBalance = extractBalance(_ck, "value");
    var node_response = await doBurnAsset(_waitMsgId, _assetName, _txRecord, _ck, _lang, false);

    /* need to read assets again in case of depletion or life update. Otherwise just update the balance. */
    if (vBalance <= 1 || _assetName != "value"){
      await readOwnMoAssetsRaw(_ck, false);
    } else {
      /* Replace returned remaining value (so we won't have to wait for blockchain finalization just to display the result) */
      updateAssetBalance(_ck, _assetName, node_response);
    }

  } catch (err) {
    console.log("Leaving doSigninConsumeAndReadMo (promise failed)");
    _failureCallback();
    return null;
  }

  //console.log("Leaving doSigninConsumeAndReadMo, dumping _ck:");
  //console.log(_ck)
  _successCallback(_ck);
  return _ck;
}


 /* ===============================================================================================
 * Time & Connictro Blockchain Timebomb human-readable decoding functions
 * ===============================================================================================
 */
 // from modified https://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form/8211872
function millisecondsToStr (milliseconds, _lang) {

    var isde = (_lang.substring(0,2) == "de");

    function numberEnding (number, c) {
        return (number > 1) ? c : '';
    }

    var temp = Math.floor(milliseconds / 1000);
    var years = Math.floor(temp / 31536000);
    var days = Math.floor((temp %= 31536000) / 86400);
    var hours = Math.floor((temp %= 86400) / 3600);
    var minutes = Math.floor((temp %= 3600) / 60);
    var seconds = temp % 60;
    var mseconds = milliseconds % 1000;

    var retstr = "";
    if (years)    retstr += years + (isde ? ' Jahr':' year') + numberEnding(years, (isde ? 'e' : 's'));
    if (days)     retstr += " " + days + (isde ? ' Tag':' day') + numberEnding(days, (isde ? 'e' : 's'));
    if (hours)    retstr += " " + hours + (isde ? ' Stunde':' hour') + numberEnding(hours, (isde ? 'n' : 's'));
    if (minutes)  retstr += " " + minutes + (isde ? ' Minute':' minute') + numberEnding(minutes, (isde ? 'n' : 's'));
    if (seconds)  retstr += " " + seconds + (isde ? ' Sekunde':' second') + numberEnding(seconds, (isde ? 'n' : 's'));
    if (mseconds) retstr += " " + mseconds + (isde ? ' Millisekunde':' millisecond') + numberEnding(mseconds, (isde ? 'n' : 's'));

    return retstr;
}

/* Like Javascript ISO timestring in local timezone, but without the trailing long timezone explanation.
 */
function dateStringWithoutTZExplanation(_datetimeSpec){
  var timestr = _datetimeSpec.toTimeString();
  var index = timestr.indexOf("(");
  return _datetimeSpec.toDateString() + "-" + timestr.substring(0, index-1) ;
}

/* Convert a time to local time like above but in format YYYY-MM-DDThh:mm, and accepts a number instead of a date. */
function dateStringYYYMMDDThhmm(_datetimeNumber){
  var _datetimeSpec = new Date(_datetimeNumber);
  var year_str  = _datetimeSpec.getFullYear().toString();
  var month     = _datetimeSpec.getMonth() + 1;
  var day       = _datetimeSpec.getDate();
  var hour      = _datetimeSpec.getHours();
  var minutes   = _datetimeSpec.getMinutes();
  var month_str = month < 10 ? '0'+month.toString() : month.toString();
  var day_str   = day < 10 ? '0'+day.toString() : day.toString();
  var hr_str    = hour < 10 ? '0'+hour.toString() : hour.toString();
  var min_str   = minutes < 10 ? '0'+minutes.toString() : minutes.toString();

  var timespec = year_str + "-" + month_str + "-" + day_str + "T" + hr_str + ":" + min_str;
  return timespec;
}

function getDemoTimes(){
  var _now              = new Number(new Date());
  var _defaultStartTime = _now + new Number(1800000);
  var _defaultExpTime   = _now + new Number(7200000);
  var _maxExpTime       = _now + new Number(21600000);
  // convert the times into strings YYYY-MM-DDThh:mm in local timezone to pass as max/min/value to datetime input.
  var demoTimes = {
    time_now:    dateStringYYYMMDDThhmm(_now),
    time_start:  dateStringYYYMMDDThhmm(_defaultStartTime),
    time_exp:    dateStringYYYMMDDThhmm(_defaultExpTime),
    time_maxexp: dateStringYYYMMDDThhmm(_maxExpTime)
  };
  return demoTimes;
}

function getNowAsTimeDateString(){
  var _now = new Number(new Date());
  return dateStringYYYMMDDThhmm(_now);
}

// Reads time from a specified time/date widget and returns as numerical value.
function readTimeNumerical(_widgetId){
  var jqId = "#" + _widgetId;
  var curTimeReading = $(jqId).val();
  var curTimeReadingNum = new Number(new Date(curTimeReading));
  //console.log("Time reading for " + _widgetId + " is " + curTimeReading + ", numerical: " + curTimeReadingNum);
  return curTimeReadingNum;
}


const LIFE_STATES     = ["Invalid", "Returned", "Depleted", "In use", "Waiting for Pairing", "Waiting Validation", "Provisioned", "New/Created" ];
const LIFE_STATES_DE  = ["Ung&uuml;ltig", "Zur&uuml;ckgegeben", "Verbraucht", "In Benutzung", "Warte auf Pairing", "Warte auf Validierung", "Provisioniert", "Neu/Erzeugt" ];
const TIMER_STATES    = [ 'NEW', 'ARMED', 'EXPIRED' ];
const TIMER_STATES_DE = [ 'NEU', 'AKTIV', 'ABGELAUFEN' ];

function decodeLifeState(_life, _lang){
   var life_states_array = (_lang.substring(0,2) == "de") ? LIFE_STATES_DE : LIFE_STATES;
   if (_life > 7) return '(Life on stock)';
   return life_states_array[_life];
}

/* IN:  Timebomb object as returned from the node
 *      Language string
 * OUT: returns an object consisting of:
 *      { color: <HTML code for timer color>,
 *        number: <timer number>,
 *        decoded: <Decoded timer information string>
 *      }
 */
function decodeSingleTimebomb(_timebombObject, _lang){
  var timerStateColor = "<div class=\"timer-new\">";
  var timerState = 0;
  var expTime;
  var _retobj;
  var timer_states_array;
  var expired_text;
  var expires_text;
  var expires_imm_text;
  var expires_after_text;
  var next_state_text;
  var triggers_text;
  var state_of_text;
  var value_of_text;
  var and_text;

  if (_lang.substring(0,2) == "de"){
    timer_states_array = TIMER_STATES_DE;
    expired_text       = "ABGELAUFEN am ";
    expires_text       = "l&auml;uft ab am ";
    expires_imm_text   = ", l&auml;uft dann sofort ab";
    expires_after_text = ", l&auml;uft ab nach "
    next_state_text    = "n&auml;chster Status: ";
    triggers_text      = ", triggert auf ";
    state_of_text      = "Status: ";
    value_of_text      = "Wert: ";
    and_text =         " und  ";
  } else {
    timer_states_array = TIMER_STATES;
    expired_text       = "EXPIRED at ";
    expires_text       = "expires at ";
    expires_imm_text   = ", then expires immediately";
    expires_after_text = ", then expires after "
    next_state_text    = "next state: ";
    triggers_text      = ", triggers at ";
    state_of_text      = "state of ";
    value_of_text      = "value of ";
    and_text =         " and  ";
  }

  var _timerInfoStr;
  if (_timebombObject.timerState){
    if (_timebombObject.timerState >= 2){
      expTime = new Date(new Number(_timebombObject.expirationTime));
      timerStateColor = "<div class=\"timer-expired\">";
      _timerInfoStr = "<b>" + expired_text + dateStringWithoutTZExplanation(expTime) + "</b>";
      _retobj = { color: timerStateColor, number: _timebombObject.timerNo.toString(), decoded: _timerInfoStr};
      return _retobj;
    } else {
      timerState = _timebombObject.timerState;
      if (timerState == 1)
        timerStateColor = "<div class=\"timer-armed\">";
    }
  }

  if (_timebombObject.expirationTime){
    expTime = new Date(new Number(_timebombObject.expirationTime));
    _timerInfoStr = "<b>" + timer_states_array[timerState] + ", " + expires_text +
                      dateStringWithoutTZExplanation(expTime) + ", " + next_state_text + "\"" +
                      decodeLifeState(_timebombObject.nextLifeState, _lang)  + "\"</b>"
    _retobj = { color: timerStateColor, number: _timebombObject.timerNo.toString(), decoded: _timerInfoStr};
    return _retobj;
  }

  _timerInfoStr = "<b>" + timer_states_array[timerState] + triggers_text;
  if (_timebombObject.lifeTrigger){
    if (_timebombObject.lifeTrigger > 0){
      _timerInfoStr += state_of_text + "\"" + decodeLifeState(_timebombObject.lifeTrigger, _lang) + "\"";
    }
    if (_timebombObject.valueTrigger){
      if (_timebombObject.valueTrigger > 0){
        _timerInfoStr += and_text;
      }
    }
  }
  if (_timebombObject.valueTrigger){
    if (_timebombObject.valueTrigger > 0){
      _timerInfoStr += value_of_text + _timebombObject.valueTrigger;
    }
  }
  if (_timebombObject.deltaTime){
    if (_timebombObject.deltaTime == 1){
      _timerInfoStr += expires_imm_text;
    } else {
      _timerInfoStr += expires_after_text + millisecondsToStr(_timebombObject.deltaTime, _lang);
    }
  }

  _timerInfoStr +=  ", " + next_state_text + "\"" + decodeLifeState(_timebombObject.nextLifeState, _lang)  + "\"</b>";

  _retobj = { color: timerStateColor, number: _timebombObject.timerNo.toString(), decoded: _timerInfoStr};
  return _retobj;
}

function decodeTimebombArray(_timebombArray, _lang){
  var timersInfoStr = "";
  var language = _lang ? _lang : "en";
  for (var i=0; i<_timebombArray.length; i++){
    //console.log("Decoding timebomb " + i);
    var _decodedObj = decodeSingleTimebomb(_timebombArray[i], language);

    timersInfoStr += _decodedObj.decoded + "</div><br>";
  }
  return timersInfoStr;
}

/* Check token expiration time. If expiration is more than 30 seconds in the future
 * return true, false otherwise.
 */
function checkTokenValid(atTime) {
  var expireCheck = new Number(new Date(atTime));
  var currentTime = new Number(Date.now());

  //console.log("Expiration check: expires at " + expireCheck + " current time is " + currentTime);
  if ((currentTime + API_REFRESH_BEFORE_EXPIRE_MILLISECONDS) < expireCheck){
    return true;
  }
  return false;
}


/* ===============================================================================================
 * Other helpers
 * ===============================================================================================
 */

/*
 * This chooses a random blockchain node for some load balancing.
 * Until reloaded the node will stay the same.
 * Development service currently runs on 3 nodes.
 * Production service currently runs on 5 nodes.
 * Chain services development A/B and production run on these nodes but on different ports.
 * If "?" is passed as parameter (instead of a letter consisting of aAbBpP), determine the current
 * demo chain by current month (B in odd and A in even months).
 */
function chooseNode(_chain){
  if (_chain == '?'){
    var current_month = new Date().getMonth() + 1;
    _chain = ((current_month %2) == 1) ? "B" : "A";
  }

  var _nodeList = (_chain == 'P' || _chain == 'p') ? PROD_NODE_LIST : DEV_NODE_LIST;
  var _numNodes = _nodeList.length;
  if (gRandNode == null){
    gRandNode = Math.floor(Math.random() * _numNodes);
  }
  var _chainPort = (_chain == 'P' || _chain == 'p') ? CHAIN_PORT_P: ((_chain == 'a' || _chain == 'A') ? CHAIN_PORT_A: CHAIN_PORT_B);

  return (_nodeList[gRandNode] + _chainPort);
}

function parseUrlParametersJustCreds(){
  //console.log("Entering parseUrlParametersJustCreds");
  var clientKeyParam = GetParams['k'];
  var clientCertParam = GetParams['c'];
  var encHashParam = GetParams['e'];
  var devChain = GetParams['d'];
  gLanguage = GetParams['l'];

  if (clientKeyParam == undefined || clientCertParam == undefined || encHashParam == undefined || devChain == undefined){
    var invalid_param_msg = (gLanguage == "de") ?
                              "<h3>Ung&uuml;ltige Parameter</h3>Bitte angeben: d (P - Production Blockchain oder Demo Blockchain: A oder B), e (encHash), k (clientKey) und c (clientCertificate)!</h3>" :
                              "<h3>Invalid Parameters</h3>Must specify d (production blockchain P or demo blockchain: A or B), e (encHash), k (clientKey) and c (clientCertificate)!</h3>";
    writeToMain(invalid_param_msg);
    return null;
  }

  var _chosenChain = null;

  if (devChain == 'p' || devChain == 'P'){
    _chosenChain = 'P';
  } else if (devChain != null && (devChain != 'a' && devChain != 'A')){ // default to A dev chain if not specified
    _chosenChain = 'B';
  } else {
    _chosenChain = 'A';
  }

  var _signinCreds = {
              clientKey: clientKeyParam,
              clientCertificate: clientCertParam,
              encHash: encHashParam,
              chain: _chosenChain
            }
  //console.log("Leaving parseUrlParametersJustCreds");
  return _signinCreds;
}

function parseUrlParametersAndChooseNode(){
  //console.log("Entering parseUrlParametersAndChooseNode");
  var _signinCreds = parseUrlParametersJustCreds();
  if (_signinCreds != null){
    var chosenServer = chooseNode(_signinCreds.chain);
    _signinCreds.server = chosenServer;
  }
  //console.log("Leaving parseUrlParametersAndChooseNode");
  return _signinCreds;
}

function printMoFailure(){
  var signinfail = (gLanguage == "de") ? "<h3>Fehler: Login fehlgeschlagen!</h3>" : "<h3>Error: Sign-in failed!</h3>";
  writeToMain(signinfail);
}

function modifyMoFailure(){
  var modifyfail = (gLanguage == "de") ? "<h3>Fehler: MO-&Auml;nderung fehlgeschlagen!</h3>" : "<h3>Error: MO change failed!</h3>";
  writeToMain(modifyfail);
}

function mainMoDisplay(_withHistory){
  //console.log("Entering mainMoDisplay");
  var _signinCreds = parseUrlParametersAndChooseNode();
  if (_signinCreds == null) return;

  doSigninAndReadMo(printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, _withHistory);
  //console.log("Leaving mainMoDisplay");
}

function mainMoDisplayWithHistory(){ return mainMoDisplay(true); }
function mainMoDisplayWOHistory()  { return mainMoDisplay(false); }

async function handleMoActivation(){
  //console.log("Entering handleMoActivation");
  var _signinCreds = parseUrlParametersAndChooseNode();
  var activate_txrecord = (gLanguage == "de") ? "Demo MO-Aktivierung" : "Demo activate MO";

  var _ck = doSigninConsumeAndReadMo("#waitMsg", "life", activate_txrecord, printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, gLanguage);
  if (_ck == null){
    var unable_status_msg = (gLanguage == "de") ? "<h3>Kann MO-Status nicht &auml;ndern!</h3>" : "<h3>Unable to change MO status!</h3>";
    writeToMain(unable_status_msg);
  } else {
    $("#waitMsg").empty();
  }
  //console.log("Leaving handleMoActivation");
}

function handleHideHistorySection(_sectionName, _callback){
  //console.log("Entering handleHideHistorySection");
  gShowingHistory = false;
  var sectionDivName = '#' + _sectionName;
  $(sectionDivName).empty();
  _callback();
  //console.log("Leaving handleHideHistorySection");
}

async function handleUpdateHistorySection(_goodCallback){
  //console.log("Entering handleUpdateHistory");
  var _signinCreds = parseUrlParametersAndChooseNode();
  var _ck = doSigninAndReadMo(_goodCallback, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, true);
  //console.log("Leaving handleUpdateHistory");
}

function handleDisplayHistoryButtons(_showId, _hideId, _visibleNameDE, _visibleNameEN, _buttonSectionId, _areaSectionId, _showCallback, _hideCallback){
  //console.log("Entering handleDisplayHistoryButtons, gShowingHistory = " + gShowingHistory);
  var _htmlHistoryButtons;
  if (gShowingHistory){
    _htmlHistoryButtons = (gLanguage == "de") ?
                          "<button id=\"" + _showId + "\" type=\"submit\" name=\"" + _showId + "\">" + _visibleNameDE + " aktualisieren</button>" +
                          "<button id=\"" + _hideId + "\" type=\"submit\" name=\"" + _hideId + "\">" + _visibleNameDE + " verstecken</button>" :
                          "<button id=\"" + _showId + "\" type=\"submit\" name=\"" + _showId + "\">Update " + _visibleNameEN + "</button>" +
                          "<button id=\"" + _hideId + "\" type=\"submit\" name=\"" + _hideId + "\">Hide " + _visibleNameEN + "</button>";
  } else {
    _htmlHistoryButtons = (gLanguage == "de") ?
                            "<button id=\"" + _showId + "\" type=\"submit\" name=\"" + _showId + "\">" + _visibleNameDE + " zeigen</button>" :
                            "<button id=\"" + _showId + "\" type=\"submit\" name=\"" + _showId + "\">Show " + _visibleNameEN + "</button>";
  }
  writeToSection(_buttonSectionId, _htmlHistoryButtons);
  var showWidgetName = '#' + _showId;
  var hideWidgetName = '#' + _hideId;
  gShowCallback = _showCallback;
  gHideCallback = _hideCallback;
  gAreaSectionId = _areaSectionId;

  $(showWidgetName).click(function (e) {
    e.preventDefault();
    handleUpdateHistorySection(gShowCallback);
  });

  $(hideWidgetName).click(function (e) {
    e.preventDefault();
    handleHideHistorySection(gAreaSectionId, gHideCallback);
  });
  //console.log("Leaving handleDisplayHistoryButtons");
}


function genericGenerateCbQr(_baseUrlValue, _targetValue, _chain, _clientKey, _encHash, _clientCertificate, _appendId){
  var targetUrlStart = _baseUrlValue + _targetValue + "?";
  var qrUrl = targetUrlStart +
               "d=" + _chain +
               (gLanguage ? ("&l=" + gLanguage) : "") +
               "&k=" + _clientKey +
               "&e=" + _encHash +
               "&c=" + _clientCertificate;

  var qrcode_id = (_appendId > 0) ? ("qrcode" + _appendId) : "qrcode";
  var _htmlHeading   = (gLanguage == "de") ?
                         "<h3>Bitte scannen oder ausdrucken, um auf das Connictro Blockchain-Beispiel zuzugreifen</h3>" :
                         "<h3>Please scan or print to access Connictro Blockchain example</h3>";
  var _htmlQrElement = "<div id=\"" + qrcode_id + "\" style=\"width:100px; height:100px; margin-top:15px; margin-bottom:170px;\"></div>";
  var _htmlPlainUrl  = (gLanguage == "de") ?
                         "<p><div>&nbsp;&nbsp;<a href=\"" + qrUrl + "\" target=\"_blank\">(oder klicken Sie hier)</a></div></p>"  :
                         "<p><div>&nbsp;&nbsp;<a href=\"" + qrUrl + "\" target=\"_blank\">(or click this link instead)</a></div></p>";
  var _htmlProvisionButton = "<div id=\"provisioning\"></div>";
  var _allHtml = _htmlHeading + _htmlQrElement + _htmlPlainUrl + _htmlProvisionButton;

  if (_appendId > 0){
    appendToMain(_allHtml);
  } else {
    writeToMain(_allHtml);
  }

  var qrcode = new QRCode(document.getElementById(qrcode_id), {
	  width : 250,
	  height : 250
  });
  qrcode.makeCode(qrUrl);
}


function writeToSection(section, htmlText){
  var _sectionId = "#" + section;
  $(_sectionId).empty();
  $(_sectionId).append(htmlText);
}

function appendToSection(section, htmlText){
  var _sectionId = "#" + section;
  $(_sectionId).append(htmlText);
}

function writeToMain(htmlText){
  writeToSection("mainContent", htmlText);
}

function appendToMain(htmlText){
  appendToSection("mainContent", htmlText);
}


/* from https://stackoverflow.com/questions/10609511/javascript-url-parameter-parsing */
var GetParams = (function () {
    var get = {
        push:function (key,value){
            var cur = this[key];
            if (cur.isArray){
                this[key].push(value);
            }else {
                this[key] = [];
                this[key].push(cur);
                this[key].push(value);
            }
        }
    },
    search = document.location.search,
    decode = function (s,boo) {
        var a = decodeURIComponent(s.split("+").join(" "));
        return boo? a.replace(/\s+/g,''):a;
    };
    search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function (a,b,c) {
        if (get[decode(b,true)]){
            get.push(decode(b,true),decode(c));
        }else {
            get[decode(b,true)] = decode(c);
        }
    });
    return get;
})();

function parseJsonWithDefault(_jsonStr){
  var parseJson = (_jsonStr == null) ? "{}" : ((_jsonStr == "") ? "{}" : _jsonStr);
  return JSON.parse(parseJson);
}

function parseJsonWithDefaultCatchingErrors(_jsonStr){
  return new Promise((resolve, reject) => {
    try {
      var _parsed = parseJsonWithDefault(_jsonStr);
      resolve(_parsed);
    } catch (err){
      reject(null);
    }
  });
}

function verboseLifeState(_state, _lang){
  if (_state > 7){
    return (_lang == "de") ? "genug" : "sufficient";
  }
  return (_lang == "de") ? life_states_de[_state] : life_states_en[_state];
}

var mFileOpenCallback = null;

async function openLocalFile(_filesObj, _fileCallback){
  //console.log("Entering openLocalFile, files object:");
  //console.log(_filesObj);
  var file, fr;
  mFileOpenCallback = null;

  if (!window.File || !window.FileReader || !window.FileList || !window.Blob){
    alert("This browser is not supporting file API!");
    return;
  }

  if (_filesObj.length == 0){
    alert("File is empty");
    return;
  }
  mFileOpenCallback = _fileCallback;

  file = _filesObj[0];

  if (file != null){
    fr = new FileReader();
    fr.onload = function(e) {
      var _rawFile = e.target.result;
      mFileOpenCallback(_rawFile);
    };
    fr.readAsText(file);
  }
  //console.log("Leaving openLocalFile");
}

/*
 * This is the callback of the file select widget. It parses the Connictro Blockchain credentials file
 * and calls a callback with the credentials components if it finds a single key only.
 * If it finds multiple keys, it calls another callback with the entire array containing all the credentials.
 * The caller can decide what to do with them.
 *
 * "loginCredsSelectedAction" with the parsed credentials (clientKey, encHash, clientCertificate).
 * This callback must exist with that name since it cannot be passed as parameter.
 * "loginCredsMultipleAction" which accepts a ListOfClientCredentials array must exist,
 * since its name since it cannot be passed as parameter.
 */
async function loginCredsSelected(_rawFileData){
  //console.log("Entering loginCredsSelected, _rawFileData: " + _rawFileData);
  var _credsFileObj;
  var _credsRoot;

  // interpret raw file as JSON, reject unparseable files
  try {
    _credsFileObj = await parseJsonWithDefaultCatchingErrors(_rawFileData);
  } catch (err){
    // redisplay the login screen with error message
    var _errMsg = (gLanguage == "de") ?
      "<h3>Diese Datei kann nicht analysiert werden!</h3><b>Bitte w&auml;hlen Sie eine g&uuml;ltige Connictro Blockchain Zertifikatsdatei aus</b>" :
      "<h3>This file cannot be parsed!</h3><b>Please select a valid Connictro Blockchain Credentials file</b>";
    loginScreen(_errMsg);
    return;
  }
  _credsRoot = (_credsFileObj.moCredentials) ? _credsFileObj.moCredentials : _credsFileObj;
  if (!_credsRoot.ListOfClientCredentials || !_credsRoot.encHash ){
    var _errMsg = (gLanguage == "de") ?
      "<h3>Diese Datei enth&auml;lt kein g&uuml;ltiges Connictro Blockchain Zertifikat!</h3><b>Bitte w&auml;hlen Sie eine g&uuml;ltige Connictro Blockchain Zertifikatsdatei aus</b>" :
      "<h3>This file doesn't contain a valid Connictro Blockchain certificate!</h3><b>Please select a valid Connictro Blockchain Credentials file</b>";
    loginScreen(_errMsg);
    return;
  }

  if (_credsRoot.ListOfClientCredentials.length > 1){
    loginCredsMultipleAction(_credsRoot.encHash, _credsRoot.ListOfClientCredentials);
  } else {
    var selectedCreds = _credsRoot.ListOfClientCredentials[0];
    loginCredsSelectedAction(selectedCreds.clientKey, _credsRoot.encHash, selectedCreds.clientCertificate);
  }
}
