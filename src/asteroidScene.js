import * as THREE from "three";
import { getPlanet, getPointAsteroid, getRings } from "./entities";
import constants from "./constants";


export class AsteroidScene {
    constructor() {
        this._setupScene();
        this._addEntities();
    }

    _getFOV() {
        const w = window.innerWidth;
        if (w >= 1536) return 75;
        if (w >= 1280) return 80;
        if (w >= 1024) return 88;
        return 95;
    }

    _setupScene() {
        console.log("setting up scene");
        const aspect = window.innerWidth / window.innerHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            this._getFOV(),
            aspect,
            0.1,
            constants.AU * 2
        );

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('scene-container').appendChild(this.renderer.domElement);

        this.camera.position.set(250, -1500, 500);
        this.camera.lookAt(0, 0, 0);

        window.addEventListener('resize', () => {
          console.log("resize, state:", this.state);
            this.camera.fov = this._getFOV();
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);

            if (window.innerWidth < 768 && this.state && this.state !== 'IDLE') {
              this.state = 'IDLE';
              if (this.asteroids && this.originalPositions) {
                this.asteroids[this.currentAsteroidIndex].position.copy(this.originalPositions[this.currentAsteroidIndex]);
              }
              if (this._onZoomed) { this._onZoomed(); this._onZoomed = null; }
              this._afterZoomOut = null;
            } else if (this.state === 'ZOOMING_IN' || this.state === 'ZOOMED') {
              const targetWorld = this._getTargetFromDiv(".asteroid-highlight");
              const targetLocal = this.planetGroup.worldToLocal(targetWorld);
              this.targetX = targetLocal.x;
              this.targetY = targetLocal.y;
              this.targetZ = targetLocal.z;

              if (this.state === 'ZOOMED') {
                console.log("repositioning asteroid");
                const ast = this.asteroids[this.currentAsteroidIndex];
                ast.position.set(this.targetX, this.targetY, this.targetZ);
              }
            }
        });
    }

    _addEntities() {
        // initialize ring settings
        console.log("Adding entities");
        let radius = 550;
        let radiusStep = 3;
        let stepVelocity = 0;
        const maxRadius = 800;

        const ringConfig = {
          momentumFactor: 0.5,
          baseVariance: 2.5,
          oscillationBias: 1.5,
          minStep: 1,
          maxStep: 100,
          baseDensity: 100
        };

        // create one group to contain all entities
        this.planetGroup = new THREE.Group();

        // each ring has one point that will potentially be replaced by a real asteroid. coordinates stored in here:
        this.replacementPoints = [];

        // create and add rings to planetGroup
        getRings(
          radius,
          radiusStep,
          stepVelocity,
          maxRadius,
          ringConfig,
          this.replacementPoints,
          this.planetGroup
        );

        // initialize planet config

        let planetRingRadius = 10;
        let planetHeight = -350;
        const planetRadius = 350;

        getPlanet(planetHeight, planetRadius, planetRingRadius, this.planetGroup);
    }

    async addAsteroids() {
        const asteroidIds = [5267, 2209, 9830, 8941, 1407, 3448, 5970, 6244, 5816, 9357];
        const chosenLocations = []
        const chosenIdxs = []

        // from the potential locations for real asteroids,
        // choose until we have enough for all asteroids
        while (chosenLocations.length < asteroidIds.length) {
          let idx = Math.floor(Math.random() * this.replacementPoints.length);

          while (chosenIdxs.includes(idx)) {
            idx = Math.floor(Math.random() * this.replacementPoints.length);
          }

          chosenIdxs.push(idx);

          const loc = this.replacementPoints[idx];
          chosenLocations.push(loc);
        }

        // get the group for each real asteroid
        const asteroidPromises = asteroidIds.map(async (id, idx) => {
          const group = await getPointAsteroid(id, 16);
          const pos = chosenLocations[idx];
          group.position.set(pos[0], pos[1], pos[2]);
          this.planetGroup.add(group);
          return group;
        });

        this.asteroids = await Promise.all(asteroidPromises);

        // finally, add planetGroup to scene
        this.scene.add(this.planetGroup);
    }

    setupAnimation() {
        this.ROTATION_ANGULAR_VELOCITY = 0.05;
        this.IDLE_ROTATION_SPEED = -0.00015;
        this.ZOOM_Z_LERP_SLOW = 0.01;
        this.ZOOM_Z_LERP_FAST = 0.1;
        this.ZOOM_XY_LERP_SLOW = 0.02;
        this.ZOOM_XY_LERP_FAST = 0.05;
        this.ZOOM_SNAP_DIST_CLOSE = 0.05;
        this.ZOOM_SNAP_DIST_FAR = 50;
        this.ZOOM_UNHIDE_DIST = 1;

        this.zoomingIn = false;
        this.targetX, this.targetY, this.targetZ;

        this.state = 'IDLE'; // IDLE | ZOOMED_IN | ZOOMING_OUT | ROTATING | ZOOMING_IN
        this.currentAsteroidIndex = 0;
        this.originalPositions = this.asteroids.map(a => a.position.clone());
        this.moveForward = true;

        this.camAngle = Math.atan2(this.camera.position.y, this.camera.position.x);
        this.firstAst = this.asteroids[this.currentAsteroidIndex];
        this.astAngle = Math.atan2(this.firstAst.position.y, this.firstAst.position.x);
        this.targetRotation = this.camAngle - this.astAngle;


        this.pendingAsteroidIndex = null;
    }

    _navigate() {
      if (this.state !== 'ZOOMING_OUT' && this.state !== 'ROTATING') {
        this.state = 'ZOOMING_OUT';
      }
      return new Promise(resolve => { this._onZoomed = resolve; });
    }

    nextAsteroid() {
      this.pendingAsteroidIndex = (this.currentAsteroidIndex + 1) % this.asteroids.length;
      return this._navigate();
    }

    prevAsteroid() {
      this.pendingAsteroidIndex = (this.currentAsteroidIndex - 1 + this.asteroids.length) % this.asteroids.length;
      return this._navigate();
    }

    jumpToAsteroid(idx) {
      this.pendingAsteroidIndex = idx;
      return this._navigate();
    }

    setIdle() {
      this._afterZoomOut = 'IDLE';
      this.state = 'ZOOMING_OUT';
    }

    _getTargetFromDiv(query) {
      const div = document.querySelector(query);
      const rect = div.getBoundingClientRect();

      // Center of the div in pixels
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Convert to normalized device coordinates
      const ndcX = (cx / window.innerWidth) * 2 - 1;
      const ndcY = -(cy / window.innerHeight) * 2 + 1;

      // Create a point in front of the this.camera and unproject
      const target = new THREE.Vector3(ndcX, ndcY, 0.9775); // z 0-1, closer to 1 = further from this.camera
      target.unproject(this.camera);

      return target;
    }

    animate() {
      const ast = this.asteroids[this.currentAsteroidIndex];

      if (this.state === 'ZOOMING_OUT') {
        const dx = this.originalPositions[this.currentAsteroidIndex].x - ast.position.x;
        const dy = this.originalPositions[this.currentAsteroidIndex].y - ast.position.y;
        const dz = this.originalPositions[this.currentAsteroidIndex].z - ast.position.z;
        const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (totalDist <= this.ZOOM_SNAP_DIST_FAR) {
          ast.position.copy(this.originalPositions[this.currentAsteroidIndex]);

          if (this._afterZoomOut === 'IDLE') {
            this._afterZoomOut = null;
            this.state = 'IDLE';
          } else {
            this.currentAsteroidIndex = this.pendingAsteroidIndex;
            console.log(`zoomed out; new asteroid idx: ${this.currentAsteroidIndex}`);
            const newAst = this.asteroids[this.currentAsteroidIndex];
            const astAngle = Math.atan2(newAst.position.y, newAst.position.x);
            this.targetRotation = this.camAngle - astAngle;
            this.state = 'ROTATING';
          }
        } else {
          const progress = 1 - Math.min(totalDist / 500, 1);

          const easedProgress = progress * progress * progress;

          const zLerp = this.ZOOM_Z_LERP_SLOW * (1 - progress) + this.ZOOM_Z_LERP_FAST * progress;
          const xyLerp = this.ZOOM_XY_LERP_FAST * (1 - progress) + this.ZOOM_XY_LERP_SLOW * progress;


          ast.position.x += dx * xyLerp;
          ast.position.y += dy * xyLerp;
          ast.position.z += dz * zLerp;
        }
      }

      if (this.state === 'ROTATING') {
        let diff = this.targetRotation - this.planetGroup.rotation.z;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;

        if (Math.abs(diff) < 0.01) {
          // const worldPos = new THREE.Vector3();
          // ast.getWorldPosition(worldPos);

          // const targetWorld = new THREE.Vector3(
          //   worldPos.x + (camera.position.x - worldPos.x + 3) * 0.9921875,
          //   worldPos.y + (camera.position.y - worldPos.y) * 0.9921875,
          //   worldPos.z + (camera.position.z - worldPos.z - 2) * 1
          // );

          // const targetLocal = planetGroup.worldToLocal(targetWorld);
          // targetX = targetLocal.x;
          // targetY = targetLocal.y;
          // targetZ = targetLocal.z;
          const targetWorld = this._getTargetFromDiv(".asteroid-highlight");
          const targetLocal = this.planetGroup.worldToLocal(targetWorld);
          this.targetX = targetLocal.x;
          this.targetY = targetLocal.y;
          this.targetZ = targetLocal.z;

          this.state = 'ZOOMING_IN';

          // state = 'ZOOMING_IN';
        } else {
          this.planetGroup.rotation.z += diff * this.ROTATION_ANGULAR_VELOCITY;
        }
      }

      if (this.state === 'ZOOMING_IN') {
        const dx = this.targetX - ast.position.x;
        const dy = this.targetY - ast.position.y;
        const dz = this.targetZ - ast.position.z;

        const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (totalDist <= this.ZOOM_UNHIDE_DIST) {
          if (this._onZoomed) { this._onZoomed(); this._onZoomed = null; }
        }

        if (totalDist <= this.ZOOM_SNAP_DIST_CLOSE) {
          ast.position.set(this.targetX, this.targetY, this.targetZ);
          this.state = 'ZOOMED';
          // setTimeout(() => { state = 'ZOOMING_OUT'; }, 1000);
        } else {
          const progress = 1 - Math.min(totalDist / 500, 1);

          const zLerp = this.ZOOM_Z_LERP_FAST * (1 - progress) + this.ZOOM_Z_LERP_SLOW * progress;
          const xyLerp = this.ZOOM_XY_LERP_SLOW * (1 - progress) + this.ZOOM_XY_LERP_FAST * progress;

          ast.position.x += dx * xyLerp;
          ast.position.y += dy * xyLerp;
          ast.position.z += dz * zLerp;

          const dAngle = -this.IDLE_ROTATION_SPEED;
          const cos = Math.cos(dAngle);
          const sin = Math.sin(dAngle);
          const ax = ast.position.x, ay = ast.position.y;
          ast.position.x = ax * cos - ay * sin;
          ast.position.y = ax * sin + ay * cos;
          const tx = this.targetX, ty = this.targetY;
          this.targetX = tx * cos - ty * sin;
          this.targetY = tx * sin + ty * cos;
        }
      }

      if (this.state === 'IDLE' || this.state === 'ZOOMED' || this.state === 'ZOOMING_IN' || this.state === 'ZOOMING_OUT') {
        this.planetGroup.rotation.z += this.IDLE_ROTATION_SPEED;

        if (this.state === 'ZOOMED') {
          const dAngle = -this.IDLE_ROTATION_SPEED;
          const cos = Math.cos(dAngle);
          const sin = Math.sin(dAngle);
          const x = ast.position.x;
          const y = ast.position.y;
          ast.position.x = x * cos - y * sin;
          ast.position.y = x * sin + y * cos;
          this.targetX = ast.position.x;
          this.targetY = ast.position.y;
        }

        if (this.state === 'ZOOMING_IN') {
          const targetWorld = this._getTargetFromDiv(".asteroid-highlight");
          const targetLocal = this.planetGroup.worldToLocal(targetWorld);
          this.targetX = targetLocal.x;
          this.targetY = targetLocal.y;
          this.targetZ = targetLocal.z;
        }
      }

      ast.rotation.x += 0.001;
      ast.rotation.y += 0.005;

      requestAnimationFrame(() => this.animate());
      this.renderer.render(this.scene, this.camera);
    }
}