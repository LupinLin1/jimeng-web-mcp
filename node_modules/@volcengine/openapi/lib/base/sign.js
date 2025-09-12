"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryParamsToString = void 0;
const hmac_sha256_1 = __importDefault(require("crypto-js/hmac-sha256"));
const sha256_1 = __importDefault(require("crypto-js/sha256"));
const core_1 = __importDefault(require("crypto-js/core"));
const form_data_1 = __importDefault(require("form-data"));
const util_1 = __importDefault(require("util"));
const debugLog = util_1.default.debuglog("signer");
const util = {
    crypto: {
        hmac: function hmac(key, string) {
            return (0, hmac_sha256_1.default)(string, key);
        },
        sha256: function sha256(data) {
            return Buffer.isBuffer(data) ? (0, sha256_1.default)(arrayBufferToWordArray(data)) : (0, sha256_1.default)(data);
        },
    },
};
const unsignableHeaders = [
    "authorization",
    "content-type",
    "content-length",
    "user-agent",
    "presigned-expires",
    "expect",
];
const constant = {
    algorithm: "HMAC-SHA256",
    v4Identifier: "request",
    dateHeader: "X-Date",
    tokenHeader: "X-Security-Token",
    contentSha256Header: "X-Content-Sha256",
    notSignBody: "X-NotSignBody",
    kDatePrefix: "",
    credential: "X-Credential",
    algorithmKey: "X-Algorithm",
    signHeadersKey: "X-SignedHeaders",
    signQueriesKey: "X-SignedQueries",
    signatureKey: "X-Signature",
};
const uriEscape = (str) => {
    try {
        return encodeURIComponent(str)
            .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
            .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
    }
    catch (e) {
        return "";
    }
};
const queryParamsToString = (params) => Object.keys(params)
    .map((key) => {
    const val = params[key];
    if (typeof val === "undefined" || val === null) {
        return;
    }
    const escapedKey = uriEscape(key);
    if (!escapedKey) {
        return;
    }
    if (Array.isArray(val)) {
        return `${escapedKey}=${val.map(uriEscape).sort().join(`&${escapedKey}=`)}`;
    }
    return `${escapedKey}=${uriEscape(val)}`;
})
    .filter((v) => v)
    .join("&");
