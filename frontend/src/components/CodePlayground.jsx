import { useEffect, useMemo, useState } from "react";

const buildSrcDoc = (html = "", css = "", js = "") => {
  return `<!doctype html>
<html>
  <head>
    <style>${css}</style>
  </head>
  <body>
    ${html}
    <script>
      try {
        ${js}
      } catch (err) {
        const pre = document.createElement('pre');
        pre.style.color = 'red';
        pre.textContent = 'Error: ' + err.message;
        document.body.appendChild(pre);
      }
    <\/script>
  </body>
</html>`;
};

const CodePlayground = ({
  title = "Code playground",
  storageKey = "playground",
  defaultHtml = "<h2>Hello learner!</h2><p>Edit the code and hit Run.</p>",
  defaultCss = "body { font-family: Arial, sans-serif; padding: 16px; }\nh2 { color: #155eef; }",
  defaultJs = "document.querySelector('h2').textContent = 'Live preview is ready!';",
}) => {
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [js, setJs] = useState(defaultJs);
  const [runToken, setRunToken] = useState(0);

  const localStorageKey = useMemo(() => `gradus-${storageKey}`, [storageKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHtml(parsed.html ?? defaultHtml);
        setCss(parsed.css ?? defaultCss);
        setJs(parsed.js ?? defaultJs);
        setRunToken((t) => t + 1);
      }
    } catch (error) {
      // ignore parse errors
    }
  }, [localStorageKey, defaultHtml, defaultCss, defaultJs]);

  useEffect(() => {
    const payload = JSON.stringify({ html, css, js });
    try {
      localStorage.setItem(localStorageKey, payload);
    } catch (error) {
      // storage may be unavailable; ignore
    }
  }, [html, css, js, localStorageKey]);

  const handleRun = () => setRunToken((t) => t + 1);

  const handleReset = () => {
    setHtml(defaultHtml);
    setCss(defaultCss);
    setJs(defaultJs);
    setRunToken((t) => t + 1);
  };

  const srcDoc = useMemo(() => buildSrcDoc(html, css, js), [html, css, js, runToken]);

  return (
    <div className='code-playground card border-0 shadow-sm mt-4'>
      <div className='code-playground__header'>
        <div>
          <p className='code-playground__eyebrow mb-1'>Interactive practice</p>
          <h4 className='mb-0'>{title}</h4>
        </div>
        <div className='d-flex gap-2'>
          <button type='button' className='btn btn-sm btn-outline-secondary' onClick={handleReset}>
            Reset
          </button>
          <button type='button' className='btn btn-sm btn-main' onClick={handleRun}>
            Run
          </button>
        </div>
      </div>
      <div className='code-playground__body'>
        <div className='code-playground__editors'>
          <div className='code-playground__editor'>
            <div className='code-playground__editor-title'>HTML</div>
            <textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck='false' />
          </div>
          <div className='code-playground__editor'>
            <div className='code-playground__editor-title'>CSS</div>
            <textarea value={css} onChange={(e) => setCss(e.target.value)} spellCheck='false' />
          </div>
          <div className='code-playground__editor'>
            <div className='code-playground__editor-title'>JavaScript</div>
            <textarea value={js} onChange={(e) => setJs(e.target.value)} spellCheck='false' />
          </div>
        </div>
        <div className='code-playground__preview'>
          <div className='code-playground__preview-title'>Preview</div>
          <iframe
            key={runToken}
            title='Playground Preview'
            srcDoc={srcDoc}
            sandbox='allow-scripts'
            className='code-playground__iframe'
          />
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
