import { loadPyodide } from './python/pyodide.mjs';

const harness = `
import io as _io
import sys as _sys
import json as _json
import traceback as _traceback
import types as _types

class _OutputBuffer(_io.BytesIO):
    def write(self, value):
        if self.tell() + len(value) > 65536:
            raise RuntimeError("Output exceeded 64 KiB.")
        return super().write(value)

def _run_student(source, args_json, filename):
    saved = (_sys.stdin, _sys.stdout, _sys.stderr, _sys.argv)
    stdin = _io.StringIO('')
    out_buffer, err_buffer = _OutputBuffer(), _OutputBuffer()
    stdout = _io.TextIOWrapper(out_buffer, encoding='utf-8', write_through=True)
    stderr = _io.TextIOWrapper(err_buffer, encoding='utf-8', write_through=True)
    module = _types.ModuleType('student')
    module.__file__ = filename
    result = {'kind': 'error', 'value': None, 'display': '', 'exitCode': 0}
    try:
        _sys.stdin, _sys.stdout, _sys.stderr = stdin, stdout, stderr
        _sys.argv = [filename]
        exec(compile(source, filename, 'exec'), module.__dict__)
        args = _json.loads(args_json)
        try:
            answer = module.crafting(args['recipes'], args['ingredients'])
        except ValueError as error:
            if type(error) is not ValueError:
                raise
            result.update(kind='ValueError', display='ValueError')
        except LookupError as error:
            if type(error) is not LookupError:
                raise
            result.update(kind='LookupError', display='LookupError')
        else:
            if (type(answer) is not tuple or len(answer) != 2
                    or type(answer[0]) is not str or type(answer[1]) is not int
                    or not 1 <= answer[1] <= 64):
                raise TypeError('crafting must return a (str, int) tuple')
            result.update(kind='return', value=answer, display=repr(answer))
    except BaseException:
        result['exitCode'] = 1
        # Keep the traceback separate from student output, including output-limit errors.
        error_text = _traceback.format_exc()
        remaining = 65536 - err_buffer.tell()
        err_buffer.write(error_text.encode('utf-8')[:remaining])
    finally:
        _sys.stdin, _sys.stdout, _sys.stderr, _sys.argv = saved
    result.update({
        'stdout': out_buffer.getvalue().decode('utf-8', errors='replace'),
        'stderr': err_buffer.getvalue().decode('utf-8', errors='replace'),
    })
    return _json.dumps(result)
`;

try {
  const pyodide = await loadPyodide({ indexURL: new URL('./python/', import.meta.url).href });
  pyodide.runPython(harness);
  const runStudent = pyodide.globals.get('_run_student');
  self.postMessage({ type: 'ready', version: pyodide.runPython('import sys; sys.version.split()[0]') });
  self.onmessage = ({ data }) => {
    if (data.type !== 'run') return;
    self.postMessage({ type: 'running' });
    try {
      const result = JSON.parse(runStudent(data.source, JSON.stringify(data.args), data.filename));
      self.postMessage({ type: 'result', ...result });
    } catch (error) {
      self.postMessage({ type: 'error', message: String(error) });
    }
  };
} catch (error) {
  self.postMessage({ type: 'error', message: `Python could not start: ${error.message}` });
}
