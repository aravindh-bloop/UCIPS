import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ClusterOut } from '../api/types';
import { categoryStyle, palette, radii, spacing } from '../theme';
import { Text } from './ui';

interface HotspotMapProps {
  hotspots: ClusterOut[];
  onSelectHotspot?: (cluster: ClusterOut) => void;
  height?: number;
}

interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  color: string;
  icon: string;
  label: string;
  ward: string;
  count: number;
  demand: number;
}

/**
 * The map deliberately uses a light basemap even though the rest of the app is dark-luxury
 * themed -- a light map with dark floating UI chrome (zoom control, popups) reads as a
 * standard, legible map (Uber/food-delivery pattern) rather than a stylized dark overlay that
 * fights with real-world satellite/street imagery.
 */
const MAP_BG = '#EAEEF5';
const MAP_TEXT_MUTED = '#64748B';
const MAP_TEXT_FAINT = '#94A3B8';

/**
 * Real map: Leaflet.js over CARTO's light OpenStreetMap basemap, rendered inside a WebView.
 *
 * Chosen after Google Maps' Android SDK proved unusable here: both a normal project key and
 * Google's "Maps Demo Key" returned `Authorization failure / StatusCode=INVALID_ARGUMENT`,
 * because the Android SDK requires a linked billing account regardless of free-tier usage
 * (the demo key only authorizes the *web* Maps JavaScript API). OSM/CARTO tiles need no key
 * and no billing at all, so this path can't break on demo day. See TASKS.md.
 *
 * Markers are Leaflet `divIcon`s so they can reuse the app's own category colors/icons, with
 * a demand-scaled size, a report-count badge, and a pulsing ring on high-demand clusters.
 * Nearby markers collapse into a themed cluster bubble (leaflet.markercluster) so a tight
 * real-world cluster doesn't render as invisible overlapping pins.
 */
function buildHtml(points: MapPoint[]): string {
  // Escaped so a stray "</script>" inside any ward name can't break out of the script tag.
  const dataJson = JSON.stringify(points).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<style>
  .hs-cluster {
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; background: ${palette.primary}; color: ${palette.textInverse};
    border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(15,23,42,0.35);
    font-weight: 800; font-family: -apple-system, Roboto, sans-serif;
  }
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${MAP_BG}; }
  .hs-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
  .hs-ring { position: absolute; border-radius: 999px; animation: hs-pulse 2.4s ease-out infinite; }
  @keyframes hs-pulse {
    0%   { transform: scale(0.65); opacity: 0.5; }
    100% { transform: scale(1.7);  opacity: 0; }
  }
  .hs-pin {
    position: relative; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 2.5px solid #FFFFFF;
    box-shadow: 0 4px 12px rgba(15,23,42,0.35);
  }
  .hs-count {
    position: absolute; top: -5px; right: -5px;
    background: ${palette.primary}; color: ${palette.textInverse};
    border-radius: 9px; min-width: 17px; height: 17px; padding: 0 4px;
    font-size: 10px; font-weight: 800; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid #FFFFFF;
    font-family: -apple-system, Roboto, sans-serif;
  }
  .leaflet-popup-content-wrapper {
    background: #FFFFFF; color: #0F172A;
    border-radius: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.25);
    border: 1px solid #E2E8F0;
  }
  .leaflet-popup-tip { background: #FFFFFF; }
  .leaflet-popup-content { font-family: -apple-system, Roboto, sans-serif; margin: 11px 14px; }
  .leaflet-popup-close-button { color: ${MAP_TEXT_FAINT} !important; }
  .hs-pop-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  .hs-pop-sub { font-size: 11px; color: ${MAP_TEXT_MUTED}; line-height: 1.5; }
  .hs-pop-demand { color: ${palette.primaryDark}; font-weight: 700; }
  .leaflet-control-zoom a {
    background: #FFFFFF !important; color: #0F172A !important;
    border-color: #E2E8F0 !important;
  }
  .leaflet-control-attribution {
    background: rgba(255,255,255,0.75) !important; color: ${MAP_TEXT_MUTED} !important;
    font-size: 9px !important;
  }
  .leaflet-control-attribution a { color: ${MAP_TEXT_MUTED} !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  try {
    if (typeof L === 'undefined') {
      post({ type: 'error', message: 'leaflet-failed' });
    } else {
      var points = ${dataJson};
      var map = L.map('map', { zoomControl: true, attributionControl: true, minZoom: 3, maxZoom: 18 });

      var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      });
      tiles.on('load', function () { post({ type: 'ready' }); });
      tiles.on('tileerror', function () { post({ type: 'error', message: 'tiles-failed' }); });
      tiles.addTo(map);

      if (points.length > 0) {
        var useCluster = typeof L.markerClusterGroup === 'function';
        var clusterGroup = useCluster
          ? L.markerClusterGroup({
              maxClusterRadius: 60,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: false,
              iconCreateFunction: function (cluster) {
                var n = cluster.getChildCount();
                var size = n < 5 ? 38 : n < 10 ? 46 : 54;
                return L.divIcon({
                  html: '<div class="hs-cluster" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.36) + 'px;">' + n + '</div>',
                  className: '',
                  iconSize: [size, size]
                });
              }
            })
          : null;
        var markers = [];
        points.forEach(function (p) {
          var size = 32 + Math.min(1, p.demand / 10) * 18;
          var ring = size + 22;
          var showPulse = p.demand >= 5;
          var html =
            '<div class="hs-wrap" style="width:' + ring + 'px;height:' + ring + 'px;">' +
              (showPulse
                ? '<div class="hs-ring" style="width:' + size + 'px;height:' + size + 'px;background:' + p.color + ';"></div>'
                : '') +
              '<div class="hs-pin" style="width:' + size + 'px;height:' + size + 'px;background:' + p.color +
                ';font-size:' + Math.round(size * 0.44) + 'px;">' + p.icon +
                (p.count > 1 ? '<div class="hs-count">' + p.count + '</div>' : '') +
              '</div>' +
            '</div>';

          var marker = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              html: html,
              className: '',
              iconSize: [ring, ring],
              iconAnchor: [ring / 2, ring / 2],
              popupAnchor: [0, -ring / 2]
            })
          });

          marker.bindPopup(
            '<div class="hs-pop-title">' + p.icon + '&nbsp; ' + p.label + '</div>' +
            '<div class="hs-pop-sub">' + p.ward + '</div>' +
            '<div class="hs-pop-sub">' + p.count + ' report' + (p.count === 1 ? '' : 's') +
              ' &middot; demand <span class="hs-pop-demand">' + p.demand.toFixed(1) + '</span></div>'
          );
          marker.on('click', function () { post({ type: 'select', id: p.id }); });
          markers.push(marker);
          if (clusterGroup) {
            clusterGroup.addLayer(marker);
          } else {
            marker.addTo(map);
          }
        });

        if (clusterGroup) map.addLayer(clusterGroup);

        var group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.35), { maxZoom: 15 });
      } else {
        map.setView([20.5937, 78.9629], 4);
      }
    }
  } catch (e) {
    post({ type: 'error', message: String(e) });
  }
