# CampusGo — ZestModel Business Model

## 1. Business Model Overview

CampusGo uses a **customer-selected delivery bidding model**.

Unlike a traditional delivery platform where the system automatically assigns a delivery partner, CampusGo allows multiple available delivery partners to submit their delivery fee for an order.

The customer then sees the **five lowest valid bids** and chooses which delivery partner should deliver the order.

### Core Flow

```text
CUSTOMER
   ↓
Places Order
   ↓
Sets Delivery Deadline
Example: 5 minutes
   ↓
Campus Location Verification
   ↓
Order Created
   ↓
Available Delivery Partners Notified
   ↓
Delivery Partners Submit Delivery Fee
   ↓
CampusGo receives bids
   ↓
Filter lowest 5 valid bids
   ↓
Customer sees top 5 options
   ↓
Customer selects a Delivery Partner
   ↓
Delivery Partner accepts assignment
   ↓
Pickup
   ↓
Delivery
   ↓
Customer confirms delivery
```

---

## 2. Delivery Deadline

When placing an order, the customer can specify a required delivery deadline.

Example:

```text
Delivery Deadline
5 minutes
```

Possible options:

```text
5 minutes
10 minutes
15 minutes
20 minutes
30 minutes
Custom
```

The system should store:

```text
orderCreatedAt
deliveryDeadlineMinutes
deliveryDeadlineAt
```

Example:

```text
Order Created:
10:30:00

Deadline:
5 minutes

Delivery Deadline:
10:35:00
```

---

## 3. Delivery Request

After the customer places the order and the order passes campus verification:

```text
ORDER CREATED
      ↓
DELIVERY REQUEST CREATED
      ↓
FIND AVAILABLE DELIVERY PARTNERS
      ↓
SEND REQUEST
```

Only eligible delivery partners should receive the request.

Eligibility can include:

- Delivery partner is approved.
- Delivery partner is online.
- Delivery partner is currently available.
- Delivery partner is inside/near the campus delivery area.
- Delivery partner has not exceeded the active-delivery limit.
- Delivery partner is not suspended.
- Delivery partner can reasonably meet the deadline.

---

## 4. Delivery Partner Notification

Every eligible delivery partner receives a notification.

Example:

```text
🔔 NEW CAMPUSGO DELIVERY

Order:
#CG1024

Pickup:
Main Canteen

Destination:
Hostel Block A

Items:
3

Customer Deadline:
5 minutes

Submit your delivery bid.

[ VIEW REQUEST ]
```

The notification should not expose unnecessary customer personal information.

---

## 5. Delivery Partner Bidding

When a delivery partner opens the request:

```text
DELIVERY REQUEST

Order:
#CG1024

Pickup:
Main Canteen

Delivery:
Hostel Block A

Required Deadline:
5 minutes

Your Delivery Fee:

₹ ______

[ SUBMIT BID ]
```

The delivery partner can enter an amount.

Example:

```text
DP1 → ₹50
DP2 → ₹25
DP3 → ₹100
DP4 → ₹200
DP5 → ₹10
DP6 → ₹40
DP7 → ₹35
```

---

## 6. Bid Deadline

Bidding should not remain open indefinitely.

Example:

```text
Bidding Window:
30 seconds
```

During this period:

```text
DP1 → ₹50
DP2 → ₹25
DP3 → ₹100
DP4 → ₹200
DP5 → ₹10
DP6 → ₹40
DP7 → ₹35
```

When the bidding window closes:

```text
STOP ACCEPTING NEW BIDS
        ↓
VALIDATE BIDS
        ↓
SORT BY DELIVERY FEE
        ↓
SELECT TOP 5 LOWEST VALID BIDS
```

---

## 7. Top 5 Bid Filter

CampusGo must automatically filter the **five lowest valid delivery bids**.

Example:

```text
Delivery Partner     Bid

DP1                  ₹50
DP2                  ₹25
DP3                  ₹100
DP4                  ₹200
DP5                  ₹10
DP6                  ₹40
DP7                  ₹35
```

Sort ascending:

```text
DP5 → ₹10
DP2 → ₹25
DP7 → ₹35
DP6 → ₹40
DP1 → ₹50
DP3 → ₹100
DP4 → ₹200
```

