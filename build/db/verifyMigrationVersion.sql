CREATE TABLE IF NOT EXISTS _migrations (
    version TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE OR REPLACE FUNCTION assertVersion(versionToAssert text, isWipe boolean) RETURNS TEXT AS $$
DECLARE actualVersion text DEFAULT NULL;
BEGIN
    SELECT COALESCE(version, '0.0.0') INTO actualVersion
    FROM _migrations
    WHERE timestamp = (SELECT MAX(timestamp) FROM _migrations)
    LIMIT 1;

    IF actualVersion IS NULL AND versionToAssert = '0.0.0'
    THEN
        RETURN true;
    END IF;

    IF isWipe IS NOT TRUE AND (actualVersion IS NULL OR actualVersion > versionToAssert)
    THEN
        RAISE EXCEPTION 'BAD MIGRATION! EXPECTED: %, ACTUAL: %', versionToAssert, actualVersion
          USING HINT = 'Could not run migration using incorrect from of %!';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM assertVersion($1, $2);

BEGIN;
