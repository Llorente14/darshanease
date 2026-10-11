import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker images break when bundled by Vite, so the icon is built explicitly
const templeIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function TempleMap({ latitude, longitude, name }) {
  const position = [latitude, longitude];
  return (
    <MapContainer
      // Remount when the coordinates change so the map centers on the new temple
      key={`${latitude},${longitude}`}
      center={position}
      zoom={14}
      scrollWheelZoom={false}
      // MapContainer needs an explicit height, so it is set inline
      style={{ height: 220, width: "100%", borderRadius: 9 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={templeIcon}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}