The customer sees only the top 5:

```text
1. DP5 → ₹10
2. DP2 → ₹25
3. DP7 → ₹35
4. DP6 → ₹40
5. DP1 → ₹50
```

---

## 8. Top 5 Means Lowest Price

The default filtering criterion is:

```text
LOWEST VALID DELIVERY FEE
```

Do not create a ranking score that silently combines:

- Price
- Rating
- Distance
- Popularity

unless explicitly configured.

The customer interface can display additional factual information about each shortlisted delivery partner, such as:

```text
Delivery Fee: ₹25
Rating: 4.8 ⭐
Estimated Arrival: 3 min
Completed Deliveries: 84
```

The customer makes the final selection.

---

## 9. Customer Bid Selection Screen

After bidding closes:

```text
CHOOSE YOUR DELIVERY PARTNER

Delivery deadline:
5 minutes

--------------------------------

DP5
₹10
⭐ 4.6
Estimated pickup: 2 min

[ SELECT ]

--------------------------------

DP2
₹25
⭐ 4.8
Estimated pickup: 3 min

[ SELECT ]

--------------------------------

DP7
₹35
⭐ 4.7
Estimated pickup: 2 min

[ SELECT ]

--------------------------------

DP6
₹40
⭐ 4.9
Estimated pickup: 4 min

[ SELECT ]

--------------------------------

DP1
₹50
⭐ 4.5
Estimated pickup: 3 min

[ SELECT ]
```

The customer chooses the delivery partner.

---

## 10. Customer Selection

When the customer selects a delivery partner:

```text
CUSTOMER
    ↓
Selects DP
    ↓
Lock selected bid
    ↓
Assign delivery
    ↓
Notify selected DP
    ↓
Notify other shortlisted DPs
    ↓
Delivery begins
```

Selected delivery partner:

```text
✓ Delivery Assigned
```

Other delivery partners:

```text
This delivery has been assigned
to another delivery partner.
```

---

## 11. Bid Locking

Once the customer selects a delivery partner:

```text
bidStatus = SELECTED
```

All other bids become:

```text
bidStatus = NOT_SELECTED
```

The selected bid cannot be changed by the customer after assignment unless the business rules explicitly permit reassignment.

---

## 12. Delivery Partner Confirmation

After customer selection, the selected delivery partner receives:

```text
🎉 DELIVERY ASSIGNED

Order:
#CG1024

Your Bid:
₹25

Pickup:
Main Canteen

Destination:
Hostel Block A

Deadline:
5 minutes

[ ACCEPT DELIVERY ]
```

The delivery partner should confirm the assignment within a short configurable period.

Example:

```text
Confirmation Window:
15 seconds
```

---

## 13. If Selected Delivery Partner Does Not Accept

If the selected delivery partner does not confirm:

```text
Assignment Timeout
        ↓
Selected DP Removed
        ↓
Next eligible shortlisted bid
        ↓
Customer notified
```

Preferred design:

```text
The selected delivery partner
did not accept the delivery.

Please select another available
delivery partner.

[ VIEW AVAILABLE OPTIONS ]
```

---

## 14. Delivery Execution

Once accepted:

```text
DELIVERY ASSIGNED
       ↓
GO TO PICKUP
       ↓
PICKUP VERIFICATION
       ↓
PICKED UP
       ↓
OUT FOR DELIVERY
       ↓
CUSTOMER
       ↓
DELIVERY OTP
       ↓
DELIVERED
```

---

## 15. Delivery Partner Daily Fee

CampusGo charges delivery partners:

```text
₹10 per day
```

for participating in the delivery system.

This is separate from the individual delivery bid.

Example:

```text
Delivery Partner:

Daily CampusGo Access Fee
₹10/day
```

---

## 16. Daily Fee Model

Create a daily fee record.

Example:

```text
Delivery Partner:
DP1

Date:
23 September 2026

Daily Fee:
₹10

Status:
PAID
```

Possible statuses:

```text
PENDING
PAID
FAILED
WAIVED
```

The system should prevent duplicate daily charges.

If DP completes 5 deliveries in one day:

```text
Daily Fee = ₹10
```

NOT:

```text
₹10 × 5 deliveries = ₹50
```

