import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ScrollTrigger } from "../lib/gsapSetup";

type PartName = "frontGlass" | "barrel1" | "aperture" | "barrel2" | "mount";

type PartConfig = {
  assembledY: number;
  explodeOffset: number; // added to assembledY, scaled by (1 - progress)
  label: string;
  side: "left" | "right";
  radius: number; // world-space radius, for leader-line screen-space length
};

// Assembled stack, front-to-back along +Y (glass highest, body lowest) —
// mirrors the earlier SVG version's layout. Explode offsets are all
// positive (parts lift UP and away from the static body when exploded,
// never down into it — the SVG version's first pass got this wrong before
// being corrected; carried the fix forward here from the start).
const PARTS: Record<PartName, PartConfig> = {
  frontGlass: { assembledY: 1.7, explodeOffset: 3.4, label: "Front element", side: "right", radius: 0.8 },
  barrel1: { assembledY: 1.0, explodeOffset: 2.7, label: "Front barrel", side: "left", radius: 0.85 },
  aperture: { assembledY: 0.3, explodeOffset: 2.0, label: "Aperture blades", side: "right", radius: 0.7 },
  barrel2: { assembledY: -0.5, explodeOffset: 1.3, label: "Rear barrel", side: "left", radius: 0.95 },
  mount: { assembledY: -1.3, explodeOffset: 0.6, label: "Mount ring", side: "right", radius: 0.85 },
};
const BODY_Y = -2.2;
const BODY_LABEL = { label: "Camera body", side: "left" as const };

// Same staggered reveal used in the SVG version: each label fades in at its
// own point in the scroll range (top of the stack to bottom), then every
// label fades out together well before parts are close enough to crowd.
const FADE_OUT: [number, number] = [0.8, 0.93];
const FADE_WINDOWS: Record<PartName | "body", [number, number]> = {
  body: [0.02, 0.1],
  mount: [0.15, 0.23],
  barrel2: [0.28, 0.36],
  aperture: [0.41, 0.49],
  barrel1: [0.54, 0.62],
  frontGlass: [0.67, 0.75],
};

function labelOpacity(progress: number, [inStart, inEnd]: [number, number]): number {
  const [outStart, outEnd] = FADE_OUT;
  if (progress < inStart) return 0;
  if (progress < inEnd) return (progress - inStart) / (inEnd - inStart);
  if (progress < outStart) return 1;
  if (progress < outEnd) return 1 - (progress - outStart) / (outEnd - outStart);
  return 0;
}

// Metal look shared by every housing part — dark, matching --surface, with
// enough metalness/low roughness for the procedural environment map (see
// buildEnvironment) to read as real reflections without an external HDRI.
function metalMaterial(color: number) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.28 });
}

function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  // RoomEnvironment is a small synthetic scene shipped with three (a room
  // of colored boxes/lights) — PMREMGenerator captures it into a reflection
  // map. This is "generated in-code", not a downloaded HDRI file.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return envTexture;
}

type LabelRefs = Record<PartName | "body", HTMLDivElement | null>;

type BehindTheLensSceneProps = {
  sectionRef: React.RefObject<HTMLElement | null>;
};

