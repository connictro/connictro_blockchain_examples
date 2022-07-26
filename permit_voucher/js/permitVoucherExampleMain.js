/*
 * Connictro Blockchain - Permit/Voucher Example
 *
 * This module displays the created end-user and handles interaction with it (if created to do so).
 * Simple permits: Display the current status and expiration times.
 * Vouchers:
 * - in state "Provisioned" allow to activate the voucher
 * - in state "In Use" allow to make transactions (deducting 1 value each, with optional transaction description).
 * - In any other display the state information.
 *
 * The demo accepts Connictro Blockchain credentials as URL parameters
 * (clientKey abbreviated as k, encHash abbreviated as e, clientCertificate abbreviated as c -
 *  in order not to add too much redundant info to the QR code)
 *
 * Furthermore parameter 'd' denotes development blockchain (can be A or B). If not given, A is assumed.
 * Optionally parameter 'l' denotes language (currently just 'de' is detected - switches to German, everything else is displayed as English.)
 *
 * Example:
 * https:<server>/permitVoucherExample.html?d=A&k=<insert your clientKey here>&e=<insert your encHash here>&c=<insert your clientCertificate here>
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

async function handleDecrementDemo(){
  //console.log("Entering handleDecrementDemo");
  var _signinCreds = parseUrlParametersAndChooseNode();
  var _txRecord = $('#txRecord').val();
  var _ck = await doSigninConsumeAndReadMo("#waitMsg", "value", _txRecord, printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, gLanguage);
  handleHideHistorySection("historyArea", displayHistoryButtons);
  //console.log("Leaving handleDecrementDemo");
}

function displayHistoryButtons(){
  handleDisplayHistoryButtons("showHistory", "hideHistory", "Verlauf", "history", "historyButtons", "historyArea", printMoValueHistory, displayHistoryButtons);
}

async function printMoValueHistory(_ck){
  //console.log("Entering printMoValueHistory");
  var _historyList = extractHistory(_ck, "value");

  var _htmlHistoryTable = (gLanguage == "de") ? "Keine Transaktion gefunden!<br>" : "No transaction found so far!<br>";
  if (_historyList !== undefined){
    if (_historyList.length > 0){
      _htmlHistoryTable = (gLanguage == "de") ?
                            "<table><tr><th>Zeit</th><th>Menge</th><th>Transaktionsbeschreibung</th></tr>" :
                            "<table><tr><th>Time</th><th>Amount</th><th>Transaction Description</th></tr>";
      for (var i=0; i < _historyList.length; i++){
        var _timedate = new Date(_historyList[i].timestamp); // convert UTC time from blockchain to local time
        var _timestamp = dateStringWithoutTZExplanation(_timedate);
        var _amount = _historyList[i].amount;
        var _txRecord = (_historyList[i].transactionRecord === undefined) ? "" : _historyList[i].transactionRecord;
        _htmlHistoryTable += "<tr><td>" + _timestamp + "</td><td align=\"center\">" + _amount + "</td><td>" + _txRecord + "</td></tr>";
      }
      _htmlHistoryTable += "</table><br>"
    }
  }

  writeToSection("historyArea", _htmlHistoryTable);
  gShowingHistory = true;
  displayHistoryButtons();
  await doSignout(_ck);
  //console.log("Leaving printMoValueHistory");
}

async function printMoResult(_ck){
  //console.log("Entering printMoResult");
  //console.log(_ck);
  if (_ck.moFields.moTier != 255){
     // allow only endusers for this demo.
     writeToMain((gLanguage == "de") ? "<h3>MO Lesen erfolgreich, aber es sind nur Enduser erlaubt!</h3>" :"<h3>MO read OK but only endusers allowed!</h3>");
  } else {
    var _exampleTitle = (_ck.moFields.customId == null) ? ((gLanguage == "de") ? "Erlaubnis" : "Permit") : _ck.moFields.customId;
    var _state = extractBalance(_ck, "life");

    // Print message if we don't have life.
    if (_state == null){
      var _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgew&auml;hltes MO ist ung&uuml;ltig (ohne Leben)!</h3>" : "<h3>Selected MO is invalid (no life)!</h3>";
    } else {
      var _htmlMoHeading   = "<h3>" + _exampleTitle + " " + verboseLifeState(_state, gLanguage) + "!</h3>";
      var _htmlValueInformation = "";
      var _balance = extractBalance(_ck, "value");
      var _mustDisplayHistoryButtons = false;
      // Display activate button if MO is provisioned but not yet in use. Also reserve an area for a please-wait message.
      if (_state == 6){
          _htmlValueInformation += (gLanguage == "de") ?
                                     "<br><button id=\"activate\" type=\"submit\" name=\"activate\">Aktivieren</button><div id=\"waitMsg\"></div>" :
                                     "<br><button id=\"activate\" type=\"submit\" name=\"activate\">Activate</button><div id=\"waitMsg\"></div>";
      }
      // Display value balance if MO is in use only. Also reserve an area for a please-wait message.
      if (_state == 3 && _balance != null){
        _htmlValueInformation = (gLanguage == "de") ?
                                  "<br>Aktuelles Guthaben: <b>" + _balance + "</b><br>" :
                                  "<br>Current balance: <b>" + _balance + "</b><br>" ;
        if (_balance > 0){
          if (gLanguage == "de"){
            _htmlValueInformation += "<p><label for=\"txRecord\"><b> Transaktionsbeschreibung (optional): </b></label>" +
                                     "<input id=\"txRecord\" name=\"txRecord\" type=\"text\" size=\"30\" maxlength=\"120\" class=\"validate\"></p>" +
                                     "<button id=\"decrement\" type=\"submit\" name=\"decrement\">1 verbrauchen</button></p><div id=\"waitMsg\"></div>" +
                                     "<p><div id=\"historyButtons\"></div><div id=\"historyArea\"></div>";
          } else {
            _htmlValueInformation += "<p><label for=\"txRecord\"><b> Optional transaction record: </b></label>" +
                                     "<input id=\"txRecord\" name=\"txRecord\" type=\"text\" size=\"30\" maxlength=\"120\" class=\"validate\"></p>" +
                                     "<button id=\"decrement\" type=\"submit\" name=\"decrement\">Consume 1</button></p><div id=\"waitMsg\"></div>" +
                                     "<p><div id=\"historyButtons\"></div><div id=\"historyArea\"></div>";
          }
          _mustDisplayHistoryButtons = true;
        }
      }

      var _nodescText = (gLanguage == "de") ? "(Keine Beschreibung angegeben)<br>" : "(no description provided)<br>";
      var _htmlDescription = (_ck.moFields.customPayload === undefined) ? _nodescText : (_ck.moFields.customPayload + "<br>");
      var _htmlTimerSection = (gLanguage == "de") ? "<p><h3>Timer-Information:</h3></p>": "<p><h3>Timer information:</h3></p>";

      var _htmlTimerInfo = (gLanguage == "de") ? "<p><b>Keine definiert!</b></p>" : "<p><b>None defined!</b></p>";
      if (_ck.moFields.timeBombs !== undefined){
        _htmlTimerInfo = decodeTimebombArray(_ck.moFields.timeBombs, gLanguage);
      }
      var _htmlFullMessage = _htmlMoHeading + _htmlDescription + _htmlValueInformation + _htmlTimerSection + _htmlTimerInfo
    }

    writeToMain(_htmlFullMessage);
    if (_mustDisplayHistoryButtons){
      displayHistoryButtons();
    }
  }
  //console.log("Signing out in the background");
  await doSignout(_ck);
  //console.log("Leaving printMoResult");

  $("#decrement").click(function (e) {
    e.preventDefault();
    handleDecrementDemo();
  });
  $("#activate").click(function (e) {
    e.preventDefault();
    handleMoActivation();
  });
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    mainMoDisplayWOHistory();
  });

