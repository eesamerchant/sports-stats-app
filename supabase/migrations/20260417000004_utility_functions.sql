-- ============================================================================
-- Utility RPC functions for common operations.
-- ============================================================================

-- Generate a unique 6-character league join code (alphanumeric, uppercase).
create or replace function public.generate_join_code()
returns text language plpgsql as $$
declare
    chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/I/1 ambiguity
    code  text;
    try   int := 0;
begin
    loop
        code := '';
        for i in 1..6 loop
            code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
        end loop;
        -- Ensure uniqueness
        if not exists(select 1 from public.leagues where join_code = code) then
            return code;
        end if;
        try := try + 1;
        if try > 20 then
            raise exception 'Could not generate unique join code after 20 tries';
        end if;
    end loop;
end $$;

-- Join a league by code. Validates, creates membership, returns membership id.
create or replace function public.join_league_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
    v_league_id   uuid;
    v_player_id   uuid;
    v_membership  uuid;
begin
    -- Find the league
    select id into v_league_id from public.leagues
    where join_code = upper(p_code) and status = 'active';

    if v_league_id is null then
        raise exception 'Invalid or inactive join code';
    end if;

    -- Caller must have a player profile
    select id into v_player_id from public.players where user_id = auth.uid();
    if v_player_id is null then
        raise exception 'You must create a player profile before joining a league';
    end if;

    -- Insert membership (ignore if already a member)
    insert into public.league_memberships (player_id, league_id)
    values (v_player_id, v_league_id)
    on conflict (player_id, league_id) do update set left_at = null
    returning id into v_membership;

    return v_membership;
end $$;

grant execute on function public.join_league_by_code(text) to authenticated;

-- App-admin toggle (callable only by existing admins)
create or replace function public.set_app_admin(p_user_id uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.is_app_admin() then
        raise exception 'Only app admins can change admin status';
    end if;

    update public.user_profiles set is_app_admin = p_is_admin where id = p_user_id;

    insert into public.admin_audit (actor_id, action, entity_type, entity_id, after_state)
    values (auth.uid(), 'set_app_admin', 'user_profiles', p_user_id::text,
            jsonb_build_object('is_app_admin', p_is_admin));
end $$;

grant execute on function public.set_app_admin(uuid, boolean) to authenticated;
