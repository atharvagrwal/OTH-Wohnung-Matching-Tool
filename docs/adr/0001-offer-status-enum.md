# Offer Status Enum Instead of Boolean Active Flag

We use a four-value `OfferStatus` enum (ACTIVE, MANUALLY_DISABLED, FILLED, EXPIRED) instead of a boolean `active` flag. This allows `MyOffersPage` to show the owner *why* an offer is inactive (they disabled it manually, someone accepted it, or the move-in-date reminder timed out unanswered), rather than just a generic "Inactive" badge. The distinction matters for UX — an owner should understand that a FILLED offer is closed because someone got the place, whereas EXPIRED means the reminder wasn't answered and needs follow-up.
