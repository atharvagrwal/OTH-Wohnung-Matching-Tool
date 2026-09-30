# Application Status Closure Variant

When an offer is finalized to applicant A, applicants B, C, etc. move to status CLOSED_OFFER_FILLED (not DECLINED). The distinction allows different notification text: "This place has been offered to another applicant." (CLOSED_OFFER_FILLED) vs. "Your application was not selected this time." (DECLINED). Both statuses close the applicant's chat and block message input, but the wording reflects the actual reason. MyApplicationsPage groups both under a "Declined" column since both are terminal, but the UI can surface the distinction if needed.
