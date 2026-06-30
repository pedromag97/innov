-- Login por email + palavra-passe (substitui o Google OAuth).
-- Hash guardado com bcrypt; nunca a palavra-passe em claro.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
