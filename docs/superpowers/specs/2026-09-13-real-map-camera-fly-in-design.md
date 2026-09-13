# Real Map Camera Fly-in Design

## Goal

Replace the home page's image-based zoom imitation with one real, coordinate-based MapLibre map whose camera flies continuously from a Korea overview to the existing destination coordinate.

## Current State

`components/site/FigmaHomeScene.mjs` already mounts a MapLibre map, but `lib/home-map-camera.mjs` supplies two local PNG image sources (`home-map-image` and `home-house-detail`) as raster layers. The visual result is therefore an enlarged static image rather than a map that gains geographic detail. The custom wheel handler calls `flyTo`, but it is flying over those image layers instead of real map data.

## Design

### 1. Single real map space

Use MapLibre GL JS with an OSM raster tile source at `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. The style contains one raster map layer plus a background layer; no local PNG/SVG map sources, stage-specific image sources, or image overlays are present. MapLibre's tile source supplies roads, land, water, and building detail from the same geographic space at every zoom.

The map uses `projection: { type: 'globe' }` where supported by the installed MapLibre version. A grayscale raster paint (`raster-saturation: -1`) with restrained contrast/brightness preserves the site's monochrome visual identity without changing the underlying geographic data.

### 2. Camera path

Keep the destination already defined by `HOME_MAP_TARGET.center` (`[126.978, 37.5665]`) and use `HOME_MAP_CAMERA` as the Korea overview (`[127.5, 36.3]`, zoom `6`). The initial map is created at the overview. User wheel input is handled only when the pointer is over the map; built-in scroll zoom remains disabled so each gesture can call:

```js
map.flyTo({
  center: targetCenterAtZoom,
  zoom: nextZoom,
  duration: 720,
  curve: 1.2,
  speed: 0.8,
  essential: true,
})
```

`targetCenterAtZoom` is an eased interpolation between the overview and destination coordinates. The interpolation is monotonic and ease-out only: the camera approaches quickly at first and decelerates near the destination without bounce, overshoot, snapping, or camera resets. A single `flyTo` animation changes center and zoom together.

### 3. Geographic overlays

The existing invisible house click target remains a MapLibre `Marker` at the destination coordinate so it moves with the map. No CSS transform is applied to map content or overlays. If a visible marker/ring is required later, it must be added as a GeoJSON source/layer with longitude/latitude coordinates so MapLibre projects it with the camera.

### 4. Failure handling

The map container reports `loading`, `ready`, or `error` through its existing data attribute. Tile/network errors leave the camera controls disabled by the existing error state rather than substituting a local image. Attribution remains visible for OSM data.

## Files

- Modify `lib/home-map-camera.mjs`: remove local image source definitions and export the real tile-backed style plus camera constants/options.
- Modify `components/site/FigmaHomeScene.mjs`: retain the MapLibre lifecycle and map-only wheel handling, and remove any assumptions about image layers.
- Modify `app/globals.css`: keep the existing map container sizing/interaction rules and remove image-specific styling only if present.
- Modify `tests/home-map-engine.test.mjs`: assert a raster tile URL, globe projection, grayscale paint, real `flyTo` options, and the absence of local image sources, CSS scale, crossfade, or stage-specific layers.

## Verification

Run `npm test`, `npm run build`, `npm run verify:static`, and `git diff --check`. In the local browser, confirm the map canvas loads, wheel input over the map changes both `data-map-zoom` and `data-map-camera-center` continuously toward `[126.978, 37.5665]`, wheel input outside the map does not change the camera, and the final view shows the same map's local roads/buildings without a layer swap or opacity transition.
