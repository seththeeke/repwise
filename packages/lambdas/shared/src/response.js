"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverError = exports.notFound = exports.forbidden = exports.unauthorized = exports.badRequest = exports.noContent = exports.created = exports.ok = void 0;
const ok = (body) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
exports.ok = ok;
const created = (body) => ({
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
exports.created = created;
const noContent = () => ({ statusCode: 204, body: '' });
exports.noContent = noContent;
const badRequest = (message) => ({
    statusCode: 400,
    body: JSON.stringify({ error: message }),
});
exports.badRequest = badRequest;
const unauthorized = () => ({
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
});
exports.unauthorized = unauthorized;
const forbidden = () => ({
    statusCode: 403,
    body: JSON.stringify({ error: 'Forbidden' }),
});
exports.forbidden = forbidden;
const notFound = (resource = 'Resource') => ({
    statusCode: 404,
    body: JSON.stringify({ error: `${resource} not found` }),
});
exports.notFound = notFound;
const serverError = (err) => {
    console.error(err);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
    };
};
exports.serverError = serverError;
