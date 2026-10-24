export class PythonRunner {
  constructor(onStatus) {
    this.onStatus = onStatus;
    this.start();
  }

  start() {
    this.worker = new Worker(new URL('worker.js', document.baseURI), { type: 'module' });
    this.ready = false;
    this.onStatus('loading', 'Loading Python…');
    this.timer = setTimeout(() => this.fail('Python took too long to load. Check the local runtime files, then retry.'), 45000);
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(this.timer);
        this.ready = true;
        this.onStatus('ready', `Python ${data.version} ready`);
      } else if (data.type === 'running') {
        this.timer = setTimeout(() => this.fail('Stopped after 3 seconds. Check for an infinite loop or an unexpected input read.'), 3000);
      } else if (data.type === 'result') {
        clearTimeout(this.timer);
        const pending = this.pending;
        this.pending = null;
        pending.resolve(data);
      } else if (data.type === 'error') {
        this.fail(data.message);
      }
    };
    this.worker.onerror = event => {
      event.preventDefault();
      this.fail(event.message || 'The Python worker stopped unexpectedly.');
    };
  }

  run(source, args, filename) {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker.postMessage({ type: 'run', source, args, filename });
    });
  }

  fail(message) {
    clearTimeout(this.timer);
    this.worker.terminate();
    this.ready = false;
    this.onStatus('error', 'Python stopped');
    if (this.pending) {
      this.pending.reject(new Error(message));
      this.pending = null;
    } else {
      this.onStatus('error', message);
    }
  }

  restart() {
    clearTimeout(this.timer);
    this.worker.terminate();
    this.start();
  }
}
