"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = void 0;
const getUserId = (event) => {
    return event.requestContext.authorizer.jwt.claims['sub'];
};
exports.getUserId = getUserId;
