const http = require('http');
const https = require('https');
const { URL } = require('url');

function useFetch() {
  return typeof fetch === 'function';
}

async function fetchWithNode(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: body,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function request(url, options = {}) {
  if (useFetch()) {
    const res = await fetch(url, { method: options.method || 'GET', headers: options.headers, body: options.body, signal: options.signal });
    const text = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { status: res.status, headers, text };
  }
  return fetchWithNode(url, options);
}

module.exports = { request };
