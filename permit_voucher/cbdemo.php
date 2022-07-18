<?php
/**
 * Connictro Blockchain demo - Creation of enduser MO from web page/
 *                             provisioning of voucher.
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

const MAX_FUTURE_EXP_TIME = 21600000;  // 6h in the future
const MAX_INITIAL_CREDIT = 20;
//define("LICENSEE_CREDS_FILE", "<<< insert your path to the licensee credentials file here >>>");
define("LICENSEE_CREDS_FILE", "/home/mpaar/demo/demo_licensee.json");
define("QR_GENERATOR", "/bc-examples/qrResult.html?d="); // Edit according to your examples directory on the web server

class DemoParameters {
  public $customId;       // text to store as customId in generated blockchain MO
  public $customPayload;  // text to store as customPayload in generated blockchain MO
  public $expirationTime; // fixed expiration time (as long integer - milliseconds since Jan 1, 1970 00:00)
  public $startTime;      // fixed start time (as long integer  - milliseconds since Jan 1, 1970 00:00)
  public $usageDuration;  // usage duration (for creating a timer starting with MO entering "in use", in milliseconds)
  public $initialCredit;  // initial amount of "value"
  public $clientKey;      // in case of provisioning (not creating) contains a clientKey to provision.
  public $lang;           // display language

  function __construct($cid, $cpl, $ext, $stt, $usd, $inc, $clk, $lng ){
    $this->customId = $cid;
    $this->customPayload = $cpl;
    $this->expirationTime = $ext;
    $this->startTime = $stt;
    $this->usageDuration = $usd;
    $this->initialCredit = $inc;
    $this->clientKey = $clk;
    $this->lang = $lng;
  }

  public function ApplyRestrictions() {
    if (empty($this->clientKey)){
      /* Overwrite defaults if necessary for expiration time and/or initial credit
       * This is for the public demo executable without registration.
       *
       * NOTE: As Connictro Blockchain licensee (including free trial) you can remove
       *       all code in this branch, or replace by your limits.
       */
      $current_time = ceil(microtime(true) * 1000);
      $max_expiration_time = $current_time + MAX_FUTURE_EXP_TIME;
      if (empty($this->expirationTime)){
        $this->expirationTime =  $max_expiration_time;
      } else {
        $this->expirationTime =  min($this->expirationTime, $max_expiration_time);
      }

      if (empty($this->initialCredit)){
        $this->initialCredit = 0;
      } else {
        $this->initialCredit = min($this->initialCredit, MAX_INITIAL_CREDIT);
      }
    } else {
      // If clientKey was given we call the provision API and ignore all others (except language).
      $this->customId = "";
      $this->customPayload = "";
      $this->expirationTime = 0;
      $this->startTime = 0;
      $this->usageDuration = 0;
      $this->initialCredit = 0;
    }
  }

  public function PrintContent() {
    echo "<br>";
    echo "customID is: " . $this->customId . "<br>";
    echo "customPayload is: " . $this->customPayload . "<br>";
    echo "expirationTime is: " . $this->expirationTime . "<br>";
    echo "startTime is: " . $this->startTime . "<br>";
    echo "usageDuration is: " . $this->usageDuration . "<br>";
    echo "initialCredit is: " . $this->initialCredit . "<br>";
    echo "clientKey is: " . $this->clientKey . "<br>";
    echo "lang is: " . $this->lang . "<br>";
  }
}

class DemoCredentials{
  public $clientKey;
  public $encHash;
  public $clientCertificate;
  public $encPubkey;

  public function Set($creds_json) {
    $creds_object = json_decode($creds_json, false);
    $creds_inner_object = (empty($creds_object->moCredentials)) ? $creds_object : $creds_object->moCredentials;
    $this->encHash = $creds_inner_object->encHash;
    if (!empty($creds_inner_object->encPubkey)) { $this->encPubkey = $creds_inner_object->encPubkey;}
    $this->clientKey = $creds_inner_object->ListOfClientCredentials[0]->clientKey;
    $this->clientCertificate = $creds_inner_object->ListOfClientCredentials[0]->clientCertificate;
  }

  public function ReadCredentialsFile($filename) {
    $licensee_json = file_get_contents($filename);
    $this->Set($licensee_json);
  }

