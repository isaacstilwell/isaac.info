import * as THREE from "three";
import { rebuildChunkGeometry } from "./TerrainChunkUtils";
import QuadtreeTerrainCube from "./QuadtreeTerrainCube";
import Config from "./asteroidConfig";
import constants from "./constants";

// -=-=-=-=-=-=-=-=-=-=-ASTEROID SETUP-=-=-=-=-=-=-=-=-=-=-ASTEROID SETUP-=-=-=-=-=-=-=-=-=-=-ASTEROID SETUP-=-=-=-=-=-=-=-=-=-=-ASTEROID SETUP-=-=-=-=-=-=-=-=-=-=-

let cache = {
  asteroid: {},
  asteroids: {},
  planets: {},
};

const rebuildTerrainGeometry = function (chunk) {
  chunk.offset = new THREE.Vector3(
    chunk.offset[0],
    chunk.offset[1],
    chunk.offset[2],
  );
  chunk.stretch = new THREE.Vector3(
    chunk.stretch[0],
    chunk.stretch[1],
    chunk.stretch[2],
  );
  const { positions, normals } = rebuildChunkGeometry(chunk);
  return { positions, normals };
};

const workerPool = {
  processInBackground: (message, callback) => {
    // console.log(`fake processing in bg: ${JSON.stringify(message)}`);
    if (message.asteroid) cache.asteroid = message.asteroid;
    const result = rebuildTerrainGeometry({
      ...cache.asteroid,
      ...message.chunk,
    });
    callback(result);
  },
  broadcast: () => {}, // No-op
  cancelBackgroundProcesses: () => {}, // No-op
};

// -=-=-=-=-=-=-=-=-=-=-METHODS-=-=-=-=-=-=-=-=-=-=-METHODS-=-=-=-=-=-=-=-=-=-=-METHODS-=-=-=-=-=-=-=-=-=-=-METHODS-=-=-=-=-=-=-=-=-=-=-

export const getPointAsteroid = async (id, res) => {
  console.log(`${id}`);
  const asteroidConfig = await Config.create(id);
  console.log(asteroidConfig.radius);
  const QTC = new QuadtreeTerrainCube(
    id,
    asteroidConfig,
    res,
    workerPool,
    {},
    true,
  );
  const asteroidGroup = new THREE.Group();
  QTC.groups.forEach((g) => asteroidGroup.add(g));
  asteroidGroup.position.set(0, 0, 0);
  QTC.setCameraPosition(constants.AU);

  const waitUntilReady = (whenReady) => {
    if (QTC.builder.isUpdating()) {
      if (QTC.builder.isWaitingOnMaps()) {
        QTC.builder.updateMaps();
      } else {
        QTC.builder.update();
        return whenReady();
      }
    } else {
      QTC.processNextQueuedChange();
    }
    setTimeout(waitUntilReady, 50, whenReady);
  };

  await new Promise(waitUntilReady);

  return asteroidGroup;
};

export const getRings = (
  radius,
  radiusStep,
  stepVelocity,
  maxRadius,
  ringConfig,
  replacementPoints,
  planetGroup,
) => {
  while (radius < maxRadius) {
    const reversalPull = -stepVelocity * ringConfig.oscillationBias;
    const randomChange = (Math.random() - 0.5) * ringConfig.baseVariance;

    const stepChange =
      stepVelocity * ringConfig.momentumFactor + reversalPull + randomChange;

    stepVelocity = stepChange;
    radiusStep += stepChange;

    radiusStep = Math.max(
      ringConfig.minStep,
      Math.min(ringConfig.maxStep, radiusStep),
    );

    if (
      radiusStep === ringConfig.minStep ||
      radiusStep === ringConfig.maxStep
    ) {
      stepVelocity *= -0.5;
    }

    const density = 1.0 + (radius - 550) * 0.02;
    const pointCount = Math.floor(ringConfig.baseDensity * density);

    const positions = new Float32Array(pointCount * 3);

    const replacementPoint = Math.floor(Math.random() * pointCount);

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      const radialNoise = (Math.random() - 0.5) * 3.0;
      const effectiveRadius = radius + radialNoise;

      if (i == replacementPoint) {
        const loc = [
          Math.cos(angle) * effectiveRadius,
          Math.sin(angle) * effectiveRadius,
          (Math.random() - 0.5) * 2.5 * Math.exp(-Math.abs(radialNoise) * 5),
        ];
        replacementPoints.push(loc);
        continue;
      }

      positions[i * 3] = Math.cos(angle) * effectiveRadius;
      positions[i * 3 + 1] = Math.sin(angle) * effectiveRadius;
      positions[i * 3 + 2] =
        (Math.random() - 0.5) * 2.5 * Math.exp(-Math.abs(radialNoise) * 5);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x515c63,
      size: 1,
    });

    const points = new THREE.Points(geometry, material);
    planetGroup.add(points);

    radius += radiusStep;
  }
};

export const getPlanet = (planetHeight, planetRadius, planetRingRadius, planetGroup) => {
  while (planetHeight <= planetRadius) {
    const pointCount = Math.floor(planetRingRadius / 5);
    const positions = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;

      positions[i * 3] = Math.cos(angle) * planetRingRadius;
      positions[i * 3 + 1] = Math.sin(angle) * planetRingRadius;
      positions[i * 3 + 2] = planetHeight;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x515c63,
      size: 2.5,
    });

    const points = new THREE.Points(geometry, material);
    planetGroup.add(points);

    planetHeight += 5;
    planetRingRadius = Math.sqrt(planetRadius ** 2 - planetHeight ** 2);
  }

  const planetSphere = new THREE.SphereGeometry(planetRadius - 1);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
  });
  const planetSphereMesh = new THREE.Mesh(planetSphere, sphereMat);
  planetGroup.add(planetSphereMesh);
};
