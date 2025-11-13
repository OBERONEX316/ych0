const Queue = require('./Queue');
const { request } = require('./HttpClient');

class Crawler {
  constructor(opts = {}) {
    this.concurrency = opts.concurrency || 4;
    this.intervalMs = opts.intervalMs || 0;
    this.maxRetries = opts.maxRetries || 2;
    this.timeoutMs = opts.timeoutMs || 15000;
    this.queue = new Queue();
    this.requestMiddlewares = [];
    this.responseMiddlewares = [];
    this.pipelines = [];
  }
  use(mw) {
    if (mw && mw.type === 'request') this.requestMiddlewares.push(mw.run);
    else if (mw && mw.type === 'response') this.responseMiddlewares.push(mw.run);
    else if (mw && mw.type === 'pipeline') this.pipelines.push(mw.run);
    return this;
  }
  add(task) {
    this.queue.add(task);
  }
  async runOnce(task) {
    let options = { method: 'GET', headers: {}, timeout: this.timeoutMs };
    for (const fn of this.requestMiddlewares) {
      options = await fn({ url: task.url, options }) || options;
    }
    let attempt = 0;
    let res;
    while (attempt <= this.maxRetries) {
      try {
        res = await request(task.url, options);
        break;
      } catch (e) {
        attempt += 1;
        if (attempt > this.maxRetries) throw e;
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    for (const fn of this.responseMiddlewares) {
      await fn({ url: task.url, response: res });
    }
    const ctx = { url: task.url, status: res.status, headers: res.headers, text: res.text, json: safeJSON(res.text) };
    const out = await task.handler(ctx);
    if (out && Array.isArray(out.next)) {
      for (const t of out.next) this.add(t);
    }
    if (out && Array.isArray(out.items) && this.pipelines.length) {
      for (const item of out.items) {
        for (const p of this.pipelines) await p(item);
      }
    }
  }
  async start() {
    const workers = [];
    for (let i = 0; i < this.concurrency; i += 1) {
      workers.push(this.worker());
    }
    await Promise.all(workers);
  }
  async worker() {
    while (true) {
      const task = this.queue.take();
      if (!task) break;
      await this.runOnce(task);
      if (this.intervalMs) await new Promise(r => setTimeout(r, this.intervalMs));
    }
  }
}

function safeJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

module.exports = Crawler;
