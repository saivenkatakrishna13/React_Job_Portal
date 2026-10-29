import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Surface transport-level failures as a toast (Part C Phase 7). Server error
// bodies ({success:false, message}) are already shown by each caller; this
// covers the case where there is no response at all — network drops, DNS
// failures, timeouts — which used to fail silently.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Network error — please check your connection and try again.');
    }
    return Promise.reject(error);
  }
);

export default api;
