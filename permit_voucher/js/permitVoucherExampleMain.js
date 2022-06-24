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

const CHAIN_PORT_A = 58081; // 58081 is the default port for A development chain (reset in Jan-Mar-May-Jul-Sep-Nov)
const CHAIN_PORT_B = 58082; // For B development chain (reset Feb-Apr-Jun-Aug-Oct-Dec) set to 58082.
                            // For production chain set to 58080 (not recommended for this demo as all data in production will be PERMANENT!). 
const DEV_NODE_LIST = [
        "https://node1.connictro-blockchain.de:",
        "https://node2.connictro-blockchain.de:",
        "https://node3.connictro-blockchain.de:"
        ]        
var gRandNode = null;
var gShowingHistory = false;
var gLanguage;

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

function parseUrlParametersAndChooseNode(){
  //console.log("Entering parseUrlParametersAndChooseNode");
  var clientKeyParam = GetParams['k'];
  var clientCertParam = GetParams['c'];
  var encHashParam = GetParams['e'];
  var devChain = GetParams['d'];
  gLanguage = GetParams['l'];  
    
  if (clientKeyParam == undefined || clientCertParam == undefined || encHashParam == undefined || devChain == undefined){
    var invalid_param_msg = (gLanguage == "de") ?
                              "<h3>Ung&uuml;ltige Parameter</h3>Bitte angeben: d (Demo Blockchain A oder B), e (encHash), k (clientKey) und c (clientCertificate)!</h3>" :  
                              "<h3>Invalid Parameters</h3>Must specify d (chain A or B), e (encHash), k (clientKey) and c (clientCertificate)!</h3>";  
    writeToMain(invalid_param_msg);
    return null;
  }
    
  var _chosenChain = null;
  if (devChain != null && (devChain != 'a' && devChain != 'A')){
    _chosenChain = 'B';
  } else {
    _chosenChain = 'A';
  }
  var chosenServer = chooseNode(_chosenChain);
    
  var _signinCreds = { 
              clientKey: clientKeyParam,
              clientCertificate: clientCertParam,
              encHash: encHashParam,
              server: chosenServer
            }     
  //console.log("Leaving parseUrlParametersAndChooseNode");
  return _signinCreds;
}


function mainMoDisplay(){
  //console.log("Entering mainMoDisplay");
  var _signinCreds = parseUrlParametersAndChooseNode();
  if (_signinCreds == null) return;
  
  var _ck = doSigninAndReadMo(printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, false);
  if (_ck == null){
    var unable_read_msg = (gLanguage == "de") ? "<h3>MO nicht zugreifbar!</h3>" : "<h3>Unable to read MO!</h3>";
    writeToMain(unable_read_msg);
  }
  //console.log("Leaving mainMoDisplay");
}

function printMoFailure(){
  var signinfail = (gLanguage == "de") ? "<h3>Fehler: Login fehlgeschlagen!</h3>" : "<h3>Error: Sign-in failed!</h3>"; 
  writeToMain(signinfail);
}

async function handleDecrementDemo(){
  //console.log("Entering handleDecrementDemo");
  var _signinCreds = parseUrlParametersAndChooseNode();

  var _txRecord = $('#txRecord').val();
  var _ck = doSigninConsumeAndReadMo("#waitMsg", "value", _txRecord, printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, gLanguage);
  if (_ck == null){
    var unable_deduct_msg = (gLanguage == "de") ? "<h3>Kann MO-Wert nicht vermindern!</h3>" : "<h3>Unable to deduct value from MO!</h3>";
    writeToMain(unable_deduct_msg);
  } else {
    $("#waitMsg").empty();
  }  
  await doSignout(_ck);
  //console.log("Leaving handleDecrementDemo");
}

async function handleMoActivation(){
  //console.log("Entering handleMoActivation");
  var _signinCreds = parseUrlParametersAndChooseNode();
  var activate_txrecord = (gLanguage == "de") ? "Demo MO-Aktivierung" : "Demo activate MO"; 
  
  var _ck = doSigninConsumeAndReadMo("#waitMsg", "life", activate_txrecord, printMoResult, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, gLanguage);
  if (_ck == null){
    var unable_status_msg = (gLanguage == "de") ? "<h3>Kann MO-Status nicht ändern!</h3>" : "<h3>Unable to change MO status!</h3>";
    writeToMain(unable_status_msg);
  } else {
    $("#waitMsg").empty();
  }  
  await doSignout(_ck);
  //console.log("Leaving handleMoActivation");
}

function displayHistoryButtons(){
  //console.log("Entering displayHistoryButtons");
  var _htmlHistoryButtons;
  if (gShowingHistory){
    _htmlHistoryButtons = (gLanguage == "de") ?
                          "<button id=\"showHistory\" type=\"submit\" name=\"showHistory\">Verlauf aktualisieren</button>" +                                    
                          "<button id=\"hideHistory\" type=\"submit\" name=\"hideHistory\">Verlauf verstecken</button>" :                                    
                          "<button id=\"showHistory\" type=\"submit\" name=\"showHistory\">Update history</button>" +                                    
                          "<button id=\"hideHistory\" type=\"submit\" name=\"hideHistory\">Hide history</button>";                                    
  } else {
    _htmlHistoryButtons = (gLanguage == "de") ? 
                            "<button id=\"showHistory\" type=\"submit\" name=\"showHistory\">Verlauf zeigen</button>" :                                    
                            "<button id=\"showHistory\" type=\"submit\" name=\"showHistory\">Show history</button>";                                    
  }
  writeToSection("historyButtons", _htmlHistoryButtons);

  $("#showHistory").click(function (e) {
    e.preventDefault();
    handleUpdateHistory(); 
  });

  $("#hideHistory").click(function (e) {
    e.preventDefault();
    handleHideHistory(); 
  });
  //console.log("Leaving displayHistoryButtons");
}

function handleHideHistory(){
  //console.log("Entering handleHideHistory");
  gShowingHistory = false;
  $("#historyArea").empty();
  displayHistoryButtons();
  //console.log("Leaving handleHideHistory");
}

async function handleUpdateHistory(){
  //console.log("Entering handleUpdateHistory");
  var _signinCreds = parseUrlParametersAndChooseNode();

  var _ck = doSigninAndReadMo(printMoValueHistory, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, true);
  if (_ck == null){
    var unable_read_msg = (gLanguage == "de") ? "<h3>MO nicht zugreifbar!</h3>" : "<h3>Unable to read MO!</h3>";
    writeToMain(unable_read_msg);
  }
  //console.log("Leaving handleUpdateHistory");
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
      var _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgewähltes MO ist ungültig (ohne Leben)!</h3>" : "<h3>Selected MO is invalid (no life)!</h3>"; 
    } else {
      var _licenseText     = (gLanguage == "de") ? 
                              ((_state > 3) ? _exampleTitle + " noch nicht aktiv" + ((_state >= 7) ? "" : " (bereitgestellt)") : (_state < 3) ? _exampleTitle + " abgelaufen!" : _exampleTitle + " g&uuml;ltig!") :
                              ((_state > 3) ? _exampleTitle + " not yet active" + ((_state >= 7) ? "" : " (provisioned)") : (_state < 3) ? _exampleTitle + " expired!" : _exampleTitle + " valid!");
      var _htmlMoHeading   = "<h3>" + _licenseText + "</h3>";
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
            
      var _htmlDescription = _ck.moFields.customPayload + "<br>";
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
    mainMoDisplay(false);
  });

