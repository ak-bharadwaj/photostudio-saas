import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test: Booking Management
 * 
 * Tests booking CRUD operations under load
 * 
 * Run: k6 run k6/booking-load-test.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const bookingCreationTime = new Trend('booking_creation_time');
const bookingListTime = new Trend('booking_list_time');

export const options = {
  scenarios: {
    // Scenario 1: Read-heavy load (80% reads, 20% writes)
    read_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'readHeavy',
    },
    
    // Scenario 2: Write operations
    write_operations: {
      executor: 'constant-vus',
      vus: 5,
      duration: '4m',
      startTime: '0s',
      exec: 'writeOperations',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    booking_creation_time: ['p(95)<1500'],
    booking_list_time: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
let accessToken = null;

// Setup: Login once to get token
export function setup() {
  const loginPayload = JSON.stringify({
    email: 'owner@example.com',
    password: 'password123',
  });

  const loginRes = http.post(`${BASE_URL}/auth/user/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.accessToken };
  }
  
  throw new Error('Setup failed: Unable to login');
}

// Read-heavy scenario: 80% list, 20% get single
export function readHeavy(data) {
  const headers = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  };

  const random = Math.random();
  
  if (random < 0.8) {
    // 80% - List bookings
    const startTime = Date.now();
    const listRes = http.get(`${BASE_URL}/bookings?limit=50`, headers);
    bookingListTime.add(Date.now() - startTime);
    
    const success = check(listRes, {
      'list bookings status 200': (r) => r.status === 200,
      'list has data array': (r) => {
        try {
          return JSON.parse(r.body).data !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
  } else {
    // 20% - Get bookings with filters
    const statusFilters = ['INQUIRY', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
    const randomStatus = statusFilters[Math.floor(Math.random() * statusFilters.length)];
    
    const filterRes = http.get(`${BASE_URL}/bookings?status=${randomStatus}`, headers);
    
    const success = check(filterRes, {
      'filtered bookings status 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
  }

  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

// Write operations scenario
export function writeOperations(data) {
  const headers = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // Get customers and services first
  const customersRes = http.get(`${BASE_URL}/customers?limit=10`, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
  
  const servicesRes = http.get(`${BASE_URL}/services?limit=10`, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });

  if (customersRes.status === 200 && servicesRes.status === 200) {
    try {
      const customers = JSON.parse(customersRes.body).data;
      const services = JSON.parse(servicesRes.body).data;
      
      if (customers.length > 0 && services.length > 0) {
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const randomService = services[Math.floor(Math.random() * services.length)];
        
        // Create a booking
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const createPayload = JSON.stringify({
          customerId: randomCustomer.id,
          serviceId: randomService.id,
          scheduledAt: tomorrow.toISOString(),
          customerNotes: 'Load test booking',
        });
        
        const startTime = Date.now();
        const createRes = http.post(`${BASE_URL}/bookings`, createPayload, headers);
        bookingCreationTime.add(Date.now() - startTime);
        
        const createSuccess = check(createRes, {
          'create booking status 201 or 409': (r) => r.status === 201 || r.status === 409,
        });
        
        errorRate.add(!createSuccess);
        
        // If successful, update status
        if (createRes.status === 201) {
          const bookingId = JSON.parse(createRes.body).id;
          
          const updatePayload = JSON.stringify({
            status: 'CONFIRMED',
            notes: 'Confirmed via load test',
          });
          
          const updateRes = http.patch(
            `${BASE_URL}/bookings/${bookingId}/status`,
            updatePayload,
            headers
          );
          
          check(updateRes, {
            'update status 200': (r) => r.status === 200,
          });
        }
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      errorRate.add(true);
    }
  }

  sleep(Math.random() * 3 + 2); // 2-5 seconds between writes
}

export function handleSummary(data) {
  return {
    'k6/results-booking.json': JSON.stringify(data, null, 2),
    'k6/results-booking.html': htmlReport(data),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = '\n====== BOOKING LOAD TEST SUMMARY ======\n\n';
  
  summary += 'HTTP Metrics:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `  Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Custom Metrics:\n';
  summary += `  Booking List Time (p95): ${data.metrics.booking_list_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `  Booking Creation Time (p95): ${data.metrics.booking_creation_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += 'Thresholds:\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓' : '✗';
    summary += `  ${status} ${name}\n`;
  }
  
  summary += '\n======================================\n';
  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report - Bookings</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .metric { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .metric h3 { margin-top: 0; color: #0066cc; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>k6 Load Test Report - Booking Endpoints</h1>
  <div class="metric">
    <h3>Test Duration</h3>
    <p>Total: ${data.state.testRunDurationMs / 1000}s</p>
  </div>
  <div class="metric">
    <h3>HTTP Requests</h3>
    <p>Total: ${data.metrics.http_reqs.values.count}</p>
    <p>Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</p>
    <p>Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</p>
    <p>P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</p>
  </div>
  <div class="metric">
    <h3>Thresholds</h3>
    ${Object.entries(data.thresholds || {})
      .map(([name, t]) => `<p class="${t.ok ? 'pass' : 'fail'}">${t.ok ? '✓' : '✗'} ${name}</p>`)
      .join('')}
  </div>
</body>
</html>
  `;
}
