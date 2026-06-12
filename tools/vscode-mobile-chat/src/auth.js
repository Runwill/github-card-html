const crypto = require('crypto');

function createAccessToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function extractToken(requestUrl, headers) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  const authorization = headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function isAuthorized(requestUrl, headers, expectedToken, requireToken) {
  if (!requireToken) {
    return true;
  }
  return extractToken(requestUrl, headers) === expectedToken;
}

module.exports = {
  createAccessToken,
  isAuthorized
};
