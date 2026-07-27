import { useEffect, useRef, useState } from "react";

// Server-only secret this is NOT — VITE_GOOGLE_MAPS_API_KEY is domain- and
// API-restricted (see .env.example), meant to be public, same as
// VITE_TURNSTILE_SITE_KEY.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Beirut — sensible default center/zoom before a place is picked.
const DEFAULT_CENTER = { lat: 33.8938, lng: 35.5018 };
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 16;

export type LocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
};

export function isLocationSelected(value: LocationValue): boolean {
  return value.lat !== null && value.lng !== null && !!value.mapsUrl;
}

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

let scriptPromise: Promise<void> | null = null;

// Loads the base Maps JS API script once, with the exact libraries this
// component needs declared upfront via the classic `libraries=` URL param —
// deliberately not the newer `importLibrary` pattern, whose readiness
// `script.onload` does NOT reliably signal (the script can still be
// finishing internal async setup after `onload` fires). The `callback=` URL
// param is the one signal Google's own script guarantees fires only once
// everything named in `libraries=` is actually ready to use.
// https://developers.google.com/maps/documentation/javascript/load-maps-js-api
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // @types/google.maps declares `google` as an always-present ambient
  // global, so it can't itself express "the script hasn't loaded yet" —
  // this cast is only to check that pre-load state honestly.
  if ((window as { google?: typeof google }).google?.maps?.Map) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const callbackName = "__locationPickerGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[callbackName] = () => resolve();

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "places",
      callback: callbackName,
      loading: "async",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("The Google Maps JavaScript API could not load."));
    document.head.append(script);
  });

  return scriptPromise;
}

type LocationPickerProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
};

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Mirrors `value` for use inside Maps event listeners set up once at mount
  // — those closures would otherwise only ever see the initial empty value.
  const valueRef = useRef(value);
  valueRef.current = value;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
        if (cancelled || !mapContainerRef.current || !autocompleteContainerRef.current) return;

        const { Map, Marker, Geocoder } = google.maps;
        const { PlaceAutocompleteElement } = google.maps.places;

        // Deliberately the legacy Marker, not the newer AdvancedMarkerElement:
        // AdvancedMarkerElement requires a `mapId` and vector rendering, and
        // in testing the map's rendering type got stuck at "UNINITIALIZED"
        // with that combination — it displayed a static-looking tile with
        // zero interactivity (no click/drag events ever reached it, silently
        // — no console error). Marker has no such requirement and works on
        // the standard raster renderer this map otherwise uses.
        const map = new Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        geocoderRef.current = new Geocoder();

        function reverseGeocode(lat: number, lng: number) {
          geocoderRef.current?.geocode({ location: { lat, lng } }, (results, geocodeStatus) => {
            if (geocodeStatus !== "OK" || !results?.[0]) {
              console.warn("[location-picker] reverse geocoding failed:", geocodeStatus);
              return;
            }
            onChangeRef.current({
              ...valueRef.current,
              address: results[0].formatted_address,
            });
          });
        }

        function placeMarker(position: google.maps.LatLngLiteral) {
          if (markerRef.current) {
            markerRef.current.setPosition(position);
          } else {
            const marker = new Marker({ map, position, draggable: true });
            marker.addListener("dragend", () => {
              const pos = marker.getPosition();
              if (!pos) return;
              const lat = pos.lat();
              const lng = pos.lng();
              onChangeRef.current({ ...valueRef.current, lat, lng, mapsUrl: buildMapsUrl(lat, lng) });
              reverseGeocode(lat, lng);
            });
            markerRef.current = marker;
          }
        }

        // Click anywhere on the map as a fallback way to place/move the pin,
        // in addition to dragging it. Both paths reverse-geocode the new
        // position into a real address (Geocoding API — must be enabled on
        // the same Google Cloud project as Maps JavaScript API / Places).
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          placeMarker({ lat, lng });
          onChangeRef.current({ ...valueRef.current, lat, lng, mapsUrl: buildMapsUrl(lat, lng) });
          reverseGeocode(lat, lng);
        });

        const autocomplete = new PlaceAutocompleteElement();
        autocompleteContainerRef.current.appendChild(autocomplete);
        autocomplete.addEventListener("gmp-select", async (event: any) => {
          const place = event.placePrediction.toPlace();
          await place.fetchFields({ fields: ["formattedAddress", "location"] });
          if (!place.location) return;
          const lat = place.location.lat();
          const lng = place.location.lng();
          map.setCenter({ lat, lng });
          map.setZoom(SELECTED_ZOOM);
          placeMarker({ lat, lng });
          onChangeRef.current({
            address: place.formattedAddress ?? "",
            lat,
            lng,
            mapsUrl: buildMapsUrl(lat, lng),
          });
        });

        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error("[location-picker] failed to load Google Maps:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
        Could not load the location picker. Please reload the page and try again.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={autocompleteContainerRef}
        className="w-full overflow-hidden rounded-xl border border-stroke bg-surface [&_gmp-place-autocomplete]:w-full"
      />
      <div
        ref={mapContainerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-stroke"
      />
      {status === "loading" && <p className="text-xs text-muted">Loading map…</p>}
      {value.address && (
        <p className="text-xs text-muted">
          Selected: {value.address}
          {!isLocationSelected(value) && " — drag the pin or search again to set an exact spot."}
        </p>
      )}
    </div>
  );
}
