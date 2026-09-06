-- =============================================================
-- Exception Tracker — Migration 001
-- RLS Policies, Functions, Triggers, and Seed Data
-- Run AFTER drizzle-kit push creates the tables
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_hr_id    ON users(hr_id);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team_id  ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
CREATE INDEX IF NOT EXISTS idx_incidents_agent_id          ON incidents(agent_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status            ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_category_id       ON incidents(category_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reference_number  ON incidents(reference_number);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date     ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_deleted_at        ON incidents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comp_records_incident_id      ON compensation_records(incident_id);
CREATE INDEX IF NOT EXISTS idx_comp_records_agent_id         ON compensation_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_comp_records_status           ON compensation_records(status);
CREATE INDEX IF NOT EXISTS idx_comp_records_reference_number ON compensation_records(reference_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id          ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id        ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_reference_number ON audit_logs(reference_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at       ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id  ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read       ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at    ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_invites_token      ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_manager_id ON team_invites(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id    ON team_invites(team_id);

-- ============================================================
-- SECTION 2: AUTO updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at_teams
  BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at_incident_categories
  BEFORE UPDATE ON incident_categories FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at_incidents
  BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at_compensation_records
  BEFORE UPDATE ON compensation_records FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SECTION 3: REFERENCE NUMBER (EXC-YYYYMMDD-XXXX)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_reference_number(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT LANGUAGE plpgsql AS $func$
DECLARE
  v_seq      INT;
  v_date_str TEXT;
BEGIN
  INSERT INTO reference_number_sequences (date_key, last_seq)
  VALUES (p_date, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_seq = reference_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  v_date_str := TO_CHAR(p_date, 'YYYYMMDD');
  RETURN 'EXC-' || v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$func$;

CREATE OR REPLACE FUNCTION trigger_assign_incident_ref_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := generate_reference_number(NEW.incident_date::DATE);
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER assign_incident_ref_number
  BEFORE INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION trigger_assign_incident_ref_number();

CREATE OR REPLACE FUNCTION trigger_sync_compensation_ref_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
DECLARE v_ref_number TEXT;
BEGIN
  SELECT reference_number INTO v_ref_number FROM incidents WHERE id = NEW.incident_id;
  NEW.reference_number := v_ref_number;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER sync_compensation_ref_number
  BEFORE INSERT ON compensation_records FOR EACH ROW EXECUTE FUNCTION trigger_sync_compensation_ref_number();

-- ============================================================
-- SECTION 4: REMAINING MINUTES FORMULA & VALIDATION (BRD §2)
-- ============================================================

CREATE OR REPLACE FUNCTION get_remaining_minutes(p_incident_id UUID)
RETURNS INT LANGUAGE plpgsql STABLE AS $func$
DECLARE
  v_lost_minutes          INT;
  v_approved_compensation INT;
BEGIN
  SELECT lost_minutes INTO v_lost_minutes FROM incidents
  WHERE id = p_incident_id
    AND status IN ('approved','partially_compensated','fully_compensated')
    AND deleted_at IS NULL;
  IF v_lost_minutes IS NULL THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(compensation_minutes), 0) INTO v_approved_compensation
  FROM compensation_records
  WHERE incident_id = p_incident_id AND status = 'approved' AND deleted_at IS NULL;
  RETURN GREATEST(0, v_lost_minutes - v_approved_compensation);
END;
$func$;

CREATE OR REPLACE FUNCTION trigger_validate_compensation_minutes()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
DECLARE v_remaining INT;
BEGIN
  v_remaining := get_remaining_minutes(NEW.incident_id);
  IF NEW.compensation_minutes > v_remaining THEN
    RAISE EXCEPTION 'Compensation minutes (%) exceed remaining minutes (%) for incident %',
      NEW.compensation_minutes, v_remaining, NEW.incident_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER validate_compensation_minutes
  BEFORE INSERT ON compensation_records FOR EACH ROW EXECUTE FUNCTION trigger_validate_compensation_minutes();

CREATE OR REPLACE FUNCTION trigger_update_incident_compensation_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
DECLARE v_remaining INT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    v_remaining := get_remaining_minutes(NEW.incident_id);
    IF v_remaining = 0 THEN
      UPDATE incidents SET status = 'fully_compensated', updated_at = NOW() WHERE id = NEW.incident_id;
    ELSE
      UPDATE incidents SET status = 'partially_compensated', updated_at = NOW()
      WHERE id = NEW.incident_id AND status = 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER update_incident_compensation_status
  AFTER UPDATE OF status ON compensation_records FOR EACH ROW
  EXECUTE FUNCTION trigger_update_incident_compensation_status();

-- ============================================================
-- SECTION 5: AUTH USER HANDLER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  INSERT INTO public.users (id, full_name, hr_id, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'hr_id', 'UNKNOWN-' || substr(NEW.id::text, 1, 8)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'agent'),
    'active'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $func$
  SELECT role FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL;
$func$;

CREATE OR REPLACE FUNCTION auth_user_team_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $func$
  SELECT team_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL;
$func$;

-- USERS
CREATE POLICY "agents_read_own_user" ON users FOR SELECT
  USING (auth.uid() = id AND auth_user_role() = 'agent');
CREATE POLICY "managers_read_team_users" ON users FOR SELECT
  USING (auth_user_role() = 'manager' AND (auth.uid() = id OR (team_id = auth_user_team_id() AND role = 'agent' AND deleted_at IS NULL)));
CREATE POLICY "admins_read_all_users" ON users FOR SELECT USING (auth_user_role() = 'admin');
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "managers_admins_update_users" ON users FOR UPDATE USING (auth_user_role() IN ('manager','admin'));
CREATE POLICY "service_insert_users" ON users FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- TEAMS
CREATE POLICY "authenticated_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "admins_manage_teams" ON teams FOR ALL USING (auth_user_role() = 'admin');

-- TEAM INVITES
CREATE POLICY "managers_manage_own_invites" ON team_invites FOR ALL USING (manager_id = auth.uid() AND auth_user_role() = 'manager');
CREATE POLICY "admins_all_invites" ON team_invites FOR ALL USING (auth_user_role() = 'admin');
CREATE POLICY "service_read_invites" ON team_invites FOR SELECT USING (auth.role() = 'service_role');

-- INCIDENT CATEGORIES
CREATE POLICY "authenticated_read_categories" ON incident_categories FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "admins_manage_categories" ON incident_categories FOR ALL USING (auth_user_role() = 'admin');

-- INCIDENTS
CREATE POLICY "agents_read_own_incidents" ON incidents FOR SELECT
  USING (agent_id = auth.uid() AND auth_user_role() = 'agent' AND deleted_at IS NULL);
CREATE POLICY "agents_insert_own_incidents" ON incidents FOR INSERT
  WITH CHECK (agent_id = auth.uid() AND auth_user_role() = 'agent');
CREATE POLICY "managers_read_team_incidents" ON incidents FOR SELECT
  USING (auth_user_role() = 'manager' AND deleted_at IS NULL AND agent_id IN (SELECT id FROM public.users WHERE team_id = auth_user_team_id() AND role = 'agent' AND deleted_at IS NULL));
CREATE POLICY "managers_update_team_incidents" ON incidents FOR UPDATE
  USING (auth_user_role() = 'manager' AND agent_id IN (SELECT id FROM public.users WHERE team_id = auth_user_team_id() AND role = 'agent' AND deleted_at IS NULL));
CREATE POLICY "admins_all_incidents" ON incidents FOR ALL USING (auth_user_role() = 'admin');

-- COMPENSATION RECORDS
CREATE POLICY "agents_read_own_compensations" ON compensation_records FOR SELECT
  USING (agent_id = auth.uid() AND auth_user_role() = 'agent' AND deleted_at IS NULL);
CREATE POLICY "agents_insert_own_compensations" ON compensation_records FOR INSERT
  WITH CHECK (agent_id = auth.uid() AND auth_user_role() = 'agent');
CREATE POLICY "managers_read_team_compensations" ON compensation_records FOR SELECT
  USING (auth_user_role() = 'manager' AND deleted_at IS NULL AND agent_id IN (SELECT id FROM public.users WHERE team_id = auth_user_team_id() AND role = 'agent' AND deleted_at IS NULL));
CREATE POLICY "managers_update_team_compensations" ON compensation_records FOR UPDATE
  USING (auth_user_role() = 'manager' AND agent_id IN (SELECT id FROM public.users WHERE team_id = auth_user_team_id() AND role = 'agent' AND deleted_at IS NULL));
CREATE POLICY "admins_all_compensations" ON compensation_records FOR ALL USING (auth_user_role() = 'admin');

-- AUDIT LOGS (agents: SELECT only — no INSERT/UPDATE/DELETE)
CREATE POLICY "agents_read_own_audit_logs" ON audit_logs FOR SELECT
  USING (auth_user_role() = 'agent' AND user_id = auth.uid());
CREATE POLICY "managers_read_team_audit_logs" ON audit_logs FOR SELECT
  USING (auth_user_role() = 'manager' AND user_id IN (SELECT id FROM public.users WHERE team_id = auth_user_team_id()));
CREATE POLICY "service_insert_audit_logs" ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth_user_role() IN ('manager','admin'));
CREATE POLICY "admins_all_audit_logs" ON audit_logs FOR ALL USING (auth_user_role() = 'admin');

-- NOTIFICATIONS
CREATE POLICY "users_own_notifications_read" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "users_own_notifications_update" ON notifications FOR UPDATE USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "service_insert_notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth_user_role() IN ('manager','admin'));

-- REFERENCE SEQUENCES (only via SECURITY DEFINER function)
CREATE POLICY "service_manage_sequences" ON reference_number_sequences FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SECTION 7: INCIDENT SUMMARY VIEW
-- ============================================================

CREATE OR REPLACE VIEW incident_summary AS
SELECT
  i.id, i.reference_number, i.agent_id,
  u.full_name AS agent_name, u.hr_id AS agent_hr_id, u.team_id,
  ic.name AS category, i.incident_date, i.submission_date, i.lost_minutes,
  COALESCE(comp.total_approved_compensation, 0) AS compensated_minutes,
  GREATEST(0, i.lost_minutes - COALESCE(comp.total_approved_compensation, 0)) AS remaining_minutes,
  i.status, i.notes, i.reviewed_by, reviewer.full_name AS reviewer_name,
  i.reviewed_at, i.review_comment, i.created_at, i.updated_at
FROM incidents i
JOIN users u ON u.id = i.agent_id
JOIN incident_categories ic ON ic.id = i.category_id
LEFT JOIN users reviewer ON reviewer.id = i.reviewed_by
LEFT JOIN (
  SELECT incident_id, SUM(compensation_minutes) AS total_approved_compensation
  FROM compensation_records WHERE status = 'approved' AND deleted_at IS NULL
  GROUP BY incident_id
) comp ON comp.incident_id = i.id
WHERE i.deleted_at IS NULL;

-- ============================================================
-- SECTION 8: SEED DATA — 7 default incident categories (BRD §9)
-- ============================================================

INSERT INTO incident_categories (name, is_active, sort_order) VALUES
  ('Late Arrival',                TRUE, 1),
  ('Early Leave',                 TRUE, 2),
  ('Power Cut / Internet Outage', TRUE, 3),
  ('Tool ID Malfunction',         TRUE, 4),
  ('Tardy Login',                 TRUE, 5),
  ('Half Day Deduction',          TRUE, 6),
  ('Tardy Break',                 TRUE, 7)
ON CONFLICT (name) DO NOTHING;

-- Root Admin: see SETUP.md Step 6 for instructions.
-- SELECT generate_reference_number(CURRENT_DATE); -- Verification query
