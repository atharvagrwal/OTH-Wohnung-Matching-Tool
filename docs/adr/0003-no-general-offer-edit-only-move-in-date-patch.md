# No General Offer Edit, Narrow Move-In-Date Exception

The platform does not offer a general "edit this offer after posting" feature (no PUT/PATCH endpoint beyond move-in-date). The move-in-date reminder flow requires a "yes, keep offering with a new move-in-date" action, so a single-purpose `PATCH /offers/{id}/move-in-date` endpoint exists as a narrow exception. This endpoint touches only the `availableFrom` and resets `reminderSentAt` for re-triggering the next day. Owners who want to make other changes must disable and re-post.
