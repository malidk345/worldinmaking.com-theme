'use client';
import React, { useEffect, useRef } from 'react';

const VERTEX_COUNT = 550;

// Internal type definitions
interface Particle {
    targetR: number;
    targetTheta: number;
    targetPhi: number;
    currentR: number;
    currentTheta: number;
    currentPhi: number;
    speed: number;
    phase: number;
}

interface Triangle {
    p1: number;
    p2: number;
    p3: number;
}

export const HolographicGlobe: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const trianglesRef = useRef<Triangle[]>([]);
    const frameIdRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    // Radius ref to handle responsive resizing logic without full re-init
    const radiusRef = useRef<number>(120);

    useEffect(() => {
        // Determine radius based on screen size
        const updateRadius = () => {
            if (window.innerWidth < 640) {
                radiusRef.current = 100; // Larger for mobile (was 95)
            } else {
                radiusRef.current = 120; // Standard for desktop
            }
        };
        updateRadius();
        window.addEventListener('resize', updateRadius);

        // 1. Initialize Particles
        // Note: We use a baseline large radius for init, and scale during render based on current radiusRef
        const baseInitRadius = 120;
        const particles: Particle[] = [];
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (let i = 0; i < VERTEX_COUNT; i++) {
            const theta = 2 * Math.PI * i / goldenRatio;
            const phi = Math.acos(1 - 2 * (i + 0.5) / VERTEX_COUNT);

            particles.push({
                targetR: baseInitRadius,
                targetTheta: theta,
                targetPhi: phi,
                currentR: baseInitRadius,
                currentTheta: theta,
                currentPhi: phi,
                speed: 0.05 + Math.random() * 0.05,
                phase: Math.random() * Math.PI * 2
            });
        }
        particlesRef.current = particles;

        // 2. Pre-calculate Topology
        const tempPoints = particles.map(p => ({
            x: p.targetR * Math.sin(p.targetPhi) * Math.cos(p.targetTheta),
            y: p.targetR * Math.sin(p.targetPhi) * Math.sin(p.targetTheta),
            z: p.targetR * Math.cos(p.targetPhi)
        }));

        const triangles: Triangle[] = [];
        for (let i = 0; i < tempPoints.length; i++) {
            const p1 = tempPoints[i];
            const neighbors = tempPoints
                .map((p, index) => ({ index, dist: (p.x - p1.x) ** 2 + (p.y - p1.y) ** 2 + (p.z - p1.z) ** 2 }))
                .filter(n => n.index !== i)
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 6);

            if (neighbors.length >= 2) {
                for (let k = 0; k < neighbors.length - 1; k++) {
                    const n1 = neighbors[k].index;
                    const n2 = neighbors[k + 1].index;
                    if (neighbors[k].dist < 800) {
                        triangles.push({ p1: i, p2: n1, p3: n2 });
                    }
                }
            }
        }
        trianglesRef.current = triangles;

        return () => window.removeEventListener('resize', updateRadius);
    }, []);

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            timeRef.current += 1;

            const { clientWidth, clientHeight } = canvas;
            if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
                canvas.width = clientWidth;
                canvas.height = clientHeight;
            }
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const currentRadius = radiusRef.current;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const projectedPoints: { x: number, y: number, z: number, alpha: number }[] = new Array(particlesRef.current.length);

            const globalRotSpeed = 0.002;
            const globalThetaOffset = timeRef.current * globalRotSpeed;

            // Scale factor to map the internal logic (based on 120) to actual currentRadius
            const sizeScale = currentRadius / 120;

            particlesRef.current.forEach((p, i) => {
                // Physics logic (Self-Repair)
                const rDiff = p.targetR - p.currentR;
                p.currentR += rDiff * p.speed;

                const thetaDiff = p.targetTheta - p.currentTheta;
                p.currentTheta += thetaDiff * p.speed;

                const phiDiff = p.targetPhi - p.currentPhi;
                p.currentPhi += phiDiff * p.speed;

                // Breathing & Glitch
                const breathingR = Math.sin(timeRef.current * 0.05 + p.phase) * 2;
                if (Math.random() > 0.992) {
                    p.currentR += 15 + Math.random() * 20;
                }

                const effectiveR = (p.currentR + breathingR) * sizeScale;

                // Spherical to Cartesian
                const x3d = effectiveR * Math.sin(p.currentPhi) * Math.cos(p.currentTheta + globalThetaOffset);
                const y3d = effectiveR * Math.sin(p.currentPhi) * Math.sin(p.currentTheta + globalThetaOffset);
                const z3d = effectiveR * Math.cos(p.currentPhi);

                // Tilt
                const tiltAngle = 0.3;
                const tiltedY = y3d * Math.cos(tiltAngle) - z3d * Math.sin(tiltAngle);
                const tiltedZ = y3d * Math.sin(tiltAngle) + z3d * Math.cos(tiltAngle);

                // Project
                const perspective = 400;
                const scale = perspective / (perspective + tiltedZ);

                const glitchAlpha = Math.max(0, 1 - (effectiveR - currentRadius) / 100);

                projectedPoints[i] = {
                    x: centerX + x3d * scale,
                    y: centerY + tiltedY * scale,
                    z: tiltedZ,
                    alpha: glitchAlpha
                };
            });

            // --- Draw Core Glow (Navy Blue) ---
            const gradient = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, currentRadius * 1.5);
            // Navy Blue Glow (1e3a8a is approx 30, 58, 138)
            gradient.addColorStop(0, 'rgba(30, 58, 138, 0.2)');
            gradient.addColorStop(1, 'rgba(30, 58, 138, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // --- Draw Triangles ---
            trianglesRef.current.forEach(t => {
                const v1 = projectedPoints[t.p1];
                const v2 = projectedPoints[t.p2];
                const v3 = projectedPoints[t.p3];

                if (v1.z > -100 && v2.z > -100 && v3.z > -100) {
                    const avgAlpha = (v1.alpha + v2.alpha + v3.alpha) / 3;
                    const nz = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x);

                    if (nz < 0) {
                        ctx.beginPath();
                        ctx.moveTo(v1.x, v1.y);
                        ctx.lineTo(v2.x, v2.y);
                        ctx.lineTo(v3.x, v3.y);
                        ctx.closePath();

                        // Stroke: Navy Blue / Indigo (Darker than before)
                        ctx.strokeStyle = `rgba(30, 64, 175, ${avgAlpha * 0.5})`; // Blue-800
                        ctx.lineWidth = 0.5;
                        ctx.stroke();

                        // Fill: Very subtle Navy
                        ctx.fillStyle = `rgba(30, 58, 138, ${avgAlpha * 0.08})`; // Blue-900
                        ctx.fill();
                    }
                }
            });

            // --- Draw Particles ---
            projectedPoints.forEach(p => {
                if (p.z > -100) {
                    const size = Math.max(0.5, (1.5 * 400) / (400 + p.z));
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    // Particle Color: Deep Navy/Black-Blue
                    ctx.fillStyle = `rgba(23, 37, 84, ${p.alpha})`; // Blue-950
                    ctx.fill();
                }
            });

            frameIdRef.current = requestAnimationFrame(render);
        };

        frameIdRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameIdRef.current);
    }, []);

    const ripple = () => {
        particlesRef.current.forEach(p => {
            p.currentR += Math.random() * 40;
        });
    };

    return (
        <canvas
            ref={canvasRef}
            onClick={ripple}
            // Responsive canvas sizing via Tailwind
            className="w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] cursor-pointer z-20"
            title="Tap to ripple"
        />
    );
};
