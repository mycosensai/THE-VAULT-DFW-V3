import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://thevaultdfw.win';

export default function () {
  const endpoints = [
    '/',
    '/api/health',
    '/api/db/health',
    '/api/trpc',
  ];

  for (const path of endpoints) {
    const res = http.get(`${BASE_URL}${path}`, {
      headers: {
        'User-Agent': 'TheVaultDFW-k6-smoke-test/1.0',
      },
    });

    check(res, {
      [`${path} returned non-5xx`]: (r) => r.status < 500,
      [`${path} responded`]: (r) => r.status > 0,
    });

    sleep(0.25);
  }
}
