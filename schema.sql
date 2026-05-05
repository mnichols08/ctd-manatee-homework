-- Users table to store user information
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table to store user tasks with foreign key relationship
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT task_id_user_id_unique UNIQUE (id, user_id)
);
