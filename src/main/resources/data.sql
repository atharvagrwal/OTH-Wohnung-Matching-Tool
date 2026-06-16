-- Schema is created by Hibernate. Do not set explicit IDs (breaks auto-increment for new records).
-- Password for max@oth.de is encoded on startup (plain text: changeme).

INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Max Mustermann', 'max@oth.de', 'changeme', 'STUDENT', FALSE, CURRENT_TIMESTAMP);

INSERT INTO student_profile (matriculation_number, course, semester, user_id)
VALUES ('1234567', 'Informatik', 4, (SELECT id FROM users WHERE email = 'max@oth.de'));

INSERT INTO apartment (title, description, price, deposit, location, apartment_type, total_occupants, area, kaltmiete, nebenkosten, ablose, sonstiges, males_count, females_count, diverse_count, pets_permission, smoking_permission, parties_permission, instruments_permission, visitors_permission)
VALUES
    ('WG-Zimmer in Regensburg', 'Gemütliches Zimmer nahe der OTH, voll möbliert', 350, 700, 'Galgenbergstraße 25, 93053 Regensburg', 'WG', 3, 18.0, 300.0, 50.0, 0.0, 0.0, 1, 2, 0, 'not-allowed', 'not-allowed', 'maybe', 'allowed', 'allowed'),
    ('Student Studio Near Campus', 'Ruhiges Zimmer, 15 Min. zur Uni', 420, 840, 'Prüfeninger Straße 58, 93049 Regensburg', 'STUDIO', 1, 25.0, 350.0, 70.0, 100.0, 0.0, 0, 1, 0, 'maybe', 'not-allowed', 'not-allowed', 'maybe', 'allowed');

INSERT INTO offer (apartment_id, owner_id, stay_type, active, created_at)
VALUES
    ((SELECT id FROM apartment WHERE title = 'WG-Zimmer in Regensburg'),
     (SELECT id FROM users WHERE email = 'max@oth.de'),
     'ZWISCHENMIETE', TRUE, CURRENT_TIMESTAMP),
    ((SELECT id FROM apartment WHERE title = 'Student Studio Near Campus'),
     (SELECT id FROM users WHERE email = 'max@oth.de'),
     'NACHMIETER', TRUE, CURRENT_TIMESTAMP);