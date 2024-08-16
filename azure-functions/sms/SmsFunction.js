module.exports = function (context, myQueueItem) {
    const queueItem = JSON.parse(myQueueItem);
    context.bindings.message = {
        body: queueItem.msg,
        to: queueItem.phoneNumber
    };

    context.done();
};
