/**
 * Scene.js - Gerenciamento da cena Three.js
 * Configura renderer, iluminação, skybox e ambiente
 */

import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class Scene {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;  // CSS2DRenderer para labels
        this.clock = null;
    }

    async init() {
        this.container = document.getElementById(this.containerId);

        // Criar cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Céu azul claro
        this.scene.fog = new THREE.Fog(0x87CEEB, 500, 3000);

        // Criar câmera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
        this.camera.position.set(0, 50, 100);

        // Criar renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.container.appendChild(this.renderer.domElement);

        // CSS2DRenderer para labels dos carros
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.left = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.labelRenderer.domElement);

        // Clock para animações
        this.clock = new THREE.Clock();

        // Configurar iluminação
        this.setupLighting();

        // Criar skybox/ambiente
        this.createEnvironment();

        // Eventos de resize
        window.addEventListener('resize', () => this.onResize());

        return this;
    }

    setupLighting() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Luz direcional principal (sol)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(200, 400, 200);
        sunLight.castShadow = true;

        // Configuração de sombras
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 2000;
        sunLight.shadow.camera.left = -500;
        sunLight.shadow.camera.right = 500;
        sunLight.shadow.camera.top = 500;
        sunLight.shadow.camera.bottom = -500;
        sunLight.shadow.bias = -0.0001;

        this.scene.add(sunLight);

        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xffffee, 0.4);
        fillLight.position.set(-100, 100, -100);
        this.scene.add(fillLight);

        // Hemisphere light para iluminação mais natural
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c35, 0.5);
        this.scene.add(hemiLight);
    }

    createEnvironment() {
        // Criar gradiente de céu
        const skyGeometry = new THREE.SphereGeometry(2000, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x89CFF0) },
                offset: { value: 400 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Adicionar nuvens simples (planos com textura)
        this.createClouds();
    }

    createClouds() {
        // Criar algumas nuvens simples como planos brancos semitransparentes
        const cloudGeometry = new THREE.PlaneGeometry(200, 100);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
            cloud.position.set(
                (Math.random() - 0.5) * 3000,
                300 + Math.random() * 200,
                (Math.random() - 0.5) * 3000
            );
            cloud.rotation.x = Math.PI / 2;
            cloud.rotation.z = Math.random() * Math.PI;
            cloud.scale.setScalar(0.5 + Math.random() * 1);
            this.scene.add(cloud);
        }
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }
}
