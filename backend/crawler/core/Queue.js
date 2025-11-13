class Queue {
  constructor() {
    this.items = [];
    this.seen = new Set();
  }
  add(task) {
    const key = task.url;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.items.push(task);
    return true;
  }
  take() {
    if (this.items.length === 0) return null;
    return this.items.shift();
  }
  size() {
    return this.items.length;
  }
}

module.exports = Queue;
