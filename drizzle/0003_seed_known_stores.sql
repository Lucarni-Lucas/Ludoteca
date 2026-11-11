-- Las tiendas conocidas son de todos: user_id vacío. Drizzle no modela datos iniciales.
insert into "store" ("name", "slug") values
  ('Steam', 'steam'),
  ('Epic Games', 'epic-games'),
  ('GOG', 'gog'),
  ('Microsoft Store', 'microsoft-store'),
  ('Game Pass', 'game-pass'),
  ('Nintendo Switch', 'nintendo-switch'),
  ('itch.io', 'itch-io'),
  ('PlayStation', 'playstation'),
  ('EA app', 'ea-app'),
  ('Ubisoft Connect', 'ubisoft-connect'),
  ('Battle.net', 'battle-net'),
  ('Amazon Games', 'amazon-games')
on conflict do nothing;
