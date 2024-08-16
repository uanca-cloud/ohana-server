const {getQuickMessagesByPatient} = require('ohana-shared');

async function QuickMessagesByPatientResolver(_parent, {patientId}, {tenantId}) {
    return getQuickMessagesByPatient(patientId, tenantId);
}

module.exports = QuickMessagesByPatientResolver;
