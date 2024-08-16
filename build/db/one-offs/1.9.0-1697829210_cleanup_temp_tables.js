module.exports = {
    up: () => {
        return `
            DROP TABLE IF EXISTS temp_users;
            DROP TABLE IF EXISTS temp_patient_ulids;
        `;
    },
    down: () => {
        return ``;
    }
};
