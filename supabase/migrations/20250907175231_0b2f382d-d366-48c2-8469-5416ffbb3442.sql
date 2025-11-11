-- Insert initial categories
INSERT INTO public.categories (name) VALUES 
('Ação'),
('Aventura'),
('Comédia'),
('Drama'),
('Terror'),
('Ficção Científica'),
('Romance'),
('Thriller'),
('Fantasia'),
('Animação'),
('Documentário'),
('Crime'),
('Família'),
('Música'),
('Guerra'),
('História'),
('Mistério'),
('Western');

-- Insert initial challenges
INSERT INTO public.challenges (name, description, type, target_value, xp_reward, is_active) VALUES
('Primeira Avaliação', 'Faça sua primeira avaliação de um filme ou série', 'unique', 1, 50, true),
('Crítico Diário', 'Avalie 3 títulos em um dia', 'daily', 3, 30, true),
('Maratonista Semanal', 'Avalie 10 títulos em uma semana', 'weekly', 10, 100, true),
('Veterano Cinéfilo', 'Avalie 50 títulos no total', 'unique', 50, 200, true),
('Especialista', 'Avalie 100 títulos no total', 'unique', 100, 500, true),
('Crítico Dedicado', 'Avalie 5 títulos em um dia', 'daily', 5, 50, true),
('Explorador de Gêneros', 'Avalie títulos de 5 categorias diferentes', 'unique', 5, 150, true);

-- Insert initial achievements
INSERT INTO public.achievements (code, name, description, icon, requirement_type, requirement_value, xp_reward, is_active) VALUES
('first_review', 'Primeira Crítica', 'Fez sua primeira avaliação', '⭐', 'reviews_count', 1, 25, true),
('reviewer_10', 'Crítico Iniciante', 'Avaliou 10 títulos', '🎬', 'reviews_count', 10, 50, true),
('reviewer_25', 'Crítico Experiente', 'Avaliou 25 títulos', '🏆', 'reviews_count', 25, 100, true),
('reviewer_50', 'Crítico Veterano', 'Avaliou 50 títulos', '👑', 'reviews_count', 50, 200, true),
('level_5', 'Subindo de Nível', 'Alcançou o nível 5', '📈', 'level', 5, 75, true),
('level_10', 'Meio Caminho', 'Alcançou o nível 10', '🚀', 'level', 10, 150, true),
('high_standards', 'Padrões Altos', 'Deu 10 avaliações 5 estrelas', '⭐', 'high_ratings', 10, 100, true),
('critic', 'Crítico Rigoroso', 'Deu 10 avaliações 1-2 estrelas', '😤', 'low_ratings', 10, 100, true),
('commentator', 'Comentarista', 'Fez 20 comentários em avaliações', '💬', 'comments_count', 20, 150, true),
('explorer', 'Explorador de Gêneros', 'Avaliou títulos de 10 gêneros diferentes', '🌍', 'genres_explored', 10, 300, true);

-- Insert some sample movie/series titles
INSERT INTO public.titles (name, type, release_year, synopsis, poster_url, duration_minutes) VALUES
('The Matrix', 'movie', 1999, 'Um programador de computador descobre a verdade chocante sobre sua realidade e seu papel na guerra contra suas controladoras.', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 136),
('Breaking Bad', 'series', 2008, 'Um professor de química do ensino médio diagnosticado com câncer de pulmão inoperável se volta para a fabricação e venda de metanfetamina.', 'https://image.tmdb.org/t/p/w500/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg', null),
('Inception', 'movie', 2010, 'Um ladrão que rouba segredos corporativos através do uso da tecnologia de compartilhamento de sonhos recebe a tarefa inversa de plantar uma ideia.', 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 148),
('Stranger Things', 'series', 2016, 'Quando um menino desaparece, sua mãe, um chefe de polícia e seus amigos devem enfrentar forças terríficas para trazê-lo de volta.', 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', null),
('The Dark Knight', 'movie', 2008, 'Quando a ameaça conhecida como O Coringa emerge de seu passado misterioso, ele causa estragos e caos nas pessoas de Gotham.', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 152),
('Game of Thrones', 'series', 2011, 'Nove famílias nobres lutam pelo controle das terras míticas de Westeros, enquanto um antigo inimigo retorna após estar adormecido por milênios.', 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', null);

-- Link titles to categories
INSERT INTO public.title_categories (title_id, category_id) 
SELECT t.id, c.id FROM public.titles t, public.categories c 
WHERE (t.name = 'The Matrix' AND c.name IN ('Ação', 'Ficção Científica'))
   OR (t.name = 'Breaking Bad' AND c.name IN ('Drama', 'Crime'))
   OR (t.name = 'Inception' AND c.name IN ('Ação', 'Ficção Científica', 'Thriller'))
   OR (t.name = 'Stranger Things' AND c.name IN ('Terror', 'Ficção Científica', 'Drama'))
   OR (t.name = 'The Dark Knight' AND c.name IN ('Ação', 'Crime', 'Drama'))
   OR (t.name = 'Game of Thrones' AND c.name IN ('Fantasia', 'Drama', 'Aventura'));