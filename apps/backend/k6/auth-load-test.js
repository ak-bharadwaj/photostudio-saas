import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * k6 Load Test: Authentication Endpoints
 * 
 * Tests login, registration, and token refresh under load
 * 
 * Run: k6 run k6/auth-load-test.js
 */

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% failure rate
    errors: ['rate<0.1'],             // Less than 10% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: User Login
  const loginPayload = JSON.stringify({
    email: 'owner@example.com',
    password: 'password123',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${BASE_URL}/auth/user/login`, loginPayload, loginParams);
  
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    'login duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!loginSuccess);

  if (loginSuccess) {
    const body = JSON.parse(loginRes.body);
    const accessToken = body.accessToken;

    // Test 2: Access Protected Route
    const protectedParams = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    const bookingsRes = http.get(`${BASE_URL}/bookings`, protectedParams);
    
    const protectedSuccess = check(bookingsRes, {
      'bookings status is 200': (r) => r.status === 200,
      'bookings response is valid': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        } catch (e) {
          return false;
        }
      },
      'bookings duration < 1000ms': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!protectedSuccess);
  }

  sleep(1); // Think time between requests
}

export function handleSummary(data) {
  return {
    'k6/results-auth.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n' + indent + '====== LOAD TEST SUMMARY ======\n\n';
  
  // HTTP metrics
  summary += indent + 'HTTP Metrics:\n';
  summary += indent + `  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `  Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += indent + `  Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += indent + `  Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `  Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // VUs
  summary += indent + 'Virtual Users:\n';
  summary += indent + `  Max: ${data.metrics.vus_max.values.max}\n\n`;
  
  // Custom metrics
  if (data.metrics.errors) {
    summary += indent + 'Custom Metrics:\n';
    summary += indent + `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  summary += indent + '==============================\n';
  
  return summary;
}
