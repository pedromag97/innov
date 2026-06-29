// Mapa com pins coloridos por estado.
//
// ABSTRAÇÃO: este componente esconde a biblioteca de mapa (Leaflet hoje).
// Para migrar para Google Maps JS API, reescreve-se SÓ este ficheiro mantendo
// a mesma interface de props:
//   - points:    [{ id, lat, lng, estado, title, subtitle }]
//   - onPointClick(point)
//   - editable:  bool — permite arrastar UM pin (modo edição do WorkForm)
//   - draggablePoint / onDragEnd({lat,lng}) — para definir coordenadas
//   - center, zoom
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { stateColor, stateLabel } from '../states.js';

// Ícone "gota" colorido (divIcon) — cor = estado.
function pinIcon(estado) {
  return L.divIcon({
    className: '',
    html: `<div class="fc-pin" style="background:${stateColor(estado)}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -16],
  });
}

const PT_CENTER = [39.5, -8.0]; // Portugal continental

export default function MapView({
  points = [],
  onPointClick,
  editable = false,
  draggablePoint = null,   // {lat, lng} editável
  onDragEnd,
  center,
  zoom = 7,
  className = '',
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const editMarkerRef = useRef(null);

  // Init do mapa (uma vez).
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true }).setView(center || PT_CENTER, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // Leaflet precisa de recalcular o tamanho após render do contentor.
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // Redesenha os pins read-only quando os pontos mudam.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const latlngs = [];
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue;
      const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.estado) }).addTo(map);
      const html = `<div style="min-width:160px">
          <strong>${escapeHtml(p.title || '')}</strong><br/>
          <span style="color:${stateColor(p.estado)};font-weight:600">${escapeHtml(stateLabel(p.estado))}</span>
          ${p.subtitle ? `<br/><span style="color:#64748b">${escapeHtml(p.subtitle)}</span>` : ''}
        </div>`;
      marker.bindPopup(html);
      if (onPointClick) marker.on('click', () => onPointClick(p));
      markersRef.current.push(marker);
      latlngs.push([p.lat, p.lng]);
    }

    // Ajusta o enquadramento aos pontos (se não estamos em modo edição).
    if (!editable && latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.2), { maxZoom: 14 });
    }
  }, [points, onPointClick, editable]);

  // Pin editável (modo WorkForm).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !editable) return;
    if (editMarkerRef.current) { editMarkerRef.current.remove(); editMarkerRef.current = null; }
    if (draggablePoint && draggablePoint.lat != null) {
      const m = L.marker([draggablePoint.lat, draggablePoint.lng], {
        draggable: true,
        icon: pinIcon('PENDENTE'),
      }).addTo(map);
      m.on('dragend', () => {
        const ll = m.getLatLng();
        onDragEnd && onDragEnd({ lat: ll.lat, lng: ll.lng });
      });
      editMarkerRef.current = m;
      map.setView([draggablePoint.lat, draggablePoint.lng], Math.max(map.getZoom(), 13));
    }
    // Clicar no mapa coloca/define o pin.
    const onClick = (e) => onDragEnd && onDragEnd({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [editable, draggablePoint, onDragEnd]);

  return <div ref={elRef} className={className} style={{ width: '100%', height: '100%' }} />;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