  public function PrintContent() {
    echo "<br>";
    echo "clientKey is: " . $this->clientKey . "<br>";
    echo "encHash is: " . $this->encHash . "<br>";
    echo "clientCertificate is: " . $this->clientCertificate . "<br>";
    echo "encPubkey is: " . $this->encPubkey . "<br>";
  }
}

class Timebomb{
  public $expirationTime;
  public $deltaTime;
  public $lifeTrigger;
  public $nextLifeState;

  function __construct($exp_time, $next_life_state, $life_trigger, $delta_time){
    if (empty($exp_time)){
      $this->deltaTime = (int)$delta_time;
      $this->lifeTrigger = $life_trigger;
    } else {
      $this->expirationTime = (int)$exp_time;
    }
    $this->nextLifeState = $next_life_state;
  }
}

class AllTimebombs{
  public $timeBombsArray; // we store already serialized timebomb strings here.
  function __construct($demo_params){
    // extract all timebombs for the demo cases (start/expiration times and usage duration).
    if (!empty($demo_params->expirationTime)){
      $expTimebomb = new Timebomb($demo_params->expirationTime, 2, 0, 0);
      $this->timeBombsArray[] = $expTimebomb;
    }
    if (!empty($demo_params->startTime)){
      $startTimebomb = new Timebomb($demo_params->startTime, 3, 0, 0);
      $this->timeBombsArray[] = $startTimebomb;
    }
    if (!empty($demo_params->usageDuration)){
      $durationTimebomb = new Timebomb(0, 2, 3, $demo_params->usageDuration);
      $this->timeBombsArray[] = $durationTimebomb;
    }
  }
  function serialize(){
    $entries = count($this->timeBombsArray);
    if ($entries > 0){
      $tbJson = "[";
      foreach ($this->timeBombsArray as &$value){
        $tbJson = $tbJson . json_encode($value);
        $entries--;
        if ($entries > 0){
          $tbJson = $tbJson . ",";
        }
      }
      unset($value);
      $tbJson = $tbJson . "]";
      $tbJsonFiltered = preg_replace('/,\s*"[^"]+":null|"[^"]+":null,?/', '', $tbJson);
      return $tbJsonFiltered;
    } else {
      return "";
    }
  }
}

// subset of an MO, just define the fields we need for this demo.
class MoBody{
  public $timeBombs;
  public $customId;
  public $customPayload;
  function __construct($custom_id, $custom_payload, $time_bombs_json){
    if (!empty($time_bombs_json)){ $this->timeBombs = $time_bombs_json; }
    if (!empty($custom_payload)){ $this->customPayload = $custom_payload; }
    if (!empty($custom_id)){ $this->customId = $custom_id; }
  }
  function serialize(){
    // Serializing to JSON, make sure an empty customPayload and extra quotes are excluded.
    $bodyJson = json_encode($this);
    $bodyJsonFiltered =    preg_replace("/\]\"/", "]", preg_replace("/:\"\[/", ":[", preg_replace("/\\\\\"/", "\"", preg_replace("/,\"customPayload\"\:null/", "", $bodyJson))));
    return $bodyJsonFiltered;
  }
}

function get_chain() {
  // Determine current chain with shortest expiration date
  // (A in even months, B in odd months).

  /* IMPORTANT for Connictro Blockchain licensees: You'll get a permanent assignment
   * for a specific development blockchain (A or B).
   */

  // As Connictro Blockchain licensee, comment or remove the next two lines.
  $current_month = date("m");
  $chain = (($current_month % 2) == 1) ? "B" : "A";
  // As Connictro Blockchain licensee, enable the next line and change according to your development blockchain assignment.
  // $chain = "A";

  return $chain;
}

function get_node() {
  // Determine current chain with shortest expiration date
  // (A = port 58081 in even months, B = port 58082 in odd months).
  // Node number is random for some load balancing.
  $chain = get_chain();
  $chainport = ($chain == "B") ? 58082 : 58081;
  $nodenr = random_int(1,3);
  $nodeaddr = "https://node" . $nodenr . ".connictro-blockchain.de:" . $chainport;
  return $nodeaddr;
}

