import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/VT/api';

const api = axios.create({ baseURL: BASE_URL });

// ── PCB ──────────────────────────────────────────────────────────────────────
export const pcbApi = {
  getAll:       (filters = {}) => api.get('/pcb/', { params: filters }),
  create:       (data)         => api.post('/pcb/creation', data),
  bulkCreate:   (pcbs)         => api.post('/pcb/bulkCreation', { pcbs }),
  markFaulty:   (pcb_id)       => api.post('/pcb/faulty', null, { params: { pcb_id } }),
  getVINByPCB:  (pcb_id)       => api.get('/pcb/vin', { params: { pcb_id } }),
};

// ── Vehicle ───────────────────────────────────────────────────────────────────
export const vehicleApi = {
  getAll:      ()              => api.get('/vehicle'),
  getByVIN:    (vin)           => api.get('/vehicle', { params: { vin } }),
  attach:      (pcb_id, VIN)   => api.post('/vehicle/attach', { pcb_id, VIN }),
  detach:      (pcb_id, VIN)   => api.post('/vehicle/detach', { pcb_id, VIN }),
  swap:        (current_pcb_id, new_pcb_id, VIN) =>
                                  api.post('/vehicle/swap', { current_pcb_id, new_pcb_id, VIN }),
  bulkAttach:  (mappings)      => api.post('/vehicle/bulkAttach', { mappings }),
};

export default api;
