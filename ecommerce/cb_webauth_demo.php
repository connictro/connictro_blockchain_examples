<?php
/**
 * Connictro Blockchain demo - Web Content authentication and voucher deduction.
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
 
 
define("LOGIN_PAGE",   "/bc-examples/cb_webauth_login.html?content=");  // Edit according to your examples directory on the web server
define("CONTENT_DIR",  "<<< insert your path to the content directory here. This must be outside of the web content directory. >>>"); 
define("ERROR_HTML", "cb_webauth_error.html");   // Place this file into your CONTENT_DIR.
define("TOKEN_COOKIE", "url_and_node_tokens" );  // Placed on client browsers. PLEASE NOTE that you need to ask for consent before - this is not part of this demo.
define("CONTENTID",    "content");               // name of the content query parameter

class WebResult{
  public $resultString;
  public $httpStatus;
  function __construct($result, $http_status){
    $this->resultString = $result;
    $this->httpStatus = $http_status;  
  }
}

class DemoAuthTokens{
  public $nodeUrl;
  public $accessToken;
  public $refreshToken;
  public $accessTokenExpires;
  public $refreshTokenExpires;

  function __construct($cookie_json){
    $token_object = json_decode($cookie_json, false);    
    $this->nodeUrl = empty($token_object->nodeUrl) ? "" : $token_object->nodeUrl;
    $this->accessToken = empty($token_object->accessToken) ? "" : $token_object->accessToken;
    $this->refreshToken = empty($token_object->refreshToken) ? "" : $token_object->refreshToken;
    $this->accessTokenExpires = empty($token_object->accessTokenExpires) ? 0 : strtotime($token_object->accessTokenExpires);
    $this->refreshTokenExpires = empty($token_object->refreshTokenExpires) ? 0 : strtotime($token_object->refreshTokenExpires);
  }

  private function checkTokenValid($affected_token, $which_time){
   if (empty($affected_token)) { return false;}  
   $current_time = ceil(microtime(true) * 1000);
   return ($which_time <= $current_time);
  }  
    
  public function accessTokenValid(){  return $this->checkTokenValid($this->accessToken, $this->accessTokenExpires);   }
  public function refreshTokenValid(){ return $this->checkTokenValid($this->refreshToken, $this->refreshTokenExpires); }
  
  public function PrintContent() {
    echo "<br>";
    echo "nodeUrl is: " . $this->nodeUrl . "<br>";
    echo "accessToken is: " . $this->accessToken . "<br>";
    echo "refreshToken is: " . $this->refreshToken . "<br>";
    echo "accessTokenExpires is: " . $this->accessTokenExpires . "<br>";
    echo "refreshTokenExpires is: " . $this->refreshTokenExpires . "<br>";
  }  
}

function set_access_header($ch, $access_token){
  $auth_header = "accessToken: " . $access_token; 
  $header_array = [ $auth_header, 'Content-Type: application/json' ];
  curl_setopt($ch, CURLOPT_HTTPHEADER, $header_array);
}


function consumeValue($access_token, $url, $consumed_resource){
  // The URL will call the PUT API to deduct one from value, not waiting for finalization completion.
  $consume_mo_url = $url . "/cbv1/mos/0/value?deferTransactionCompletion=true&transactionRecord=Deducted%20for%20consumption%20of%20" . $consumed_resource;   
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $consume_mo_url);
  curl_setopt($ch, CURLOPT_PUT, 1);
  set_access_header($ch, $access_token);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);  
  $result = curl_exec($ch);
  $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  // Since we're not waiting for finalization we expect a 202 response on success.
  return new WebResult($result, $http_status);    
}

function redirectLogin($consumed_resource){
  $new_location = "Location: " . LOGIN_PAGE . $consumed_resource;
  header($new_location);
  die();      
}

function printErrorMessage($msg_text, $retcode){
  if ($retcode != 200){
    header(http_response_code($retcode));
  }
  $err_page_html = file_get_contents(CONTENT_DIR . ERROR_HTML);
  $main_end = strpos($err_page_html, "</main>");
  $err_msg_heading = "<h3>An error occured!</h3>";
  echo substr($err_page_html, 0, $main_end);
  echo $err_msg_heading . $msg_text;
  echo substr($err_page_html, $main_end+7);
  die();
}

function printExhaustedResponse($consumed_resource){
  printErrorMessage("Your credits have been used up, or your package expired. Please purchase a new voucher.", 402); 
}

function printAnyOtherErrorResponse($webresult, $consumed_resource){
  $err_msg_text = "Failed to access " . $consumed_resource . ".<br>";
  $err_msg_text .= "The node returned status " . $webresult->httpStatus . " with message: " . $webresult->resultString;
  printErrorMessage($err_msg_text, 500); 
}

function getResource(){
  $resource_param = htmlspecialchars($_GET[CONTENTID]);
  return empty($resource_param) ? "" : basename($resource_param);
}

function determineResourceFile($resource){
  return CONTENT_DIR . $resource; 
}

function checkRequestedResource($resource){
  $filename = determineResourceFile($resource);
  return filesize($filename);  
}

function sendRequestedResource($resource, $res_size){
  $fp = fopen(determineResourceFile($resource), 'rb');
  if ($fp){
    $mimetype = mime_content_type($fp);
    // Never cache; see https://stackoverflow.com/questions/1851849/output-an-image-in-php
    header('Cache-Control: no-cache, no-store, max-age=0, must-revalidate');
    header('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
    header('Pragma: no-cache');    
    header('Content-Type: ' . $mimetype);
    header('Content-Length: ' . $res_size);

    fpassthru($fp);  
    exit;
  }  
}

// Main

/* NOTE: In a real-world application, prior to your web site need to have acquired consent from the user to set
 *       mandatory cookies required for web site operation. The cookie will only be sent back to itself.
 *       The cookie will be kept for 30 days - the same time the refresh token from the node is active.
 *       You might want to instruct the user if he uses a private browser session, that login information will
 *       be gone if he closes the session (all private browser windows). It will be more convenient for the 
 *       user to use a regular window in order not to re-enter/re-load the credentials every time.
 *       
 *       Cookie is actually set by the Login page only (within Javascript code).
 */
 
$requested_resource = getResource();
$requested_filesize = checkRequestedResource($requested_resource);
if (!$requested_filesize){
  printErrorMessage("Requested resource not found.", 404); // will terminate and not deduct anything from voucher.
}

$read_cookie_json = (isset($_COOKIE[TOKEN_COOKIE])) ? $_COOKIE[TOKEN_COOKIE] : "{}"; 
$token_obj = new DemoAuthTokens($read_cookie_json);

//$token_obj->PrintContent(); // DEBUG only

if (!($token_obj->accessTokenValid())){
  redirectLogin($requested_resource);
  die();
} else {
  $result = consumeValue($token_obj->accessToken, $token_obj->nodeUrl, $requested_resource);
  switch ($result->httpStatus){
    case 401:
      redirectLogin($requested_resource);
      die();
    case 402:
      printExhaustedResponse($requested_resource);
      die();
    case 200:
      /* FALLTHROUGH */
    case 202:
      // Do nothing here. We're leaving the branch and providing the content below.
      break;
    default:
      printAnyOtherErrorResponse($result, $requested_resource);
      die();      
  }
}

/* If arriving here deduction was successful, so deliver content (HTML page, picture etc.). 
 * IMPORTANT: content must not be directly accessible. Also not if repeatedly accessing.
 * NOTE: In a real-world application, likely you'll access a database delivering content, 
 *       or start RTSP [video] stream etc.
 */
sendRequestedResource($requested_resource, $requested_filesize);
?>
