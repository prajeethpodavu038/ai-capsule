import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page center-page">
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <Link className="btn btn-primary" to="/">Back to home</Link>
    </div>
  );
}
