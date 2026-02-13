# k6 Load Testing

This directory contains k6 load test scripts for the Photo Studio SaaS API.

## Prerequisites

Install k6:
- **Windows:** `choco install k6` or download from https://k6.io/
- **macOS:** `brew install k6`
- **Linux:** `sudo apt-get install k6`

## Test Scripts

### 1. Authentication Load Test
Tests login, token validation, and protected route access.

```bash
k6 run k6/auth-load-test.js
```

**Test Profile:**
- Ramp up: 0 → 10 → 50 users
- Duration: 3.5 minutes
- Endpoints: `/auth/user/login`, `/bookings`

**Thresholds:**
- P95 latency < 500ms
- Error rate < 10%

### 2. Booking Load Test
Tests booking CRUD operations with mixed read/write workload.

```bash
k6 run k6/booking-load-test.js
```

**Test Profile:**
- Read-heavy scenario: 50 concurrent users (80% reads, 20% filters)
- Write scenario: 5 concurrent users (creates + updates)
- Duration: 4 minutes

**Thresholds:**
- P95 latency < 1000ms
- P99 latency < 2000ms
- Error rate < 5%
- Booking list < 500ms (P95)
- Booking creation < 1500ms (P95)

## Running Tests

### Basic Run
```bash
k6 run k6/auth-load-test.js
```

### Custom Base URL
```bash
k6 run --env BASE_URL=https://api.photostudio.com k6/auth-load-test.js
```

### Generate HTML Report
Results are automatically saved to:
- `k6/results-auth.json`
- `k6/results-booking.json`
- `k6/results-booking.html`

### Cloud Run (k6 Cloud)
```bash
k6 cloud k6/booking-load-test.js
```

## Interpreting Results

### Key Metrics

**http_req_duration:** Time to receive response
- **Target:** P95 < 500ms for auth, P95 < 1000ms for bookings

**http_req_failed:** Failed request rate
- **Target:** < 5%

**http_reqs:** Total requests per second
- Monitor for throughput

**vus:** Virtual users
- Concurrent users simulated

### Threshold Colors
- ✓ **Green:** Test passed threshold
- ✗ **Red:** Test failed threshold

## Performance Baselines

### Expected Results (Development)

**Authentication:**
- Throughput: ~100 req/s
- P95 Latency: 200-400ms
- Error Rate: 0%

**Bookings (Read):**
- Throughput: ~200 req/s
- P95 Latency: 300-800ms
- Error Rate: < 1%

**Bookings (Write):**
- Throughput: ~50 req/s
- P95 Latency: 500-1200ms
- Error Rate: < 2% (conflicts expected)

### Production Targets

**Authentication:**
- Throughput: 500+ req/s
- P95 Latency: < 500ms
- P99 Latency: < 1000ms

**Bookings:**
- Throughput: 1000+ req/s (reads)
- P95 Latency: < 800ms
- P99 Latency: < 1500ms

## Troubleshooting

### High Error Rate
- Check if backend is running
- Verify database connection
- Check rate limiting (might need adjustment for load tests)

### High Latency
- Check database query performance
- Review slow query logs
- Consider adding indexes
- Enable caching

### Connection Errors
- Increase connection pool size
- Check max connections in PostgreSQL
- Adjust Redis connection limits

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run k6 Load Tests
  run: |
    k6 run --out json=results.json k6/auth-load-test.js
    k6 run --out json=results.json k6/booking-load-test.js
  
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: k6-results
    path: k6/results-*.json
```

## Advanced Usage

### Custom Scenarios
Create new test files following the pattern:
1. Define `options` with stages or scenarios
2. Implement `default()` or named functions
3. Add custom metrics and thresholds
4. Export `handleSummary()` for reporting

### Debugging
```bash
# Verbose output
k6 run --http-debug k6/auth-load-test.js

# Single VU for debugging
k6 run --vus 1 --iterations 1 k6/auth-load-test.js
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Patterns](https://k6.io/docs/examples/)
- [Thresholds Guide](https://k6.io/docs/using-k6/thresholds/)