The default model is **₹10 per calendar day**, not per delivery.

---

## 17. Delivery Partner Wallet

Create a wallet/ledger system.

Example:

```text
DELIVERY PARTNER WALLET

Balance:
₹350

Today's Fee:
₹10

Delivery Earnings:
₹125

Transactions:

+ ₹25
Delivery #CG1024

+ ₹35
Delivery #CG1025

- ₹10
Daily CampusGo Fee
```

Use a transaction ledger rather than simply modifying a balance without history.

---

## 18. Delivery Earnings

If a delivery partner bids:

```text
₹25
```

and the customer selects that bid:

```text
Delivery Partner Earnings:
₹25
```

CampusGo records:

```text
Delivery Fee:
₹25

Platform deductions:
According to configured business rules

Net DP earning:
Calculated amount
```

Do not silently change the bid amount.

The customer should see the delivery fee before selecting the delivery partner.

---

## 19. CampusGo Revenue Model

CampusGo can have multiple revenue sources.

### Revenue Source 1 — Delivery Partner Daily Fee

```text
₹10 / delivery partner / day
```

Example:

```text
100 active delivery partners

100 × ₹10
=
₹1,000/day
```

### Revenue Source 2 — Platform / Service Fee

CampusGo can charge a small platform/service fee on the order.

Example:

```text
Product subtotal       ₹200
Delivery fee            ₹25
CampusGo service fee     ₹5
--------------------------------
Subtotal                ₹230
```

The exact fee should be configurable by the admin.

Possible configuration:

```text
Fixed:
₹5

OR

Percentage:
2%
```

Do not hardcode the fee.

---

## 20. Tax Handling

Do **not** label every service charge as GST or SGST.

The system must distinguish:

```text
Product Price
Delivery Fee
CampusGo Platform/Service Fee
Applicable Taxes
```

Example:

```text
Product Subtotal        ₹200
Delivery Fee             ₹25
Platform Fee              ₹5
Applicable Tax             ₹X
--------------------------------
Final Total              ₹XXX
```

Tax rates and tax applicability must be configurable based on the actual business/tax setup.

Do not hardcode GST/SGST rates without confirming the applicable tax treatment.

---

## 21. Customer Bill Breakdown

The checkout screen should clearly display:

```text
ORDER SUMMARY

Products
₹200

Delivery Fee
₹25

CampusGo Service Fee
₹5

Applicable Taxes
₹X

--------------------------------

TOTAL
₹230 + applicable taxes
```

The customer must be able to understand exactly what they are paying.

---

## 22. Business Model Example

Suppose:

```text
Product subtotal = ₹200
```

Five delivery partners submit:

```text
DP1 = ₹50
DP2 = ₹25
DP3 = ₹100
DP4 = ₹200
DP5 = ₹10
DP6 = ₹40
DP7 = ₹35
```

Top 5:

```text
DP5 = ₹10
DP2 = ₹25
DP7 = ₹35
DP6 = ₹40
DP1 = ₹50
```

Customer chooses:

```text
DP2 = ₹25
```

Checkout:

```text
Product Subtotal       ₹200
Delivery Fee            ₹25
Platform Fee             ₹5
Applicable Taxes         ₹X
--------------------------------
Total                   ₹230 + applicable taxes
```

Delivery partner receives the configured delivery earning associated with the selected bid.

The delivery partner also pays:

```text
₹10 daily CampusGo fee
```

CampusGo records both transactions separately.

---

## 23. Bid Data Model

Create a `DeliveryBid` model.

Fields:

```text
DeliveryBid
-----------
id
orderId
deliveryPartnerId
amount
estimatedPickupTime
estimatedDeliveryTime
status
submittedAt
expiresAt
```

Statuses:

```text
ACTIVE
SELECTED
NOT_SELECTED
EXPIRED
CANCELLED
```

---

## 24. Delivery Request Model

Create a `DeliveryRequest`.

```text
DeliveryRequest
---------------
id
orderId
deadlineMinutes
deadlineAt
bidStartAt
bidEndAt
status
createdAt
updatedAt
```

Statuses:

```text
OPEN
BIDDING_CLOSED
SELECTION_PENDING
ASSIGNED
EXPIRED
CANCELLED
COMPLETED
```

