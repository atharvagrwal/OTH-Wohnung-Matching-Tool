-- Schema is created by Hibernate. Do not set explicit IDs (breaks auto-increment for new records).
-- Password for max@oth.de is encoded on startup (plain text: changeme).

INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Max Mustermann', 'max@oth.de', 'changeme', 'STUDENT', FALSE, CURRENT_TIMESTAMP);

INSERT INTO student_profile (matriculation_number, course, semester, user_id)
VALUES ('1234567', 'Informatik', 4, (SELECT id FROM users WHERE email = 'max@oth.de'));

INSERT INTO apartment (title, description, price, deposit, location, apartment_type, total_occupants)
VALUES
('WG-Zimmer in Passau', 'Gemütliches Zimmer nahe der OTH, voll möbliert', 350, 700, 'Passau', 'WG', 3),
('Einzelzimmer Innstadt', 'Ruhiges Zimmer, 15 Min. zur Uni', 420, 840, 'Passau', 'ROOM', 1);

INSERT INTO offer (apartment_id, owner_id, active, created_at)
VALUES
((SELECT id FROM apartment WHERE title = 'WG-Zimmer in Passau'),
 (SELECT id FROM users WHERE email = 'max@oth.de'),
 TRUE, CURRENT_TIMESTAMP),
((SELECT id FROM apartment WHERE title = 'Einzelzimmer Innstadt'),
 (SELECT id FROM users WHERE email = 'max@oth.de'),
 TRUE, CURRENT_TIMESTAMP);
