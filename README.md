# ADDERLEY MOSS — Counsel & Attorneys-at-Law

An editorial law-firm website with a full practice-management system behind it. The site reads like a legal document: paper, ink, one red, and plain English redlining the legalese. One Node app serves four surfaces:

| Surface | URL | Who |
|---|---|---|
| Website | `/` | Prospective clients. A redlined hero and a 3D wax seal, tracked-changes plain English, practice areas with stage-by-stage process, the attorneys, a fee schedule with a conveyancing cost calculator, insights, and a conflict-checked enquiry form |
| Guest links | `/i/:token` `/sign/:token` `/pay/:token` | No login needed. Follow an enquiry and book a paid consultation; review and e-sign a document; view and pay an invoice |
| Client portal | `/portal` | What we need from you (sign, upload, pay), matter progress by stage, secure messages, documents, diary, client trust ledger, invoices, KYC uploads |
| Practice console | `/console` | Managing partner, partners, associates, paralegals, accounts, reception |

## Run it

Needs Node 22.13 or newer (uses the built-in `node:sqlite`).

```bash
npm install
npm start          # http://localhost:3700 (PORT to change)
```

On first boot the database is seeded with 30 months of firm history in about 15 seconds. Everything runs through the real engine, so time, invoices, payments, trust ledgers and reports all reconcile. The seed includes:
- 250 clients with KYC files, a few of them expired or under review
- about 650 matters across 8 practice areas, with about 130 open
- 31,000 time entries at about 80% utilisation
- 3,400 invoices
- 1,500 client-trust transactions, which reconcile three ways
- 150 enquiries, including fresh ones in conflict review
- court deadlines, hearings, tasks, documents, messages and 8 articles

`npm run seed -- --reset` starts over.

## Demo logins

Shown as one-tap buttons on `/login` while `SHOW_DEMO_LOGINS` is not `false`.

| Who | Email | Password |
|---|---|---|
| Cassandra Adderley, managing partner (everything) | cadderley@adderleymoss.bs | am-partner |
| Julian Moss, partner, litigation (timer running) | jmoss@adderleymoss.bs | am-partner |
| Renée Bethel, partner, real estate and private client | rbethel@adderleymoss.bs | am-partner |
| Desmond Rolle, associate (sees only his team's matters) | drolle@adderleymoss.bs | am-associate |
| Tamika Ferguson, paralegal | tferguson@adderleymoss.bs | am-paralegal |
| Accounts (billing and trust) | accounts@adderleymoss.bs | am-accounts |
| Reception (enquiries and diary) | reception@adderleymoss.bs | am-reception |
| Client: Harbourline Holdings Ltd. (Daniel Strachan) | client@adderleymoss.bs | am-client |

Test cards: `4242 4242 4242 4242` succeeds and `4000…` is declined. Every email and text lands in the console **Outbox**; nothing is sent for real.

## What the system does

**Intake and conflicts**
- Every enquiry is fuzzy-matched against every client, party and matter the moment it arrives. Company suffixes, punctuation and typos are ignored.
- A direct hit goes to conflict review, and only a partner can clear it, with a logged reason.
- Declining sends a neutral non-engagement letter.
- The enquirer books a consultation from their link, and pays the fee where one applies.
- An attorney converts the enquiry into a client and a matter in one step.

**Matters**
- Numbered `AM-YYYY-NNNN`.
- Each matter has a stage stepper specific to its practice area, a team, and parties. Adding an adverse party re-runs the conflict check.
- Live financials show WIP, billed, collected, outstanding, trust, realization and budget used.
- A new matter with a direct conflict is refused unless a partner overrides it, and the override is logged.
- Opening a matter drafts the engagement letter and sends it for e-signature. Signing it advances the stage.
- A matter cannot close with unbilled time or money still in trust.

**Court-rule deadlines**
- Pick a rule and a trigger date. Rules include acknowledgment of service, defence, reply, discovery, Court of Appeal, Privy Council leave, contract and personal-injury limitation, stamping, and work-permit renewal.
- The deadline lands on the next business day and is docketed to an attorney.
- *Verify the periods against the current Rules before real use.*

**Time**
- One running timer per person, shown in the top bar on every page.
- Time is recorded in 6-minute units and needs a narrative, because the narrative appears on the bill.
- A weekly timesheet tracks progress against each person's daily target.
- Billed entries are locked.

**Billing**
- Hourly, fixed-fee and capped matters. A capped matter gets an automatic discount line, and a fixed fee bills only what remains.
- VAT applies to fees and firm expenses, not to pass-through disbursements.
- A pre-bill is a draft you can edit line by line. Removing a line returns it to WIP.
- Issuing an invoice can apply client trust funds.
- Payments, reminders with a secure pay link, partner-only write-offs, voids that release entries, and receivables aging.

**Client trust**
- A separate ledger for each client and matter. A ledger can never go negative.
- Deposits are refused until the client's KYC is verified (AML).
- Evergreen retainers trigger a replenishment request when funds fall below the floor.
- Three-way reconciliation: the adjusted bank balance must equal the cash book, which must equal the sum of client ledgers.

**KYC / AML**
- Individuals and companies have different document sets.
- Clients upload from the portal and partners or accounts review them.
- Documents can expire, and clients can be flagged as PEP or high risk.

**Documents**
- Templates: engagement letter, fee estimate, letter before action, power of attorney, board resolution, will instructions.
- Each document is merged with the matter and fee terms.
- E-signature records the signer, a drawn signature, the time, the IP address and a document hash.

**Reports**
- Billed against collected over 12 months.
- Per timekeeper: utilisation, realization (excluding fixed-fee work), worked value and origination.
- Fees by practice area, the intake funnel, WIP aging, receivables aging and top matters.

## Stack

- Node 22, Express and `node:sqlite`.
- Vanilla JS with GSAP and Three.js for the procedural wax seal. No build step.
- Fonts are self-hosted: Libre Caslon Display, EB Garamond, Schibsted Grotesk, Courier Prime and Mrs Saint Delafield.

Deploy with `render.yaml`; see the comments there before going live.
