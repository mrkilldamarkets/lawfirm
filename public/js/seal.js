// =========================================================================
// ADDERLEY MOSS — the wax seal. Fully procedural: a heightmap is painted on a
// canvas (irregular poured-wax blob, raised rim, ring lettering, AM monogram),
// turned into a normal map with a Sobel pass, and used to displace a dense
// plane lit at a raking angle. It drops onto the page, squashes, and settles.
// =========================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function heightmap(S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), C = S / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  // poured wax: an irregular blob with soft shoulders
  const blob = (r0, wob, fill, blur) => { g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = fill; g.beginPath(); for (let i = 0; i <= 360; i++) { const a = (i / 360) * Math.PI * 2, r = r0 * (1 + wob * (0.5 * Math.sin(a * 3 + 1.1) + 0.3 * Math.sin(a * 7 + 0.4) + 0.2 * Math.sin(a * 13 + 2.2))); const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.fill(); g.restore(); };
  blob(S * 0.46, 0.045, '#5a5a5a', S * 0.02); blob(S * 0.43, 0.03, '#9a9a9a', S * 0.018); blob(S * 0.38, 0.0, '#c8c8c8', S * 0.012);
  // the struck face: flat disc, raised rim, ring text, monogram (debossed = darker)
  g.save(); g.filter = `blur(${S * 0.002}px)`;
  g.fillStyle = '#bdbdbd'; g.beginPath(); g.arc(C, C, S * 0.34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e8e8e8'; g.lineWidth = S * 0.014; g.beginPath(); g.arc(C, C, S * 0.335, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#e0e0e0'; g.lineWidth = S * 0.005; g.beginPath(); g.arc(C, C, S * 0.245, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e6e6e6'; g.font = `400 ${S * 0.038}px 'Courier Prime', monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = ' ADDERLEY · MOSS · COUNSEL · NASSAU · MCMLXXIV ·'.toUpperCase(), R = S * 0.29; for (let i = 0; i < txt.length; i++) { const a = (i / txt.length) * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(C + Math.cos(a) * R, C + Math.sin(a) * R); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); }
  g.fillStyle = '#7a7a7a'; g.font = `400 ${S * 0.27}px 'Caslon Display', Georgia, serif`; g.fillText('AM', C, C + S * 0.018);
  g.fillStyle = '#e4e4e4'; g.font = `400 ${S * 0.27}px 'Caslon Display', Georgia, serif`; g.globalAlpha = 0.25; g.fillText('AM', C - S * 0.003, C + S * 0.015); g.globalAlpha = 1;
  for (const [x, y] of [[0, -0.19], [0, 0.19]]) { g.fillStyle = '#d8d8d8'; g.beginPath(); g.arc(C + x * S, C + y * S, S * 0.008, 0, Math.PI * 2); g.fill(); }
  g.restore();
  return c;
}
function normalFrom(hc, strength = 5) {
  const S = hc.width, src = hc.getContext('2d').getImageData(0, 0, S, S).data, out = document.createElement('canvas'); out.width = out.height = S;
  const og = out.getContext('2d'), img = og.createImageData(S, S), d = img.data, h = (x, y) => src[(Math.min(S - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) * strength;
    const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4; d[i] = ((-dx / l) * 0.5 + 0.5) * 255; d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255; d[i + 2] = (1 / l) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return out;
}

export async function createSeal(host, { mobile = false, reduced = false, onStamp } = {}) {
  try { await Promise.all([document.fonts.load("400 40px 'Caslon Display'"), document.fonts.load("400 20px 'Courier Prime'")]); } catch { /* fonts optional */ }
  const canvas = document.createElement('canvas'); host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50); cam.position.set(0, -2.6, 7.4); cam.lookAt(0, 0, 0);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(-4, 3, 3.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9c2, 1.2); rim.position.set(4, -2, 2); scene.add(rim); scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const S = mobile ? 512 : 768, hc = heightmap(S), nc = normalFrom(hc, mobile ? 4 : 6);
  const hTex = new THREE.CanvasTexture(hc), nTex = new THREE.CanvasTexture(nc); nTex.colorSpace = THREE.NoColorSpace;
  const alpha = document.createElement('canvas'); alpha.width = alpha.height = S; { const ag = alpha.getContext('2d'); ag.drawImage(hc, 0, 0); const id = ag.getImageData(0, 0, S, S); for (let i = 0; i < id.data.length; i += 4) { const v = id.data[i] > 18 ? 255 : 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; } ag.putImageData(id, 0, 0); }
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x6e0f0a, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xff8a70), sheenRoughness: 0.5, displacementMap: hTex, displacementScale: 0.42, normalMap: nTex, normalScale: new THREE.Vector2(1.4, 1.4), alphaMap: new THREE.CanvasTexture(alpha), alphaTest: 0.5, transparent: false });
  const seg = mobile ? 200 : 300, geo = new THREE.PlaneGeometry(3, 3, seg, seg), seal = new THREE.Mesh(geo, mat);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64), new THREE.MeshBasicMaterial({ color: 0x2a0905, transparent: true, opacity: 0.0, depthWrite: false })); shadow.position.z = -0.02;
  const group = new THREE.Group(); group.add(seal); void shadow; scene.add(group); group.rotation.x = -0.25;
  const size = () => { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.position.z = cam.aspect < 0.8 ? 12.5 : 10.5; cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(host); size();
  const st = { t: 0, drop: reduced ? 1 : 0, mx: 0, my: 0, scroll: 0, stamped: false, visible: true };
  addEventListener('pointermove', (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver(([e]) => (st.visible = e.isIntersecting)).observe(host);
  let last = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame); if (!st.visible) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
    if (st.drop < 1) st.drop = Math.min(1, st.drop + dt / 1.15);
    const d = st.drop, fall = 1 - Math.pow(1 - Math.min(1, d / 0.62), 3), squash = d > 0.62 ? Math.sin(Math.min(1, (d - 0.62) / 0.38) * Math.PI) * (1 - (d - 0.62) / 0.38) : 0;
    group.position.z = (1 - fall) * 4.2; seal.scale.set(1 + squash * 0.08, 1 + squash * 0.08, 1 - squash * 0.35);
    
    if (!st.stamped && d > 0.64) { st.stamped = true; onStamp && onStamp(); }
    const idle = reduced ? 0 : Math.sin(st.t * 0.4) * 0.05;
    group.rotation.z = -0.18 + (1 - fall) * 0.9 + st.mx * 0.12 + st.scroll * 0.6; group.rotation.x = -0.25 + st.my * 0.12 + idle - st.scroll * 0.35; group.rotation.y = st.mx * 0.15;
    key.position.x = -4 + st.mx * 3; renderer.render(scene, cam);
  })(last);
  return { setScroll: (p) => (st.scroll = p) };
}
