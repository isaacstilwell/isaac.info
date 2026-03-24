import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  // DoubleSide,
  Float32BufferAttribute,
  LessDepth,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  Points,
  NearestFilter,
  RGBADepthPacking,
  Vector2
} from 'three';

import constants from './constants';
import {
  applyDisplacementToGeometry,
  getCachedGeometryAttributes,
  transformStretch
} from './TerrainChunkUtils';

const { SHADOWLESS_NORMAL_SCALE } = constants;

// TODO: remove debug
// let first = true;
// let taskTotal = 0;
// let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg execution time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
//   first = true;
// }, 5000);

class TerrainChunk {
  constructor(params, config, { materialOverrides, shadowsEnabled, resolution }, renderAsPoints) {
    this._params = params;
    this._config = config;
    this._materialOverrides = materialOverrides;
    this._shadowsEnabled = false;
    this._resolution = resolution;
    this._renderAsPoints = renderAsPoints;
    this.updateDerived();

    // init geometry
    this._geometry = new BufferGeometry();
    this.initGeometry();

    if (this._renderAsPoints) {
      this._pointsGeometry = new BufferGeometry();
      const attr = getCachedGeometryAttributes(this._resolution);
      this._pointsGeometry.setIndex(new BufferAttribute(attr.indices, 1));
      this._pointsGeometry.setAttribute('uv', new Float32BufferAttribute(attr.uvs, 2));
      this._pointsGeometry.attributes.uv.needsUpdate = true;
    }

    const extraMaterialProps = {};
    if (!shadowsEnabled) {
      extraMaterialProps.normalScale = new Vector2(SHADOWLESS_NORMAL_SCALE, SHADOWLESS_NORMAL_SCALE);
    } else {
      extraMaterialProps.alphaTest = 2;
    }

    const materialProps = {
      color: 0xffffff,
      depthFunc: LessDepth,
      displacementBias: -1 * (this._config.radius * 1.005) * this._config.dispWeight,
      displacementScale: 2 * (this._config.radius * 0.995) * this._config.dispWeight,
      dithering: true,
      metalness: 0,
      roughness: 1,
      wireframe: true,
      ...extraMaterialProps
    };

    if (this._renderAsPoints) {
      // Force the mesh material to be flat black as an occluder
      materialProps.color = 0x000000;
      materialProps.emissive = 0x000000;
      materialProps.wireframe = false;
    } else if (this._materialOverrides) {
      Object.keys(this._materialOverrides).forEach((k) => materialProps[k] = this._materialOverrides[k]);
    }

    this._material = new MeshStandardMaterial(materialProps);

    // Always create the mesh
    this._plane = new Mesh(this._geometry, this._material);

    // If points mode, also create the points object on top
    if (this._renderAsPoints) {
      const pointsMaterialProps = {
        color: 0x515c63,
        size: 0.02,
        sizeAttenuation: true,
        depthFunc: LessDepth,
      };
      if (this._materialOverrides) {
        const validPointsProps = ['color', 'map', 'size', 'sizeAttenuation', 'alphaMap', 'fog', 'transparent', 'opacity', 'depthFunc', 'depthTest', 'depthWrite'];
        Object.keys(this._materialOverrides).forEach((k) => {
          if (validPointsProps.includes(k)) pointsMaterialProps[k] = this._materialOverrides[k];
        });
      }
      this._pointsMaterial = new PointsMaterial(pointsMaterialProps);
      this._points = new Points(this._pointsGeometry, this._pointsMaterial);
    }

    // add customDepthMaterial
    if (shadowsEnabled) {
      this._plane.castShadow = true;
      this._plane.receiveShadow = true;

      // TODO: this looks better without depthPacking, but might be because not visible at all
      this._plane.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
    }

    // add onBeforeCompile's
    this.applyOnBeforeCompile();
  }

