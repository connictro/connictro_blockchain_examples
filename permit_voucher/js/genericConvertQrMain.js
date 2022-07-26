/*
 * Connictro Blockchain - Company-internal Example  - QR Code Generator
 *
 * The demo reads a Connictro Blockchain credentials file (as delivered from the UI Dashboard)
 * and converts it into a link to the company-internal example, displayed as link and QR code.
 * It runs completely locally in the browser.
 *
 * Parameters in this link are abbreviated similar as for the Permit/Voucher example:
 * - clientKey abbreviated as k, encHash abbreviated as e, clientCertificate abbreviated as c -
 * - Furthermore parameter 'd' denotes development blockchain (can be A or B).
 * - Optionally parameter 'l' denotes language (currently just 'de' is detected - switches to German, everything else is displayed as English.)
 *
 * This example is based on QR Code JS by davidshimjs,  twitter @davidshimjs
 * (under MIT License)
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

const gTargetUrlBase  = "https://www.connictro.de/bc-examples/";
const gExample         = "companyInternalExample.html";
var gUrlParams = null;
var mBaseUrlValue;
var mExamplePageValue;
var mSelectedChain;

function generateCbQr(_appendId){
  if (_appendId == 0){
    var baseUrlWidget       = document.getElementById("baseUrl");
    var examplePageWidget   = document.getElementById("examplePage");
    mBaseUrlValue = baseUrlWidget.value;
    mExamplePageValue = examplePageWidget.value;
    mSelectedChain = gUrlParams.chain;
  }
  genericGenerateCbQr(mBaseUrlValue, mExamplePageValue, mSelectedChain, gUrlParams.clientKey, gUrlParams.encHash, gUrlParams.clientCertificate, _appendId);
}

function loginCredsMultipleAction(_encHash, _selectedCredsArray){
  for (var i=0; i<_selectedCredsArray.length; i++){
    loginCredsSelectedActionInternal(_selectedCredsArray[i].clientKey, _encHash, _selectedCredsArray[i].clientCertificate, i);
  }
}

function loginCredsSelectedAction(_clientKey, _encHash, _clientCertificate){
  loginCredsSelectedActionInternal(_clientKey, _encHash, _clientCertificate, 0);
}

function loginCredsSelectedActionInternal(_clientKey, _encHash, _clientCertificate, _appendId){
  var chainRadioButtons = document.getElementsByName("selectChain");
  var chainSelectVal = "a";
  if (chainRadioButtons !== undefined){
    for (var i=0; i<chainRadioButtons.length; i++){
      if (chainRadioButtons[i].checked == true){
        chainSelectVal = chainRadioButtons[i].value;
        break;
      }
    }
  }

  gUrlParams = {
      clientKey: _clientKey,
      clientCertificate: _clientCertificate,
      encHash: _encHash,
      chain: chainSelectVal,
  };
  generateCbQr(_appendId);
}

function loginScreen(_errMsg){
  var _demo_convertpage = (_errMsg ? _errMsg : "");
  gLanguage = GetParams['l'];

  _demo_convertpage += (gLanguage == "de") ?
    "<h3>Konvertierung Zugangsdaten JSON in URL und QR-Code</h3>" +
    "<b>Nutze Blockchain-Service: </b>"
     :
    "<h3>Convert access certificate JSON into URL and QR code</h3>" +
    "<b>Using blockchain service: </b>";

  _demo_convertpage +=
     "<input type=\"radio\" name=\"selectChain\" id=\"selectDevA\" value=\"A\" checked />" +
     "<label for=\"selectDevA\">Development A </label>" +
     "<input type=\"radio\" name=\"selectChain\" id=\"selectDevB\" value=\"B\" />" +
     "<label for=\"selectDevB\">Development B </label>" +
     "<input type=\"radio\" name=\"selectChain\" id=\"selectProd\" value=\"P\" />" +
     "<label for=\"selectProd\">Production</label>";

  var base_url_text     = (gLanguage == "de") ? "Basis-URL" : "Base URL";
  var example_page_text = (gLanguage == "de") ? "Beispielseite" : "Example page";

  _demo_convertpage +=
    "<br><br><b>" + base_url_text + ":</b>&nbsp;" +
    "<input id=\"baseUrl\" type=\"text\" size=\"40\" maxlength=\"120\" class=\"validate\">" +
    "&nbsp;&nbsp;<b>" + example_page_text + ":&nbsp;" +
    "<input id=\"examplePage\" type=\"text\" size=\"30\" maxlength=\"80\" class=\"validate\">";

  _demo_convertpage += (gLanguage == "de") ?
    "<br><br><b>Bitte Zertifikatsdatei laden:</b>&nbsp;"
     :
    "<br><br><b>Please load certificate file:</b>&nbsp;";

  _demo_convertpage += "<input type=\"file\" id=\"loadCreds\" /><br>";

  writeToMain(_demo_convertpage);
  // As callback for the file selector use loginCredsSelected().

  var baseUrlWidget       = document.getElementById("baseUrl");
  var examplePageWidget   = document.getElementById("examplePage");
  baseUrlWidget.value     = gTargetUrlBase;
  examplePageWidget.value = gExample;

  $("#loadCreds").on('change', function (e) {
    //console.log("in eventlistener for file open button");
    openLocalFile(e.target.files, loginCredsSelected);
  });
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    loginScreen("");
  });

