# LILITH Connect — 38 logical routes / eight templates

Approved prototype contract UI-017; mock_data:true, prototype_only:true. Application paths only, no approved public domain paths. Source: [Owner proposed Notion manifest](https://app.notion.com/p/3df0b9ccc0c9813899c7d44b0e7fba50?pvs=204), adopted through Owner path approval and Claude round 3.

| ID | Name | Application path | Group | Template |
| --- | --- | --- | --- | --- |
| R01 | Welcome | /welcome | Reception | T1 Welcome |
| R02 | Explore | /explore | Reception | T1 Welcome |
| R03 | Language | /language | Reception | T1 Welcome |
| R04 | My Request | /my-request | Reception | T1 Welcome |
| R05 | Condo | /condo | Property | T2 Discovery |
| R06 | Rent | /rent | Property | T2 Discovery |
| R07 | Buy | /buy | Property | T2 Discovery |
| R08 | Projects | /projects | Property | T2 Discovery |
| R09 | BTS Living | /bts-living | Property | T2 Discovery |
| R10 | Luxury Homes | /luxury-homes | Property | T2 Discovery |
| R11 | Shortlist | /shortlist | Property | T2 Discovery |
| R12 | Property Detail | /property/:property_id | Property | T3 Detail |
| R13 | Request Viewing | /request-viewing | Property | T4 Request |
| R14 | Hotel | /hotel | Hospitality | T2 Discovery |
| R15 | Hotel Search | /hotel/search | Hospitality | T2 Discovery |
| R16 | Hotel Detail | /hotel/:hotel_id | Hospitality | T3 Detail |
| R17 | Stay Request | /stay-request | Hospitality | T4 Request |
| R18 | Airport Transfer | /airport-transfer | Mobility | T2 Discovery |
| R19 | Car with Driver | /car-with-driver | Mobility | T2 Discovery |
| R20 | Private Driver | /private-driver | Mobility | T2 Discovery |
| R21 | Trip Details | /trip-details | Mobility | T4 Request |
| R22 | Pickup Details | /pickup-details | Mobility | T4 Request |
| R23 | Bespoke Request | /bespoke-request | Concierge | T4 Request |
| R24 | Lifestyle | /lifestyle | Concierge | T2 Discovery |
| R25 | Dining | /dining | Concierge | T2 Discovery |
| R26 | Wellness | /wellness | Concierge | T2 Discovery |
| R27 | Local Assistance | /local-assistance | Concierge | T2 Discovery |
| R28 | Tell Lili | /lili/tell | Lili | T5 Lili Reception |
| R29 | Lili Reception | /lili/reception | Lili | T5 Lili Reception |
| R30 | Requirements | /lili/requirements | Lili | T5 Lili Reception |
| R31 | Contact Details | /intake/contact | Intake | T6 Intake |
| R32 | Consent | /intake/consent | Intake | T6 Intake |
| R33 | Review Request | /intake/review | Intake | T6 Intake |
| R34 | Pending Review | /status/pending | Operations | T7 Operations / Status |
| R35 | Request Status | /status/request | Operations | T7 Operations / Status |
| R36 | Human Handoff | /status/handoff | Operations | T7 Operations / Status |
| R37 | Help & Support | /support | Support | T8 Support / Governance |
| R38 | Privacy & Safety | /privacy-safety | Governance | T8 Support / Governance |

Invariants: 38 routes, 38 unique IDs, eight reusable renderers, zero unmapped routes, zero duplicate IDs/paths. Counts T1..T8 = 4,16,2,5,3,3,3,2. Runtime machine-readable source will be apps/concierge-prototype/src/shared/routes.ts and its automated manifest tests.

R33–R36 require consent. R13,R17,R21–R23,R28–R36 require eventual human handoff; this is never acceptance. Locale keys th/en share the same route implementations. Unknown paths and unknown synthetic detail IDs fail safely. /hotel/search has precedence over /hotel/:hotel_id.
