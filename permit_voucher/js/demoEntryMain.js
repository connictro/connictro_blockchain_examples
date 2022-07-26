/*
 * Connictro Blockchain - Permit/Voucher Example - Entry page
 *
 * The demo page prepares creation of a Connictro Blockchain end user MO
 * and submits the request to a server-side script, which returns the requested
 * credentials as QR code.
 *
 * Optionally parameter 'l' denotes language (currently just 'de' is detected -
 * switches to German, everything else is displayed as English.)
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

const gRedirectUrl = "https://www.connictro.de/bc-examples/cbdemo.php";

// Redraws demo-specific widgets
function handleExampleSelect(){
  var exmpl = $("#exampleSelect").val();
  var _specificHtml;
  var _demoTimes = getDemoTimes();
  switch(exmpl){
    case "permit":
      _specificHtml =
       ((gLanguage == "de") ? "<label for=\"startTime\"><b> Startdatum/Zeit: </b></label>" : "<label for=\"startTime\"><b> Start date/time: </b></label>") +
       "<input id=\"startTime\" name=\"startTime\" type=\"datetime-local\" value=\"" + _demoTimes.time_start + "\" min=\"" + _demoTimes.time_now + "\" max=\"" + _demoTimes.time_maxexp + "\">" +
       "<div id=\"startTimeMsg\"></div>";
      break;
    case "voucher":
      // for Voucher we won't have a start time but a start credit.
      _specificHtml =
         ((gLanguage == "de") ? "<p><b>Startguthaben: </b>" : "<p><b>Initial Credit: </b>") +
         "<select id=\"initialCredit\" class=\"browser-default\">" +
           "<option value=\"1\">1</option>" + "<option value=\"2\">2</option>" + "<option value=\"3\">3</option>" + "<option value=\"4\">4</option>" +
           "<option value=\"5\">5</option>" + "<option value=\"6\">6</option>" + "<option value=\"7\">7</option>" + "<option value=\"8\">8</option>" +
           "<option value=\"9\">9</option>" + "<option value=\"10\" selected>10</option>" + "<option value=\"11\">11</option>" + "<option value=\"12\">12</option>" +
           "<option value=\"13\">13</option>" + "<option value=\"14\">14</option>" + "<option value=\"15\">15</option>" + "<option value=\"16\">16</option>" +
           "<option value=\"17\">17</option>" + "<option value=\"18\">18</option>" + "<option value=\"19\">19</option>" + "<option value=\"20\">20</option>" +
         "</select>" +
         ((gLanguage == "de") ?
           " (HINWEIS: Maximal 20 f&uuml;r diese Demo. Melden Sie sich f&uuml;r einen kostenlosen Test an um diese Einschr&auml;nkung zu entfernen.)</p>" +
           "<p><b>Maximale Nutzungszeit nach Verbrauchsstart: </b>" +
           "<select id=\"usageLimit\" class=\"browser-default\">" +
           "<option value=\"0\" selected>Unbegrenzt</option>" +
           "<option value=\"600000\">10 Minuten</option>" +
           "<option value=\"1200000\">20 Minuten</option>" +
           "<option value=\"1800000\">30 Minuten</option>" +
           "<option value=\"2400000\">40 Minuten</option>" +
           "<option value=\"3000000\">50 Minuten</option>" +
           "<option value=\"3600000\">1 Stunde</option>"
          :
           " (NOTE: Maximum 20 for this demo. Sign up for Trial (at least) to remove this limitation.)</p>" +
           "<p><b>Maximum usage time after start of usage: </b>" +
           "<select id=\"usageLimit\" class=\"browser-default\">" +
           "<option value=\"0\" selected>No limit</option>" +
           "<option value=\"600000\">10 minutes</option>" +
           "<option value=\"1200000\">20 minutes</option>" +
           "<option value=\"1800000\">30 minutes</option>" +
           "<option value=\"2400000\">40 minutes</option>" +
           "<option value=\"3000000\">50 minutes</option>" +
           "<option value=\"3600000\">1 hour</option>"
         ) +
         "</select>";
      break;
    default:
      _specificHtml = (gLanguage == "de") ? "<h3 style=\"color:red;\">Irgendwas ist schiefgelaufen.. ung&uuml;ltiges Beispiel</h3>" : "<h3 style=\"color:red;\">Something bad happened... invalid example</h3>";
      break;
  }
  writeToSection("exampleSpecific", _specificHtml);
}

function verifyStartTime(){
  // Verify and ensure start time is not set after expiration time.
  var curExpTimeNum = readTimeNumerical("expTime");
  var curStartTimeNum = readTimeNumerical("startTime");
  if (curExpTimeNum <= curStartTimeNum){
    var start_time_msg = (gLanguage == "de") ? "<h3 style=\"color:red;\">Startzeit muss vor Ablaufzeit liegen!</h3>" : "<h3 style=\"color:red;\">Start time must be before expiration time!</h3>";
    writeToSection("startTimeMsg", start_time_msg)
    return null;
  }
  $("#startTimeMsg").empty();
  return { expTime: curExpTimeNum, startTime: curStartTimeNum};
}

// Read out the widgets and call the CreateMo server-side URL to create a simple permit with start and expiration time.
function handleCreateSimplePermit(_customFields){
  //console.log("Entering handleCreateSimplePermit");
  var timesObj = verifyStartTime();
  if (timesObj == null){
    return;
  }
  //console.log("Ready creating permit");
  //console.log("customID: " + _customFields.customId);
  //console.log("customPayload: " + _customFields.customPayload);
  //console.log("start time: " + timesObj.startTime);
  //console.log("expiration time: " + timesObj.expTime);
  // We have all what we need, call the PHP. It will redirect to the page showing the QR code.
  var newUrl = gRedirectUrl + "?" +
               (_customFields.customId ? ("customId=" + encodeURIComponent(_customFields.customId) + "&") : "") +
               (_customFields.customPayload ? ("customPayload=" + encodeURIComponent(_customFields.customPayload) + "&") : "") +
               ((gLanguage == "de") ? "lang=de&" : "") +
               "startTime=" + timesObj.startTime + "&" +
               "expirationTime=" + timesObj.expTime;
  location.assign(newUrl);
}

// Read out the widgets and call the CreateMo server-side URL to create a simple voucher with value and expiration time.
function handleCreateSimpleVoucher(_customFields){
  //console.log("Entering handleCreateSimpleVoucher");
  var curExpTimeNum = readTimeNumerical("expTime");
  var maxUsageTime = $("#usageLimit").val();
  var initialValue = $("#initialCredit").val();
  //console.log("Ready creating voucher");
  //console.log("customID: " + _customFields.customId);
  //console.log("customPayload: " + _customFields.customPayload);
  //console.log("expiration time: " + curExpTimeNum);
  //console.log("max. usage time: " + maxUsageTime);
  //console.log("initial credit: " + initialValue);
  // We have all what we need, call the PHP. It will redirect to the page showing the QR code.
  var newUrl = gRedirectUrl + "?" +
               (_customFields.customId ? ("customId=" + encodeURIComponent(_customFields.customId) + "&") : "") +
               (_customFields.customPayload ? ("customPayload=" + encodeURIComponent(_customFields.customPayload) + "&") : "") +
               ((gLanguage == "de") ? "lang=de&" : "") +
               "initialCredit=" + initialValue + "&" +
               ((maxUsageTime > 0) ? ("usageDuration=" + maxUsageTime + "&") : "") +
               "expirationTime=" + curExpTimeNum;
  location.assign(newUrl);
}

function handleSubmitRequest(){
  //console.log("Entering handleSubmitRequest");
  // distinguish between demos and call one of the above functions and read the common custom fields.
  var _customId = $("#customId").val();
  var _customPayload = $("#customPayload").val();
  var customFields = { customId: _customId, customPayload: _customPayload};
  var exmpl = $("#exampleSelect").val();
  var finalization_wait_msg = (gLanguage == "de") ? "<br><h3>Finalisierung dauert einige Sekunden... bitte warten</h3>" : "<br><h3>Finalization will take a few seconds... please wait</h3>";
  writeToSection("submitprogress", finalization_wait_msg);
  switch(exmpl){
    case "permit":
      handleCreateSimplePermit(customFields);
      break;
    case "voucher":
      handleCreateSimpleVoucher(customFields);
      break;
    default:
      var invalid_default = (gLanguage == "de") ? "<h3 style=\"color:red;\">Irgendwas ist schiefgelaufen.. ung&uuml;ltiges Beispiel</h3>" : "<h3 style=\"color:red;\">Something bad happened... invalid example</h3>";
      writeToMain(invalid_default);
      break;
  }
}

function mainDemo(){
  //console.log("Entering mainDemo");
  gLanguage = GetParams['l'];

  var _demoTimes = getDemoTimes();
  var _htmlHeading;
  var _htmlStaticWidgets;
  var _htmlSubmitButton;

  if (gLanguage == "de"){
    _htmlHeading =
       "<h3>Einfache Connictro Blockchain-Demo</h3>" +
       "<p><b>Erl&auml;uterung:</b><br>" +
       "Die Demo nutzt nur reines HTML und Javascript, die einzigen Abh&auml;ngigkeiten sind jQuery und QRCodeJS.<br>" +
       "\"Erlaubnis\" erzeugt einen zeitbegrenzten Pass, wie er z.B. f&uuml;r Konzerttickets oder Parkscheine verwendet werden kann." +
       "<br>\"Gutschein\" erzeugt eine virtuelle Geldb&ouml;rse mit Punkten, die bis zum Vorratsende verbraucht werden k&ouml;nnen (optional mit Beschreibung f&uuml;r jede Transaktion). " +
       "Gutscheine m&uuml;ssen nach Erzeugung noch bereitgestellt werden, bevor sie genutzt werden k&ouml;nnen.<br>" +
       "Das \"Gutschein\"-Beispiel demonstiert zus&auml;tzlich die Nutzung der Blockchain zur vertrauensw&uuml;rdigen Datenspeicherung.<br></p>";
    _htmlStaticWidgets =
       "<div>" +
         "<p><b>Demo-Typ ausw&auml;hlen:</b> " +
         "<select id=\"exampleSelect\" class=\"browser-default\">" +
           "<option value=\"permit\" selected>Erlaubnis (feste Startzeit)</option>" +
           "<option value=\"voucher\">Gutschein (mit vertrauensw&uuml;rdiger Datenspeicherung)</option>" +
         "</select>" +
         "</p>" +
      "</div>" +
       "<div>" +
         "<p>" +
           "<b>Textfelder - werden in der Blockchain abgelegt:</b><br>" +
           "Kurzname Ihrer Demo: " +
           "<input id=\"customId\" type=\"text\" size=\"10\" maxlength=\"30\" class=\"validate\">" +
           " (\"Erlaubnis\" falls leer gelassen)" +
         "</p>" +
         "<p>" +
           "Freitext - wird in Ihrer Demo angezeigt: " +
           "<input id=\"customPayload\" type=\"text\" size=\"30\" maxlength=\"120\" class=\"validate\">" +
         "</p>" +
         "<p>" +
           "<label for=\"expTime\"><b> Ablaufdatum/Zeit: </b></label>" +
           "<input id=\"expTime\" name=\"expTime\" type=\"datetime-local\" value=\"" + _demoTimes.time_exp + "\" min=\"" + _demoTimes.time_now + "\" max=\"" + _demoTimes.time_maxexp + "\"> " +
           " (HINWEIS: Maximal 6 Stunden in der Zukunft f&uuml;r diese Demo. Melden Sie sich f&uuml;r einen kostenlosen Test an um diese Einschr&auml;nkung zu entfernen.)" +
         "</p>" +
       "</div>";
    _htmlSubmitButton =
       "<br><button id=\"submitRequest\" type=\"submit\" name=\"submitRequest\">Demo-Objekt erzeugen!</button><br><div id=\"submitprogress\"></div>";
  } else {
    _htmlHeading =
       "<h3>Simple Connictro Blockchain Demo</h3>" +
       "<p><b>Demo explanation:</b><br>" +
       "The demo uses plain HTML and Javascript, and only has a dependency to jQuery and QRCodeJS.<br>" +
       "\"Permit\" creates a simple time-limited pass like used for concert tickets or parking permits." +
       "<br>\"Voucher\" creates a simple wallet of points which can be consumed until depletion (with optional description for each transaction). " +
       "Vouchers need to be provisioned (after creation) before they can be used.<br>" +
       "The \"Voucher\" example also demonstrates usage of the blockchain for trusted storage.<br></p>";
    _htmlStaticWidgets =
       "<div>" +
         "<p><b>Select type of demo:</b> " +
         "<select id=\"exampleSelect\" class=\"browser-default\">" +
           "<option value=\"permit\" selected>Permit (fixed start time)</option>" +
           "<option value=\"voucher\">Voucher (with trusted data storage)</option>" +
         "</select>" +
         "</p>" +
      "</div>" +
       "<div>" +
         "<p>" +
           "<b>Text fields - these are stored in the blockchain:</b><br>" +
           "Short name of your demo: " +
           "<input id=\"customId\" type=\"text\" size=\"10\" maxlength=\"30\" class=\"validate\">" +
           " (\"Permit\" displayed if left empty)" +
         "</p>" +
         "<p>" +
           "Free text displayed on your demo: " +
           "<input id=\"customPayload\" type=\"text\" size=\"30\" maxlength=\"120\" class=\"validate\">" +
         "</p>" +
         "<p>" +
           "<label for=\"expTime\"><b> Expiration date/time: </b></label>" +
           "<input id=\"expTime\" name=\"expTime\" type=\"datetime-local\" value=\"" + _demoTimes.time_exp + "\" min=\"" + _demoTimes.time_now + "\" max=\"" + _demoTimes.time_maxexp + "\"> " +
           " (NOTE: Maximum 6 hours in the future for this demo. Sign up for Free Trial to remove this limitation.)" +
         "</p>" +
       "</div>";
    _htmlSubmitButton =
       "<br><button id=\"submitRequest\" type=\"submit\" name=\"submitRequest\">Create demo object!</button><br><div id=\"submitprogress\"></div>";
  }

  var _htmlSpecificArea =
       "<div id=\"exampleSpecific\"></div>";
  var _htmlFullMessage = _htmlHeading + _htmlStaticWidgets + _htmlSpecificArea + _htmlSubmitButton;

  writeToMain(_htmlFullMessage);
  handleExampleSelect();

  $("#exampleSelect").change(function (e) {
    e.preventDefault();
    handleExampleSelect();
  });
  $("#submitRequest").click(function (e) {
    e.preventDefault();
    handleSubmitRequest();
  });
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    mainDemo();
  });

