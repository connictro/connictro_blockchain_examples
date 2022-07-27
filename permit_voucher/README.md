# Connictro Blockchain Permit / Voucher Example

This is an example to demonstrate usage of the Connictro Blockchain platform for the use cases
"Time-limited Access Permit" and "Voucher".

### Permit example
"Permits" are MOs populated only with "Life", no "Value". After creation they are in state "7 - New/Created", 
and 2 timers are created as well. One causes a state transition to "3 - In Use" (start timer) and another a
transition to "2 - Depleted" (expiration timer). Expiration obviously should be later than start. Between start
and expiration, the MO is valid.
In real life, this would model a permit like a concert ticket, or tenant parking permit etc. .

### Voucher example
"Vouchers" are MOs populated with both "Life" and "Value". In real life these are used to model consumption of a
device's consumable (being a digital twin of the consumable product like a printer cartridge), or as voucher to
purchase services, download news articles etc. See also the "e-commerce" example.
Each consumption can be accompanied by a transaction record which is stored in the blockchain. Therefore, in use
cases only requiring trusted storage of tracking data (e.g. temperature, GPS location etc.), "Value" is required but
actually not used to model credit balance. There just needs to be sufficient supply to accommodate all expected
transactions. The example also combines vouchers with timers (a voucher can expire regardless of consumption,
on predefined dates or after a certain time of usage).

## Full documentation
To see the complete Licensee manual, please sign up for a Connictro Blockchain Trial license. The demos show only
a small subset of the platform's capabilities. 

## Free demo without registration
The Connictro homepage links to a pre-defined "Permit/Voucher" demo with limited supply and validity, using the same
code as in this repository. This does not require any installation or registration for the SaaS service (even not
for Free Trial). However to see the full platform capability, it is recommended to install the components as described
in the next section.

## Installation
1. Sign up for a Connictro Blockchain Trial (or commercial) license. You'll receive credentials for production and
   development services, access to Licensee Dashboard and documentation.
   
2. Copy the repository contents into a subdirectory of your web server.

3. Get third-party components and copy them into the "js/thirdparty" subdirectory:

   a) [jQuery](https://code.jquery.com/jquery-3.6.0.min.js)
     
   b) [QRCode.js](https://github.com/davidshimjs/qrcodejs) - and copy qrcode.min.js
     
4. It is recommended to create a sub-licensee using your development licensee credentials received in step 1
   (with sufficient supply of life and value), using the dashboard. Don't use production credentials for the demo.
   Save the .json file on your web server, in a directory not publicly accessible.
   
5. In cbdemo.php, edit the following lines:
     ```php
    define("LICENSEE_CREDS_FILE", "<<< insert your path to the licensee credentials file here >>>");
     ```
   and edit the path to your just-created (sub-)licensee credentials file.
   In function get_chain() remove these lines:
     ```php
     $current_month = date("m");
     $chain = (($current_month % 2) == 1) ? "B" : "A";
     ```
   and add a line depending on which development chain you have been assigned to (A or B):
     ```php
     $chain = "A";    (or $chain = "B";)
     ```
6. Save cbdemo.php.

Please note that this also installs common modules other examples depend upon.

## Running the demo
Call [your server URL]/[your example subdirectory]/demoEntry.html.
Fill in the fields and select demo type (permit or voucher). Then hit "Create demo object!".
This will run cbdemo.php which accesses one of the development blockchain nodes, and returns the new credentials,
displayed in qrResult.html as link and QR code.

Vouchers (which don't have a start timer) need to be provisioned (= deducted 1 life) before they can be used.
This is intended to protect produced goods or services from being used without approval, think of theft protection.
Use the QR code or link to directly access the just-created end user MO. Provisioned end users have to be activated
before entering "In use" state. Afterwards value can be consumed and/or tracking data stored in the blockchain.
Once the supply of value is depleted the MO enters "Depleted" state, this also happens if any of the expiration
timers hit.

Please note that an expired timer still shows up as "Armed", since finalization in the blockchain to write the new
timer state (as field in the MO) takes a few seconds (timers are checked implicitly on access and not in the
background). However its expiration is in effect immediately. Simply reload the example page to show the new state
information. In real-life examples the timer state normally will not be displayed anyhow, just the result (if the
MO is not yet provisioned, needs to be activated, is valid or depleted, and how much (if any) value is left).

## Limitations
Being a simple demo, concurrent access to the PHP using the same licensee is currently not handled. 
This is a limitation in the PHP script which uses the SAME licensee credentials and for each access signs in and out
(receiving different credentials each time). In real use cases the server application would likely keep the access
tokens for each node connecting to, and re-sign-in if necessary only (the Connictro Blockchain Dashboard UI does it
this way).
The platform itself of course can handle concurrent, simultaneous accesses of thousands of MOs.

