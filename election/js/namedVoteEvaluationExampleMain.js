/*
 * Connictro Blockchain - Named Vote Example - Vote Evaluation
 *
 * This module is part of the election (named vote) example.
 * It allows to evaluate results of a running or finished election.
 * It runs as sublicensee and expects two or more enduser dependents (the voters)
 *
 * The demo accepts Connictro Blockchain credentials as URL parameters
 * (clientKey abbreviated as k, encHash abbreviated as e, clientCertificate abbreviated as c -
 *  in order not to add too much redundant info to the QR code)
 *
 * Furthermore parameter 'd' denotes development blockchain (can be A or B). If not given, A is assumed.
 * Optionally parameter 'l' denotes language (currently just 'de' is detected - switches to German, everything else is displayed as English.)
 *
 * Example:
 * https:<server>/namedVoteExample.html?d=A&k=<insert your clientKey here>&e=<insert your encHash here>&c=<insert your clientCertificate here>
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

const abstention_id = "invalid";
var mVotesExamined = 0;
var mVotesExpired = 0;
var mVoteChoices = null;     // will contain all the vote choices, including "invalid" for abstention
var mAllVotes = null;        // will contain all the valid vote results (w/o expired votes).
var mReadVotesError = false;
var mNotStarted;

async function readVoteObject(customPayloadField){
  //console.log("Entering readVoteObject");

  var voteObject;
  try {
    voteObject = await parseJsonWithDefaultCatchingErrors(customPayloadField);
  } catch(err) {
    // any error means no projects.
    console.log("Error parsing customPayload \"" + customPayloadField + "\", not a valid JSON");
    return null;
  }
  //console.log("Leaving readVoteObject");
  return voteObject;
}

function createHtmlResultTableRow(_number, _text_de, _text_en){
  var _html_line = "";
  if (_number > 0){
    _html_line += (gLanguage == "de") ? ("<tr><td>" + _text_de) : ("<tr><td>" + _text_en);
    _html_line += ":&nbsp;&nbsp</td><td>" + _number + "</td></tr>";
  }
  return _html_line;
}


async function presentVoteResult(num_voters, _ck){
  var pending_votes = num_voters-mVotesExpired-mAllVotes.length;
  //console.log("Entering presentVoteResult, voters: " + num_voters + "; expired votes: " + mVotesExpired + "; pending votes: " + pending_votes);
  //console.log("Vote choices:"); console.log(mVoteChoices);
  //console.log("Vote results:"); console.log(mAllVotes);
  var vote_result_html;
  var bogus_votes = 0;
  var election_started_or_ended = true;
  var results = new Array(mVoteChoices.vote_options.length);
  results.fill(0);


  // Examine states, convert to vote result
  var election_special_title;
  if (mNotStarted){
    election_special_title = ((gLanguage == "de") ? "Wahl hat noch nicht begonnen" : "Election didn't yet start");
  } else if (mAllVotes.length > 0){
    for (var i=0; i<mAllVotes.length; i++){
      switch (mAllVotes[i].state){
        case 5:
          /* FALLTHROUGH */
        case 4:
          election_started_or_ended = false;
          election_special_title = ((gLanguage == "de") ? "Validierung / Pairing in dieser Demo nicht unterst&uuml;tzt!" : "Validation / Pairing not supported in this demo!");
          break;
        /* 7, 1 or 0 should not happen - in case of 7 (not started) the vote should not have been recorded, in case of 1 or 0 somebody further depleted the object
         * (manipulated attempt to double/triple vote by manual API access from enduser object)
         */
        case 7:
          /* FALLTHROUGH */
        case 1:
          /* FALLTHROUGH */
        case 0:
          bogus_votes++;
          break;
        case 2:
          // valid vote: count result
          var isVote = (vote) => vote == mAllVotes[i].choice;
          var found = mVoteChoices.vote_options.findIndex(isVote);
          if (found != -1){
            results[found]++;
          }
          break;
        default:
          // pending result: do nothing
          break;
      }
      if (!election_started_or_ended){
        break;
      }
    }
  }
  //console.log("Vote counts:"); console.log(results);

  // print election status and title into heading
  var election_first_title =
    (election_started_or_ended && !mNotStarted) ?
      ((pending_votes == 0) ?
        ((gLanguage == "de") ? "Endergebnis" : "Final Election result") :
        ((gLanguage == "de") ? "Zwischenergebnis (Wahl l&auml;uft noch)" : "Intermediate result (election still running)")) :
      election_special_title;
  writeToSection("electionStatus", election_first_title);
  writeToSection("electionTitle", mVoteChoices.title);


  /* Finally display the total vote results.
   * If the individual votes are needed, the raw votes (and association to keys) could be evaulated,
   * and assigned to real names if tracking random keys to real names.
   */

  if (!mNotStarted){
    vote_result_html = (gLanguage == "de") ?
      "<thead><tr><th>Option</th><th>Stimmen</th></tr></thead><tbody>" :
      "<thead><tr><th>Choice</th><th>Votes</th></tr></thead><tbody>";

    for (var i=0; i<results.length; i++){
      var cur_choice = (mVoteChoices.vote_options[i] == abstention_id) ?
        ((gLanguage == "de") ? "Stimmenthaltungen" : "Abstentions") :
        mVoteChoices.vote_options[i] ;
      vote_result_html += "<tr><td>" + cur_choice + ":&nbsp;&nbsp;</td><td>" + results[i] + "</td></tr>";
    }

    vote_result_html += createHtmlResultTableRow(bogus_votes, "Ung&uuml;ltige Stimmen", "Bogus votes");
    vote_result_html += createHtmlResultTableRow(mVotesExpired, "Nicht gew&auml;hlt", "Not voted");
    vote_result_html += createHtmlResultTableRow(pending_votes, "Noch ausstehend", "Pending");
    vote_result_html += "</tbody>"

    writeToSection("voteReportSection", vote_result_html);
  }
  $("#waitMsg").empty();
  //console.log("Signing out in the background");
  await doSignout(_ck);
  //console.log("Leaving presentVoteResult");
}

