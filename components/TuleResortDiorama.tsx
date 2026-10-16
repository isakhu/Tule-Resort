'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type SceneMount = HTMLDivElement;

export default function TuleResortDiorama() {
  const mountRef = useRef<SceneMount | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      mount.classList.add('tule-3d-fallback');
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(4.6, 4.2, 7.2);
    camera.lookAt(0, 0.22, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(Math.max(mount.clientWidth, 1), Math.max(mount.clientHeight, 1));
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    scene.add(new THREE.AmbientLight(0xd4e7e5, 1.8));

    const keyLight = new THREE.DirectionalLight(0xffedc4, 3.1);
    keyLight.position.set(-3.5, 6, 4);
    scene.add(keyLight);

    const coolLight = new THREE.DirectionalLight(0x4caeaa, 2.1);
    coolLight.position.set(4, 3, -3);
    scene.add(coolLight);

    const goldLight = new THREE.PointLight(0xf5c76b, 5, 8);
    goldLight.position.set(-1.8, 1.7, 2.4);
    scene.add(goldLight);

    const resort = new THREE.Group();
    scene.add(resort);

    const material = (color: number, roughness = 0.5, metalness = 0.08) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const terrainMaterial = material(0x426f55, 0.92, 0);
    const baseMaterial = material(0x183b3b, 0.36, 0.25);
    const wallMaterial = material(0xf0e8d7, 0.62, 0);
    const roofMaterial = material(0x17343a, 0.36, 0.18);
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x5eb2b2,
      roughness: 0.16,
      metalness: 0.52,
      emissive: 0x123b3c,
      emissiveIntensity: 0.35,
    });
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3ce7a,
      roughness: 0.3,
      metalness: 0.55,
      emissive: 0x6d481a,
      emissiveIntensity: 0.26,
    });
    const leafMaterial = material(0x315944, 0.86, 0);
    const leafLightMaterial = material(0x5c855c, 0.9, 0);
    const poolMaterial = new THREE.MeshStandardMaterial({
      color: 0x249aa0,
      roughness: 0.2,
      metalness: 0.28,
      emissive: 0x0b4547,
      emissiveIntensity: 0.5,
    });

    const addMesh = (
      geometry: any,
      mat: any,
      parent: any,
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
    ) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    };

    // Floating circular landscape and its thin lake-coloured rim.
    addMesh(new THREE.CylinderGeometry(2.08, 2.22, 0.25, 72), baseMaterial, resort, [0, -0.17, 0]);
    addMesh(new THREE.CylinderGeometry(1.99, 2.04, 0.16, 72), terrainMaterial, resort, [0, 0.015, 0]);
    addMesh(
      new THREE.TorusGeometry(2.1, 0.045, 12, 96),
      goldMaterial,
      resort,
      [0, -0.075, 0],
      [Math.PI / 2, 0, 0],
    );

    // Main lodge: pale stone, dark roof, broad glass frontage.
    addMesh(new THREE.BoxGeometry(1.16, 0.12, 0.88), roofMaterial, resort, [-0.12, 0.15, -0.14]);
    addMesh(new THREE.BoxGeometry(1.05, 0.42, 0.76), wallMaterial, resort, [-0.12, 0.405, -0.14]);
    addMesh(new THREE.BoxGeometry(1.12, 0.075, 0.84), roofMaterial, resort, [-0.12, 0.65, -0.14]);
    for (let i = 0; i < 4; i += 1) {
      addMesh(
        new THREE.BoxGeometry(0.19, 0.25, 0.018),
        glassMaterial,
        resort,
        [-0.48 + i * 0.24, 0.42, 0.251],
      );
    }
    addMesh(new THREE.BoxGeometry(0.92, 0.035, 0.035), goldMaterial, resort, [-0.12, 0.275, 0.26]);

    // Low-profile guest villas positioned around a landscaped courtyard.
    const villa = (x: number, z: number, width: number, depth: number, yaw = 0) => {
      const group = new THREE.Group();
      group.position.set(x, 0.08, z);
      group.rotation.y = yaw;
      resort.add(group);
      addMesh(new THREE.BoxGeometry(width + 0.12, 0.07, depth + 0.12), roofMaterial, group, [0, 0.035, 0]);
      addMesh(new THREE.BoxGeometry(width, 0.3, depth), wallMaterial, group, [0, 0.21, 0]);
      addMesh(new THREE.BoxGeometry(width + 0.08, 0.06, depth + 0.08), roofMaterial, group, [0, 0.39, 0]);
      addMesh(new THREE.BoxGeometry(width * 0.58, 0.19, 0.018), glassMaterial, group, [0, 0.22, depth / 2 + 0.012]);
      addMesh(new THREE.BoxGeometry(width * 0.24, 0.2, 0.022), glassMaterial, group, [width * 0.29, 0.22, depth / 2 + 0.014]);
    };
    villa(-1.0, -0.86, 0.58, 0.48, -0.15);
    villa(0.77, -0.92, 0.57, 0.46, 0.15);
    villa(1.03, 0.08, 0.48, 0.42, 0.25);

    // A geometric turquoise pool and a small stepping-stone path.
    addMesh(new THREE.BoxGeometry(0.84, 0.09, 0.52), roofMaterial, resort, [0.76, 0.105, 0.78]);
    addMesh(new THREE.BoxGeometry(0.77, 0.035, 0.45), poolMaterial, resort, [0.76, 0.16, 0.78]);
    for (let i = 0; i < 5; i += 1) {
      addMesh(
        new THREE.BoxGeometry(0.2, 0.035, 0.14),
        material(0xbab6a2, 0.94, 0),
        resort,
        [0.22 + i * 0.14, 0.105, 1.38 + i * 0.08],
        [0, -0.12, 0],
      );
    }

    // Trees and garden forms add scale to the small architectural scene.
    const palm = (x: number, z: number, height: number, tone = false) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.08, z);
      resort.add(tree);
      addMesh(
        new THREE.CylinderGeometry(0.035, 0.06, height, 8),
        material(0x72583c, 0.92, 0),
        tree,
        [0, height / 2, 0],
        [0, 0, -0.08],
      );
      const crownY = height;
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        addMesh(
          new THREE.ConeGeometry(0.12, 0.5, 6),
          tone ? leafLightMaterial : leafMaterial,
          tree,
          [Math.cos(angle) * 0.16, crownY - 0.04, Math.sin(angle) * 0.16],
          [Math.cos(angle) * 0.62, angle, Math.sin(angle) * 0.62],
        );
      }
      addMesh(new THREE.SphereGeometry(0.1, 10, 8), leafLightMaterial, tree, [0, crownY + 0.04, 0]);
    };
    palm(-1.63, 0.57, 0.68);
    palm(-1.55, -1.0, 0.57, true);
    palm(1.62, -0.63, 0.72, true);
    palm(1.55, 0.65, 0.54);

    const shrubPositions: [number, number, number][] = [
      [-1.55, 0.12, -0.15], [-1.22, 0.11, 0.72], [1.38, 0.1, -1.25],
      [0.18, 0.1, -1.42], [-0.65, 0.1, 1.2], [1.3, 0.1, 0.12],
    ];
    shrubPositions.forEach((position, index) => {
      addMesh(
        new THREE.IcosahedronGeometry(index % 2 === 0 ? 0.14 : 0.11, 1),
        index % 2 === 0 ? leafMaterial : leafLightMaterial,
        resort,
        position,
      );
    });

    // Warm garden lights give the scene a soft evening atmosphere.
    [[-0.9, 0.19, 0.61], [1.18, 0.19, 0.44], [0.08, 0.18, 1.2]].forEach((position) => {
      addMesh(new THREE.CylinderGeometry(0.018, 0.025, 0.22, 8), roofMaterial, resort, [position[0], position[1], position[2]]);
      const lamp = addMesh(new THREE.SphereGeometry(0.055, 12, 10), goldMaterial, resort, [position[0], position[1] + 0.13, position[2]]);
      const glow = new THREE.PointLight(0xf2bd60, 0.45, 1.25);
      glow.position.copy(lamp.position);
      resort.add(glow);
    });

    resort.scale.setScalar(0.86);
    resort.rotation.y = -0.45;
    resort.rotation.x = -0.05;

    let targetX = 0;
    let targetY = -0.45;
    let animationFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = -0.45 + nx * 0.42;
      targetX = -0.05 + ny * 0.22;
    };
    const onPointerLeave = () => {
      targetX = -0.05;
      targetY = -0.45;
    };
    mount.addEventListener('pointermove', onPointerMove, { passive: true });
    mount.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    const clock = new THREE.Clock();
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion) {
        resort.rotation.y += 0.0014;
        goldLight.intensity = 4.6 + Math.sin(elapsed * 1.25) * 0.55;
      }
      resort.rotation.x += (targetX - resort.rotation.x) * 0.035;
      if (reducedMotion) {
        resort.rotation.y = targetY;
      } else {
        const animatedTarget = targetY + Math.sin(elapsed * 0.21) * 0.035;
        resort.rotation.y += (animatedTarget - resort.rotation.y) * 0.028;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      scene.traverse((object: any) => {
        const mesh = object as any;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: any) => mat.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-label="Decorative interactive 3D illustration of a lakeside resort"
      role="img"
      className="tule-diorama absolute inset-0 z-0"
    />
  );
}
