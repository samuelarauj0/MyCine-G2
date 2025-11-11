
# MyCine G - Sistema de Avaliação de Filmes e Séries

## 📋 Sobre o Projeto

MyCine G é uma plataforma web interativa para avaliação de filmes e séries, com um sistema de gamificação que recompensa os usuários por suas contribuições. O sistema utiliza dados do TMDB (The Movie Database) para popular seu catálogo e oferece uma experiência envolvente com níveis, conquistas e desafios.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Vite** - Build tool e dev server de alta performance
- **React Router DOM 6.30.1** - Gerenciamento de rotas
- **Tailwind CSS** - Framework CSS utilitário
- **shadcn/ui** - Biblioteca de componentes React baseada em Radix UI

### Backend & Infraestrutura
- **Supabase** - Backend-as-a-Service com:
  - PostgreSQL database
  - Autenticação (email/password e Google OAuth)
  - Row Level Security (RLS)
  - Edge Functions (Deno runtime)
  - Realtime subscriptions

### Gerenciamento de Estado
- **TanStack Query (React Query) 5.83.0** - Gerenciamento de estado assíncrono e cache
- **React Hook Form 7.61.1** - Gerenciamento de formulários
- **Zod 3.25.76** - Validação de schemas

### API Externa
- **TMDB API** - The Movie Database para dados de filmes e séries