function displayVoteError(_ck, _errMsg){
  writeToSection("voteReportSection", _errMsg);
  //console.log("Signing out in the background");
  doSignout(_ck);
}


async function requestVoteChoices(_ck, _clientKey, maxindex){
  //console.log("Entering requestVoteChoices");
  try {
    var fieldRead = await readForeignMoSingleFieldOrAssetRaw(_ck, _clientKey, "customPayload", false);
    if (fieldRead.customPayload !== undefined){
      mVoteChoices = await readVoteObject(fieldRead.customPayload);
      mVoteChoices.vote_options.push(abstention_id);
    }
  } catch (err){
    // on any error, abort reading further results.
    console.log("Error reading vote choices!");
    mReadVotesError = true;
    displayVoteError(_ck, (gLanguage == "de") ? "<h3>Fehler beim Lesen der Auswahlliste!</h3>" :"<h3>Error reading the choices list!</h3>");
  }
  mVotesExamined++;
  if (mVotesExamined == maxindex+1){
    presentVoteResult(maxindex, _ck);
  }
  //console.log("Leaving requestVoteChoices");
}

  /* This function requests a single submo with fields and assets in the background.
   * It runs in multiple instances.
   */
async function populateSubmoResult(_ck, _clientKey, whichindex, maxindex){
  //console.log("Entering populateSubmoResult for entry " + whichindex);
  if (mReadVotesError){
    return;
  }

  var curVoteResult = {
    id: whichindex,
    choice: ""
  }
  var haveValidVote = false;

  if (whichindex == 0){
    /* Only for entry 0 extract the available votes from the customPayload field
     * (in background).
     * We don't need it for all MOs since this is identical for all.
     */
    requestVoteChoices(_ck, _clientKey, maxindex);
  }

  try {
    var assetRead = await readForeignMoSingleFieldOrAssetRaw(_ck, _clientKey, "life", true);
    if (assetRead.allAssetsWithTransaction !== undefined){
      var lifeInfo = assetRead.allAssetsWithTransaction[0];
      curVoteResult.state = lifeInfo.assetCurrentBalance;
      if (curVoteResult.state == 7) {
        mNotStarted = true;
      }
      var txHistory = lifeInfo.transactionHistoryList;
      if (txHistory){
        if (txHistory.length > 0){
          var lastTxHist = txHistory[txHistory.length-1];
          curVoteResult.choice = lastTxHist.transactionRecord;
          mAllVotes.push(curVoteResult);
          haveValidVote = true;
        }
      }
      if (curVoteResult.state == 2 && !haveValidVote){
        // Depeleted and no vote result means the timer expiration was the reason. Count not issued vote.
        mVotesExpired++;
      }
    }
  } catch (err){
      // on any error, abort reading further results.
      console.log("Error reading vote results for " + whichindex);
      mReadVotesError = true;
      displayVoteError(_ck, (gLanguage == "de") ? "<h3>Fehler beim Lesen der Ergebnisse!</h3>" :"<h3>Error reading the election results!</h3>");
  }

  mVotesExamined++;
  // If we have collected all single results, present the total vote result.
  if (mVotesExamined == maxindex+1){
    presentVoteResult(maxindex, _ck);
  }
  //console.log("Leaving populateSubmoResult");
}

