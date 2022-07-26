/*
 * Connictro Blockchain - Company Internal Use Example
 *
 * This module displays a created end-user object with the purpose of booking hours for different projects.
 * This is typically used within R&D of companies or by consultants reporting to their principal.
 * Simplest way to do so would be a spreadsheet, but this is not fraud proof. Using Connictro Blockchain
 * instead, stores the time records in the fraud-proof distributed database.
 *
 * It allows to add projects, and for all projects added so far, a drop-down list for actual booking of time
 * to projects is displayed.
 *
 * It displays current status - which project currently working on (if any) and presents the appropriate options
 * (start/change or stop current project).
 * A report of work performed so far can be showm, which uses the DataTables component.
 * Reports can be exported to clipboard, CSV file, Excel [LibreOffice will work as well], PDF or sent to printer.
 *
 * The demo accepts Connictro Blockchain credentials as URL parameters
 * (clientKey abbreviated as k, encHash abbreviated as e, clientCertificate abbreviated as c -
 *  in order not to add too much redundant info to the QR code)
 *
 * Furthermore parameter 'd' denotes blockchain (can be A, B or P for development A/B or production). If not given, A is assumed.
 * Optionally parameter 'l' denotes language (currently just 'de' is detected - switches to German, everything else is displayed as English.)
 *
 * Example:
 * https:<server>/companyInternalExample.html?d=A&k=<insert your clientKey here>&e=<insert your encHash here>&c=<insert your clientCertificate here>
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


const SIGNIFICANT_TIME_DIFF = 60000; // significant time deltas are minutes. We don't care about anything less than a minute.
const exportFilenameBase = "Connictro_Blockchain_Example-Work_history_of_";

const BALANCE_WARNING = 100;
var gProjects;


async function addProject(_ck){
  //console.log("Entering addProject");
  // Read-modify-write projects list to customPayload field in blockchain.

  var project_name = $('#addProjectName').val();
  var _projectsFileList = [];
  try {
    var _projectsFileObj = await parseJsonWithDefaultCatchingErrors(_ck.moFields.customPayload);
    if (_projectsFileObj.ListOfProjects){
      _projectsFileList = _projectsFileObj.ListOfProjects;
    }
  } catch(err) {
    // any error means no projects.
    console.log("Ignoring customPayload \"" + _ck.moFields.customPayload + "\", not a valid JSON");
  }

  _projectsFileList.push(project_name);
  var _projectsObj = {
    ListOfProjects: _projectsFileList
  }
  var _serializedProjectsList = JSON.stringify(_projectsObj);
  //console.log("New project list to add is: " + _serializedProjectsList);
  doModifyField("#waitMsg", "customPayload", _serializedProjectsList, mainMoDisplayWithHistory, modifyMoFailure, _ck, gLanguage);
  //console.log("Leaving addProject");
}

async function handleAddProjectEntry(){
  //console.log("Entering handleAddProjectEntry");
  var _signinCreds = parseUrlParametersAndChooseNode();
  if (_signinCreds == null) return;

  var _ck = doSigninAndReadMo(addProject, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, true);
  //console.log("Leaving handleAddProjectEntry");
}

function retrieveBookingHistory(_ck){
  var _booking_history = extractHistory(_ck, "value");
  if (_booking_history === undefined || _booking_history == null ){
    _booking_history = [];
  }
  return _booking_history;
}

/* Checks last history entry (if any) about:
 * - if it is a start entry
 * - if it matches current project.
 * Returns an object consisting of these two booleans.
 */
