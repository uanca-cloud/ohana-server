module.exports = {
    up: () => {
        return `
            DROP TABLE IF EXISTS temp_attachments;
            DROP TABLE IF EXISTS temp_updates;
            DROP TABLE IF EXISTS temp_users_patients_mapping;
            DROP TABLE IF EXISTS temp_encounters_secondary;
            DROP TABLE IF EXISTS temp_encounters_external;
            DROP TABLE IF EXISTS temp_family_identities;
        `;
    },
    down: () => {
        return ``;
    }
};