function sign_in($credentials, $url){
  $signin_url = $url . "/cbv1/mos/signin?clientKey=" . $credentials->clientKey . "&encHash=" . $credentials->encHash . "&clientCertificate=" .  $credentials->clientCertificate;
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $signin_url);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  curl_close($ch);
  $creds_token_obj = json_decode($result, false);
  return $creds_token_obj->accessToken;
}

function set_access_header($ch, $access_token){
  $auth_header = "accessToken: " . $access_token;
  $header_array = [ $auth_header, 'Content-Type: application/json' ];
  curl_setopt($ch, CURLOPT_HTTPHEADER, $header_array);
}

function sign_out($access_token, $url){
  $signout_url = $url . "/cbv1/mos/signout";
  $ch = curl_init();
  set_access_header($ch, $access_token);
  curl_setopt($ch, CURLOPT_URL, $signout_url);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  curl_close($ch);
}

function createMo($access_token, $url, $demo_params, $encPubkey){
  $initial_value_str = ($demo_params->initialCredit > 0) ? ("&initialValue=" . $demo_params->initialCredit) : "";
  $create_mo_url = $url . "/cbv1/mos?encPubkey=" . $encPubkey . "&initialLife=7" . $initial_value_str . "&generateAuthKeypair=true";

  $all_timebombs = new AllTimebombs($demo_params);
  $all_timebombs_json = $all_timebombs->serialize();
  $mo_body = new MoBody($demo_params->customId, $demo_params->customPayload, $all_timebombs_json);
  $mo_body_json = $mo_body->serialize();

  // compose and send MO create request
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $create_mo_url);
  curl_setopt($ch, CURLOPT_POST, 1);
  set_access_header($ch, $access_token);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $mo_body_json);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

  $result = curl_exec($ch);
  curl_close($ch);
  return $result;
  //return false;
}

function provisionMo($access_token, $url, $client_key){
  // The URL will call the PUT API to deduct one from life, not waiting for finalization completion.
  $provision_mo_url = $url . "/cbv1/mos/" . $client_key . "/life?deferTransactionCompletion=true&transactionRecord=Provisioned";
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $provision_mo_url);
  curl_setopt($ch, CURLOPT_PUT, 1);
  set_access_header($ch, $access_token);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($http_status != 204 && $http_status != 202 ) { echo $result; }
}

// Main
$my_nodeaddr = get_node();
$demo_params = new DemoParameters(
      htmlspecialchars($_GET["customId"]),
      htmlspecialchars($_GET["customPayload"]),
      htmlspecialchars($_GET["expirationTime"]),
      htmlspecialchars($_GET["startTime"]),
      htmlspecialchars($_GET["usageDuration"]),
      htmlspecialchars($_GET["initialCredit"]),
      htmlspecialchars($_GET["clientKey"]),
      htmlspecialchars($_GET["lang"])
    );

$demo_params->ApplyRestrictions();
$demo_licensee = new DemoCredentials;
$demo_licensee->ReadCredentialsFile(LICENSEE_CREDS_FILE);
$new_enduser   = new DemoCredentials;

// now we have everything we need.
// 1. log in into the node using the licensee credentials from the statically configured file
$access_token = sign_in($demo_licensee, $my_nodeaddr);

// 2. Call the appropriate API and return the result to the caller.
if (empty($demo_params->clientKey)){
  $new_enduser_created_json = createMo($access_token, $my_nodeaddr, $demo_params, $demo_licensee->encPubkey);
  $new_enduser->Set($new_enduser_created_json);
  // redirect to the QR code generator page. Set parameters accordingly.
  // Also set the provision parameter in case MO doesn't automatically switches to "In Use" after some time (simple permit).
  $new_location = "Location: " . QR_GENERATOR . get_chain() .
                  (empty($demo_params->startTime) ? "&p=1" : "" ) .
                  (!empty($demo_params->lang) ? (($demo_params->lang == "de") ? "&l=de" : "") : "" ) .
                  "&k=" . $new_enduser->clientKey .
                  "&e=" . $new_enduser->encHash .
                  "&c=" . $new_enduser->clientCertificate;
  header($new_location);
} else {
  provisionMo($access_token, $my_nodeaddr, $demo_params->clientKey);
}

// 3. Log out from Connictro Blockchain
sign_out($access_token, $my_nodeaddr);
die();

?>