async function checkProjectRunning(_ck){
  //console.log("Entering checkProjectRunning");

  // look into history if there is an unfinished booking.
  var _booking_history;
  try {
    _booking_history = await retrieveBookingHistory(_ck);
  } catch (err){
    // any error means we experienced a low-level error on identifying the booking history. Return an empty history.
    console.log("checkProjectRunning: Early error reading the booking history!");
    return {
       history_len: 0,
       is_stopped: true,
       last_project: "",
       last_time: 0
    }
  }

  var last_stopped = true; // assume no running project
  var last_started_project = "";
  var last_timestamp = "";
  if (_booking_history.length > 0){
    var last_entry = _booking_history[_booking_history.length-1];
    var last_tx_str = last_entry.transactionRecord;
    last_timestamp = last_entry.timestamp;
    /* look into last_tx if there is a start entry meaning current project time running,
     * decompose entry into object.
     */
    var last_tx_obj;
    try {
      last_tx_obj = await parseJsonWithDefaultCatchingErrors(last_tx_str);
      if (last_tx_obj.actions){
        var actionlist = last_tx_obj.actions;
        for (var i=0;i<actionlist.length; i++){
          if (actionlist[i].st == true){ // start entry found, current project time running
            last_stopped = false;
            last_started_project = actionlist[i].pid;
            break;
          }
        }
      }
    } catch(err) {
      // any error means no readable time booking entry. Stop here with the assumption that there is no running project.
    }
  }

  var numerical_last_time = new Number(new Date(last_timestamp));
  var retobj = {
    history_len: _booking_history.length,
    is_stopped: last_stopped,
    last_project: last_started_project,
    last_time: numerical_last_time
  };

  //console.log("Leaving checkProjectRunning");
  return retobj;
}

// Returns a stop time which is either current time, or the time entered into the stopTime widget
function calculateStopTimeRecord(last_entry_examined){
  //console.log("Entering calculateStopTimeRecord");
  var stop_record = {
      pid: last_entry_examined.last_project,
      st: false
    };

  /* Only if specific stop time is selected, take the time
   * entered into the widget and write it as stop time into the stop time record.
   */
  var stoptime_checked = $('#selectedStopTime').prop('checked');
  if (stoptime_checked){
    var _specified_stop_time = readTimeNumerical("stopTime");
    var stop_iso_time_str = new Date(_specified_stop_time)
    stop_record.time = stop_iso_time_str.toISOString();
  }

  //console.log("Leaving calculateStopTimeRecord");
  return stop_record;
}


async function writeBookingRecord(_ck, booking_record){
  //console.log("Entering writeBookingRecord");

  var serialized_booking_record = JSON.stringify(booking_record);
  var _signinCreds = parseUrlParametersAndChooseNode();

  try {
    await doBurnAsset("#waitMsg", "value", serialized_booking_record, _ck, gLanguage, true);
    // Need to re-read assets to update in _ck object
    await readOwnMoAssetsRaw(_ck, true);
    //console.log("Read assets successful");
    printMoResult(_ck);
  } catch (err){
    modifyMoFailure();
  }

  //console.log("Leaving writeBookingRecord");
}

async function startBookingWorker(_ck){
  //console.log("Entering startBookingWorker");
  var last_entry_examined = await checkProjectRunning(_ck); // look into history if there is an unfinished booking.
  var booking_record;
  var need_to_submit = true;
  var new_project = $("#projectSelection").val();
  var start_record = {
      pid: new_project,
      st: true
  }
  var opt_comment = $("#optComment").val();
  if (opt_comment){
    start_record.comment = opt_comment;
  }

  if (last_entry_examined.is_stopped){
    // no unfinished booking: Just write a start record.
    booking_record = { actions: [ start_record] };
  } else {
    // unfinished booking available
    if (last_entry_examined.last_project == new_project){
      // Trying to restart the same activity -> nothing to do
      var nothing_running_msg = (_lang == "de") ?
                    "<h3 style=\"color:red;\">Projekt ist schon aktiv!</h3>" :
                    "<h3 style=\"color:red;\">Project already running!</h3>";
      $("#waitMsg").append(nothing_running_msg);
      need_to_submit = false;
    } else {
      // otherwise write a stop record for the unfinished project and a start record for the new one.
      var stop_record = calculateStopTimeRecord(last_entry_examined);
      var booking_record = {
        actions: [ start_record, stop_record ]
      }
    }
  }
  if (need_to_submit){
    writeBookingRecord(_ck, booking_record);
  }
  //console.log("Leaving startBookingWorker");
}

async function stopBookingWorker(_ck){
  //console.log("Entering stopBookingWorker");
  var last_entry_examined = await checkProjectRunning(_ck); // look into history if there is an unfinished booking.
  if (last_entry_examined.is_stopped){
    // no running project: display message.
    var nothing_running_msg = (_lang == "de") ?
                    "<h3 style=\"color:red;\">Keine laufendes zu buchendes Projekt!</h3>" :
                    "<h3 style=\"color:red;\">No running project to book!</h3>";
    $("#waitMsg").append(nothing_running_msg);
  } else {
    var stop_record = calculateStopTimeRecord(last_entry_examined);
    var booking_record = {
      actions: [ stop_record ]
    }
    writeBookingRecord(_ck, booking_record);
  }
  //console.log("Leaving stopBookingWorker");
}

