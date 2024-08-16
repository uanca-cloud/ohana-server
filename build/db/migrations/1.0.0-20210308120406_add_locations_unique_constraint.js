module.exports = {
    up: () => {
        return `
        ALTER TABLE locations ADD CONSTRAINT locations_unique_idx UNIQUE (label, tenant_id);
        ALTER TABLE patients ADD CONSTRAINT locations_fkey FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE SET NULL;
        `;
    },
    down: () => {
        return `
        ALTER TABLE IF EXISTS locations DROP CONSTRAINT IF EXISTS locations_unique_idx;
        ALTER TABLE IF EXISTS patients DROP CONSTRAINT IF EXISTS locations_fkey;
        `;
    }
};
