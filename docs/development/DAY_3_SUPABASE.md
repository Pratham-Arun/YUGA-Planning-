# Day 3: Supabase Integration

## 1. Supabase Setup
```sql
-- Projects Table
create table projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Project Files Table
create table project_files (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects on delete cascade,
  path text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table projects enable row level security;
alter table project_files enable row level security;

create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = owner_id);
```

## 2. Authentication Setup
- Configure Supabase Auth UI
- Add auth middleware
- Create protected routes
- Set up auth context

## 3. Project Management
- Create project CRUD operations
- Add file management
- Set up storage buckets
- Implement file versioning

## 4. Frontend Integration
- Add auth components
- Create project dashboard
- Implement file browser
- Add file editor

## 5. Testing
- Add auth integration tests
- Test project operations
- Validate RLS policies
- Test file operations