-- Sajag notebook RLS/constraint check. Runs inside one transaction and ROLLS BACK:
-- no rows, users or settings persist. Safe to run on the real project (SQL editor / MCP).
-- Every check raises an exception on failure; a clean run prints only PASS notices.
begin;
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  e1 uuid := '00000000-0000-4000-8000-0000000000e1';
  e2 uuid := '00000000-0000-4000-8000-0000000000e2';
  e3 uuid := '00000000-0000-4000-8000-0000000000e3';
  n int;
  doc jsonb;
begin
  insert into auth.users (id) values (a), (b);
  doc := jsonb_build_object('id', e1::text, 'input', 'Guaranteed 3% daily returns', 'language', 'en',
                            'findings', '[]'::jsonb, 'summary', '{}'::jsonb, 'limitations', '{}'::jsonb);

  -- User A: insert (user_id comes from default auth.uid()), read, update own row.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.notebook_entries (id, analysis) values (e1, doc);
  select count(*) into n from public.notebook_entries where user_id = a;
  if n <> 1 then raise exception 'FAIL: A should read 1 own row, read %', n; end if;
  update public.notebook_entries set saved_at = now() where id = e1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A should update own row, updated %', n; end if;
  raise notice 'PASS: A can insert/read/update own row; user_id defaults to auth.uid()';

  -- User B: cannot see, update, delete, or forge rows for A.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notebook_entries;
  if n <> 0 then raise exception 'FAIL: B can read % rows belonging to A', n; end if;
  update public.notebook_entries set analysis = analysis where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated % of A''s rows', n; end if;
  delete from public.notebook_entries where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted % of A''s rows', n; end if;
  begin
    insert into public.notebook_entries (user_id, id, analysis)
      values (a, e2, jsonb_set(doc, '{id}', to_jsonb(e2::text)));
    raise exception 'FAIL: B inserted a row owned by A';
  exception when insufficient_privilege then null;
  end;
  insert into public.notebook_entries (id, analysis) values (e3, jsonb_set(doc, '{id}', to_jsonb(e3::text)));
  begin
    update public.notebook_entries set user_id = a where id = e3;
    raise exception 'FAIL: B re-assigned its own row to A';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: B cannot read/update/delete/forge or hand rows to A';

  -- Constraints (as B, own rows).
  begin
    insert into public.notebook_entries (id, analysis) values (e2, jsonb_set(doc, '{language}', '"fr"'));
    raise exception 'FAIL: unsupported language accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.notebook_entries (id, analysis) values (e2, doc);  -- payload id is e1, row id e2
    raise exception 'FAIL: mismatched payload id accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.notebook_entries (id, analysis)
      values (e2, jsonb_set(jsonb_set(doc, '{id}', to_jsonb(e2::text)), '{input}', to_jsonb(repeat('x', 6001))));
    raise exception 'FAIL: oversized input accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.notebook_entries (id, analysis) values (e2, '{"id":"x"}'::jsonb);
    raise exception 'FAIL: payload missing required fields accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS: language, id-match, size and required-field constraints enforced';

  -- Anonymous role: no table access at all.
  reset role;
  set local role anon;
  begin
    select count(*) into n from public.notebook_entries;
    raise exception 'FAIL: anon can query notebook_entries (% rows visible)', n;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: anon has no access';
  reset role;
end $$;
rollback;
