# Red-Flag Reports Email-Only, No Persisted Report Entity

Users can report another user from a chat (red-flag button). The report sends the reported user's name and the reporter's message to support.email via JavaMailSender. Today, no `Report` entity is persisted — the email is the only record. This keeps the feature simple while the project is young; later, if needed, a Report table can be added without changing the UI.
