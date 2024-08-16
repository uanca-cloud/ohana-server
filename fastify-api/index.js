const {bootstrap: bootstrapApplication} = require('./server'),
    {bootstrap: bootstrapServices} = require('ohana-shared');

async function start() {
    try {
        await bootstrapServices(false);
        await bootstrapApplication();
    } catch (error) {
        console.error(`Server crashed! ${error}`);
        process.exit(1);
    }
}

start();
