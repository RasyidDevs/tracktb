import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import type { RegionRecord } from '../types';

export interface ThreeOverlayController {
  layer: maplibregl.CustomLayerInterface;
  setSelection: (
    region: RegionRecord | null,
    highlightedNeighborCode: string | null,
    heightByCode?: Record<string, number>,
  ) => void;
  setReducedMotion: (reduced: boolean) => void;
}

const ORIGIN_LNG = 101.4;
const ORIGIN_LAT = -0.4;

function buildArcPoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  peakHeight: number,
  segments = 36,
): THREE.Vector3[] {
  const mid = new THREE.Vector3(
    (start.x + end.x) * 0.5,
    (start.y + end.y) * 0.5,
    Math.max(start.z, end.z) + peakHeight,
  );
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(segments);
}

/**
 * Custom WebGL layer Three.js di ruang Mercator 3D MapLibre:
 * - Beacon vertikal emerald & cincin halo tepat di atas atap poligon terpilih
 * - Busur parabolik 3D (TubeGeometry) dari atap wilayah terpilih ke atap maksimal 5 tetangga
 * - Partikel cahaya bergerak sepanjang busur (menghormati prefers-reduced-motion)
 */
export function createThreeOverlayController(): ThreeOverlayController {
  let mapRef: maplibregl.Map | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let rootGroup: THREE.Group | null = null;

  let activeRegion: RegionRecord | null = null;
  let activeHighlightNeighbor: string | null = null;
  let activeHeightByCode: Record<string, number> = {};
  let reducedMotion = false;

  const originMerc = maplibregl.MercatorCoordinate.fromLngLat([ORIGIN_LNG, ORIGIN_LAT], 0);
  const meterScale = originMerc.meterInMercatorCoordinateUnits();

  interface AnimatedPulse {
    mesh: THREE.Mesh;
    curve: THREE.QuadraticBezierCurve3;
    speed: number;
    phase: number;
  }

  let pulses: AnimatedPulse[] = [];
  let haloRing: THREE.Mesh | null = null;
  const startTime = performance.now();

  function toLocalCoords(lngLat: [number, number], metersZ: number): THREE.Vector3 {
    const mc = maplibregl.MercatorCoordinate.fromLngLat(lngLat, metersZ);
    return new THREE.Vector3(
      (mc.x - originMerc.x) / meterScale,
      -(mc.y - originMerc.y) / meterScale,
      (mc.z - originMerc.z) / meterScale,
    );
  }

  function clearGroup() {
    if (!rootGroup) return;
    while (rootGroup.children.length > 0) {
      const child = rootGroup.children[0];
      rootGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    pulses = [];
    haloRing = null;
  }

  function rebuildScene() {
    if (!rootGroup) return;
    clearGroup();
    if (!activeRegion) return;

    const selectedTopZ = (activeHeightByCode[activeRegion.kodeBps] ?? 8_000) + 800;
    const beaconHeight = 24_000;
    const centerPos = toLocalCoords(activeRegion.centroid, selectedTopZ);

    // 1. Vertical tapered emerald beacon column resting cleanly on roof
    const columnGeo = new THREE.CylinderGeometry(650, 1_500, beaconHeight, 24, 1, true);
    columnGeo.rotateX(Math.PI / 2);
    const columnMat = new THREE.MeshBasicMaterial({
      color: 0x117a66,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const columnMesh = new THREE.Mesh(columnGeo, columnMat);
    columnMesh.position.set(centerPos.x, centerPos.y, centerPos.z + beaconHeight * 0.5);
    rootGroup.add(columnMesh);

    // Core slender spire + small top tip
    const coreGeo = new THREE.CylinderGeometry(320, 520, beaconHeight * 0.92, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x2e9e6b,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(centerPos.x, centerPos.y, centerPos.z + beaconHeight * 0.46);
    rootGroup.add(coreMesh);

    const tipGeo = new THREE.SphereGeometry(850, 14, 14);
    const tipMat = new THREE.MeshBasicMaterial({
      color: 0x0a4a3e,
      transparent: true,
      opacity: 0.95,
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.set(centerPos.x, centerPos.y, centerPos.z + beaconHeight * 0.92);
    rootGroup.add(tipMesh);

    // 2. Floating horizontal halo ring just above roof
    const ringGeo = new THREE.RingGeometry(3_200, 4_500, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x117a66,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    haloRing = new THREE.Mesh(ringGeo, ringMat);
    const haloPos = toLocalCoords(activeRegion.centroid, selectedTopZ + 400);
    haloRing.position.copy(haloPos);
    rootGroup.add(haloRing);

    // 3. Parabolic 3D neighbor arcs from selected roof to each neighbor roof
    const startPt = toLocalCoords(activeRegion.centroid, selectedTopZ + 600);
    activeRegion.neighbors.forEach((nb, index) => {
      const neighborTopZ = (activeHeightByCode[nb.kodeBps] ?? 8_000) + 1_000;
      const endPt = toLocalCoords(nb.centroid, neighborTopZ);
      const dist = startPt.distanceTo(endPt);
      const peakOffset = Math.min(44_000, Math.max(12_000, dist * 0.26));
      const mid = new THREE.Vector3(
        (startPt.x + endPt.x) * 0.5,
        (startPt.y + endPt.y) * 0.5,
        Math.max(startPt.z, endPt.z) + peakOffset,
      );
      const curve = new THREE.QuadraticBezierCurve3(startPt, mid, endPt);
      const isHighlighted = activeHighlightNeighbor === nb.kodeBps;
      const isPositive = nb.shapPp >= 0;
      const arcColor = isHighlighted ? 0x0a4a3e : isPositive ? 0x226d72 : 0xb45441;

      const tubeGeo = new THREE.TubeGeometry(
        curve,
        40,
        isHighlighted ? 1_000 : 580,
        10,
        false,
      );
      const tubeMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        transparent: true,
        opacity: isHighlighted ? 0.94 : 0.78,
      });
      rootGroup!.add(new THREE.Mesh(tubeGeo, tubeMat));

      // End node marker sphere cleanly resting above neighbor roof
      const nodeGeo = new THREE.SphereGeometry(isHighlighted ? 1_850 : 1_250, 14, 14);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: arcColor,
        transparent: true,
        opacity: 0.94,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(endPt);
      rootGroup!.add(nodeMesh);

      // Moving pulse sphere along the 3D arc
      const pulseGeo = new THREE.SphereGeometry(isHighlighted ? 1_400 : 920, 12, 12);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.96,
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      const midPt = buildArcPoints(startPt, endPt, peakOffset, 4)[2];
      pulseMesh.position.copy(midPt);
      rootGroup!.add(pulseMesh);

      pulses.push({
        mesh: pulseMesh,
        curve,
        speed: 0.24 + index * 0.04,
        phase: index * 0.21,
      });
    });

    mapRef?.triggerRepaint();
  }

  const layer: maplibregl.CustomLayerInterface = {
    id: 'tracktb-three-spatial-layer',
    type: 'custom',
    renderingMode: '3d',

    onAdd(map, gl) {
      mapRef = map;
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      rootGroup = new THREE.Group();
      scene.add(rootGroup);

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
      rebuildScene();
    },

    render(_gl, options) {
      if (!renderer || !scene || !camera) return;

      const rawMatrix =
        (options as unknown as { defaultProjectionData?: { mainMatrix?: number[] | Float32Array } })
          ?.defaultProjectionData?.mainMatrix ?? (options as unknown as number[] | Float32Array);

      if (!rawMatrix) return;

      const worldScale = new THREE.Matrix4().makeScale(meterScale, -meterScale, meterScale);
      const worldTranslate = new THREE.Matrix4().makeTranslation(
        originMerc.x,
        originMerc.y,
        originMerc.z,
      );
      const l = worldTranslate.multiply(worldScale);
      const m = new THREE.Matrix4().fromArray(Array.from(rawMatrix));
      camera.projectionMatrix = m.multiply(l);

      const elapsedSec = (performance.now() - startTime) * 0.001;
      if (!reducedMotion && pulses.length > 0) {
        for (const p of pulses) {
          const t = (elapsedSec * p.speed + p.phase) % 1;
          p.curve.getPoint(t, p.mesh.position);
        }
        if (haloRing) {
          const s = 1 + 0.14 * Math.sin(elapsedSec * 2.4);
          haloRing.scale.set(s, s, 1);
        }
      }

      renderer.resetState();
      renderer.render(scene, camera);

      if (!reducedMotion && activeRegion) {
        mapRef?.triggerRepaint();
      }
    },

    onRemove() {
      clearGroup();
      renderer?.dispose();
      renderer = null;
      scene = null;
      camera = null;
      rootGroup = null;
      mapRef = null;
    },
  };

  return {
    layer,
    setSelection(region, highlightedNeighborCode, heightByCode) {
      activeRegion = region;
      activeHighlightNeighbor = highlightedNeighborCode;
      if (heightByCode) {
        activeHeightByCode = heightByCode;
      }
      rebuildScene();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      mapRef?.triggerRepaint();
    },
  };
}