export default function BehindTheLensScene({ sectionRef }: BehindTheLensSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<LabelRefs>({
    frontGlass: null,
    barrel1: null,
    aperture: null,
    barrel2: null,
    mount: null,
    body: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let disposed = false;
    let rafId = 0;
    const progress = { target: 0, rendered: 0 };

    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top bottom",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        progress.target = self.progress;
      },
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, -0.3, 8);
    camera.lookAt(0, -0.3, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    scene.environment = buildEnvironment(renderer);

    // Three-point rig + a hemisphere fill so nothing goes fully black.
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 4, 5);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, -1, 3);
    const rim = new THREE.DirectionalLight(0x89aacc, 0.7);
    rim.position.set(0, 2, -5);
    const hemi = new THREE.HemisphereLight(0x2a2a33, 0x000000, 0.4);
    scene.add(key, fill, rim, hemi);

    // --- Geometry -----------------------------------------------------
    const metalColor = 0x161616;

    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = BODY_Y;
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 1.6), metalMaterial(0x1c1c1c));
    const bumpMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.3), metalMaterial(0x1c1c1c));
    bumpMesh.position.y = 1.1;
    bodyGroup.add(bodyMesh, bumpMesh);
    scene.add(bodyGroup);

    const mountGroup = new THREE.Group();
    const mountMesh = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 16, 32), metalMaterial(metalColor));
    mountMesh.rotation.x = Math.PI / 2;
    mountGroup.add(mountMesh);
    scene.add(mountGroup);

    const barrel2Group = new THREE.Group();
    const barrel2Mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.9, 32, 1, true),
      metalMaterial(metalColor)
    );
    barrel2Group.add(barrel2Mesh);
    scene.add(barrel2Group);

    const apertureGroup = new THREE.Group();
    const apertureRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.03, 8, 32),
      metalMaterial(0x1e1e1e)
    );
    apertureRing.rotation.x = Math.PI / 2;
    apertureGroup.add(apertureRing);

    const bladesGroup = new THREE.Group();
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 });
    const BLADE_COUNT = 8;
    for (let i = 0; i < BLADE_COUNT; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.16), bladeMaterial);
      const angle = (i / BLADE_COUNT) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
      blade.rotation.y = -angle;
      bladesGroup.add(blade);
    }
    apertureGroup.add(bladesGroup);
    scene.add(apertureGroup);

    const barrel1Group = new THREE.Group();
    const barrel1Mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.8, 32, 1, true),
      metalMaterial(metalColor)
    );
    barrel1Group.add(barrel1Mesh);
    scene.add(barrel1Group);

    const frontGlassGroup = new THREE.Group();
    // A shallow spherical cap reads as a "slightly domed disc" without a
    // custom lathe profile — small thetaLength keeps the dome subtle.
    const glassGeometry = new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.22);
    glassGeometry.rotateX(Math.PI);
    glassGeometry.translate(0, 0.35, 0);
    // Cheaper glass look by default (transparent + clearcoat, no
    // transmission) — see the perf note in the project report: transmission
    // requires a render-to-texture pass behind every transmissive pixel,
    // which measurably cost frame time on the throttled profile tested.
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a2530,
      metalness: 0.05,
      roughness: 0.12,
      transparent: true,
      opacity: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
    frontGlassGroup.add(glassMesh);
    scene.add(frontGlassGroup);

    const partGroups: Record<PartName, THREE.Group> = {
      frontGlass: frontGlassGroup,
      barrel1: barrel1Group,
      aperture: apertureGroup,
      barrel2: barrel2Group,
      mount: mountGroup,
    };

    // --- Resize ---------------------------------------------------------
    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // --- Render loop ------------------------------------------------
    const screenPos = new THREE.Vector3();
    const worldPos = new THREE.Vector3();

    const positionLabel = (el: HTMLDivElement | null, group: THREE.Object3D, opacity: number) => {
      if (!el) return;
      group.getWorldPosition(worldPos);
      screenPos.copy(worldPos).project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * container.clientHeight;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.opacity = String(opacity);
    };

    const loop = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(loop);

      // Critically-damped smoothing on top of ScrollTrigger's own scrub —
      // GSAP never tweens the Three.js objects directly; this progress
      // value is the only thing driving them, read fresh every frame.
      progress.rendered += (progress.target - progress.rendered) * 0.12;
      const p = progress.rendered;

      (Object.keys(PARTS) as PartName[]).forEach((name) => {
        const cfg = PARTS[name];
        partGroups[name].position.y = cfg.assembledY + cfg.explodeOffset * (1 - p);
      });

      // Secondary, independent motion: blades sweep open/closed across the
      // same progress range instead of only sliding into place.
      const bladeAngle = THREE.MathUtils.degToRad(-9 + p * 18);
      bladesGroup.rotation.y = bladeAngle;

      renderer.render(scene, camera);

      (Object.keys(PARTS) as PartName[]).forEach((name) => {
        positionLabel(labelRefs.current[name], partGroups[name], labelOpacity(p, FADE_WINDOWS[name]));
      });
      positionLabel(labelRefs.current.body, bodyGroup, labelOpacity(p, FADE_WINDOWS.body));
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      scrollTrigger.kill();
      resizeObserver.disconnect();
      scene.environment?.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [sectionRef]);

  const allParts: (PartName | "body")[] = ["frontGlass", "barrel1", "aperture", "barrel2", "mount", "body"];
  const labelText: Record<PartName | "body", string> = {
    frontGlass: PARTS.frontGlass.label,
    barrel1: PARTS.barrel1.label,
    aperture: PARTS.aperture.label,
    barrel2: PARTS.barrel2.label,
    mount: PARTS.mount.label,
    body: BODY_LABEL.label,
  };
  const labelSide: Record<PartName | "body", "left" | "right"> = {
    frontGlass: PARTS.frontGlass.side,
    barrel1: PARTS.barrel1.side,
    aperture: PARTS.aperture.side,
    barrel2: PARTS.barrel2.side,
    mount: PARTS.mount.side,
    body: BODY_LABEL.side,
  };

  return (
    <div ref={containerRef} className="relative h-[70vh] w-full max-w-2xl">
      <canvas ref={canvasRef} className="will-change-transform absolute inset-0 h-full w-full" />
      {allParts.map((name) => (
        <div
          key={name}
          ref={(el) => {
            labelRefs.current[name] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap opacity-0"
          style={{ willChange: "transform, opacity" }}
        >
          <div className={`flex items-center gap-2 ${labelSide[name] === "left" ? "flex-row-reverse" : ""}`}>
            <span className="h-px w-6 bg-muted" />
            <span className="font-display text-sm italic text-muted">{labelText[name]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
