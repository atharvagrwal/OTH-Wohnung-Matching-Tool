# Housing Application Platform

A Spring Boot + React platform for matching applicants with housing offers (apartments, sublets, couch surfing). Users post listings, apply, and communicate via in-app chat. Landlords review applicants and finalize offers.

## Language

**Offer** (or Listing):
A housing listing posted by an owner with address, move-in date, rent, and house rules. Progresses through states: ACTIVE → MANUALLY_DISABLED, FILLED (someone accepted), or EXPIRED (move-in-date reminder unanswered for 1 week).
_Avoid_: Ad, posting, housing

**Offer Status**:
Tracks why an offer is inactive: ACTIVE, MANUALLY_DISABLED (owner deactivated), FILLED (applicant accepted), EXPIRED (reminder timeout).
_Avoid_: Active/inactive flag, disabled flag

**Application**:
A user's request to live in an offer, including an optional message. Progresses through: PENDING → APPROVED (owner interested, chat opens) → OFFERED (owner selected this applicant) or DECLINED (rejected by owner or another applicant won).
_Avoid_: Request, claim, interest

**Application Status**:
PENDING: Owner has not yet responded. APPROVED: Owner opened chat line. DECLINED: Owner said no, or another applicant was finalized. OFFERED: Owner selected this applicant; offer is now finalized to them. CLOSED_OFFER_FILLED: A sibling application was finalized (someone else won); this application is closed, notification text differs from DECLINED.
_Avoid_: Accepted, rejected, matched

**Chat**:
One-to-one messaging between owner and applicant, tied to a single Application. Created when owner approves an application. Closes (input disabled, banner shown) when the owner finalizes an offer to a different applicant or declines the application's owner.
_Avoid_: Conversation, message thread

**Befristet** (German: time-limited):
A contract with a fixed end date. For Zwischenmiete (sublet) or Couchsurfing only; applicant and owner both see the expected move-out date at offer creation and in chat.
_Avoid_: Temporary, fixed-term

**House Rule**:
Preset policy on pets, smoking, parties, instruments, visitors — each with allowed/not-allowed/maybe. Custom/free-text rules are no longer supported (removed Q8).
_Avoid_: Policy, household rule, custom rule

**Red Flag** (or Report):
A user's report of suspicious behavior by another user in a chat. Reported user's name and message are recorded; an email is sent to support.email. No in-app report table today (Q11).
_Avoid_: Complaint, alert, flag

**Reminder**:
Automated notification sent to offer owner when availableFrom == today and no applicant is finalized (OFFERED status) yet. Owner must respond: "yes, I'm still offering (optionally update move-in date)" or "no, disable the offer." If unanswered for 1 week from reminder-sent time, offer auto-disables (EXPIRED).
_Avoid_: Notification, alert, prompt

**Decline Notification** (for applicant):
System message sent when application status moves to DECLINED or CLOSED_OFFER_FILLED. Text differs: "Your application was not selected this time." (real decline) vs. "This place has been offered to another applicant." (someone else won).
_Avoid_: Rejection message, decline message
