module.exports = {
    up: () => {
        return `
        ALTER TABLE patients ADD CONSTRAINT patients_unique_idx UNIQUE (external_id, tenant_id, external_id_type);
        `;
    },
    down: () => {
        return `
        ALTER TABLE IF EXISTS patients DROP CONSTRAINT IF EXISTS patients_unique_idx;
        `;
    }
};
