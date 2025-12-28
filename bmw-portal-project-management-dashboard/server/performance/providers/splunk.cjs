async function fetchAll({ config, products }) {
  const data = {};
  for (const p of products || []) {
    data[p] = {
      product: p,
      kpis: {},
      topEndpoints: [],
      errorLog: [],
      _note: "Splunk provider hazır. Henüz gerçek API mapping eklenmedi.",
      _cfg: { baseUrl: config?.splunk?.baseUrl ? "set" : "empty" }
    };
  }
  return data;
}

module.exports = { fetchAll };