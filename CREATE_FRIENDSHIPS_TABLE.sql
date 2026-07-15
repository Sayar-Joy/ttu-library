-- Create friendships table for friend requests and relationships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Create a trigger to prevent duplicate friendships in reverse
CREATE OR REPLACE FUNCTION prevent_duplicate_friendship()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE requester_id = NEW.addressee_id 
    AND addressee_id = NEW.requester_id
  ) THEN
    RAISE EXCEPTION 'Friendship already exists in reverse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_duplicate_friendship
BEFORE INSERT ON friendships
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_friendship();

-- Update timestamp on update
CREATE OR REPLACE FUNCTION update_friendship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendship_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_friendship_timestamp();
