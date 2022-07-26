/*
 * Connictro Blockchain - Permit/Voucher Example  - QR Code Generator
 *
 * The demo accepts Connictro Blockchain credentials as parameters to form an URL,
 * displayed as QR code. Actually these parameters are the same as for the Connictro
 * Blockchain login page from this example
 * (clientKey abbreviated as k, encHash abbreviated as e, clientCertificate abbreviated as c -
 *  in order not to add too much redundant info to the QR code)
 * Furthermore parameter 'd' denotes development blockchain (can be A or B).
 * Optionally parameter 'l' denotes language (currently just 'de' is detected - switches to German, everything else is displayed as English.)
 *
 * Outline:
 * https:<server>/qrResult.html?d=<chain>&k=<insert your clientKey here>&e=<insert your encHash here>&c=<insert your clientCertificate here>
 *
 * Optionally a button to provision the just-created MO will be displayed. Actual provisioning will be performed server-side.
 * Parameter to display the provision button: p=true or p=1
 * (NOTE: Intentionally provisioning only works for MOs in state New/Created).
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

const gTargetUrlStart  = "https://www.connictro.de/bc-examples/";
const gTargetScript    = "permitVoucherExample.html";
const gProvisionScript = "https://www.connictro.de/bc-examples/cbdemo.php";
var gUrlParams = null;

function parseUrlParametersWithProv(){
  var _signinCreds = parseUrlParametersJustCreds();
  if (_signinCreds != null){
    var displayProvButton = GetParams['p'];
    _signinCreds.provision = (displayProvButton !== undefined) ? ((displayProvButton == "true" || displayProvButton == 1) ? true : false) : false;
  }
  return _signinCreds;
}

function handleProvisionDemo(){
  return new Promise((resolve, reject) => {
    //console.log("Entering handleProvisionDemo");
    var _targetkey = gUrlParams.clientKey;
    var _server = gProvisionScript;
    $("#provisionerror").empty();

    $.ajax({
        type: 'post',
        url: _server + '?clientKey=' + _targetkey,
        success: function (response) {
          var prov_good_msg = (gLanguage == "de") ? "<br><h3>Bereitstellung erfolgreich!</h3>" : "<br><h3>Provisioning successful!</h3>";
          writeToSection("provisioning", prov_good_msg);
          //console.log("Resolving handleProvisionDemo (success)");
          resolve();
        },
        error: function (response) {
          //console.log(response);
          //console.log("Rejecting handleProvisionDemo (failure)");
          var prov_bad_msg = (gLanguage == "de") ? "<br><h3>Bereitstellung fehlgeschlagen, bitte erneut versuchen!</h3>" : "<br><h3>Provisioning failed, please try again!</h3>";
          writeToSection("provisionerror", prov_bad_msg);
          reject();
        }
     });
  });
}

function generateCbQr(){
  gUrlParams = parseUrlParametersWithProv();
  if (gUrlParams == null) return;

  genericGenerateCbQr(gTargetUrlStart, gTargetScript, gUrlParams.chain, gUrlParams.clientKey, gUrlParams.encHash, gUrlParams.clientCertificate, 0);

  // generate the provisioning button if it should be displayed
  if (gUrlParams.provision){
    var _htmlProvisionSection = (gLanguage == "de") ?
                                  "<br><h3>Schlie&szlig;en Sie diesen Tab nicht, bevor das neue MO bereitgestellt wurde!</h3><button id=\"provision\" type=\"submit\" name=\"provision\">Erzeugten Gutschein jetzt bereitstellen!</button><br><br><div id=\"provisionerror\"></div>" :
                                  "<br><h3>Do not close this tab before new MO was provisioned!</h3><button id=\"provision\" type=\"submit\" name=\"provision\">Provision created voucher now!</button><br><br><div id=\"provisionerror\"></div>";
    writeToSection("provisioning", _htmlProvisionSection);
  }

  $("#provision").click(function (e) {
    e.preventDefault();
    handleProvisionDemo();
  });
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    generateCbQr();
  });

