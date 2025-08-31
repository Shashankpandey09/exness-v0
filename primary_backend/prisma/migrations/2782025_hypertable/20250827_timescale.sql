-- 1) Enable TimescaleDB extension (safe)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2) Convert existing trades table into hypertable (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM timescaledb_information.hypertables
    WHERE hypertable_name = 'trades'
  ) THEN
    PERFORM create_hypertable(
      'trades',
      'time',
      chunk_time_interval => INTERVAL '1 day',
      if_not_exists => TRUE
    );
  END IF;
END$$;

-- 3) 1-minute continuous aggregate (ONLY one base aggregate)
CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_candles_1m
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 minute', time) AS bucket, 
  symbol,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close,
  sum(size) AS volume
FROM trades
GROUP BY bucket, symbol;

-- 4) Add refresh policy for 1m safely
DO $$
BEGIN
  BEGIN
    PERFORM add_continuous_aggregate_policy(
      'cagg_candles_1m',
      start_offset => INTERVAL '2 minutes',  -- re-check last 2m in case of late trades
      end_offset   => INTERVAL '0 minutes',  -- refresh up to now
      schedule_interval => INTERVAL '30 seconds'
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- ignore if policy already exists
  END;
END$$;
