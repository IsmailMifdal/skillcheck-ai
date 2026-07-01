-- ═══════════════════════════════════════════════════════════════════
-- SkillCheck AI — Schéma initial
-- Postgres + pgvector (Supabase)
-- ═══════════════════════════════════════════════════════════════════

-- Extension vectorielle pour le RAG (embeddings)
create extension if not exists vector;

-- ───────────────────────────────────────────────────────────────────
-- documents : un cours/PDF uploadé par un utilisateur
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titre       text not null,
  contenu     text not null,                 -- texte brut extrait
  -- Embedding "global" du document (moyenne / résumé). Le RAG réel se fait
  -- via document_chunks, mais on garde cette colonne comme demandé.
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- document_chunks : découpage du document pour un RAG précis
-- (chaque chunk a son propre embedding → citations sourcées)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.document_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  chunk_index  int not null,
  contenu      text not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- concepts : concepts-clés extraits d'un document par le LLM
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.concepts (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  nom          text not null,
  description  text,
  ordre        int default 0,                -- ordre pédagogique
  created_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- questions : QCM générés à partir des concepts
-- difficulte : 1 (facile) → 3 (difficile) pour le diagnostic adaptatif
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  concept_id        uuid not null references public.concepts(id) on delete cascade,
  enonce            text not null,
  options           jsonb not null,          -- ["A", "B", "C", "D"]
  reponse_correcte  int not null,            -- index 0-based dans options
  explication       text,                    -- pourquoi cette réponse
  difficulte        int not null default 1 check (difficulte between 1 and 3),
  created_at        timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- sessions : un parcours (diagnostic → apprendre → re-test)
-- phase : 'diagnostic' | 'learning' | 'retest' | 'done'
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  document_id  uuid not null references public.documents(id) on delete cascade,
  phase        text not null default 'diagnostic',
  score_avant  numeric,                       -- score du diagnostic initial (0-100)
  score_apres  numeric,                       -- score du re-test (0-100)
  created_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- reponses : chaque réponse donnée pendant un diagnostic / re-test
-- confiance    : 'sur' | 'hesitant'
-- misconception: true si faux ET confiant (= faux acquis)
-- phase        : 'diagnostic' | 'retest'
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.reponses (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  reponse_donnee int not null,                -- index choisi
  est_correcte   boolean not null,
  confiance      text not null default 'hesitant' check (confiance in ('sur', 'hesitant')),
  misconception  boolean not null default false,
  phase          text not null default 'diagnostic',
  created_at     timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- maitrise : statut de maîtrise par concept pour une session
-- statut : 'maitrise' | 'fragile' | 'misconception' | 'non_teste'
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.maitrise (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  concept_id    uuid not null references public.concepts(id) on delete cascade,
  score         numeric not null default 0,   -- 0-100
  statut        text not null default 'non_teste'
                check (statut in ('maitrise', 'fragile', 'misconception', 'non_teste')),
  updated_at    timestamptz not null default now(),
  unique (session_id, concept_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- Index
-- ═══════════════════════════════════════════════════════════════════
create index if not exists idx_documents_user      on public.documents(user_id);
create index if not exists idx_chunks_document      on public.document_chunks(document_id);
create index if not exists idx_concepts_document    on public.concepts(document_id);
create index if not exists idx_questions_concept    on public.questions(concept_id);
create index if not exists idx_sessions_user        on public.sessions(user_id);
create index if not exists idx_reponses_session     on public.reponses(session_id);
create index if not exists idx_maitrise_session     on public.maitrise(session_id);

-- Index vectoriel (IVFFlat, distance cosinus) pour la recherche RAG
create index if not exists idx_chunks_embedding
  on public.document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ═══════════════════════════════════════════════════════════════════
-- Fonction RPC : recherche des chunks les plus proches d'une requête
-- Filtrée par document. Utilisée par le service RAG côté serveur.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.match_chunks(
  query_embedding vector(1536),
  p_document_id   uuid,
  match_count     int default 5
)
returns table (
  id          uuid,
  contenu     text,
  chunk_index int,
  similarity  float
)
language sql stable
as $$
  select
    dc.id,
    dc.contenu,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.document_id = p_document_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security — chaque utilisateur ne voit que ses données
-- ═══════════════════════════════════════════════════════════════════
alter table public.documents        enable row level security;
alter table public.document_chunks  enable row level security;
alter table public.concepts         enable row level security;
alter table public.questions        enable row level security;
alter table public.sessions         enable row level security;
alter table public.reponses         enable row level security;
alter table public.maitrise         enable row level security;

-- documents : accès direct par user_id
drop policy if exists "own documents" on public.documents;
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions : accès direct par user_id
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tables liées à un document : on remonte au propriétaire du document
drop policy if exists "own chunks" on public.document_chunks;
create policy "own chunks" on public.document_chunks
  for all using (
    exists (select 1 from public.documents d
            where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "own concepts" on public.concepts;
create policy "own concepts" on public.concepts
  for all using (
    exists (select 1 from public.documents d
            where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "own questions" on public.questions;
create policy "own questions" on public.questions
  for all using (
    exists (select 1 from public.concepts c
            join public.documents d on d.id = c.document_id
            where c.id = concept_id and d.user_id = auth.uid())
  );

-- Tables liées à une session : on remonte au propriétaire de la session
drop policy if exists "own reponses" on public.reponses;
create policy "own reponses" on public.reponses
  for all using (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );

drop policy if exists "own maitrise" on public.maitrise;
create policy "own maitrise" on public.maitrise
  for all using (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );

-- NOTE : les mutations serveur utilisent la clé service_role qui contourne
-- les RLS. Ces politiques protègent les accès directs via la clé anon (client).
