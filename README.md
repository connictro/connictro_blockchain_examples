# Connictro Blockchain Permit / Voucher Example

This repository contains examples to demonstrate usage of the Connictro Blockchain platform.
(Currently there is only one example - "Time-limited Access Permit" and "Voucher").

## Short Overview of Connictro Blockchain
Connictro Blockchain is based on Managed Objects (MOs) like an account in a database, or a wallet
in a cryptocurrency (NOTE: Connictro Blockchain is NOT a cryptocurrency!). MOs are stored in the blockchain.
Names are completely random to support usage in data privacy-friendly applications. No personal data -
like e-mail address, phone number, credit card number etc. is needed. 

Each MO consists of fields (from simple text fields of up to 4KB, to fields controlling MO behaviour),
and assets (similar to "money" or "fuel"). End user assets (the digital twin of a permit or voucher) can
only be consumed, never transferred to others.
The most important (and predefined) assets are "life" (mandatory) and "value" (optional).

"Life" models the state of the MO (counting down from 7 to 0; states may be skipped).

7 - New/Created - the MO exists in the blockchain but it can not yet be used - it must be provisioned 
                  by a licensee (or timer) first to enable it for usage.
                  
6 - Provisioned - the MO can now be used. Next deduction of "Life" advances state directly to "In Use",
                  unless validation or pairing has been defined.
                                    
(See Licensee manual for description of "5 - Wait Validation" and "4 - Wait Pairing" states)
    
3 - In Use      - In this state the MO is valid and "value" asset can be used (if defined)

2 - Depleted    - Either all "value" has been consumed or a timer expired.

(See Licensee manual for description of "1 - Returned" and "0 - Invalid" states)
 
If required by the use case, "Value" models the supply of whatever you define it should be (points, credits, ...). 