function handleStartStopBooking(processingWorker){
  //console.log("Entering handleStartStopBooking");
  var _signinCreds = parseUrlParametersAndChooseNode();
  var _ck = doSigninAndReadMo(processingWorker, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, true);
  //console.log("Leaving handleStartStopBooking");
}

function handleStartBooking(){ handleStartStopBooking(startBookingWorker); }
function handleStopBooking() { handleStartStopBooking(stopBookingWorker);  }

function displayReportButtons(){
  handleDisplayHistoryButtons("showReport", "hideReport", "Auswertung", "report", "reportButtons", "reportSection", printReportTable, displayReportButtons);
}

async function extractReport(_ck, _assetname){
  //console.log("Entering extractReport");

  var _interpreted_history = [];
  var _raw_booking_history = extractHistory(_ck, _assetname);
  if (_raw_booking_history === undefined || _raw_booking_history == null ){
    _raw_booking_history = [];
  }

  //console.log("read raw booking history, dump:");
  //console.log(_raw_booking_history);

  if (_raw_booking_history.length > 0){
    var pending_project_record = {
      pid: "",
      comment: "",
      timestamp: ""
    };
    for (var i=0; i<_raw_booking_history.length; i++){
      /* Walk through the history. Assume chronological order in the blockchain.
       * we can get start or stop events, or both. First extract all.
       */
      var cur_entry = _raw_booking_history[i];
      var current_start_record = {
        pid: "",
        comment: "",
        timestamp: cur_entry.timestamp
      }
      var current_stop_record = {
        pid: "",
        timestamp: cur_entry.timestamp
      }

      var _booking_obj;
      try {
        var cur_tx_obj = await parseJsonWithDefaultCatchingErrors(cur_entry.transactionRecord);
        if (cur_tx_obj.actions){
          var actionlist = cur_tx_obj.actions;
          for (var j=0;j<actionlist.length; j++){
            if (actionlist[j].st){
              current_start_record.pid = actionlist[j].pid;
              if (actionlist[j].comment !== undefined){
                current_start_record.comment = actionlist[j].comment;
              }
            } else {
              current_stop_record.pid = actionlist[j].pid;
              if (actionlist[j].time !== undefined){
                // if the stop record has a timestamp, use it instead of the blockchain's timestamp.
                current_stop_record.timestamp = actionlist[j].time;
              }
            }
          }
        }
      } catch (err){
        console.log("Ignoring history entry " + i + " \"" + cur_entry.transactionRecord + "\", not a valid JSON");
      }

      /* Now we have a start record, a stop record - or both (identified by pid being not empty),
       * consisting of pid, timestamp (and in case of start record) optionally also a comment.
       *
       * If we have a stop record, process it first - look for a matching pending start record and create a new project time entry.
       */
      if (current_stop_record.pid){
        if (current_stop_record.pid == pending_project_record.pid){
          /* Create a new project time entry if a significant time (>= 1 minute) has been recorded.
           * It consists of: project ID - start time - stop time - spent time (in minutes) - comment (if any)
           */
          var numerical_start_time = new Number(new Date(pending_project_record.timestamp));
          var numerical_stop_time = new Number(new Date(current_stop_record.timestamp));
          var significant_timediff = ~~((numerical_stop_time - numerical_start_time)/SIGNIFICANT_TIME_DIFF);
          if (significant_timediff > 0){
            var history_entry = {
              pid: current_stop_record.pid,
              time_start: pending_project_record.timestamp,
              time_stop: current_stop_record.timestamp,
              time_delta: significant_timediff,
              comment: pending_project_record.comment
            };
            _interpreted_history.push(history_entry);

            pending_project_record = { // empty out the pending record.
              pid: "",
              comment: "",
              timestamp: ""
            };

          }
        }
      }
      // If we have a start record, update the pending record.
      if (current_start_record.pid){
        pending_project_record.pid = current_start_record.pid;
        pending_project_record.timestamp = current_start_record.timestamp;
        pending_project_record.comment = current_start_record.comment;
      }
    }
  }

  //console.log("Leaving extractReport, dump of interpreted history object: ");
  //console.log(_interpreted_history);
  return _interpreted_history;
}

