import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Lista de países ativos (geridos em Definições). Usado nos filtros/dropdowns.
export function useCountries() {
  const [countries, setCountries] = useState([]);
  useEffect(() => { api.listCountries().then((d) => setCountries(d.countries)).catch(() => {}); }, []);
  return countries;
}
