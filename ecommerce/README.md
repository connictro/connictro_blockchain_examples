# Connictro Blockchain E-Commerce Example

This is an example to demonstrate usage of the Connictro Blockchain platform for an e-commerce
web site (paid content delivery). The demo is based on the Voucher example (see permit_voucher folder), as
it needs a Voucher MO (populated with both "Life" and "Value").

## Full documentation
To see the complete Licensee manual, please sign up for a Connictro Blockchain Trial license. The demos show only
a small subset of the platform's capabilities. 


## Installation
1. If not already done, sign up for a Connictro Blockchain Trial (or commercial) license. You'll receive credentials for
   production and development services, access to Licensee Dashboard and documentation.
   
2. First copy the permit_voucher example repository contents into a subdirectory of your web server.
   It contains some common files needed by both examples.

3. Then copy the ecommerce example repository contents into the same subdirectory. It will add a few files.

4. Get third-party components and copy them into the "js/thirdparty" subdirectory:

   a) [jQuery](https://code.jquery.com/jquery-3.6.0.min.js)
     
   b) [QRCode.js](https://github.com/davidshimjs/qrcodejs) - and copy qrcode.min.js
   
   c) [JS-Cookie](https://github.com/js-cookie/js-cookie/releases) - From the latest release, copy js.cookie.min.js
     
5. It is recommended to create a sub-licensee using your development licensee credentials received in step 1
   (with sufficient supply of life and value), using the dashboard. Don't use production credentials for the demo.
   Save the .json file on your web server, in a directory not publicly accessible.
   
6. In cb_webauth_demo.php, edit the following lines:
     ```php
     define("CONTENT_DIR",  "<<< insert your path to the content directory here. This must be outside of the web content directory. >>>");
     ```
   and edit the path to a local directory accomodating the content.
   
   Modify LOGIN_PAGE should your demo directory is not bc-examples.
   
   Save cb_webauth_demo.php .
   
7. In js/cbWebauthExampleMain.js, edit the following line and adapt to your assigned development chain (A or B):
     ```js
     const SELECTED_CHAIN = "?"; 
     ```
   Save cbWebauthExampleMain.js.

8. Populate content:
   Copy the ecommerce/content/cb_webauth_error.html file to the content directory defined in the previous step above.
   Place content file(s) into the content directory. Example: "image.jpg".

## Running the demo
Call `[your server URL]/[your example subdirectory]/cb_webauth_demo.php?content=<<one of your content files>> `.  
 e.g. `[your server URL]/[your example subdirectory]/cb_webauth_demo.php?content=image.jpg` .

This will redirect to the login page. On the login page, select the end-user MO (JSON) certificate file,
which has been previously generated from the Dashboard UI.  
Should there be more than one certificate in the file, the login page will ask to select one of them to use for signing in.  
After successful login, a cookie is placed on the browsing machine (named "url_and_node_tokens") and sign-in to the
end-user MO in the blockchain has been made.  
Then the login page will automatically redirect back to the originating PHP script, which then verifies the supplied blockchain MO,
deducts one value and - if successful - displays the content. Otherwise a message will be displayed, or again redirected to the login page.  
On subsequent visits, the stored authentication token from the cookie is used and the login page is not displayed again.
(Of course should the browser be configured to remove cookies by end of the session, or if an incognito browser window
is used, the cookie will vanish after closing and it needs to be re-loaded again.)  
If the authentication token expired (after 6 hours), the login page silently uses the refresh token to obtain a fresh
authentication token, not asking for a login anymore - unless the cookie has been deleted.


## Running the demo without installation/registration
It is recommended to have access to the Dashboard UI using this demo. However, it is also available without registration,
although it is a bit inconvenient and just provides one static content file.  
Use the public permit/voucher demo (https://www.connictro.de/bc-examples/demoEntry.html), create a voucher,
the text fields can or can not be populated (not important for this demo).
Submit the MO creation, and afterwards provision the MO as displayed below the QR code. Save the generated URL.  
This demo normally depends on the Dashboard UI generating credentials files.
If the dashboard UI is not accessible, create a credentials file manually instead with the following contents:  

    {
    "ListOfClientCredentials": [
      {
        "clientCertificate": "<<< copy your clientCertificate here >>>",
        "clientKey": "<<< copy your clientKey here >>>"
      }
    ],
    "encHash": "<<< copy your encHash here >>>"
    }

Then call https://www.connictro.de/bc-examples/cb_webauth_demo.php?content=connictro_winter.jpg 
It will ask for the certificate file just created and will show a view from the Connictro Office in Munich during winter :-)  
Check that one value has been deducted from the blockchain for viewing (using the permit/voucher example), or if you have
access to the Dashboard UI, look up your end-user, navigate to it and display the "value" asset. 