---

## 25. Bid Validation

A delivery partner cannot submit:

```text
₹0
negative amount
invalid amount
```

Use configurable minimum/maximum bid values if required.

Example:

```text
Minimum Bid:
₹5

Maximum Bid:
₹500
```

These should be admin-configurable.

---

## 26. Delivery Time Validation

A delivery partner should not submit a bid if the estimated delivery time cannot reasonably meet the customer's deadline.

Example:

```text
Customer deadline:
5 minutes

DP estimated delivery:
8 minutes
```

The system should either reject the bid or clearly mark:

```text
Cannot meet requested deadline
```

Preferred design:

> Reject bids that cannot meet the requested deadline unless the customer explicitly allows them.

---

## 27. Available Delivery Partners

Only show delivery requests to partners who satisfy:

```text
Approved = true
Online = true
Available = true
Not suspended
Within allowed service area
Active delivery count below limit
Can meet deadline
```

---

## 28. Bid Privacy

Delivery partners should **not** see bids submitted by other delivery partners.

Example:

DP1 sees:

```text
Your bid:
₹50
```

DP1 should NOT see:

```text
DP2 = ₹25
DP3 = ₹100
```

Only the system knows all bids.

This prevents delivery partners from continuously underbidding one another based on live information.

---

## 29. Customer Sees Bid Information

Customer sees only the shortlisted valid bids after the bidding window closes.

Example:

```text
Available Delivery Partners

₹10
DP5

₹25
DP2

₹35
DP7

₹40
DP6

₹50
DP1
```

The customer can also see relevant factual information such as:

```text
Rating
Completed deliveries
Estimated pickup time
Estimated delivery time
```

---

## 30. Tie Handling

If two delivery partners submit the same amount:

```text
DP1 = ₹25
DP2 = ₹25
```

Use a deterministic tie-breaker such as:

1. Earlier valid bid submission time.
2. Estimated delivery time.
3. Availability.

Document the rule clearly.

Do not randomly select a winner.

---

## 31. Bidding Timer

The customer should see:

```text
Finding delivery partners...

00:25
```

Then:

```text
Bidding closed.

Finding best available options...
```

Then:

```text
Choose your delivery partner
```

The bidding timer must be controlled by the server, not just by the Flutter client.

---

## 32. Customer Selection Timer

After top 5 bids are available, optionally give the customer a limited selection period.

Example:

```text
Choose a delivery partner within:
00:30
```

If the timer expires:

```text
Refresh available delivery options
```

or follow the configured business rule.

---

## 33. Real-Time Bidding Events

Use WebSockets / Socket.IO or another real-time mechanism where practical.

Events:

```text
delivery_request_created
delivery_request_received
bid_submitted
bidding_closed
top_bids_ready
delivery_partner_selected
delivery_assignment_confirmed
delivery_assignment_expired
```

The client should never be the authority for final bid state.

---

## 34. Admin Controls for Bidding

Admin should be able to configure:

```text
Minimum bid
Maximum bid
Bidding duration
Customer selection duration
Maximum shortlisted bids
Delivery deadline options
Daily delivery partner fee
Platform service fee
Delivery partner eligibility rules
Maximum active deliveries
```

Default:

```text
Shortlisted bids = 5
Daily DP fee = ₹10
```

All should be configurable.

---

## 35. Admin Bidding Monitor

Admin should be able to view:

```text
Order #CG1024

Deadline:
5 minutes

Bids:
DP1 ₹50
DP2 ₹25
DP3 ₹100
DP4 ₹200
DP5 ₹10

Top 5:
DP5 ₹10
DP2 ₹25
DP7 ₹35
DP6 ₹40
DP1 ₹50

Selected:
DP2 ₹25
```

Admin should not normally interfere with customer selection unless required for support/operations.

---

## 36. Customer Price Transparency

The final checkout should clearly distinguish:

```text
Products
Delivery fee
Platform/service fee
Applicable taxes
Discounts
Final total
```

Do not hide charges.

---

## 37. Order Status With Bidding

Extend the order workflow to:

