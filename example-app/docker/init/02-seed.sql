INSERT INTO projects (name, description, status) VALUES
('Website Redesign', 'Marketing site refresh', 'active'),
('Mobile App', 'iOS + Android MVP', 'active'),
('Legacy Migration', 'Move off the old stack', 'archived');

INSERT INTO tasks (project_id, title, done, priority) VALUES
(1, 'Design homepage', false, 3),
(1, 'Set up CI', true, 2),
(1, 'Write copy', false, 1),
(2, 'Auth flow', false, 5),
(2, 'Push notifications', false, 4),
(3, 'Export data', true, 2);
