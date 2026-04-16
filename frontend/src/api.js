const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }
  return res.json();
}

export async function uploadDataset(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function loadSample(filename) {
  return request(`/samples/${filename}`, { method: 'POST' });
}

export async function listSamples() {
  return request('/samples');
}

export async function analyzeDataset(datasetId) {
  return request(`/analyze/${datasetId}`, { method: 'POST' });
}

export async function mitigateBias(datasetId, method = 'reweighting') {
  return request(`/mitigate/${datasetId}`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  });
}

export async function getCounterfactuals(datasetId) {
  return request(`/counterfactual/${datasetId}`, { method: 'POST' });
}

export async function whatIfAnalysis(datasetId, feature, action, value = null) {
  return request(`/whatif/${datasetId}`, {
    method: 'POST',
    body: JSON.stringify({ feature, action, value }),
  });
}

export async function injectBias(datasetId) {
  return request(`/inject/${datasetId}`, { method: 'POST' });
}

export async function checkCompliance(datasetId) {
  return request(`/compliance/${datasetId}`, { method: 'POST' });
}

export async function chatAboutBias(datasetId, question) {
  return request(`/chat/${datasetId}`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export async function generateReport(datasetId) {
  return request(`/report/${datasetId}`, { method: 'POST' });
}

export async function monitorPredictions(predictions, groups, sensitiveColumn = 'group') {
  return request('/monitor', {
    method: 'POST',
    body: JSON.stringify({ predictions, groups, sensitive_column: sensitiveColumn }),
  });
}

export async function getMonitorHistory() {
  return request('/monitor/history');
}

// ─── PHD-LEVEL FEATURES ─────────────────────

export async function getCausalAnalysis(datasetId) {
  return request(`/causal/${datasetId}`, { method: 'POST' });
}

export async function getLegalRisk(datasetId) {
  return request(`/legal-risk/${datasetId}`, { method: 'POST' });
}

export async function getCertificate(datasetId) {
  return request(`/certificate/${datasetId}`, { method: 'POST' });
}

export async function getSyntheticData(datasetId) {
  return request(`/synthetic/${datasetId}`, { method: 'POST' });
}

export async function getProvenance(datasetId) {
  return request(`/provenance/${datasetId}`, { method: 'POST' });
}
