# Connictro Blockchain Election Example

This is an example to demonstrate usage of the Connictro Blockchain platform for elections (polls with vote records).  
It will store vote results in a way voters could be identified (if the organizer maps the generated random keys to real-life names).
So, the use cases are elections e.g. for home-owner communities. For political elections  (secret ballots) it can not be used as is,
but it can be modified (see below) to fulfil privacy requirements.  
The demo is based on the Voucher example (see permit_voucher folder), as it reuses common components. It needs at least a Trial license
and cannot be used without registration to the SaaS service (Free Trial is sufficient to be able to use the demo).  
The example is intended to be deployed on a web server, but actually just consists of static HTML and Javascript files,
so it can also be used on a local drive.


## Full documentation
To see the complete Licensee manual, please sign up for a Connictro Blockchain Trial license.
The demos show only a small subset of the platform's capabilities. 


## Demo Installation and Preparation
### Installation
1. If not already done, sign up for a Connictro Blockchain Trial (or commercial) license. You'll receive credentials for
   production and development services, access to Licensee Dashboard and documentation.
   
2. First copy the permit_voucher example repository contents into a subdirectory of your web server, or a local drive.
   It contains some common files needed by both examples.

3. Then copy the election example repository contents into the same subdirectory. It will add a few files.

4. Get third-party components and copy them into the "js/thirdparty" subdirectory:

   a) [jQuery](https://code.jquery.com/jquery-3.6.0.min.js)
     
   b) [QRCode.js](https://github.com/davidshimjs/qrcodejs) - and copy qrcode.min.js
        
### Preparing the demo without installation
Use the Base URL "https://www.connictro.de/bc-examples/" in preparation.

### Preparation

1. Sign in into the dashboard UI.
   It is strongly (!) recommended to create a sub-licensee using your development licensee credentials received in step 1.
   Don't use the top-level licensee. Reuse the encPubkey to save creation cost.
   The new sub-licensee should EXACTLY get (17*number of voters) + 1 life, no value at all. 
   E.g. if your election consists of 20 voters, populate the sub-licensee with 341 life.
   Save the .json credentials of the newly created sub-licensee.
   
2. Sign out of the dashboard, and sign in again using the sub-licensee just created.
   Bulk-create endusers, reusing encPubkey and with no additional ECDSA key. 
   2a. Populate the customPayload field as follows:

         {
           "title": "<election title>",
           "vote_options": [
              "option 1",
              "option 2",
                [...]
              "option n"
           ]
         }

      Example: You're managing a homeowner's community and let the members vote, what infrastructure project should be prioritized,
      since there is budget only for one of them. With a couple of choices the JSON to be placed into customPayload would look like:  
      `{"title": "Infrastructure Projects","vote_options": ["Bicycle stands","Photovoltaic roof","Heat pump","Modernization of windows","Modernization of elevator"]}`

   2b. Create two explicit timers:
       The first one determines election start, next life state should be "In Use".
       The second one determines election end,  next life state should be "Depleted".
       
   2c. Submit enduser creation to the node.
        
   2d. Save the resulting .json file, it will need to be split to distribute to the individual voters in the next step.

3. Call `[your server URL]/[your example subdirectory]/generic_cb-creds_to_qrcode.html`   
   Select your blockchain service, as `Base URL` enter `[your server URL]/[your example subdirectory]/`.
   As `Example page` enter `namedVoteExample.html`.  
   Then load the multiple end-user .json credentials file created in step 2.
   QR codes and URLs will be printed for each of the contained MOs.  
   Distribute the QR code and/or the URL link to the individual voters (each one should only get one of them of course).
   
4. For the election supervisor, create an URL like in step 3, but as `Example page` enter `namedVoteEvaluationExample.html`,
   and load the sub-licensee credentials. Save the URL (and QR code if deciding to use a mobile to see the results) in a safe
   place, only visible to the election supervisor.

## Running the demo
### Voter
As voter, call the URL received from the election supervisor (created in step 3 above).
Before the election started, it will just display a text asking for patience.  
Once the election started, the voter can submit his vote (if selecting nothing, or clearing the vote before submission, it is also
possible to opt for vote abstention - which is counted and is different to not voting at all).  
Reloading the URL after vote submission will print the own choice, it is not possible to vote again.  
Should the voter have decided not to vote, after expiration of the election time it is not possible to vote anymore.
This choice will be displayed as well.

### Election supervisor
As election supervisor, call the URL created in step 4. There is nothing to do, just watch the result table.  
It is updated during the vote (reload to refresh), and either after all voters have voted, or after the election ended
(whichever occurs earlier), the final result is displayed.


## Modifying the demo
### Multiple topics
Most common modification would be to have more than one poll at the same time (multiple topics). As an exercise, you could:  
- Extend the customPayload by placing the above object into an array.
- In namedVoteExampleMain.js, function printMoResult - after getting the voteObject check the number of polls and check number of choices in each poll.
- In the same function, draw multiple vote radio button section with a differnt id for each.
- In function handleVoteDemo, examine all vote radio buttons(instead of just one and pass the vote result as stringified JSON array to performVote,
  making sure it does not exceed 189 characters (maximum size of JSON-formatted transaction record)).
- In namedVoteEvaluationExampleMain.js, function presentVoteResult: Add a column to the table for the topics. Add an outer loop to walk through the topics first,
  use the current loop as inner loop walking through the choices/results. Remove the election title from the title line (as there are multiple titles now).
  
### Digital Secret ballot
The current demo records the vote results in the blockchain, making them permanent. Voter's names are pseudonymized by the random clientKeys, however
it would be possible by somebody having access to the database, which clientKey was issued to which person, to identify individual voters, which is not
desired in a secret ballot. The only - and important - information which should be still kept in the blockchain, is if somebody had already voted, to prevent
double votes.
Voting would then run on a web server (e.g. one per electoral district). Vote results itself should be either kept in a separate domain on the blockchain
using named assets to count (one for each individual party participating in the election) - it is however still possible (although unlikely) to do a timestamp
correlation from the voter MOs to the votes itself. Better in this case is to count the votes in a traditional relational database (or collect paper in a
non-digital election - just with the double-vote prevention on top) .
- In namedVoteExampleMain.js, function handleVoteDemo - This would pass the result to the server to count the vote. Don't pass anything to performVote.
- Function performVote: Don't accept a transaction record and just record an empty string as transaction record in the blockchain.
- namedVoteEvaluationExampleMain.js would then be replaced by the software collecting all the votes from the electoral districts.

