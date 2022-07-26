/*
 * Connictro Blockchain - Named Vote Example
 *
 * This module is part of the election (named vote) example.
 * It allows to submit a vote if in the "In Use" state.
 * In lower states it displays the submitted vote (or the fact that no vote has been submitted).
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


async function readVoteObject(_ck){
  //console.log("Entering readVoteObject");

  var voteObject;
  try {
    voteObject = await parseJsonWithDefaultCatchingErrors(_ck.moFields.customPayload);
  } catch(err) {
    // any error means no projects.
    console.log("Error parsing customPayload \"" + _ck.moFields.customPayload + "\", not a valid JSON");
    return null;
  }
  //console.log("Leaving readVoteObject");
  return voteObject;
}

function handleVotesClear(){
  //console.log("Entering handleVotesClear");
  var voteRadioButtons = document.getElementsByName("voteSelect");
  for (var i=0; i<voteRadioButtons.length; i++){
    voteRadioButtons[i].checked = false;
  }
  //console.log("Leaving handleVotesClear");
}

async function handleVoteDemo(){
  //console.log("Entering handleVoteDemo");
  var voteRadioButtons = document.getElementsByName("voteSelect");
  var voteSelect = null;
  for (var i=0; i<voteRadioButtons.length; i++){
    if (voteRadioButtons[i].checked == true){
      voteSelect = voteRadioButtons[i].value;
      break;
    }
  }
  if (voteSelect == null){
    var reallyInvalid = (gLanguage == "de") ? "Keine Auswahl getroffen. Wirklich der Stimme enthalten?" : "No choice selected. Do you really want to abstain from voting?";
    if (confirm(reallyInvalid) == true){
      performVote(abstention_id);
    } else {
      mainMoDisplayWithHistory();
    }
  } else {
    performVote(voteSelect);
  }
  //console.log("Leaving handleVoteDemo");
}

async function performVote(_txRecord){
  console.log("Entering performVote");
  var _signinCreds = parseUrlParametersAndChooseNode();
  // Vote is performed by depleting Life with a transaction record containing the selected choice.
  var _ck = doSigninConsumeAndReadMo("#waitMsg", "life", _txRecord, mainMoDisplayWithHistory, printMoFailure, _signinCreds.server, _signinCreds.clientKey, _signinCreds.encHash,  _signinCreds.clientCertificate, gLanguage);
  if (_ck == null){
    var unable_deduct_msg = (gLanguage == "de") ? "<h3>Kann MO-Wert nicht vermindern!</h3>" : "<h3>Unable to deduct value from MO!</h3>";
    writeToMain(unable_deduct_msg);
  } else {
    $("#waitMsg").empty();
  }
  console.log("Leaving performVote");
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
    if (_state == null){
      // Print message if we don't have life.
      _htmlFullMessage = (gLanguage == "de") ? "<h3>Ausgew&auml;hltes MO ist ung&uuml;ltig (ohne Leben)!</h3>" : "<h3>Selected MO is invalid (no life)!</h3>";
    } else {
      if (_ck.moFields.customPayload !== undefined){
        var voteObject = await readVoteObject(_ck);
        console.log("voteObject dump:");
        console.log(voteObject);

        if (voteObject == null){
          _htmlFullMessage = (gLanguage == "de") ? "<h3>Wahlparameter nicht lesbar!</h3>" : "<h3>Election parameters not readable!</h3>";
        } else {
          var _electionTitle = (gLanguage == "de") ? "Unbenannte Wahl<br>" : "Unnamed election<br>";
          if (voteObject.title){
            _electionTitle = voteObject.title;
          }
          _htmlFullMessage = "<h3>" + _electionTitle + "</h3>";

          // Check if choices are available to vote for.
          var vote_options = voteObject.vote_options;
          if (vote_options === undefined){
            _htmlFullMessage += (gLanguage == "de") ? "<h3>Wahlleiter hat keine Auswahlen definiert!</h3>" : "<h3>Election administrator has not defined any choices!</h3>";
          } else {
            if (vote_options.length < 2){
              _htmlFullMessage += (gLanguage == "de") ? "<h3>Wahlleiter hat nur eine einzige Auswahl definiert - keine Wahl m&ouml;glich!</h3>" : "<h3>Election administrator has defined just a single choice - no vote possible!</h3>";
            } else {
              if (_state > 7) _state = 7; // if somebody over-provisioned life for this MO. It would be wasted.
              switch(_state){
                case 7: // new = vote not yet possible
                  _htmlFullMessage += (gLanguage == "de") ? "<h3>Wahl ist noch nicht m&ouml;glich. Bitte Wahlbeginn abwarten!</h3>" : "<h3>Vote is not yet possible. Please wait for election start!</h3>";
                  break;
                case 6: // provisioned: need to activate
                  _htmlFullMessage += (gLanguage == "de") ?
                                             "<br><button id=\"activate\" type=\"submit\" name=\"activate\">Aktivieren</button><div id=\"waitMsg\"></div>" :
                                             "<br><button id=\"activate\" type=\"submit\" name=\"activate\">Activate</button><div id=\"waitMsg\"></div>";
                  break;
                case 5:
                  /* FALLTHROUGH */
                case 4: // validation/pairing: not for this demo. These should not occur.
                  _htmlFullMessage += (gLanguage == "de") ? "<h3>Validierung / Pairing ist in dieser Demo nicht unterst&uuml;tzt!</h3>" : "<h3>Validation / Pairing not supported in this demo!</h3>";
                  break;
                case 3:
                  // Draw the vote buttons.
                  _htmlFullMessage += (gLanguage == "de") ? "<h3>Bitte w&auml;hlen Sie:</h3>" : "<h3>Please vote:</h3>";
                  for (var i=0;i<vote_options.length;i++){
                    _htmlFullMessage += "<br><input type=\"radio\" name=\"voteSelect\" id=\"voteSelect" + i + "\" value=\"" + vote_options[i] + "\"/>" +
                                        "<label for=\"voteSelect" + i + "\"> " + vote_options[i] + "</label>";
                  }
                  var clearVotesBtnText = (gLanguage == "de") ? "Auswahl l&ouml;schen" : "Clear vote";
                  var voteBtnText = (gLanguage == "de") ? "Stimme abgeben" : "Submit vote";
                  _htmlFullMessage += "<br><br><br><button id=\"clearVotes\" type=\"submit\" name=\"clearVotes\">" + clearVotesBtnText + "</button>&nbsp;&nbsp;";
                  _htmlFullMessage += "<br><br><button id=\"submitVote\" type=\"submit\" name=\"submitVote\">" + voteBtnText + "</button>&nbsp;&nbsp;";
                  break;
                default: // 2-0 depleted, returned or invalid. Vote no longer possible. Display own vote (if any).
                  var vote_submitted_text = (gLanguage == "de") ? "<h3>Stimme abgegeben!</h3>" : "<h3>Vote submitted!</h3>";
                  var vote_expired_text = (gLanguage == "de") ? "<h3>Wahl beendet!</h3><b>Sie haben keine Stimme abgegeben.</b>" : "<h3>Election ended!</h3><b>You haven't voted.</b>";
                  var invalid_vote_text =  (gLanguage == "de") ? "Stimmenthaltung" : "Abstention";
                  var _raw_life_history = extractHistory(_ck, "life");
                  var yourvote = null;
                  if (_raw_life_history !== undefined){
                    if (_raw_life_history.length > 0){
                      var last_tx_record = _raw_life_history[_raw_life_history.length-1].transactionRecord;
                      // Compare to "invalid" and any of the choices. Only if there is a match a vote has been submitted.
                      if (last_tx_record !== undefined){
                        if (last_tx_record == abstention_id){
                          yourvote = invalid_vote_text;
                        } else {
                          for (var i=0;i<vote_options.length;i++){
                            if (vote_options[i] == last_tx_record){
                              yourvote = last_tx_record;
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                  // Now we have our own vote - even it was intentionally invalid (abstention) (or the fact that we didn't vote at all)
                  if (yourvote == null){
                    _htmlFullMessage += vote_expired_text;
                  } else {
                    _htmlFullMessage += vote_submitted_text + ((gLanguage == "de") ? "<b>Ihre Wahl war: </b>" : "<b>Your vote was: </b>") + yourvote;
                  }
                  break;
              } // switch
            } // else vote_options.length < 2
          } // else vote_options === undefined
        } // else vote_object == null
      } // _ck.moFields.customPayload !== undefined
    } // else _state == null
    _htmlFullMessage += "<div id=\"waitMsg\"></div>";
    writeToMain(_htmlFullMessage);
  }
  //console.log("Signing out in the background");
  await doSignout(_ck);
  //console.log("Leaving printMoResult");

  $("#clearVotes").click(function (e) {
    e.preventDefault();
    handleVotesClear();
  });
  $("#submitVote").click(function (e) {
    e.preventDefault();
    handleVoteDemo();
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

