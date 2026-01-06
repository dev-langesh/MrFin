const request = require("supertest");
const { app } = require("../app");
const { register } = require("../lib/metrics/metrics.service");

describe("Prometheus Metrics", () => {
  it("should expose /metrics endpoint", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe(register.contentType);
    expect(res.text).toContain("process_cpu_user_seconds_total");
  });

  it("should record http request duration", async () => {
    // Make a request to root
    await request(app).get("/");

    // Check metrics
    const res = await request(app).get("/metrics");
    expect(res.text).toContain("http_request_duration_seconds_bucket");
    expect(res.text).toContain('route="/"');
    expect(res.text).toContain('status_code="200"');
  });

  it("should normalize routes", async () => {
    await request(app).get("/non-existent-route-123");

    const res = await request(app).get("/metrics");

    expect(res.text).toContain('route="not_found"');
  });
});
