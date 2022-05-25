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

const gTargetUrlStart  = "https://www.connictro.de/bc-examples/permitVoucherExample.html?";
const gProvisionScript = "https://www.connictro.de/bc-examples/cbdemo.php"; 
var gUrlParams = null;
var gLanguage; 

function parseUrlParameters(){
    var clientKeyParam = GetParams['k'];
    var clientCertParam = GetParams['c'];
    var encHashParam = GetParams['e'];
    var devChain = GetParams['d'];
    var displayProvButton = GetParams['p'];
    gLanguage = GetParams['l'];
    
    if (clientKeyParam == undefined || clientCertParam == undefined || encHashParam == undefined || devChain == undefined){
      var invalid_param_msg = gLanguage ?
                              "<h3>Ung&uuml;ltige Parameter</h3>Bitte angeben: d (Demo Blockchain A oder B), e (encHash), k (clientKey) und c (clientCertificate)!</h3>" :  
                              "<h3>Invalid Parameters</h3>Must specify d (chain A or B), e (encHash), k (clientKey) and c (clientCertificate)!</h3>";  
      writeToMain(invalid_param_msg);
      return null;
    }
    
    if (devChain != 'a' && devChain != 'A' && devChain != 'b' && devChain != 'B'){
      writeToMain("<h3>Invalid chain specified - must be A or B</h3>");
      return null;
    }
    gUrlParams = { 
      clientKey: clientKeyParam,
      clientCertificate: clientCertParam,
      encHash: encHashParam,
      chain: devChain,
      provision: (displayProvButton !== undefined) ? ((displayProvButton == "true" || displayProvButton == 1) ? true : false) : false
    }     
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
  parseUrlParameters();
  if (gUrlParams == null) return;

  var _qrUrl = gTargetUrlStart + 
               "d=" + gUrlParams.chain +
               (gLanguage ? ("&l=" + gLanguage) : "") + 
               "&k=" + gUrlParams.clientKey + 
               "&e=" + gUrlParams.encHash + 
               "&c=" + gUrlParams.clientCertificate; 

  var _htmlHeading   = (gLanguage == "de") ?
                         "<h3>Bitte scannen oder ausdrucken, um auf das Connictro Blockchain-Beispiel zuzugreifen</h3>" : 
                         "<h3>Please scan or print to access Connictro Blockchain example</h3>";
  var _htmlQrElement = "<div id=\"qrcode\" style=\"width:100px; height:100px; margin-top:15px; margin-bottom:170px;\"></div>";
  var _htmlPlainUrl  = (gLanguage == "de") ?
                         "<p><div>&nbsp;&nbsp;<a href=\"" + _qrUrl + "\" target=\"_blank\">(oder klicken Sie hier)</a></div></p>"  :
                         "<p><div>&nbsp;&nbsp;<a href=\"" + _qrUrl + "\" target=\"_blank\">(or click this link instead)</a></div></p>";
  var _htmlProvisionButton = "<div id=\"provisioning\"></div>";
  
  writeToMain(_htmlHeading + _htmlQrElement + _htmlPlainUrl + _htmlProvisionButton);  

  // generate the provisioning button if it should be displayed
  if (gUrlParams.provision){
    var _htmlProvisionSection = (gLanguage == "de") ?
                                  "<br><h3>Schlie&szlig;en Sie diesen Tab nicht, bevor das neue MO bereitgestellt wurde!</h3><button id=\"provision\" type=\"submit\" name=\"provision\">Erzeugten Gutschein jetzt bereitstellen!</button><br><br><div id=\"provisionerror\"></div>" : 
                                  "<br><h3>Do not close this tab before new MO was provisioned!</h3><button id=\"provision\" type=\"submit\" name=\"provision\">Provision created voucher now!</button><br><br><div id=\"provisionerror\"></div>"; 
    writeToSection("provisioning", _htmlProvisionSection);
  }
               
  var qrcode = new QRCode(document.getElementById("qrcode"), {
	  width : 250,
	  height : 250
  });
  qrcode.makeCode(_qrUrl);
  
  $("#provision").click(function (e) {
    e.preventDefault();
    handleProvisionDemo(); 
  });    
}

$(document).ready(function(){
    //console.log("Entering document ready function");    
    generateCbQr();
  });

