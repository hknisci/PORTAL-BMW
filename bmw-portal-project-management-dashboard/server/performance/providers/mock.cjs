function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeCommonPayload(product) {
  return {
    product,
    kpis: {
      cpu: rand(5, 85),
      memory: rand(10, 90),
      disk: rand(20, 95),
      errorRate: Number((Math.random() * 3).toFixed(2)),
      latencyMs: rand(20, 1500),
      rps: rand(10, 5000),
      activeConnections: rand(1, 20000),
    },
    topEndpoints: Array.from({ length: 5 }).map((_, i) => ({
      name: `/api/${product}/endpoint-${i + 1}`,
      count: rand(10, 10000),
      avgMs: rand(10, 1500),
      p95Ms: rand(50, 3000),
      errors: rand(0, 120),
    })),
    errorLog: Array.from({ length: 6 }).map((_, i) => ({
      ts: new Date(Date.now() - i * 60_000).toISOString(),
      level: ["INFO", "WARN", "ERROR"][rand(0, 2)],
      message: `${product.toUpperCase()} sample log line ${i + 1}`,
    })),
  };
}

async function fetchAll({ products }) {
  const data = {};
  for (const p of products || []) data[p] = makeCommonPayload(p);
  return data;
}

module.exports = { fetchAll };