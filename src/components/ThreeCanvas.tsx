import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SceneSettings } from '../types';

interface ThreeCanvasProps {
  settings: SceneSettings;
  scrollProgress: number;
  activeServiceId: string | null;
  onSelectService: (id: string | null) => void;
}

// Helper to generate crisp 2D Canvas textures for 3D Holographic Panels
function createHolographicPanelTexture(
  title: string,
  subtitle: string,
  metrics: { label: string; value: string }[],
  accentColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Semi-transparent subtle dark glass background
    ctx.fillStyle = 'rgba(4, 9, 22, 0.45)';
    ctx.fillRect(0, 0, 512, 320);

    // Glowing border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 308);

    // Corner accents
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 18, 18);
    ctx.fillRect(494, 0, 18, 18);
    ctx.fillRect(0, 302, 18, 18);
    ctx.fillRect(494, 302, 18, 18);

    // Header Title
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = accentColor;
    ctx.fillText(title, 32, 48);

    // Subtitle
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subtitle, 32, 74);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 90);
    ctx.lineTo(480, 90);
    ctx.stroke();

    // Metrics grid
    metrics.forEach((m, idx) => {
      const yPos = 130 + idx * 52;
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(m.label.toUpperCase(), 32, yPos);

      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(m.value, 32, yPos + 22);

      // Progress / Signal bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(300, yPos + 8, 180, 8);
      ctx.fillStyle = accentColor;
      ctx.fillRect(300, yPos + 8, 120 + Math.sin(idx + 1) * 40, 8);
    });

    // Decorative telemetry scanlines
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    for (let i = 0; i < 320; i += 4) {
      ctx.fillRect(0, i, 512, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  settings,
  scrollProgress,
  activeServiceId,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL Detection Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Scene & Deep Atmospheric Environment Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020617); // Deep slate charcoal
    scene.fog = new THREE.FogExp2(0x020617, 0.028);

    // 3. Perspective Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.2);
    cameraRef.current = camera;

    // 4. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 5. Studio Environment Reflection Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Cinematic Multi-Point Studio Lighting
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.2); // Electric cyan key
    keyLight.position.set(8, 12, 8);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xa855f7, 0x020617, 1.6); // Violet sky fill
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 2.2); // Indigo rim
    rimLight.position.set(-10, -6, -8);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0x38bdf8, 3.5, 14);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // ----------------------------------------------------
    // SPATIAL BACKGROUND GRID & FLOATING PARTICLES MIST
    // ----------------------------------------------------
    const gridHelper = new THREE.GridHelper(60, 60, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -4.5;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    scene.add(gridHelper);

    // Volumetric Dust & Energy Particles
    const particleCount = isSoftwareGl ? 800 : 2200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 32;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 32;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 32;
      particleScales[i] = Math.random() * 0.08 + 0.02;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // ----------------------------------------------------
    // REWORKED 3D CENTRAL AI CORE (ELEGANT PHYSICAL MODEL)
    // ----------------------------------------------------
    const heroCoreGroup = new THREE.Group();
    heroCoreGroup.name = 'heroCoreGroup';
    scene.add(heroCoreGroup);

    // Tier 1: Outer Faceted Metallic Exoskeleton
    const outerFrameGeo = new THREE.IcosahedronGeometry(1.35, 2);
    const outerFrameMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.12,
      transmission: isSoftwareGl ? 0 : 0.75,
      transparent: true,
      opacity: isSoftwareGl ? 0.6 : 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      wireframe: settings.wireframeMode,
    });
    const outerFrameMesh = new THREE.Mesh(outerFrameGeo, outerFrameMat);
    heroCoreGroup.add(outerFrameMesh);

    // Wireframe overlay accent for exoskeleton
    const frameEdges = new THREE.WireframeGeometry(outerFrameGeo);
    const frameEdgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
    });
    const frameLineMesh = new THREE.LineSegments(frameEdges, frameEdgeMat);
    heroCoreGroup.add(frameLineMesh);

    // Tier 2: Concentric Gimbal Rings
    const ringGroup = new THREE.Group();
    heroCoreGroup.add(ringGroup);

    const ringMatCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.92,
      roughness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const ringMatViolet = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.35,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.04, 16, 100), ringMatCyan);
    ring1.rotation.x = Math.PI / 3;
    ringGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.035, 16, 100), ringMatViolet);
    ring2.rotation.y = Math.PI / 4;
    ringGroup.add(ring2);

    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.03, 12, 80), ringMatCyan);
    ring3.rotation.z = Math.PI / 6;
    ringGroup.add(ring3);

    // Tier 3: Glowing Quantum Nucleus Sphere
    const nucleusGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    heroCoreGroup.add(nucleusMesh);

    // Tier 4: Energy Nodes
    const nodesGroup = new THREE.Group();
    heroCoreGroup.add(nodesGroup);

    for (let i = 0; i < 8; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.09, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      const angle = (i / 8) * Math.PI * 2;
      nodeMesh.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0);
      nodesGroup.add(nodeMesh);
    }

    // ----------------------------------------------------
    // FLOATING 3D HOLOGRAPHIC INTERFACE PANELS
    // ----------------------------------------------------
    const panelsGroup = new THREE.Group();
    panelsGroup.name = 'panelsGroup';
    scene.add(panelsGroup);

    // Holographic Panel 1: Neural Matrix Telemetry (Left)
    const panelTex1 = createHolographicPanelTexture(
      'GAHAN AI // TELEMETRY',
      'AUTONOMOUS NEURAL MESH',
      [
        { label: 'Throughput', value: '1.42 TFLOPS' },
        { label: 'Context Horizon', value: '2M Tokens' },
        { label: 'Inference Latency', value: '0.84 ms' },
      ],
      '#38bdf8'
    );
    const panelPlaneGeo = new THREE.PlaneGeometry(2.8, 1.7);
    const panelMat1 = new THREE.MeshBasicMaterial({
      map: panelTex1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const panelMesh1 = new THREE.Mesh(panelPlaneGeo, panelMat1);
    panelMesh1.position.set(-4.2, 0.2, -1.5);
    panelMesh1.rotation.y = 0.35;
    panelsGroup.add(panelMesh1);

    // Holographic Panel 2: Cryptographic Execution Matrix (Right)
    const panelTex2 = createHolographicPanelTexture(
      'GAHAN // SECURITY',
      'ZERO-TRUST ISOLATION',
      [
        { label: 'Status', value: 'VERIFIED' },
        { label: 'Compliance Index', value: '100% ISO-27001' },
        { label: 'Pipeline', value: 'Argon2id Hash' },
      ],
      '#a855f7'
    );
    const panelMat2 = new THREE.MeshBasicMaterial({
      map: panelTex2,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const panelMesh2 = new THREE.Mesh(panelPlaneGeo, panelMat2);
    panelMesh2.position.set(4.2, -0.2, -1.5);
    panelMesh2.rotation.y = -0.35;
    panelsGroup.add(panelMesh2);

    // ----------------------------------------------------
    // FLOATING 3D SERVICE CAPABILITY NODES
    // ----------------------------------------------------
    const servicesGroup = new THREE.Group();
    servicesGroup.position.set(0, -16, 0);
    scene.add(servicesGroup);

    const serviceObjects: { [key: string]: THREE.Group } = {};
    const serviceTypes = [
      { id: 'ai', color: 0x38bdf8, label: 'AI Research' },
      { id: 'ml', color: 0xa855f7, label: 'Neural Architecture' },
      { id: 'web', color: 0x34d399, label: 'Software Engineering' },
      { id: 'automation', color: 0xf59e0b, label: 'Enterprise Automation' },
      { id: 'cloud', color: 0x60a5fa, label: 'Distributed Cloud' },
      { id: 'cyber', color: 0xef4444, label: 'Spatial Computing' },
    ];

    serviceTypes.forEach((st, idx) => {
      const sGroup = new THREE.Group();
      const angle = (idx - 2.5) * 0.75;
      sGroup.position.set(Math.sin(angle) * 5.2, (idx % 2 === 0 ? 0.4 : -0.4), Math.cos(angle) * 1.8 - 2);

      const mat = new THREE.MeshStandardMaterial({
        color: st.color,
        metalness: 0.88,
        roughness: 0.12,
        emissive: st.color,
        emissiveIntensity: 0.25,
      });

      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), mat);
      sGroup.add(mesh);

      servicesGroup.add(sGroup);
      serviceObjects[st.id] = sGroup;
    });

    // ----------------------------------------------------
    // EVENT LISTENERS & RESIZE
    // ----------------------------------------------------
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);

      // Hide holographic panels on screens narrower than 900px to ensure text remains pristine
      panelsGroup.visible = w >= 900;
    };

    const handlePointerMove = (e: MouseEvent) => {
      mousePos.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mousePos.current.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove);
    handleResize();

    // ----------------------------------------------------
    // ANIMATION & SCROLL CHOREOGRAPHY LOOP
    // ----------------------------------------------------
    let frameId = 0;
    const clock = new THREE.Clock();

    function renderLoop() {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Mouse position interpolation
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      // Rotate Hero Core
      const speed = settings.coreRotationSpeed || 1.0;
      outerFrameMesh.rotation.x = time * 0.15 * speed;
      outerFrameMesh.rotation.y = time * 0.25 * speed;

      ringGroup.children[0].rotation.z = time * 0.35 * speed;
      ringGroup.children[1].rotation.x = -time * 0.45 * speed;
      ringGroup.children[2].rotation.y = time * 0.55 * speed;

      nodesGroup.rotation.z = -time * 0.3 * speed;

      // Pulse Nucleus
      const pulse = 1 + Math.sin(time * 3.8) * 0.08;
      nucleusMesh.scale.set(pulse, pulse, pulse);
      coreLight.intensity = 2.8 + Math.sin(time * 4.5) * 1.2;

      // Float Holographic Panels smoothly in background
      panelMesh1.position.y = 0.2 + Math.sin(time * 1.2) * 0.08;
      panelMesh2.position.y = -0.2 + Math.cos(time * 1.2) * 0.08;

      // React to mouse movement
      heroCoreGroup.rotation.y = mousePos.current.x * 0.25;
      heroCoreGroup.rotation.x = mousePos.current.y * 0.25;
      panelsGroup.rotation.y = mousePos.current.x * 0.12;

      // Drift Particles
      particleSystem.rotation.y = time * 0.02;

      // SCROLL-DRIVEN CAMERA & SCENE TRANSITIONS
      const p = scrollProgress;

      if (cameraRef.current) {
        if (p < 0.25) {
          // HERO SECTION (0% - 25%): Clean centered view behind headline
          const subP = p / 0.25;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, mousePos.current.x * 0.5, 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, mousePos.current.y * 0.5, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 8.2 - subP * 1.2, 4, delta);
          heroCoreGroup.position.set(0, 0, 0);
          panelsGroup.position.set(0, 0, 0);
        } else if (p < 0.5) {
          // ARCHITECTURE / STORY SECTION (25% - 50%): Fly into core
          const subP = (p - 0.25) / 0.25;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, 2.0 * Math.sin(subP * Math.PI), 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 0.8 * subP, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 5.8 - subP * 1.5, 4, delta);

          const explode = subP * (settings.explodedViewRatio || 0.6);
          ringGroup.scale.set(1 + explode, 1 + explode, 1 + explode);
        } else if (p < 0.75) {
          // CAPABILITIES / SERVICES SECTION (50% - 75%): Track down to 3D service objects
          const subP = (p - 0.5) / 0.25;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, -2.5 * Math.cos(subP * Math.PI), 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, -3.2 - subP * 2.0, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 6.2, 4, delta);
        } else {
          // PLATFORM / CONTACT / PRICING SECTION (75% - 100%): Cinematic perspective
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, 0, 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, -1.2, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 8.0, 4, delta);
        }
      }

      // Animate Service Objects
      Object.keys(serviceObjects).forEach((id, idx) => {
        const obj = serviceObjects[id];
        obj.rotation.y = time * (0.6 + idx * 0.1);
        obj.rotation.x = time * 0.4;

        const isActive = activeServiceId === id;
        const targetScale = isActive ? 1.5 : 1.0;
        obj.scale.x = THREE.MathUtils.damp(obj.scale.x, targetScale, 6, delta);
        obj.scale.y = THREE.MathUtils.damp(obj.scale.y, targetScale, 6, delta);
        obj.scale.z = THREE.MathUtils.damp(obj.scale.z, targetScale, 6, delta);
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(renderLoop, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = requestAnimationFrame(renderLoop);
      }
    }

    renderLoop();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      if (frameId) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      }
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, [settings.wireframeMode, settings.lightingMode]);

  useEffect(() => {
    if (sceneRef.current) {
      const core = sceneRef.current.getObjectByName('heroCoreGroup');
      if (core) {
        const scale = 1 + settings.explodedViewRatio * 0.5;
        core.scale.set(scale, scale, scale);
      }
    }
  }, [settings.explodedViewRatio]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: settings.zenMode ? 1 : 0.96 }}
    />
  );
};