async function displayDependentsResult(_ck, _nodeResponseObj){
  //console.log("Entering displayDependentsResult, dumping _nodeResponse:");
  //console.log(_nodeResponseObj);
  var dependents = _nodeResponseObj.ListOfMoKeys;

  if (dependents === undefined){
    displayVoteError(_ck, (gLanguage == "de") ? "<h3>Keine W&auml;hler definiert!</h3>" :"<h3>No voters defined!</h3>");
  } else {
    if (dependents.length < 2){
      displayVoteError(_ck, (gLanguage == "de") ? "<h3>Weniger als 2 W&auml;hler definiert!</h3>" :"<h3>Less than 2 voters defined!</h3>");
    } else {
      mVotesExamined = 0;
      mAllVotes = new Array();
      // Asynchronously walk through each dependent. Evaluation will be performed once all results have been received.
      for (var submo=0; submo<dependents.length; submo++){
        populateSubmoResult(_ck, dependents[submo].clientKey, submo, dependents.length);
      }
    }
  }
  //console.log("Leaving displayDependentsResult");
}

async function printMoResult(_ck){
  //console.log("Entering printMoResult");
  //console.log(_ck);
  mNotStarted = false;
  var _goReadVotesOk = false;
  if (_ck.moFields.moTier < 3 || _ck.moFields.moTier > 127){
     // allow only (sub)licensees for this part of the demo.
     writeToMain((gLanguage == "de") ? "<h3>MO Lesen erfolgreich, aber es sind nur (Sub)-Licensees erlaubt!</h3>" :"<h3>MO read OK but only (sub)licensees allowed!</h3>");
  } else {
    var _state = extractBalance(_ck, "life");
    var _htmlFullMessage;
    if (_state == null){
      // Print message if we don't have the life asset defined.
      _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgew&auml;hltes MO ist ung&uuml;ltig (ohne Leben)!</h3>" : "<h3>Selected MO is invalid (no life)!</h3>";
    } else {
      if (_state == 0){
        // Print message if our life is depleted.
        _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgew&auml;hltes MO ist deaktiviert (Null Leben)!</h3>" : "<h3>Selected MO is inactive (zero life)!</h3>";
      } else {
        _goReadVotesOk = true;
        _htmlFullMessage = "<h3><span id=\"electionStatus\"></span> - <span id=\"electionTitle\"></span>:</h3>";
      }
    } // else _state == null
    _htmlFullMessage += "<div id=\"voteReportSection\"></div><div id=\"waitMsg\"></div>";
    writeToMain(_htmlFullMessage);
    var waitmsg = (gLanguage == "de") ?
                    "<h3 style=\"color:red;\">Lese Wahlergebnisse...</h3>" :
                    "<h3 style=\"color:red;\">Reading election results...</h3>";
    writeToSection("waitMsg", waitmsg);

    // If pre-checks above passed, read the dependents and continue.
    if (_goReadVotesOk){
        doReadOwnDependents(displayDependentsResult, printMoFailure, _ck);
    } else {
      //console.log("Signing out in the background");
      await doSignout(_ck);
    }
  }

  // Note that we have no handlers as there are no UI actions.
  //console.log("Leaving printMoResult");
}

$(document).ready(function(){
    //console.log("Entering document ready function");
    mainMoDisplayWithHistory();
  });

