import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Landing() {
  const [params] = useSearchParams();
  const [health, setHealth] = useState(null);
  const loginRequired = params.get('login_required') === '1';

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="page landing">
      <header className="landing-hero">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <span className="brand-name">Capsule</span>
        </div>
        <h1>Never lose a good prompt again.</h1>
        <p className="lede">
          AI Capsule is your private library for the prompts you actually use — with ChatGPT,
          Copilot, Gemini, Claude, or anything else. Save the prompt, the response summary, and a
          quick note on whether it worked, so your best prompts are one search away next time.
        </p>

        {loginRequired && (
          <div className="notice">You need to sign in before you can open the dashboard.</div>
        )}

        <a className="btn btn-primary btn-lg" href="/login">
          <GithubMark /> Sign in with GitHub
        </a>

        <p className="health-line">
          Backend status:{' '}
          {health ? <span className="status-ok">● {health.status}</span> : <span className="status-pending">checking…</span>}
        </p>
      </header>

      <section className="features">
        <div className="feature-card">
          <h3>Capture</h3>
          <p>Save the prompt, project, version, category and the response summary in one place.</p>
        </div>
        <div className="feature-card">
          <h3>Review</h3>
          <p>Mark whether a response was reviewed and whether the output was improved.</p>
        </div>
        <div className="feature-card">
          <h3>Private</h3>
          <p>Sign in with GitHub. Every record is tied to your account — only you can see it.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>AI Capsule &middot; a small full-stack CRUD project &middot; React + Node/Express + SQLite</p>
      </footer>
    </div>
  );
}

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
      0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
      -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
      .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
      -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
      1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
      1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
      1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
