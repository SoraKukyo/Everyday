import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(previous) { if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="tracker-shell"><section className="suite-grid"><section className="suite-card error-boundary"><span className="section-label">Something went wrong</span><h1>This page could not load.</h1><p>Nothing was changed. Return to your dashboard, then try the module again.</p><button type="button" onClick={this.props.onRecover}>Back to dashboard</button></section></section></main>;
  }
}
