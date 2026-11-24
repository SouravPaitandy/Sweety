
-- ==========================================
-- SWEETY: BLOOD GLUCOSE TRACKER
-- Database Schema
-- ==========================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. READINGS TABLE
CREATE TABLE IF NOT EXISTS readings (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    reading_date DATE NOT NULL,

    slot VARCHAR(30) NOT NULL
        CHECK (
            slot IN (
                'Morning',
                'After breakfast',
                'After lunch',
                'After dinner'
            )
        ),

    glucose_value INTEGER NOT NULL
        CHECK (glucose_value BETWEEN 40 AND 600),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_reading_slot
        UNIQUE (user_id, reading_date, slot)
);

-- 3. INDEX FOR FASTER USER-BASED DATE QUERIES
CREATE INDEX IF NOT EXISTS idx_readings_user_date
ON readings(user_id, reading_date DESC);

-- ==========================================
-- SCHEMA COMPLETE
-- ==========================================
