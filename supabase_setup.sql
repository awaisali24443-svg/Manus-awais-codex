-- Supabase pgvector setup for Synod Memory System

-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store global memories
create table if not exists global_memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(384), -- Using sentence-transformers/all-MiniLM-L6-v2 which has 384 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index for faster similarity search
create index if not exists global_memories_embedding_idx on global_memories using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create the match_memories RPC function
create or replace function match_memories (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    global_memories.id,
    global_memories.content,
    global_memories.metadata,
    1 - (global_memories.embedding <=> query_embedding) as similarity
  from global_memories
  where 1 - (global_memories.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