function drawReportTableGrid(){
  const _htmlTableHeadings = (gLanguage == "de") ?
        "<th>Projekt</th>" +
        "<th>Startzeit</th>" +
        "<th>Stopzeit</th>" +
        "<th>Zeit gearbeitet</th>" +
        "<th>Kommentar</th>" :
        "<th>Project</th>" +
        "<th>Start time</th>" +
        "<th>Stop time</th>" +
        "<th>Time worked</th>" +
        "<th>Comment</th>";

  const _htmlDtReportTable =
    "<table id=\"reportTable\" class=\"row-border\" cellspacing=\"0\" width=\"100%\">" +
      "<thead>" +
        "<tr>" +
          _htmlTableHeadings +
        "</tr>" +
      "</thead>" +
      "<tbody>" +
      "</tbody>" +
    "</table>";
  writeToSection("reportSection", _htmlDtReportTable);
}

function drawReportTable(processedReportData, exportFilenameBase, clientKey){
  //console.log("Entering drawReportTable");

  var _exportFilename = exportFilenameBase + clientKey;
  var data = [];

  for (var i=0; i<processedReportData.length; i++){
    var _entry = [
        processedReportData[i].pid,
        dateStringWithoutTZExplanation(new Date(processedReportData[i].time_start)),
        dateStringWithoutTZExplanation(new Date(processedReportData[i].time_stop)),
        processedReportData[i].time_delta,
        processedReportData[i].comment,
      ];
    data.push(_entry);
  }
  var searchterm = (gLanguage == "de") ? "Suchbegriff" : "Enter search term";

  var myReportTable = $('#reportTable');
  if (myReportTable.length) {
    var table = myReportTable.DataTable({
      'data': data,
      'language': {
        'search': '',
        'searchPlaceholder': searchterm
      },
      'order': [/*0, 'asc'*/],
      'dom': 'Bfrt<"footer-wrapper"l<"paging-info"ip>>',
      'buttons': [ { extend: 'copyHtml5'                             },
                   { extend: 'csvHtml5',   filename: _exportFilename },
                   { extend: 'excelHtml5', filename: _exportFilename },
                   { extend: 'pdfHtml5',   filename: _exportFilename,
                                           orientation: 'landscape',
                                           pageSize: 'A4',
                                           customize: function(doc) {
                                             doc.defaultStyle.fontSize = 8;
                                          }
                   },
                   { extend: 'print'                                 }
                 ],
      'lengthMenu': [ [25, 50, 100, 250, 500, -1], [25, 50, 100, 250, 500, 'All'] ],
      'scrollY': '400px',
      'scrollCollapse': true,
      'pagingType': 'full',
      'drawCallback': function( settings ) {
        var api = this.api();
        api.table().columns.adjust();
      }
    });
  }
  //console.log("Leaving drawReportTable");
}

async function printReportTable(_ck){
  //console.log("Entering printReportTable");

  try {
    var _reportList = await extractReport(_ck, "value");
    if (_reportList.length > 0){
      drawReportTableGrid();
      drawReportTable(_reportList, exportFilenameBase, _ck.clientKey);
      $('#reportTable').DataTable().draw();
    } else {
      var _htmlOther = (gLanguage == "de") ? "<h3><b>Keine Arbeit aufgezeichnet!</b></h3>" : "<h3><b>No work recorded!</b></h3>";
      writeToSection("reportSection", _htmlOther);
    }
  } catch (err) {
    var _htmlOther = (gLanguage == "de") ? "<h3><b>Fehler bei Reportgenerierung!</b></h3>" : "<h3><b>Error generating report!</b></h3>";
    writeToSection("reportSection", _htmlOther);
  }


  gShowingHistory = true;
  displayReportButtons();
  //console.log("Leaving printReportTable");
}

function optionalStopTimeSelection(){
  var stoptime_checked = $('#selectedStopTime').prop('checked');
  if (stoptime_checked){
    $('#optionalStopTime').show();
    var stopTimeWidget = document.getElementById('stopTime');
    stopTimeWidget.value = getNowAsTimeDateString();
  } else {
    $('#optionalStopTime').hide();
  }
}

