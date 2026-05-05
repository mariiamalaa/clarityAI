import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message ||
      'Something went wrong';

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', { detail: { message } }));
    }

    return Promise.reject(new Error(message));
  }
);

export default client;
