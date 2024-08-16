const invitationFixtures = {
    familyInvitation1: {
        tenantId: '123',
        role: 'ApprovedUser',
        userId: '1234',
        firstName: 'John',
        lastName: 'Doe',
        title: 'Caregiver',
        deviceId: '',
        appVersion: '1.1.0',
        osVersion: '',
        deviceModel: '',
        sessionInactivityTimeoutInSecs: '60',
        eulaAcceptTimestamp: new Date()
    }
};

module.exports = {invitationFixtures};