async function printMoResult(_ck){
  //console.log("Entering printMoResult");
  //console.log(_ck);

  if (_ck.moFields.moTier != 255){
     // allow only endusers for this demo.
     writeToMain((gLanguage == "de") ? "<h3>MO Lesen erfolgreich, aber es sind nur Enduser erlaubt!</h3>" :"<h3>MO read OK but only endusers allowed!</h3>");
  } else {
    var _state = extractBalance(_ck, "life");
    var _htmlFullMessage;
    // Print message if we don't have life.
    if (_state == null){
      _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgew&auml;hltes MO ist ung&uuml;ltig (ohne Leben)!</h3>" : "<h3>Selected MO is invalid (no life)!</h3>";
    } else {
      var _exampleTitle = (gLanguage == "de") ? "Arbeitsaufzeichnungs-Objekt ist " : "Work records object is ";
      var _htmlMoHeading   = "<h3>" + _exampleTitle + verboseLifeState(_state, gLanguage) + "!</h3>";
      var _htmlActivateButton = "";
      var _htmlBalanceWarning = "";
      var _htmlProjectActions = "";
      const _htmlFinalWaitMsgSection = "<div id=\"waitMsg\"></div>";
      var _mustDisplayReportButtons = false;

      // Display activate button if MO is provisioned but not yet in use.
      if (_state == 6){
          var activate_text = (gLanguage == "de") ? "Aktivieren" : "Activate";
          _htmlActivateButton = "<br><button id=\"activate\" type=\"submit\" name=\"activate\">" + activate_text + "</button>";
      }
      // Otherwise Display any activities if MO is in use only.
      var _balance = extractBalance(_ck, "value");
      if (_state == 3 && _balance != null){
        if (_balance > 0 && _balance < BALANCE_WARNING){
          var remaining_bookings = Math.floor(_balance / 2);
          var plural = (remaining_bookings != 1) ? ((gLanguage == "de") ? "en" : "s" ) : "";
          _htmlBalanceWarning = (gLanguage == "de") ?
            "<h4 style=\"color:red;\">Warnung: Transaktionsvorrat niedrig... nur noch " + remaining_bookings + " Buchung" + plural + " &uuml;brig</h4>" :
            "<h4 style=\"color:red;\">Warning: Transaction supply low... only " + remaining_bookings + " booking" + plural + " left</h4>";
        }
        var addproject_name = (gLanguage == "de") ? "Neues Projekt hinzuf&uuml;gen: " : "Add new project: ";
        var addproject_description = (gLanguage == "de") ? "Beschreibung: " : "Description: ";
        var addproject_button = (gLanguage == "de") ? "Zu Blockchain hinzuf&uuml;gen" : "Add to blockchain";
        _htmlProjectActions = "<p><label for=\"addProjectName\"><b>" + addproject_name + "</b></label>" +
                              "<input id=\"addProjectName\" name=\"addProjectName\" type=\"text\" size=\"15\" maxlength=\"25\" class=\"validate\">" +
                              "&nbsp;&nbsp;<button id=\"addProjectAction\" type=\"submit\" name=\"addProjectAction\">" + addproject_button + "</button></p>";

        var _projectsFileList = [];
        try {
          var _projectsFileObj = await parseJsonWithDefaultCatchingErrors(_ck.moFields.customPayload);
          if (_projectsFileObj.ListOfProjects){
            _projectsFileList = _projectsFileObj.ListOfProjects;
          }
        } catch(err) {
          // any error means no projects.
        }

        var last_entry_examined = await checkProjectRunning(_ck);

        // Time booking section only displayed if there are projects.
        if (_projectsFileList.length > 0){
          var booktime_intro = (gLanguage == "de") ? "<h3>Zeit buchen</h3> Projekt ausw&auml;hlen: " : "<h3>Book time</h3>Select project: ";
          var booktime_start_change = (gLanguage == "de") ? "Start oder &auml;ndern" : "Start or change";
          var optional_comment_text = (gLanguage == "de") ? "optionaler Kommentar" : "Optional comment";
          var booktime_stop = "Stop";
          _htmlProjectActions += booktime_intro + "<select id=\"projectSelection\" class=\"browser-default\">";
          for (var i=0; i<_projectsFileList.length;i++){
            var currentProjectName = _projectsFileList[i];
            _htmlProjectActions += "<option value=\"" + _projectsFileList[i] + "\">" + _projectsFileList[i] + "</option>";
          }
          _htmlProjectActions +=
            "</select>" +
            "<button id=\"startBookTime\" type=\"submit\" name=\"startBookTime\">" + booktime_start_change + "</button>&nbsp;&nbsp;" +
            optional_comment_text + ":&nbsp;<input id=\"optComment\" name=\"optComment\" type=\"text\" size=\"15\" maxlength=\"32\" class=\"validate\"></p>";

          if (!last_entry_examined.is_stopped){
            // Stop section with button and editable stop time. Maximum is current time and minimum the timestamp from the start entry.
            var _nowTDString = getNowAsTimeDateString();
            var _minTDString = dateStringYYYMMDDThhmm(last_entry_examined.last_time);
            var currentProjString = (gLanguage == "de") ? "Laufende Arbeit an: " : "Currently working on: ";
            var selectDifferentStopTimeString = (gLanguage == "de") ? "Andere Stop-Zeit" : "Different stop time";
            _htmlProjectActions += "<p><div id=\"stopTimeSection\"><b>" +
                 currentProjString + "</b>" + last_entry_examined.last_project +
                 "&nbsp;<button id=\"stopBookTime\" type=\"submit\" name=\"stopBookTime\">" + booktime_stop + "</button></p><b>" +
                 selectDifferentStopTimeString + ":</b>&nbsp;<input type=\"checkbox\" id=\"selectedStopTime\">&nbsp;&nbsp;" +
                 "<span id=\"optionalStopTime\" hidden>" +
                 ((gLanguage == "de") ? "<label for=\"stopTime\"><b> Stop-Datum/Zeit: </b></label>" : "<label for=\"stopTime\"><b> Stop date/time: </b></label>") +
                 "<input id=\"stopTime\" name=\"stopTime\" type=\"datetime-local\" value=\"" + _nowTDString + "\" min=\"" + _minTDString + "\" max=\"" + _nowTDString + "\">" +
                 "</span></div>";
          }

          if (last_entry_examined.history_len > 0){
            _mustDisplayReportButtons = true;
          }
        }
      }

      // Depleted objects should still be able to print the report. These just cannot book time anymore.
      if (_state <= 2 && _balance != null){
        var depleted_booking_history;
        try {
          depleted_booking_history = await retrieveBookingHistory(_ck);
          if (depleted_booking_history.length > 0){
            _mustDisplayReportButtons = true;
          }
        } catch (err){
          // any error means there are no valid bookings. The report buttons won't be displayed.
        }
      }

      var _htmlTimerSection = "";
      if (_ck.moFields.timeBombs !== undefined){
        _htmlTimerSection = ((gLanguage == "de") ? "<p><h3>Timer-Information:</h3></p>": "<p><h3>Timer information:</h3></p>") +
                            decodeTimebombArray(_ck.moFields.timeBombs, gLanguage);
      }

      _htmlProjectActions += "<p><div id=\"reportButtons\"></div><p><div id=\"reportSection\"></div>";
      _htmlFullMessage = _htmlMoHeading + _htmlActivateButton + _htmlBalanceWarning + _htmlProjectActions + _htmlTimerSection + _htmlFinalWaitMsgSection;
    }

    writeToMain(_htmlFullMessage);
    if (_mustDisplayReportButtons){
      handleHideHistorySection("reportSection", displayReportButtons);
    }
  }
  //console.log("Signing out in the background (printMoResult)");
  await doSignout(_ck);
  //console.log("Leaving printMoResult");

  $("#generateReport").click(function (e) {
    e.preventDefault();
    handleUpdateReport();
  });

  $("#addProjectAction").click(function (e) {
    e.preventDefault();
    handleAddProjectEntry();
  });

  $("#selectedStopTime").change(function (e) {
    e.preventDefault();
    optionalStopTimeSelection();
  });

  $("#startBookTime").click(function (e) {
    e.preventDefault();
    handleStartBooking();
  });
  $("#stopBookTime").click(function (e) {
    e.preventDefault();
    handleStopBooking();
  });
  $("#activate").click(function (e) {
    e.preventDefault();
    handleMoActivation();
  });
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    mainMoDisplayWithHistory();
  });
