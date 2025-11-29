-- Add constraint to ensure only one CEO exists
CREATE OR REPLACE FUNCTION check_single_ceo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'ceo' THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE role = 'ceo' AND user_id != NEW.user_id) THEN
      RAISE EXCEPTION 'Only one CEO account is allowed in the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_ceo
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_single_ceo();