```text
ORDER_CREATED
      ↓
DELIVERY_BIDDING_OPEN
      ↓
BIDDING_CLOSED
      ↓
CUSTOMER_SELECTING_DP
      ↓
DELIVERY_ASSIGNED
      ↓
PICKUP
      ↓
PICKED_UP
      ↓
OUT_FOR_DELIVERY
      ↓
DELIVERED
```

Canteen preparation happens alongside the delivery assignment process according to the configured workflow.

---

## 38. Parallel Order / Delivery Process

Do not unnecessarily wait until the food is prepared before starting delivery-partner bidding.

Recommended flow:

```text
Customer places order
        │
        ├──────────────→ Canteen receives order
        │
        └──────────────→ Delivery bidding begins
                              ↓
                         Top 5 bids
                              ↓
                       Customer selects DP
                              ↓
                       DP waits/coordinates
                              ↓
                       Order becomes ready
                              ↓
                           Pickup
```

This reduces total delivery time.

However, the selected delivery partner should only be allowed to pick up after the order is actually ready.

---

## 39. Deadline Management

If the customer selects:

```text
5-minute deadline
```

the system must track:

```text
orderCreatedAt
deadlineAt
currentTime
remainingTime
```

Display:

```text
Delivery deadline:
4:32 remaining
```

If the deadline is missed:

```text
DEADLINE MISSED
```

Record it for analytics and support.

Do not falsely claim successful delivery within the deadline.

---

## 40. Delivery Performance

Track:

```text
Expected delivery time
Actual delivery time
Deadline
Deadline met?
```

Example:

```text
Deadline:
5 minutes

Actual:
4 minutes 20 seconds

Deadline:
MET
```

or:

```text
Deadline:
5 minutes

Actual:
6 minutes 10 seconds

Deadline:
MISSED
```

---

## 41. Delivery Partner Performance

Show factual metrics:

```text
Completed Deliveries
Average Delivery Time
Deadline Met %
Average Rating
Cancellation Count
```

These metrics can help customers make an informed choice.

Do not manipulate the metrics.

---

## 42. Customer Delivery Partner Card

Use:

```text
--------------------------------
DP2

₹25 Delivery Fee

⭐ 4.8

84 completed deliveries

Estimated pickup:
2 min

Estimated delivery:
4 min

[ SELECT ]
--------------------------------
```

The delivery fee should be clearly visible.

---

## 43. Daily Fee Payment

At the start of the delivery partner's working day:

```text
Delivery Partner opens app
        ↓
System checks daily fee
        ↓
Already paid?
 ┌──────┴──────┐
 YES           NO
 ↓              ↓
Continue      Pay ₹10
                 ↓
              Active
```

If the daily fee is unpaid, the default implementation should prevent delivery participation until the required daily fee is successfully recorded as paid.

---

## 44. Daily Fee Record

Create:

```text
DeliveryPartnerDailyFee
-----------------------
id
deliveryPartnerId
date
amount
status
paymentReference
createdAt
```

Add a unique constraint:

```text
deliveryPartnerId + date
```

to prevent duplicate daily charges.

---

## 45. Financial Ledger

Create a proper transaction ledger.

Example:

```text
WalletTransaction
-----------------
id
userId
type
amount
referenceType
referenceId
description
createdAt
```

Transaction types:

```text
DELIVERY_EARNING
DAILY_FEE
PLATFORM_FEE
REFUND
ADJUSTMENT
```

Do not rely only on a single mutable wallet balance.

---

## 46. Business Revenue Dashboard

Admin should see:

```text
Today's Revenue

Daily Partner Fees
₹1,000

Platform Fees
₹500

Other Revenue
₹200

Total
₹1,700
```

Also show:

```text
Total Delivery Partner Fees
Total Platform Fees
Total Applicable Taxes
Total Refunds
Net Platform Revenue
```

Tax reporting should distinguish taxes collected/remitted from actual platform revenue.

---

## 47. Example Complete Transaction

Customer orders:

```text
Products:
₹300
```

Delivery partners bid:

```text
DP1 = ₹50
DP2 = ₹30
DP3 = ₹25
DP4 = ₹80
DP5 = ₹40
DP6 = ₹20
```

Top 5:

```text
DP6 = ₹20
DP3 = ₹25
DP2 = ₹30
DP5 = ₹40
DP1 = ₹50
```

