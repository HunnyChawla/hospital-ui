"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * LoginScene3D — Clean, Elegant, Impressive WebGL Scene from previous design.
 *
 * System:
 *   • 3 slow-rotating thin geometric rings (torus) for depth
 *   • Animated particle network (220 nodes with live dynamic connections)
 *   • 12 soft floating branded orbs drifting on sinusoidal paths
 *   • Smooth camera mouse parallax
 *   • Fluid tempo (t += 0.018/frame)
 *   • Respects prefers-reduced-motion
 */
export function LoginScene3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      el.clientWidth / el.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, 0, 22);

    // ── Brand Palette ─────────────────────────────────────────────────────────
    const C_SKY  = 0x0ea5e9;
    const C_TEAL = 0x14b8a6;
    const C_LTCY = 0x38bdf8;
    const C_MINT = 0x2dd4bf;

    // ── 1. Rotating Rings ─────────────────────────────────────────────────────
    interface Ring { mesh: THREE.Mesh; rx: number; ry: number; rz: number }
    const rings: Ring[] = [
      { rx: 0.0005, ry: 0.004,  rz: 0.0008 },
      { rx: 0.003,  ry: -0.002, rz: 0.001  },
      { rx: -0.001, ry: 0.003,  rz: -0.002 },
    ].map(({ rx, ry, rz }, i) => {
      const radius = 5.5 + i * 2.2;
      const tube   = 0.028 + i * 0.009;
      const geo    = new THREE.TorusGeometry(radius, tube, 24, 120);
      const color  = [C_SKY, C_TEAL, C_LTCY][i];
      const mat    = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18 - i * 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = [0.4, -0.6, 1.1][i];
      mesh.rotation.y = [0.2, 0.9, -0.3][i];
      scene.add(mesh);
      return { mesh, rx, ry, rz };
    });

    // ── 2. Particle Network ───────────────────────────────────────────────────
    const NODE_COUNT = 220;
    const nodePos    = new Float32Array(NODE_COUNT * 3);
    const nodeVel    = new Float32Array(NODE_COUNT * 3);

    for (let i = 0; i < NODE_COUNT; i++) {
      nodePos[i * 3]     = (Math.random() - 0.5) * 32;
      nodePos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      nodePos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;

      nodeVel[i * 3]     = (Math.random() - 0.5) * 0.022;
      nodeVel[i * 3 + 1] = (Math.random() - 0.5) * 0.016;
      nodeVel[i * 3 + 2] = 0;
    }

    const nodeGeo = new THREE.BufferGeometry();
    const nodeBuf = new THREE.BufferAttribute(nodePos.slice(), 3);
    nodeGeo.setAttribute("position", nodeBuf);

    const nodeMat = new THREE.PointsMaterial({
      color: C_SKY,
      size: 0.1,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodePoints);

    // Live line segments
    const MAX_LINES      = 350;
    const linePosBuf     = new Float32Array(MAX_LINES * 6);
    const lineGeo        = new THREE.BufferGeometry();
    const linePosBufAttr = new THREE.BufferAttribute(linePosBuf, 3);
    linePosBufAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", linePosBufAttr);
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: C_LTCY,
        transparent: true,
        opacity: 0.14,
      })
    );
    scene.add(lineMat);

    // ── 3. Floating Ambient Orbs ──────────────────────────────────────────────
    interface Orb { mesh: THREE.Mesh; phase: number; speed: number; ax: number }
    const orbs: Orb[] = [];
    const ORB_COLORS = [C_SKY, C_TEAL, C_LTCY, C_MINT, C_SKY, C_TEAL];

    for (let i = 0; i < 12; i++) {
      const r     = 0.6 + Math.random() * 1.4;
      const color = ORB_COLORS[i % ORB_COLORS.length];
      const geo   = new THREE.SphereGeometry(r, 20, 20);
      const mat   = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.045 + Math.random() * 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 8 - 4
      );
      scene.add(mesh);
      orbs.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        ax:    (Math.random() - 0.5) * 0.028,
      });
    }

    // ── Mouse Parallax ────────────────────────────────────────────────────────
    const target  = { rx: 0, ry: 0 };
    const current = { rx: 0, ry: 0 };

    const onMouseMove = (e: MouseEvent) => {
      if (reduced) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width  * 2 - 1;
      const ny = (e.clientY - rect.top)  / rect.height * 2 - 1;
      target.rx = -ny * 0.14;
      target.ry =  nx * 0.18;
    };
    el.addEventListener("mousemove", onMouseMove);

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation Loop ────────────────────────────────────────────────────────
    let animId: number;
    let t = 0;
    const CONN_DIST_SQ = 5.5 * 5.5;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (reduced) {
        renderer.render(scene, camera);
        return;
      }

      t += 0.018;

      // Rotate rings
      for (const r of rings) {
        r.mesh.rotation.x += r.rx;
        r.mesh.rotation.y += r.ry;
        r.mesh.rotation.z += r.rz;
      }

      // Move particles
      let lineVerts = 0;
      const curPos  = nodeBuf.array as Float32Array;

      for (let i = 0; i < NODE_COUNT; i++) {
        curPos[i * 3]     += nodeVel[i * 3];
        curPos[i * 3 + 1] += nodeVel[i * 3 + 1];

        if (Math.abs(curPos[i * 3])     > 16) nodeVel[i * 3]     *= -1;
        if (Math.abs(curPos[i * 3 + 1]) > 12) nodeVel[i * 3 + 1] *= -1;
      }
      nodeBuf.needsUpdate = true;

      // Reconnect dynamic line network
      for (let i = 0; i < NODE_COUNT && lineVerts < MAX_LINES; i++) {
        for (let j = i + 1; j < NODE_COUNT && lineVerts < MAX_LINES; j++) {
          const dx = curPos[i * 3] - curPos[j * 3];
          const dy = curPos[i * 3 + 1] - curPos[j * 3 + 1];
          const dz = curPos[i * 3 + 2] - curPos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < CONN_DIST_SQ) {
            const base = lineVerts * 6;
            linePosBuf[base]     = curPos[i * 3];
            linePosBuf[base + 1] = curPos[i * 3 + 1];
            linePosBuf[base + 2] = curPos[i * 3 + 2];
            linePosBuf[base + 3] = curPos[j * 3];
            linePosBuf[base + 4] = curPos[j * 3 + 1];
            linePosBuf[base + 5] = curPos[j * 3 + 2];
            lineVerts++;
          }
        }
      }
      linePosBufAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, lineVerts * 2);

      // Drift floating orbs
      for (const orb of orbs) {
        orb.mesh.position.x += orb.ax;
        orb.mesh.position.y += Math.sin(t * orb.speed + orb.phase) * 0.012;

        if (Math.abs(orb.mesh.position.x) > 14) orb.ax *= -1;

        const mat = orb.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.04 + Math.abs(Math.sin(t * 0.4 + orb.phase)) * 0.055;
      }

      // Camera parallax
      current.rx += (target.rx - current.rx) * 0.04;
      current.ry += (target.ry - current.ry) * 0.04;
      scene.rotation.x = current.rx;
      scene.rotation.y = current.ry;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
