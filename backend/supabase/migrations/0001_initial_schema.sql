-- Create extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Projects table
create table if not exists projects (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    engine text not null check (engine in ('unity', 'bevy')),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    
    constraint valid_name check (char_length(name) between 1 and 100)
);

-- Enable RLS
alter table projects enable row level security;

-- RLS policies
create policy "Users can view their own projects"
    on projects for select
    using (auth.uid() = owner_id);

create policy "Users can create their own projects"
    on projects for insert
    with check (auth.uid() = owner_id);

create policy "Users can update their own projects"
    on projects for update
    using (auth.uid() = owner_id);

create policy "Users can delete their own projects"
    on projects for delete
    using (auth.uid() = owner_id);

-- AI Jobs table
create table if not exists ai_jobs (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    task text not null check (task in ('codegen', 'artgen', 'worldgen')),
    model text not null check (model in ('gpt-4', 'claude-3', 'starcoder')),
    prompt text not null,
    request jsonb not null default '{}'::jsonb,
    response jsonb,
    status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
    error text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    constraint valid_prompt check (char_length(prompt) between 1 and 2000)
);

-- Enable RLS
alter table ai_jobs enable row level security;

-- RLS policies
create policy "Users can view their own jobs"
    on ai_jobs for select
    using (auth.uid() = user_id);

create policy "Users can create jobs for their projects"
    on ai_jobs for insert
    with check (auth.uid() = user_id);

-- Assets table
create table if not exists assets (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references projects(id) on delete cascade,
    name text not null,
    url text not null,
    type text not null check (type in ('texture', '3dmodel', 'animation', 'audio')),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    
    constraint valid_asset_name check (char_length(name) between 1 and 255)
);

-- Enable RLS
alter table assets enable row level security;

-- RLS policies
create policy "Users can view project assets"
    on assets for select
    using (
        exists (
            select 1 from projects
            where projects.id = assets.project_id
            and projects.owner_id = auth.uid()
        )
    );

create policy "Users can create assets in their projects"
    on assets for insert
    with check (
        exists (
            select 1 from projects
            where projects.id = assets.project_id
            and projects.owner_id = auth.uid()
        )
    );

create policy "Users can update assets in their projects"
    on assets for update
    using (
        exists (
            select 1 from projects
            where projects.id = assets.project_id
            and projects.owner_id = auth.uid()
        )
    );

create policy "Users can delete assets in their projects"
    on assets for delete
    using (
        exists (
            select 1 from projects
            where projects.id = assets.project_id
            and projects.owner_id = auth.uid()
        )
    );

-- Vector store table for embeddings
create table if not exists vector_store (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references projects(id) on delete cascade,
    file_path text not null,
    cursor text,
    content text not null,
    embedding vector(1536),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    -- Composite key to ensure unique embeddings per file location
    unique(project_id, file_path, cursor)
);

-- Enable RLS
alter table vector_store enable row level security;

-- RLS policies
create policy "Users can view project embeddings"
    on vector_store for select
    using (
        exists (
            select 1 from projects
            where projects.id = vector_store.project_id
            and projects.owner_id = auth.uid()
        )
    );

create policy "Users can create embeddings in their projects"
    on vector_store for insert
    with check (
        exists (
            select 1 from projects
            where projects.id = vector_store.project_id
            and projects.owner_id = auth.uid()
        )
    );

-- Create indexes
create index if not exists projects_owner_id_idx on projects(owner_id);
create index if not exists ai_jobs_project_id_idx on ai_jobs(project_id);
create index if not exists ai_jobs_user_id_idx on ai_jobs(user_id);
create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists vector_store_project_id_idx on vector_store(project_id);
create index if not exists vector_store_embedding_idx on vector_store using ivfflat (embedding vector_cosine_ops);

-- Functions

-- Update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger update_projects_updated_at
    before update on projects
    for each row
    execute function update_updated_at();

create trigger update_ai_jobs_updated_at
    before update on ai_jobs
    for each row
    execute function update_updated_at();

create trigger update_assets_updated_at
    before update on assets
    for each row
    execute function update_updated_at();

create trigger update_vector_store_updated_at
    before update on vector_store
    for each row
    execute function update_updated_at();