import axios from 'axios';

export const makeClient = (token: string) =>
  axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
