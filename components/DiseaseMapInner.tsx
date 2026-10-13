"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MapPin, UserMapPin } from "@/lib/types";

const SEV_COLOR: Record<string, string> = {
  Low: "#16a34a", Moderate: "#d97706", High: "#ea580c", Critical: "#dc2626",
};

function userPopupHtml(pin: UserMapPin): string {
  const col = SEV_COLOR[pin.severity] ?? "#16a34a";
  const d = (() => { try { return new Date(pin.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return pin.createdAt; } })();
  const wx = pin.weather ? `
    <div style="margin-top:8px;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;color:#64748b;display:flex;gap:10px;flex-wrap:wrap">
      <span>🌡️ ${pin.weather.temperature}°C</span>
      <span>💧 ${pin.weather.humidity}%</span>
      <span>🌧️ ${pin.weather.precipitation}mm</span>
      <span style="font-weight:600;color:${pin.weather.riskLevel==="High"?"#dc2626":pin.weather.riskLevel==="Moderate"?"#d97706":"#16a34a"}">${pin.weather.riskLevel} spread risk</span>
    </div>` : "";
  const notes = pin.notes ? `<p style="margin-top:6px;font-size:11px;color:#64748b;font-style:italic">${pin.notes}</p>` : "";
  return `<div style="font-family:Inter,system-ui,sans-serif;padding:2px;min-width:190px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-weight:700;color:#0f172a;font-size:13px">${pin.disease}</span>
      <span style="background:${col}18;color:${col};border:1px solid ${col}40;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:600">${pin.severity}</span>
    </div>
    <div style="font-size:11px;color:#475569;margin-bottom:2px">🌾 ${pin.crop}</div>
    <div style="font-size:10px;color:#94a3b8">📅 ${d}</div>
    <div style="font-size:10px;color:#cbd5e1;font-family:monospace">${pin.lat.toFixed(4)}°, ${pin.lng.toFixed(4)}°</div>
    ${wx}${notes}
    <button onclick="window.__agrovision_removePin('${pin.id}')"
      style="margin-top:8px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;width:100%"
      onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
      Remove Report
    </button>
  </div>`;
}

type Props = {
  pins: MapPin[];
  userPins?: UserMapPin[];
  center?: [number, number];
  zoom?: number;
  addMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onRemoveUserPin?: (id: string) => void;
  focusPin?: { lat: number; lng: number } | null;
};

export default function DiseaseMapInner({
  pins, userPins = [], center = [20, 0], zoom = 3, addMode = false,
  onMapClick, onRemoveUserPin, focusPin,
}: Props) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const leafletRef     = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number | null };
    if (container._leaflet_id) container._leaflet_id = null;

    // Use SVG renderer (default) — canvas (preferCanvas:true) crashes with
    // clearRect on undefined when the container is torn down mid-animation frame.
    const map = L.map(container, { zoomControl: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);
    leafletRef.current = map;

    return () => {
      initializedRef.current = false;
      map.stop();
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  const isAlive = () => initializedRef.current && !!leafletRef.current;

  useEffect(() => {
    if (!isAlive()) return;
    const map = leafletRef.current;
    map.eachLayer((layer: any) => { if (layer.__type === "disease") map.removeLayer(layer); });
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:9px;height:9px;background:#ea580c;border:2px solid white;border-radius:50%;box-shadow:0 0 0 1px #ea580c40,0 1px 3px rgba(0,0,0,0.2)"></div>`,
      iconSize: [9,9], iconAnchor: [4,4],
    });
    pins.forEach(pin => {
      if (!isAlive()) return;
      const m = L.marker([pin.lat, pin.lng], { icon })
        .bindPopup(L.popup({ maxWidth: 260, className: "agrovision-popup" }).setContent(`
          <div style="font-family:Inter,system-ui,sans-serif;padding:2px">
            <p style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:4px">${pin.taxon_name}</p>
            ${pin.scientific_name ? `<p style="font-style:italic;color:#475569;font-size:11px;margin-bottom:6px">${pin.scientific_name}</p>` : ""}
            ${pin.photo_url ? `<img src="${pin.photo_url}" style="width:100%;border-radius:6px;margin-bottom:6px" loading="lazy"/>` : ""}
            ${pin.observed_on ? `<p style="color:#64748b;font-size:11px">📅 ${pin.observed_on}</p>` : ""}
            ${pin.place_guess ? `<p style="color:#64748b;font-size:11px">📍 ${pin.place_guess}</p>` : ""}
            ${pin.uri ? `<a href="${pin.uri}" target="_blank" rel="noreferrer" style="color:#16a34a;font-size:11px;margin-top:4px;display:block">View on iNaturalist →</a>` : ""}
          </div>`))
        .addTo(map);
      (m as any).__type = "disease";
    });
  }, [pins]);

  useEffect(() => {
    if (!isAlive()) return;
    const map = leafletRef.current;
    map.eachLayer((layer: any) => { if (layer.__type === "user" || layer.__type === "spread") map.removeLayer(layer); });
    (window as any).__agrovision_removePin = (id: string) => onRemoveUserPin?.(id);
    userPins.forEach(pin => {
      if (!isAlive()) return;
      const col = SEV_COLOR[pin.severity] ?? "#16a34a";
      if (pin.spreadRadiusKm && pin.spreadRadiusKm > 0) {
        const radiusM = pin.spreadRadiusKm * 1000;
        const circle = L.circle([pin.lat, pin.lng], {
          radius: radiusM,
          color: col,
          weight: 1.5,
          dashArray: "6 4",
          opacity: 0.7,
          fillColor: col,
          fillOpacity: 0.07,
        }).bindPopup(
          L.popup({ maxWidth: 240 }).setContent(
            `<div style="font-family:Inter,system-ui,sans-serif;padding:2px">
              <p style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:4px">${pin.disease}</p>
              <p style="font-size:11px;color:#475569;margin-bottom:2px">📡 Estimated spread radius</p>
              <p style="font-size:18px;font-weight:800;color:${col};margin:4px 0">${pin.spreadRadiusKm} km</p>
              <p style="font-size:10px;color:#94a3b8">Scaled from <strong>${pin.severity}</strong> severity · wind-adjusted if weather available.<br/>Not a validated epidemiological forecast.</p>
            </div>`
          )
        ).addTo(map);
        (circle as any).__type = "spread";
      }
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:18px;height:18px">
          <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${col}60;animation:agrovision-ping 1.8s ease-out infinite"></div>
          <div style="position:absolute;inset:0;background:${col};border:2.5px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25)"></div>
        </div>`,
        iconSize: [18,18], iconAnchor: [9,9],
      });
      const m = L.marker([pin.lat, pin.lng], { icon })
        .bindPopup(L.popup({ maxWidth: 280, className: "agrovision-popup" }).setContent(userPopupHtml(pin)), { offset: [0,-8] })
        .addTo(map);
      (m as any).__type = "user";
    });
  }, [userPins, onRemoveUserPin]);

  useEffect(() => {
    if (!isAlive()) return;
    const map = leafletRef.current;
    const fn = (e: any) => { if (addMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng); };
    map.on("click", fn);
    return () => { if (isAlive()) map.off("click", fn); };
  }, [addMode, onMapClick]);

  useEffect(() => {
    if (!isAlive()) return;
    (leafletRef.current.getContainer() as HTMLElement).style.cursor = addMode ? "crosshair" : "";
  }, [addMode]);

  useEffect(() => {
    if (!isAlive() || !focusPin) return;
    leafletRef.current.flyTo([focusPin.lat, focusPin.lng], 12, { duration: 1.2 });
  }, [focusPin]);

  return (
    <>
      <style>{`
        @keyframes agrovision-ping {
          0%   { transform:scale(1);   opacity:0.8; }
          70%  { transform:scale(2.5); opacity:0; }
          100% { transform:scale(2.5); opacity:0; }
        }
      `}</style>
      <div ref={mapRef} className="h-full w-full rounded-xl" />
    </>
  );
}