Customer selects:

```text
DP3 = ₹25
```

Checkout:

```text
Product Subtotal       ₹300
Delivery Fee            ₹25
Platform Fee             ₹5
Applicable Taxes         ₹X
--------------------------------
Total                   ₹330 + applicable taxes
```

Delivery partner receives the configured delivery earning associated with the accepted bid.

The delivery partner also pays:

```text
₹10 daily CampusGo fee
```

CampusGo records both transactions separately.

---

## 48. Business Model Summary

CampusGo earns through:

```text
1. Delivery Partner Daily Fee
   ₹10/day

2. CampusGo Platform/Service Fee
   Configurable

3. Other approved revenue streams
   Configurable
```

Delivery partners earn through:

```text
Accepted delivery bids
```

Customers pay:

```text
Product cost
+
Selected delivery fee
+
CampusGo platform/service fee
+
Applicable taxes
-
Applicable discounts
```

---

## 49. Flutter Screens Required

### Student

```text
Delivery Deadline Selection
Delivery Bidding Status
Top 5 Delivery Partners
Delivery Partner Selection
Selected Delivery Partner
```

### Delivery Partner

```text
Available Delivery Request
Submit Bid
Bid Submitted
Selected
Not Selected
Delivery Assignment
Daily Fee
Wallet
Earnings
```

### Canteen

```text
Order With Delivery Status
Ready for Pickup
Selected Delivery Partner
Pickup Verification
```

### Admin

```text
Bidding Configuration
Live Bids
Delivery Partner Fees
Platform Fees
Revenue
Financial Ledger
Deadline Analytics
```

---

## 50. Final Business Flow

```text
                    CUSTOMER
                       │
                       ↓
                  PLACE ORDER
                       │
                       ↓
              SET DEADLINE
                  Example 5 min
                       │
                       ↓
              CAMPUS VERIFICATION
                       │
                       ↓
                ORDER CREATED
                       │
            ┌──────────┴───────────┐
            ↓                      ↓
        CANTEEN              DELIVERY SYSTEM
            │                      │
        ACCEPT ORDER          FIND AVAILABLE DP
            │                      │
        PREPARE FOOD          SEND REQUEST
            │                      │
        PACK ORDER             DP SUBMITS BID
            │                      │
            │              DP1 ₹50
            │              DP2 ₹25
            │              DP3 ₹100
            │              DP4 ₹200
            │              DP5 ₹10
            │              DP6 ₹40
            │              DP7 ₹35
            │                      │
            │                      ↓
            │                SORT LOW → HIGH
            │                      │
            │                      ↓
            │                 TOP 5 BIDS
            │                      │
            │                      ↓
            │                CUSTOMER CHOOSES
            │                      │
            │                      ↓
            │                DELIVERY PARTNER
            │                      │
            └──────────────→ READY FOR PICKUP
                                   │
                                   ↓
                                PICKUP
                                   │
                                   ↓
                           OUT FOR DELIVERY
                                   │
                                   ↓
                                CUSTOMER
                                   │
                                   ↓
                              DELIVERY OTP
                                   │
                                   ↓
                               DELIVERED
                                   │
                                   ↓
                                REVIEW
```

---

## 51. Core Principle

The most important business rule is:

> **CampusGo does not automatically choose the cheapest delivery partner. CampusGo identifies the five lowest valid bids and presents them to the customer. The customer makes the final delivery-partner selection.**

The system must therefore separate:

```text
BID FILTERING
```

from:

```text
CUSTOMER SELECTION
```

The backend determines the valid top 5 bids.

The customer makes the final choice.

The selected delivery partner receives the assignment.

---

## 52. Implementation Requirement

Integrate the ZestModel business model into:

```text
Flutter Mobile App
+
Node.js/Express Backend
+
MySQL
+
React Admin Dashboard
```

Use real database persistence and APIs.

Do not simulate the bidding system only in Flutter.

The server must be authoritative for:

- Bid creation
- Bid validation
- Bid closing
- Top-5 calculation
- Delivery assignment
- Daily fee records
- Earnings
- Platform fees
- Order deadlines
- Order status
- Financial transactions

The Flutter application is the user interface.

The backend is the source of truth.

The MySQL database stores the permanent records.