</script>
</body>
</html>`;
}

export function HotspotMap({ hotspots, onSelectHotspot, height }: HotspotMapProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Kept in a ref so the marker-tap handler always resolves against current data
  // without having to rebuild the HTML (which would remount the whole map).
  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;

  const points: MapPoint[] = useMemo(
    () =>
      hotspots.map((h) => {
        const cat = categoryStyle(h.category);
        return {
          id: h.id,
          lat: h.centroid_lat,
          lng: h.centroid_lng,
          color: cat.color,
          icon: cat.icon,
          label: cat.label,
          ward: h.ward_name,
          count: h.complaint_count,
          demand: h.demand_score,
        };
      }),
    [hotspots],
  );

  const html = useMemo(() => buildHtml(points), [points]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type: string; id?: number };
      if (data.type === 'ready') {
        setStatus('ready');
      } else if (data.type === 'error') {
        setStatus('error');
      } else if (data.type === 'select' && data.id != null) {
        const hotspot = hotspotsRef.current.find((h) => h.id === data.id);
        if (hotspot) onSelectHotspot?.(hotspot);
      }
    } catch {
      // Ignore malformed messages from the page.
    }
  }

  return (
    <View style={[styles.container, height ? { height } : null]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={() => setStatus('error')}
        onHttpError={() => setStatus('error')}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />

      {status !== 'ready' ? (
        <Animated.View exiting={FadeOut.duration(300)} style={styles.overlay} pointerEvents="none">
          {status === 'loading' ? (
            <>
              <ActivityIndicator color={palette.primary} />
              <Text variant="caption" color={MAP_TEXT_MUTED} style={styles.overlayText}>
                Loading map…
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.overlayIcon}>🌐</Text>
              <Text variant="bodySm" color={MAP_TEXT_MUTED} style={styles.overlayText}>
                Map needs an internet connection
              </Text>
              <Text variant="caption" color={MAP_TEXT_FAINT} style={styles.overlayText}>
                Switch to List view to see hotspots
              </Text>
            </>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: MAP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  webview: { flex: 1, backgroundColor: MAP_BG },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAP_BG,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  overlayIcon: { fontSize: 30 },
  overlayText: { textAlign: 'center' },
});
