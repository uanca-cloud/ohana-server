module.exports = {
    up: () => {
        return `
            ALTER TABLE IF EXISTS location_quick_messages ALTER COLUMN location_id DROP NOT NULL;
            ALTER TABLE IF EXISTS location_quick_messages DROP CONSTRAINT IF EXISTS location_quick_messages_location_id_fkey;
        `;
    },
    down: () => {
        return `
            DELETE FROM location_quick_messages WHERE location_id IS NULL;
            ALTER TABLE IF EXISTS location_quick_messages ALTER COLUMN location_id SET NOT NULL;
            ALTER TABLE IF EXISTS location_quick_messages DROP CONSTRAINT IF EXISTS location_quick_messages_location_id_fkey;
            ALTER TABLE IF EXISTS location_quick_messages ADD CONSTRAINT location_quick_messages_location_id_fkey FOREIGN KEY(location_id) REFERENCES locations(id);
        `;
    }
};