  getOnBeforeCompile(material, radius, stretch, updateVNormal = true) {
    return function (shader) {
      shader.uniforms.uRadius = { type: 'f', value: radius };
      shader.uniforms.uStretch = { type: 'v3', value: stretch };
      shader.vertexShader = `
        uniform float uRadius;
        uniform vec3 uStretch;
        ${shader.vertexShader.replace(
          '#include <displacementmap_vertex>',
          `#ifdef USE_DISPLACEMENTMAP
            vec2 disp16 = texture2D(displacementMap, vDisplacementMapUv).xy;
            float disp = (disp16.x * 255.0 + disp16.y) / 256.0;
            // set height along normal (which is set to spherical position)
            transformed = normalize(objectNormal) * (uRadius + disp * displacementScale + displacementBias);
            // stretch according to config
            transformed *= uStretch;
            // re-init pre-normalmap normal to match stretched position (b/f application of normalmap)
            ${updateVNormal ? 'vNormal = normalize( normalMatrix * vec3(transformed.xyz) );' : ''}
          #endif`
        )}
      `;
      material.userData.shader = shader;

      if (shader.fragmentShader.includes('ERROR') || shader.vertexShader.includes('ERROR')) {
        console.error('Shader compilation error detected');
      }
    };
  }

  applyOnBeforeCompile() {
    this._material.onBeforeCompile = this.getOnBeforeCompile(
      this._material,
      this._config.radius,
      this._stretch
    );
    if (this._plane.customDepthMaterial) {
      this._plane.customDepthMaterial.onBeforeCompile = this.getOnBeforeCompile(
        this._plane.customDepthMaterial,
        this._config.radius,
        this._stretch,
        false
      );
    }
  }

  // it's possible in a race-condition that a chunk is constructed but never rendered
  // and is thus somehow compiled without onBeforeCompile ever running... these chunks
  // are not reusable and should be disposed
  isReusable() {
    // PointsMaterial doesn't use custom shaders, so always reusable
    if (this._renderAsPoints) return true;

    return !!this._material?.userData?.shader
      && (!this._shadowsEnabled || !!this._plane?.customDepthMaterial?.userData?.shader);
  }

  // NOTE: if limit resource pooling to by side, these updates aren't necessary BUT uniforms
  //  are sent either way, so it probably doesn't matter
  updateDerived() {
    this._stretch = transformStretch(this._config.stretch, this._params.side);

    // PointsMaterial doesn't use custom shaders with uniforms
    if (this._renderAsPoints) return;

    // according to https://threejs.org/docs/#manual/en/introduction/How-to-update-things,
    // uniform values are sent to shader every frame automatically (so no need for needsUpdate)
    if (this._material?.userData?.shader) {
      this._material.userData.shader.uniforms.uRadius.value = this._config.radius;
      this._material.userData.shader.uniforms.uStretch.value = this._stretch;
    }
    if (this._plane?.customDepthMaterial?.userData?.shader) {
      this._plane.customDepthMaterial.userData.shader.uniforms.uRadius.value = this._config.radius;
      this._plane.customDepthMaterial.userData.shader.uniforms.uStretch.value = this._stretch;
    }
  }

  reconfigure(newParams) {
    this._params = newParams;
    this.updateDerived();
  }

  attachToGroup() {
    this._params.group.add(this._plane);
    if (this._points) this._params.group.add(this._points);
  }

  detachFromGroup() {
    this._params.group.remove(this._plane);
    if (this._points) this._params.group.remove(this._points);
  }

  dispose() {
    this.detachFromGroup();
    this._geometry.dispose();
    if (this._plane.customDepthMaterial) this._plane.customDepthMaterial.dispose();
    if (this._material.displacementMap) this._material.displacementMap.dispose();
    if (this._material.emissiveMap) this._material.emissiveMap.dispose();
    if (this._material.map) this._material.map.dispose();
    if (this._material.normalMap) this._material.normalMap.dispose();
    this._material.dispose();
    if (this._pointsMaterial) {
      if (this._pointsMaterial.map) this._pointsMaterial.map.dispose();
      this._pointsMaterial.dispose();
    }
    if (this._pointsGeometry) this._pointsGeometry.dispose();
  }

  hide() {
    this._plane.visible = false;
  }

  show() {
    if (!this._plane.visible) {
      this._plane.visible = true;
    }
  }

  initGeometry() {
    // update geometry
    const attr = getCachedGeometryAttributes(this._resolution);
    this._geometry.setIndex(new BufferAttribute(attr.indices, 1));
    this._geometry.setAttribute('uv', new Float32BufferAttribute(attr.uvs, 2));
    this._geometry.attributes.uv.needsUpdate = true;
  }

  updateGeometry(positions, normals) {
    this._geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this._geometry.attributes.normal.needsUpdate = true;
    this._geometry.computeBoundingSphere();

    if (this._pointsGeometry) {
      this._pointsGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      this._pointsGeometry.attributes.position.needsUpdate = true;
      this._pointsGeometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      this._pointsGeometry.attributes.normal.needsUpdate = true;
      this._pointsGeometry.computeBoundingSphere();
    }
  }

  updateMaps(data) {
    // (dispose of all previous material maps)
    if (this._material.displacementMap) this._material.displacementMap.dispose();
    if (this._material.emissiveMap) this._material.emissiveMap.dispose();
    if (this._material.map) this._material.map.dispose();
    if (this._material.normalMap) this._material.normalMap.dispose();

    // PointsMaterial only supports color and map, not displacement/normal/emissive
    if (this._renderAsPoints) {
      // Update points color map
      const colorMap = data.colorBitmap.image ? data.colorBitmap : new CanvasTexture(data.colorBitmap);
      this._pointsMaterial.setValues({ map: colorMap, color: 0x515c63 });
      this._pointsMaterial.needsUpdate = true;

      // Apply displacement to geometry CPU-side for the points
      const heightMap = data.heightBitmap.image ? data.heightBitmap : new CanvasTexture(data.heightBitmap, undefined, undefined, undefined, NearestFilter);
      applyDisplacementToGeometry(
        this._pointsGeometry,
        this._resolution,
        this._config.radius,
        this._stretch,
        {
          displacementMap: heightMap,
          displacementBias: -1 * this._config.radius * this._config.dispWeight,
          displacementScale: 2 * this._config.radius * this._config.dispWeight,
        }
      );
      this._geometry.computeBoundingSphere();

      // Also update the occluder mesh maps (displacement handled by shader)
      const materialUpdates = {
        displacementMap: data.heightBitmap.image ? data.heightBitmap : new CanvasTexture(data.heightBitmap, undefined, undefined, undefined, NearestFilter),
        normalMap: data.normalBitmap.image ? data.normalBitmap : new CanvasTexture(data.normalBitmap),
        color: 0x000000,
        emissive: 0x000000,
      };
      this._material.setValues(materialUpdates);
      this._material.needsUpdate = true;

      return;
    }

    // (set new values for MeshStandardMaterial)
    // NOTE: the ternaries below are b/c there is different format for data generated
    //  on offscreen canvas vs normal canvas (i.e. if offscreencanvas not supported)
    const materialUpdates = {
      displacementMap: data.heightBitmap.image ? data.heightBitmap : new CanvasTexture(data.heightBitmap, undefined, undefined, undefined, NearestFilter),
      map: data.colorBitmap.image ? data.colorBitmap : new CanvasTexture(data.colorBitmap),
      normalMap: data.normalBitmap.image ? data.normalBitmap : new CanvasTexture(data.normalBitmap),
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      emissiveMap: null,
    };

    if (this._params.emissiveParams && data.emissiveBitmap) {
      materialUpdates.color = 0x222222; // darker modulation for color map so light doesn't wash out emissivity map
      materialUpdates.emissive = this._params.emissiveParams.color;
      materialUpdates.emissiveMap = data.emissiveBitmap.image ? data.emissiveBitmap : new CanvasTexture(data.emissiveBitmap);
      materialUpdates.emissiveIntensity = 0.05 * (this._params.emissiveParams.intensityMult || 1);
    }
    this._material.setValues({
      ...materialUpdates,
      ...(this._materialOverrides || {})
    });
    this._material.needsUpdate = true;
  }

  makeExportable() {
    // PointsMaterial doesn't support displacement maps
    if (this._renderAsPoints) {
      if (this._material.map) {
        this._material.map.flipY = false;
        this._material.map.needsUpdate = true;
      }
      return;
    }

    applyDisplacementToGeometry(
      this._geometry,
      this._resolution,
      this._config.radius,
      this._stretch,
      {
        displacementMap: this._material.displacementMap,
        displacementBias: this._material.displacementBias,
        displacementScale: this._material.displacementScale,
      }
    );

    // compute accurate normals since displacement now in geometry data
    this._geometry.computeVertexNormals();
    this._geometry.attributes.normal.needsUpdate = true;

    // flip color map, remove displacement and normal maps since now in geometry data
    this._material.map.flipY = false;
    this._material.map.needsUpdate = true;
    this._material.setValues({ displacementMap: null, normalMap: null });
    this._material.needsUpdate = true;
  }
}

export default TerrainChunk;