exports.queryParamsToString = queryParamsToString;
class Signer {
    constructor(request, serviceName, options) {
        this.request = request;
        this.request.headers = request.headers || {};
        this.serviceName = serviceName;
        options = options || {};
        this.bodySha256 = options.bodySha256;
        this.request.params = this.sortParams(this.request.params);
    }
    sortParams(params) {
        const newParams = {};
        if (params) {
            Object.keys(params)
                .filter((key) => {
                const value = params[key];
                return typeof value !== "undefined" && value !== null;
            })
                .sort()
                .map((key) => {
                newParams[key] = params[key];
            });
        }
        return newParams;
    }
    addAuthorization(credentials, date) {
        const datetime = this.getDateTime(date);
        this.addHeaders(credentials, datetime);
        this.request.headers["Authorization"] = this.authorization(credentials, datetime);
    }
    authorization(credentials, datetime) {
        const parts = [];
        const credString = this.credentialString(datetime);
        parts.push(`${constant.algorithm} Credential=${credentials.accessKeyId}/${credString}`);
        parts.push(`SignedHeaders=${this.signedHeaders()}`);
        // parts.push(`SignedQueries=${this.signedQueries()}`);
        parts.push(`Signature=${this.signature(credentials, datetime)}`);
        return parts.join(", ");
    }
    getSignUrl(credentials, date) {
        const datetime = this.getDateTime(date);
        let query = Object.assign({}, this.request.params);
        const params = this.request.params;
        const headers = this.request.headers;
        if (credentials.sessionToken) {
            query[constant.tokenHeader] = credentials.sessionToken;
        }
        query[constant.dateHeader] = datetime;
        query[constant.notSignBody] = "";
        query[constant.credential] = `${credentials.accessKeyId}/${this.credentialString(datetime)}`;
        query[constant.algorithmKey] = constant.algorithm;
        query[constant.signHeadersKey] = "";
        query[constant.signQueriesKey] = undefined;
        query[constant.signatureKey] = undefined;
        query = this.sortParams(query);
        this.request.params = query;
        this.request.headers = {};
        const sig = this.signature(credentials, datetime);
        this.request.params = params;
        this.request.headers = headers;
        query[constant.signQueriesKey] = Object.keys(query).sort().join(";");
        query[constant.signatureKey] = sig;
        return (0, exports.queryParamsToString)(query);
    }
    getDateTime(date) {
        return this.iso8601(date).replace(/[:\-]|\.\d{3}/g, "");
    }
    addHeaders(credentials, datetime) {
        this.request.headers[constant.dateHeader] = datetime;
        if (credentials.sessionToken) {
            this.request.headers[constant.tokenHeader] = credentials.sessionToken;
        }
        if (this.request.body) {
            let body = this.request.body;
            if (typeof body !== "string") {
                if (body instanceof URLSearchParams) {
                    body = body.toString();
                }
                else if (body instanceof form_data_1.default) {
                    body = body.getBuffer();
                }
                else {
                    body = JSON.stringify(body);
                }
            }
            this.request.headers[constant.contentSha256Header] =
                this.bodySha256 || util.crypto.sha256(body).toString();
        }
    }
    signature(credentials, datetime) {
        const signingKey = this.getSigningKey(credentials, datetime.substr(0, 8), this.request.region, this.serviceName);
        return util.crypto.hmac(signingKey, this.stringToSign(datetime));
    }
    stringToSign(datetime) {
        const parts = [];
        parts.push(constant.algorithm);
        parts.push(datetime);
        parts.push(this.credentialString(datetime));
        parts.push(this.hexEncodedHash(this.canonicalString()).toString());
        const result = parts.join("\n");
        debugLog("--------SignString:\n%s", result);
        return result;
    }
    canonicalString() {
        const parts = [], pathname = this.request.pathname || "/";
        parts.push(this.request.method.toUpperCase());
        parts.push(pathname);
        const queryString = (0, exports.queryParamsToString)(this.request.params) || "";
        parts.push(queryString);
        parts.push(`${this.canonicalHeaders()}\n`);
        parts.push(this.signedHeaders());
        parts.push(this.hexEncodedBodyHash());
        const result = parts.join("\n");
        debugLog("--------CanonicalString:\n%s", result);
        return result;
    }
    canonicalHeaders() {
        const headers = [];
        Object.keys(this.request.headers).forEach((key) => {
            headers.push([key, this.request.headers[key]]);
        });
        headers.sort((a, b) => (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1));
        const parts = [];
        headers.forEach((item) => {
            const key = item[0].toLowerCase();
            if (this.isSignableHeader(key)) {
                const value = item[1];
                if (typeof value === "undefined" ||
                    value === null ||
                    typeof value.toString !== "function") {
                    throw new Error(`Header ${key} contains invalid value`);
                }
                parts.push(`${key}:${this.canonicalHeaderValues(value.toString())}`);
            }
        });
        return parts.join("\n");
    }
    canonicalHeaderValues(values) {
        return values.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    }
    signedHeaders() {
        const keys = [];
        Object.keys(this.request.headers).forEach((key) => {
            key = key.toLowerCase();
            if (this.isSignableHeader(key)) {
                keys.push(key);
            }
        });
        return keys.sort().join(";");
    }
    signedQueries() {
        return Object.keys(this.request.params).join(";");
    }
    credentialString(datetime) {
        return this.createScope(datetime.substr(0, 8), this.request.region, this.serviceName);
    }
    hexEncodedHash(str) {
        return util.crypto.sha256(str);
    }
    hexEncodedBodyHash() {
        if (this.request.headers[constant.contentSha256Header]) {
            return this.request.headers[constant.contentSha256Header];
        }
        if (this.request.body) {
            return this.hexEncodedHash((0, exports.queryParamsToString)(this.request.body));
        }
        return this.hexEncodedHash("");
    }
    isSignableHeader(key) {
        return unsignableHeaders.indexOf(key) < 0;
    }
    iso8601(date) {
        if (date === undefined) {
            date = new Date();
        }
        return date.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    getSigningKey(credentials, date, region, service) {
        const kDate = util.crypto.hmac(`${constant.kDatePrefix}${credentials.secretKey}`, date);
        const kRegion = util.crypto.hmac(kDate, region);
        const kService = util.crypto.hmac(kRegion, service);
        return util.crypto.hmac(kService, constant.v4Identifier);
    }
    createScope(date, region, serviceName) {
        return [date.substr(0, 8), region, serviceName, constant.v4Identifier].join("/");
    }
}
exports.default = Signer;
function arrayBufferToWordArray(buf) {
    const i8a = new Uint8Array(buf);
    const a = [];
    for (let i = 0; i < i8a.length; i += 4) {
        a.push((i8a[i] << 24) | (i8a[i + 1] << 16) | (i8a[i + 2] << 8) | i8a[i + 3]);
    }
    return core_1.default.lib.WordArray.create(a, i8a.length);
}
//# sourceMappingURL=sign.js.map