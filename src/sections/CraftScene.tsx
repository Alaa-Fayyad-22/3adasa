import { useEffect } from "react";
import * as THREE from "three";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";

type PartKey = "glass" | "aperture" | "barrel" | "mount" | "body";

type PartInfo = {
  key: PartKey;
  label: string;
  targetZ: number;
  group: THREE.Group;
};

const DARK = 0x1c1c1c;
const DARK_ALT = 0x272727;
const BODY_DARK = 0x141414;
const PALE = 0xf0f0ec;

const ROTATION_PERIOD_SECONDS = 24;
const LABEL_OFFSET_X = 112;
const LABEL_ROW_HEIGHT = 28;
const LABEL_FADE_START = 0.12;
const LABEL_FADE_END = 0.42;

function buildGlass() {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 16),
    new THREE.MeshStandardMaterial({ color: PALE, roughness: 0.55, metalness: 0.08, flatShading: true })
  );
  mesh.scale.z = 0.3;
  group.add(mesh);
  return group;
}

function buildAperture() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.09, 10, 28),
    new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.7, metalness: 0.2, flatShading: true })
  );
  group.add(ring);

  const bladeMat = new THREE.MeshStandardMaterial({ color: DARK_ALT, roughness: 0.65, metalness: 0.2, flatShading: true });
  const blades: THREE.Mesh[] = [];
  const bladeCount = 8;
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.04), bladeMat);
    const angle = (i / bladeCount) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0);
    blade.rotation.z = angle;
    group.add(blade);
    blades.push(blade);
  }
  group.userData.blades = blades;
  return group;
}

function buildBarrel() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.75, metalness: 0.2, flatShading: true });
  const front = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.78, 0.62, 20), mat);
  front.rotation.x = Math.PI / 2;
  front.position.z = 0.32;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.62, 20), mat);
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.32;
  group.add(front, back);
  return group;
}

function buildMount() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.08, 10, 28),
    new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.7, metalness: 0.25, flatShading: true })
  );
  group.add(ring);
  return group;
}

function buildBody() {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.5, 1.2),
    new THREE.MeshStandardMaterial({ color: BODY_DARK, roughness: 0.8, metalness: 0.15, flatShading: true })
  );
  group.add(box);
  return group;
}

function buildParts(): PartInfo[] {
  return [
    { key: "glass", label: "Front Element", targetZ: 3, group: buildGlass() },
    { key: "aperture", label: "Aperture", targetZ: 1.5, group: buildAperture() },
    { key: "barrel", label: "Lens Barrel", targetZ: 0, group: buildBarrel() },
    { key: "mount", label: "Mount", targetZ: -1.5, group: buildMount() },
    { key: "body", label: "Body", targetZ: -3, group: buildBody() },
  ];
}

type Mode = "static" | "scroll";

export default function CraftScene({
  containerRef,
  sectionRef,
  mode,
  labelRefs,
  lineRefs,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  sectionRef?: React.RefObject<HTMLElement | null>;
  mode: Mode;
  labelRefs?: React.RefObject<(HTMLDivElement | null)[]>;
  lineRefs?: React.RefObject<(SVGLineElement | null)[]>;
}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6, 4, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.zIndex = "0";
    // Inserted first so the React-rendered label overlay (appended after via
    // JSX, outside this imperative DOM write) always paints above the canvas.
    container.insertBefore(renderer.domElement, container.firstChild);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const rotationGroup = new THREE.Group();
    scene.add(rotationGroup);

    const parts = buildParts();
    parts.forEach((p) => rotationGroup.add(p.group));

    const reducedMotion = mode === "static";
    if (reducedMotion) {
      rotationGroup.rotation.y = -0.5;
    }

    const progressRef = { current: 0 };
    const scratchVec = new THREE.Vector3();

    const applyExplosion = (p: number) => {
      parts.forEach((part) => {
        part.group.position.z = THREE.MathUtils.lerp(0, part.targetZ, p);
      });
      const aperture = parts.find((part) => part.key === "aperture");
      const blades = aperture?.group.userData.blades as THREE.Mesh[] | undefined;
      if (blades) {
        const openAmount = p * 0.6;
        blades.forEach((blade, i) => {
          const angle = (i / blades.length) * Math.PI * 2;
          blade.rotation.z = angle + openAmount;
        });
      }
    };
    applyExplosion(0);

    let st: ScrollTrigger | null = null;
    let ctx: gsap.Context | null = null;
    if (mode === "scroll" && sectionRef?.current) {
      ctx = gsap.context(() => {
        st = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        });
        progressRef.current = st.progress;
      });
    }

    const updateLabels = () => {
      if (!labelRefs?.current || !lineRefs?.current) return;
      const p = progressRef.current;
      const opacity = THREE.MathUtils.clamp(
        (p - LABEL_FADE_START) / (LABEL_FADE_END - LABEL_FADE_START),
        0,
        1
      );
      parts.forEach((part, i) => {
        part.group.getWorldPosition(scratchVec);
        const ndc = scratchVec.clone().project(camera);
        const screenX = (ndc.x * 0.5 + 0.5) * width;
        const screenY = (-ndc.y * 0.5 + 0.5) * height;
        const labelX = screenX + LABEL_OFFSET_X;
        // Fixed per-part vertical stagger (index order == front-to-back part
        // order) so labels never collide regardless of rotation angle, while
        // the leader line still runs from the part's true projected position.
        const labelY = screenY + (i - (parts.length - 1) / 2) * LABEL_ROW_HEIGHT;

        const label = labelRefs.current?.[i];
        if (label) {
          label.style.transform = `translate(${labelX}px, ${labelY}px) translateY(-50%)`;
          label.style.opacity = String(opacity);
        }
        const line = lineRefs.current?.[i];
        if (line) {
          line.setAttribute("x1", String(screenX));
          line.setAttribute("y1", String(screenY));
          line.setAttribute("x2", String(labelX - 6));
          line.setAttribute("y2", String(labelY));
          line.setAttribute("opacity", String(opacity * 0.5));
        }
      });
    };

    const rotationPerFrame = (Math.PI * 2) / (ROTATION_PERIOD_SECONDS * 60);

    const renderLoop = () => {
      if (!reducedMotion) {
        rotationGroup.rotation.y += rotationPerFrame;
      }
      applyExplosion(progressRef.current);
      renderer.render(scene, camera);
      updateLabels();
    };

    let animating = !reducedMotion;
    if (reducedMotion) {
      renderer.render(scene, camera);
      updateLabels();
    } else {
      renderer.setAnimationLoop(renderLoop);
    }

    let visibilityObserver: IntersectionObserver | null = null;
    if (!reducedMotion && sectionRef?.current) {
      visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !animating) {
            animating = true;
            renderer.setAnimationLoop(renderLoop);
          } else if (!entry.isIntersecting && animating) {
            animating = false;
            renderer.setAnimationLoop(null);
          }
        },
        { threshold: 0 }
      );
      visibilityObserver.observe(sectionRef.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (reducedMotion) {
        renderer.render(scene, camera);
        updateLabels();
      }
    });
    resizeObserver.observe(container);

    return () => {
      renderer.setAnimationLoop(null);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
      st?.kill();
      ctx?.revert();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [containerRef, sectionRef, mode, labelRefs, lineRefs]);

  return null;
}
