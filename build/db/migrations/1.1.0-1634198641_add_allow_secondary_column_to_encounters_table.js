module.exports = {
    up: () => {
        return `
            ALTER TABLE encounters ADD COLUMN allow_secondary BOOLEAN;
            UPDATE encounters SET allow_secondary = false;
            INSERT INTO location_settings (location_id, tenant_id, key, value)
                (SELECT DISTINCT(location_id),tenant_id, 'allowSecondaryFamilyMembers' , 'true' FROM location_settings);
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS encounters DROP COLUMN IF EXISTS allow_secondary;
            DELETE FROM location_settings WHERE key = 'allowSecondaryFamilyMembers';
        `;
    }
};
