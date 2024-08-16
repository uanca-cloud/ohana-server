module.exports = {
    up: () => {
        return `
            CREATE TABLE temp_updates AS TABLE updates;
            CREATE TABLE temp_attachments AS TABLE attachments;

            ALTER TABLE updates ADD COLUMN patient_id integer;
            ALTER TABLE updates ADD CONSTRAINT updates_patients_fkey FOREIGN KEY(patient_id) REFERENCES patients(id);
               
            UPDATE updates AS u
            SET patient_id = e.patient_id
            FROM encounters AS e
            WHERE e.id = u.encounter_id AND u.patient_id IS NULL;

            ALTER TABLE attachments ADD COLUMN patient_id integer;
            ALTER TABLE attachments ADD CONSTRAINT attachments_patients_fkey FOREIGN KEY(patient_id) REFERENCES patients(id);
 
            UPDATE attachments AS a
            SET patient_id = e.patient_id
            FROM encounters AS e
            WHERE e.id = a.encounter_id AND a.patient_id IS NULL;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS updates DROP COLUMN IF EXISTS patient_id;
            ALTER TABLE IF EXISTS attachments DROP COLUMN IF EXISTS patient_id;
            
            DROP TABLE IF EXISTS temp_attachments;
            DROP TABLE IF EXISTS temp_updates;
        `;
    }
};
