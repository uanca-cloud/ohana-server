-- MAKE SURE TO FILL IN PASSWORD FOR USER

CREATE DATABASE ohana;

BEGIN;

CREATE USER ohana_user PASSWORD '<password>';
CREATE USER ohana_user_reporting PASSWORD '<password>';

COMMIT;
