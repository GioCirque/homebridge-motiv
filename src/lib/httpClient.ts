import { request } from 'https';

export function secureGet(host, path, headers) {
  const safeHeaders = headers || {};
  const useHeaders = {
    ...safeHeaders,
  };
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: host,
        port: 443,
        path: path,
        method: 'GET',
        headers: useHeaders,
      },
      (res) => {
        res.on('data', (d) => {
          if (res.statusCode === 200) {
            resolve({
              data: JSON.parse(d.toString()),
              headers: res.headers,
              response: res,
            });
          } else {
            reject({
              data: JSON.parse(d.toString()),
              headers: res.headers,
              response: res,
            });
          }
        });
      }
    );
    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
}

export function securePost(host, path, data, headers) {
  const postData = JSON.stringify(data);
  const safeHeaders = headers || {};
  const useHeaders = {
    ...safeHeaders,
    'Content-Type': safeHeaders['Content-Type'] || 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(postData),
  };
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: host,
        port: 443,
        path: path,
        method: 'POST',
        headers: useHeaders,
      },
      (res) => {
        res.on('data', (d) => {
          if (res.statusCode === 200) {
            resolve({
              data: JSON.parse(d.toString()),
              headers: res.headers,
              response: res,
            });
          } else {
            reject({
              data: JSON.parse(d.toString()),
              headers: res.headers,
              response: res,
            });
          }
        });
      }
    );
    req.on('error', (e) => {
      reject(e);
    });
    req.write(postData);
    req.end();
  });
}
