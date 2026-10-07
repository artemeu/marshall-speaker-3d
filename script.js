import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const heroSection = document.getElementById('producto');
const canvas = document.getElementById('webgl');

/* ---------- Escena ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x14213d, 6, 16);

/* ---------- Cámara ---------- */
const camera = new THREE.PerspectiveCamera(
  45,
  heroSection.clientWidth / heroSection.clientHeight,
  0.1,
  100
);
camera.position.set(0, 1.4, 5);

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ---------- Iluminación (ambient/hemisphere + direccional) ---------- */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Luz de cielo/piso: evita que el lado opuesto a la luz principal quede sin detalle
const hemiLight = new THREE.HemisphereLight(0x9db4ff, 0x14213d, 0.7);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff4d6, 2.4);
keyLight.position.set(3.5, 6, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.bias = -0.0015;
scene.add(keyLight);

// Luz de relleno con el amarillo de marca, ilumina el lado opuesto a la principal
const fillLight = new THREE.DirectionalLight(0xffe100, 0.9);
fillLight.position.set(-4, 2.5, -3);
scene.add(fillLight);

/* ---------- Piso para recibir sombra ---------- */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5, 64),
  new THREE.ShadowMaterial({ opacity: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

/* ---------- Controles: orbit habilitado, zoom deshabilitado ---------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = Math.PI / 3.4;
controls.maxPolarAngle = Math.PI / 1.7;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;
controls.target.set(0, 1, 0);

/* ---------- Carga del modelo GLB ---------- */
const loader = new GLTFLoader();

loader.load(
  '/assets/marshall_bluetooth_speaker.glb',
  (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    // Centrar el modelo usando Box3
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    // Ajustar escala a un tamaño objetivo consistente
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.4;
    const scaleFactor = targetSize / maxDim;
    model.scale.setScalar(scaleFactor);

    // Apoyar el modelo sobre el piso (y = 0)
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y -= box2.min.y;

    scene.add(model);

    // Encuadrar cámara según la esfera envolvente para evitar cortes
    const finalBox = new THREE.Box3().setFromObject(model);
    const sphere = new THREE.Sphere();
    finalBox.getBoundingSphere(sphere);

    const fitDistance =
      (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.5;

    camera.position.set(0, sphere.center.y + sphere.radius * 0.25, fitDistance);
    camera.near = fitDistance / 100;
    camera.far = fitDistance * 12;
    camera.updateProjectionMatrix();

    controls.target.set(0, sphere.center.y, 0);
    controls.update();

    document.body.classList.add('model-loaded');
  },
  undefined,
  (error) => {
    console.error('Error cargando el modelo GLB:', error);
    const loaderEl = document.getElementById('loader');
    if (loaderEl) loaderEl.querySelector('p').textContent = 'No se pudo cargar el modelo 3D.';
  }
);

/* ---------- Resize (acotado a la sección hero) ---------- */
function onResize() {
  const w = heroSection.clientWidth;
  const h = heroSection.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* ---------- Loop de animación ---------- */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
