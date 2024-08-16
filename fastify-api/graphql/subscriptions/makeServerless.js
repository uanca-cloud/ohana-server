const {
    parse,
    validate: graphqlValidate,
    execute: graphqlExecute,
    subscribe: graphqlSubscribe,
    getOperationAST,
    GraphQLError
} = require('graphql');

const {
    GRAPHQL_TRANSPORT_WS_PROTOCOL,
    CloseCode,
    MessageType,
    stringifyMessage,
    parseMessage
} = require('graphql-ws');

const {
    getLogger,
    completeSubscription,
    deleteServerlessContext,
    persistServerlessContext,
    readAndUpdateServerlessContext,
    isObject,
    isAsyncGenerator,
    isAsyncIterable,
    areGraphQLErrors
} = require('ohana-shared');

const logger = getLogger('makeServerless');

function makeServerless(options) {
    const {
        schema,
        context,
        roots,
        validate,
        execute,
        subscribe,
        connectionInitWaitTimeout = 3000, // 3 seconds
        onConnect,
        onDisconnect,
        onClose,
        onSubscribe,
        onOperation,
        onNext,
        onError,
        onComplete,
        jsonMessageReviver: reviver,
        jsonMessageReplacer: replacer
    } = options;

    return {
        async opened(socket, connectionId, extra) {
            let ctx = {
                connectionInitReceived: false,
                acknowledged: false,
                subscriptions: {},
                extra
            };
            // need initial context when opening
            ctx = await readAndUpdateServerlessContext(connectionId, ctx);

            if (socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL) {
                logger.error({metadata: {connectionId}}, 'Subprotocol not acceptable');
                socket.close(CloseCode.SubprotocolNotAcceptable, 'Subprotocol not acceptable');
                return async (code, reason) => {
                    /* nothing was set up, just notify the closure */
                    await onClose?.(ctx, code, reason);
                };
            }

            // kick the client off (close socket) if the connection has
            // not been initialised after the specified wait timeout
            const connectionInitWait =
                !ctx.connectionInitReceived &&
                connectionInitWaitTimeout > 0 &&
                isFinite(connectionInitWaitTimeout)
                    ? setTimeout(() => {
                          if (!ctx.connectionInitReceived) {
                              logger.error(
                                  {metadata: {connectionId}},
                                  'Connection initialisation timeout'
                              );
                              socket.close(
                                  CloseCode.ConnectionInitialisationTimeout,
                                  'Connection initialisation timeout'
                              );
                          }
                      }, connectionInitWaitTimeout)
                    : null;

            socket.onMessage(async function onMessage(data) {
                let message;

                try {
                    message = parseMessage(data, reviver);
                } catch (err) {
                    logger.error({metadata: {connectionId}}, 'Invalid message received');
                    return socket.close(CloseCode.BadRequest, 'Invalid message received');
                }

                switch (message.type) {
                    case MessageType.ConnectionInit: {
                        logger.debug(
                            {metadata: {connectionId}},
                            'Connection Init handling started'
                        );
                        if (ctx.connectionInitReceived) {
                            logger.error(
                                {metadata: {connectionId}},
                                'Too many initialisation requests'
                            );
                            return socket.close(
                                CloseCode.TooManyInitialisationRequests,
                                'Too many initialisation requests'
                            );
                        }

                        ctx.connectionInitReceived = true;

                        if (isObject(message.payload)) {
                            ctx.connectionParams = message.payload;
                        }

                        const permittedOrPayload = await onConnect?.(ctx);
                        if (permittedOrPayload === false) {
                            logger.error({metadata: {connectionId}}, 'Forbidden');
                            return socket.close(CloseCode.Forbidden, 'Forbidden');
                        }

                        // we should acknowledge before send to avoid race conditions (like those exampled in https://github.com/enisdenjo/graphql-ws/issues/501)
                        // even if the send fails/throws, the connection should be closed because its malfunctioning
                        ctx.acknowledged = true;

                        logger.debug(
                            {metadata: {connectionId}},
                            'Connection Init - persisting context'
                        );
                        await persistServerlessContext(connectionId, ctx);

                        logger.debug(
                            {metadata: {connectionId}},
                            'Connection Init - sending ack message'
                        );
                        await socket.send(
                            stringifyMessage(
                                isObject(permittedOrPayload)
                                    ? {
                                          type: MessageType.ConnectionAck,
                                          payload: permittedOrPayload
                                      }
                                    : {
                                          type: MessageType.ConnectionAck
                                          // payload is completely absent if not provided
                                      },
                                replacer
                            )
                        );
                        return;
                    }

                    case MessageType.Ping: {
                        ctx = await readAndUpdateServerlessContext(connectionId, ctx);

                        if (!ctx.acknowledged) {
                            logger.error({metadata: {connectionId}}, 'Unauthorized');
                            return socket.close(CloseCode.Unauthorized, 'Unauthorized');
                        }

                        if (socket.onPing) {
                            // if the onPing listener is registered, automatic pong is disabled
                            logger.debug({metadata: {connectionId}}, 'Connection ping handling');
                            return await socket.onPing(message.payload);
                        }

                        logger.debug({metadata: {connectionId}}, 'Connection pong sending');
                        await socket.send(
                            stringifyMessage(
                                message.payload
                                    ? {type: MessageType.Pong, payload: message.payload}
                                    : {
                                          type: MessageType.Pong
                                          // payload is completely absent if not provided
                                      }
                            )
                        );
                        return;
                    }

                    case MessageType.Pong: {
                        logger.debug({metadata: {connectionId}}, 'Connection pong');
                        return await socket.onPong?.(message.payload);
                    }

                    case MessageType.Subscribe: {
                        logger.debug({metadata: {connectionId}}, 'Handling subscribe');
                        ctx = await readAndUpdateServerlessContext(connectionId, ctx);

                        if (!ctx.acknowledged) {
                            logger.error({metadata: {connectionId}}, 'Unauthorized');
                            return socket.close(CloseCode.Unauthorized, 'Unauthorized');
                        }

                        const {id, payload} = message;
                        if (id in ctx.subscriptions) {
                            logger.error(
                                {metadata: {connectionId}},
                                `Subscriber for ${id} already exists`
                            );
                            return socket.close(
                                CloseCode.SubscriberAlreadyExists,
                                `Subscriber for ${id} already exists`
                            );
                        }

                        // if this turns out to be a streaming operation, the subscription value
                        // will change to an `AsyncIterable`, otherwise it will stay as is
                        ctx.subscriptions[id] = null;

                        logger.debug({metadata: {connectionId}}, 'Creating async iterator');
                        const emit = {
                            next: async (result, args) => {
                                let nextMessage = {
                                    id,
                                    type: MessageType.Next,
                                    payload: result
                                };
                                const maybeResult = await onNext?.(ctx, nextMessage, args, result);
                                if (maybeResult) {
                                    nextMessage = {
                                        ...nextMessage,
                                        payload: maybeResult
                                    };
                                }
                                logger.debug(
                                    {metadata: {connectionId}},
                                    'Sending message from async iterator'
                                );
                                await socket.send(stringifyMessage(nextMessage, replacer));
                            },
                            error: async (errors) => {
                                let errorMessage = {
                                    id,
                                    type: MessageType.Error,
                                    payload: errors
                                };
                                const maybeErrors = await onError?.(ctx, errorMessage, errors);
                                if (maybeErrors) {
                                    errorMessage = {
                                        ...errorMessage,
                                        payload: maybeErrors
                                    };
                                }
                                logger.debug(
                                    {metadata: {connectionId}},
                                    'Sending error from async iterator'
                                );
                                await socket.send(stringifyMessage(errorMessage, replacer));
                            },
                            complete: async (notifyClient) => {
                                const completeMessage = {
                                    id,
                                    type: MessageType.Complete
                                };
                                await onComplete?.(ctx, completeMessage);
                                if (notifyClient) {
                                    logger.debug(
                                        {metadata: {connectionId}},
                                        'Sending complete from async iterator'
                                    );
                                    await socket.send(stringifyMessage(completeMessage, replacer));
                                }
                            }
                        };

                        try {
                            let execArgs;
                            const maybeExecArgsOrErrors = await onSubscribe?.(ctx, message);
                            if (maybeExecArgsOrErrors) {
                                if (areGraphQLErrors(maybeExecArgsOrErrors)) {
                                    return id in ctx.subscriptions
                                        ? await emit.error(maybeExecArgsOrErrors)
                                        : void 0;
                                } else if (Array.isArray(maybeExecArgsOrErrors)) {
                                    logger.error(
                                        {metadata: {connectionId}},
                                        'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects'
                                    );
                                    throw new Error(
                                        'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects'
                                    );
                                }
                                // not errors, is exec args
                                execArgs = maybeExecArgsOrErrors;
                            } else {
                                // you either provide a schema dynamically through
                                // `onSubscribe` or you set one up during the server setup
                                if (!schema) {
                                    logger.error(
                                        {metadata: {connectionId}},
                                        'The GraphQL schema is not provided'
                                    );
                                    throw new Error('The GraphQL schema is not provided');
                                }

                                const args = {
                                    operationName: payload.operationName,
                                    document: parse(payload.query),
                                    variableValues: payload.variables
                                };
                                execArgs = {
                                    ...args,
                                    schema:
                                        typeof schema === 'function'
                                            ? await schema(ctx, message, args)
                                            : schema
                                };
                                const validationErrors = (validate ?? graphqlValidate)(
                                    execArgs.schema,
                                    execArgs.document
                                );
                                if (validationErrors.length > 0) {
                                    return id in ctx.subscriptions
                                        ? await emit.error(validationErrors)
                                        : void 0;
                                }
                            }

                            const operationAST = getOperationAST(
                                execArgs.document,
                                execArgs.operationName
                            );
                            if (!operationAST) {
                                return id in ctx.subscriptions
                                    ? await emit.error([
                                          new GraphQLError('Unable to identify operation')
                                      ])
                                    : void 0;
                            }

                            // if `onSubscribe` didn't specify a rootValue, inject one
                            if (!('rootValue' in execArgs)) {
                                execArgs.rootValue = roots?.[operationAST.operation];
                            }

                            // if `onSubscribe` didn't specify a context, inject one
                            if (!('contextValue' in execArgs)) {
                                execArgs.contextValue =
                                    typeof context === 'function'
                                        ? await context(ctx, message, execArgs)
                                        : context;
                            }

                            // the execution arguments have been prepared
                            // perform the operation and act accordingly
                            let operationResult;
                            if (operationAST.operation === 'subscription') {
                                operationResult = await (subscribe ?? graphqlSubscribe)(execArgs);
                            }
                            // operation === 'query' || 'mutation'
                            else {
                                operationResult = await (execute ?? graphqlExecute)(execArgs);
                            }

                            const maybeResult = await onOperation?.(
                                ctx,
                                message,
                                execArgs,
                                operationResult
                            );
                            if (maybeResult) {
                                operationResult = maybeResult;
                            }

                            if (isAsyncIterable(operationResult)) {
                                /** multiple emitted results */
                                if (!(id in ctx.subscriptions)) {
                                    // subscription was completed/canceled before the operation settled
                                    if (isAsyncGenerator(operationResult)) {
                                        operationResult.return(undefined);
                                    }
                                } else {
                                    ctx.subscriptions[id] = operationResult;

                                    // only persist updated context here because subscriptionId resulted in async iterator waiting on events
                                    await persistServerlessContext(connectionId, ctx);

                                    for await (const result of operationResult) {
                                        // we need to reload the context on each source event to make sure we don't generate a source event for a completed subscription that was removed by another host
                                        await readAndUpdateServerlessContext(connectionId, ctx);

                                        if (ctx.subscriptions[id]) {
                                            await emit.next(result, execArgs);
                                        }
                                    }
                                }
                            } else {
                                /** single emitted result */
                                // if the client completed the subscription before the single result
                                // became available, he effectively canceled it and no data should be sent
                                if (id in ctx.subscriptions) {
                                    await emit.next(operationResult, execArgs);
                                }
                            }

                            logger.debug(
                                {metadata: {connectionId}},
                                'Sending complete for subscription'
                            );

                            // lack of subscription at this point indicates that the client
                            // completed the subscription, he doesn't need to be reminded
                            await emit.complete(id in ctx.subscriptions);
                        } catch (error) {
                            logger.error({error});
                        } finally {
                            // whatever happens to the subscription, we finally want to get rid of the reservation
                            delete ctx.subscriptions[id];
                        }
                        return;
                    }

                    case MessageType.Complete: {
                        logger.debug(
                            {metadata: {connectionId}},
                            'Handling complete for subscription'
                        );
                        const subscription = ctx.subscriptions[message.id];

                        delete ctx.subscriptions[message.id]; // deleting the subscription means no further activity should take place

                        if (isAsyncGenerator(subscription)) {
                            await subscription.return(undefined);

                            // update serverless context by removing subscription and notify other hosts if we had to destroy the async iterator
                            await completeSubscription(connectionId, message.id);
                        }

                        return;
                    }

                    default:
                        throw new Error(`Unexpected message of type ${message.type} received`);
                }
            });

            // wait for close, cleanup and the disconnect callback
            return async (code, reason) => {
                logger.debug({metadata: {connectionId}}, 'Handling close/cleanup for ws server');
                if (connectionInitWait) {
                    clearTimeout(connectionInitWait);
                }

                const subs = ctx?.subscriptions ? {...ctx.subscriptions} : {};
                ctx.subscriptions = {}; // deleting the subscription means no further activity should take place

                // we return all iterable subscriptions immediately, independent of the order
                await Promise.all(
                    Object.values(subs)
                        .filter(isAsyncGenerator)
                        .map((sub) => sub.return(undefined))
                );

                await deleteServerlessContext(connectionId);

                if (ctx.acknowledged) {
                    await onDisconnect?.(ctx, code, reason);
                }

                await onClose?.(ctx, code, reason);
            };
        }
    };
}

module.exports = makeServerless;
