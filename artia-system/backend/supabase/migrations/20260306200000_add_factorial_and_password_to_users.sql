-- Migration: Adicionar campos Factorial e senha à tabela users
-- Data: 2026-03-06

-- Adicionar colunas
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS factorial_employee_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_factorial_employee_id ON users(factorial_employee_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comentários
COMMENT ON COLUMN users.factorial_employee_id IS 'ID do employee no Factorial HR';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt da senha do usuário';
