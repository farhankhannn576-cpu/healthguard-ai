-- HealthGuard AI database schema
USE defaultdb;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============ HEALTH PROFILES ============
-- Snapshot of the health inputs used for a given assessment.
CREATE TABLE IF NOT EXISTS health_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  age INT NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  height DECIMAL(5,2) NOT NULL COMMENT 'cm',
  weight DECIMAL(5,2) NOT NULL COMMENT 'kg',
  blood_pressure VARCHAR(20) NOT NULL COMMENT 'systolic/diastolic e.g. 120/80',
  heart_rate INT NOT NULL COMMENT 'bpm',
  glucose INT NOT NULL COMMENT 'mg/dL',
  sleep DECIMAL(4,1) NOT NULL COMMENT 'hours/night',
  activity ENUM('sedentary', 'light', 'moderate', 'active') NOT NULL,
  smoking ENUM('never', 'former', 'current') NOT NULL,
  alcohol ENUM('none', 'occasional', 'frequent') NOT NULL,
  stress ENUM('low', 'moderate', 'high') NOT NULL,
  family_history TEXT COMMENT 'comma-separated conditions',
  existing_conditions TEXT COMMENT 'comma-separated conditions',
  symptoms TEXT COMMENT 'comma-separated current symptoms',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============ ASSESSMENTS ============
-- The ML prediction result tied to a health_profile snapshot.
CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  health_profile_id INT NOT NULL,
  risk_level ENUM('Low', 'Moderate', 'High') NOT NULL,
  probability DECIMAL(5,2) NOT NULL COMMENT 'risk probability percentage 0-100',
  factors JSON NOT NULL COMMENT 'array of contributing factor strings',
  recommendations JSON NOT NULL COMMENT 'array of recommendation strings',
  model_version VARCHAR(40) NOT NULL DEFAULT 'v1.0-demo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (health_profile_id) REFERENCES health_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============ CHAT HISTORY ============
CREATE TABLE IF NOT EXISTS chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_health_profiles_user ON health_profiles(user_id);
CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
