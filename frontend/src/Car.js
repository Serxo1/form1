/**
 * Car.js - Modelos e gerenciamento dos carros F1
 * Carrega modelo 3D GLB e aplica cores das equipes
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Cache do modelo carregado
let cachedCarModel = null;
const loader = new GLTFLoader();

function deepCloneModel(source) {
    const clone = cloneSkeleton(source);

    // Clonar materiais para evitar compartilhamento
    clone.traverse((child) => {
        if (child.isMesh) {
            if (Array.isArray(child.material)) {
                child.material = child.material.map(m => m.clone());
            } else if (child.material) {
                child.material = child.material.clone();
            }
        }
    });

    return clone;
}

async function loadCarModel() {
    if (cachedCarModel) {
        return deepCloneModel(cachedCarModel);
    }

    return new Promise((resolve, reject) => {
        loader.load(
            '../assets/models/car.glb',
            (gltf) => {
                cachedCarModel = gltf.scene;
                resolve(deepCloneModel(cachedCarModel));
            },
            (progress) => {
                console.log('Carregando modelo:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
            },
            (error) => {
                console.error('Erro ao carregar modelo:', error);
                reject(error);
            }
        );
    });
}

export class CarManager {
    constructor(scene) {
        this.scene = scene;
        this.cars = new Map();
        this.followedDriver = null;
    }

    async createCars(drivers) {
        // Pré-carregar o modelo uma vez
        await loadCarModel();

        for (const driver of drivers) {
            const car = new F1Car(driver);
            await car.create();
            this.cars.set(driver.code, car);
            this.scene.add(car.mesh);
        }
    }

    setFollowedDriver(driverCode) {
        // Resetar todos os carros para modo fantasma
        this.cars.forEach((car, code) => {
            car.setGhostMode(code !== driverCode);
        });

        this.followedDriver = driverCode;
    }

    getCar(driverCode) {
        return this.cars.get(driverCode);
    }

    updatePositions(telemetryState) {
        for (const [driverCode, data] of Object.entries(telemetryState)) {
            const car = this.cars.get(driverCode);
            if (car && data) {
                car.updatePosition(data.x, data.y, data.heading, data.speed || 0);
                car.updateTelemetry(data);
            }
        }
    }

    /**
     * Aplica efeito de flash de ultrapassagem em um carro
     * @param {string} driverCode - Código do piloto
     * @param {boolean} isGaining - true se ganhou posição (verde), false se perdeu (vermelho)
     */
    flashOvertake(driverCode, isGaining) {
        const car = this.cars.get(driverCode);
        if (car) {
            car.flashOvertake(isGaining);
        }
    }
}

class F1Car {
    constructor(driverData) {
        this.driverData = driverData;
        this.mesh = null;
        this.label = null;  // Label flutuante acima do carro
        this.heading = 0;
        this.speed = 0;
        this.isGhost = false;
        this.wheels = [];
        this.drsWing = null;
        this.brakeLights = [];
        this.lastPosition = { x: 0, z: 0 };
        this.targetRotation = 0;
        this.originalMaterials = new Map();
    }

    async create() {
        // Carregar modelo GLB
        const model = await loadCarModel();

        // Grupo principal do carro
        this.mesh = new THREE.Group();
        this.mesh.name = `car_${this.driverData.code}`;

        // Adicionar modelo ao grupo
        model.rotation.y = Math.PI; // Girar 180° para frente

        // Escala reduzida para melhor sensação de velocidade
        model.scale.set(0.3, 0.3, 0.3);
        model.updateMatrixWorld(true);

        this.mesh.add(model);

        // Aplicar cor da equipe aos materiais
        this.applyTeamColor();

        // Encontrar rodas no modelo (por nome ou posição)
        this.findWheels();

        // Criar label flutuante acima do carro
        this.createLabel();

        // Posição inicial
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);

        return this.mesh;
    }

    /**
     * Cria label HTML flutuante acima do carro
     */
    createLabel() {
        // Container da label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'car-label';

        // Barra de cor da equipe
        const colorBar = document.createElement('div');
        colorBar.className = 'car-label-color';
        colorBar.style.backgroundColor = this.driverData.team_color || '#ffffff';
        labelDiv.appendChild(colorBar);

        // Código do piloto
        const codeSpan = document.createElement('span');
        codeSpan.className = 'car-label-code';
        codeSpan.textContent = this.driverData.code;
        labelDiv.appendChild(codeSpan);

        // Criar CSS2DObject
        this.label = new CSS2DObject(labelDiv);
        this.label.position.set(0, 2.5, 0);  // Acima do carro
        this.label.center.set(0.5, 1);  // Centralizado embaixo

        this.mesh.add(this.label);
    }

    applyTeamColor() {
        const teamColor = new THREE.Color(this.driverData.team_color || '#ffffff');

        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clonar material para não afetar outros carros
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((mat, index) => {
                    const clonedMat = mat.clone();

                    // Guardar material original para ghost mode
                    this.originalMaterials.set(child.uuid + '_' + index, clonedMat);

                    // Aplicar cor da equipe em materiais que parecem ser a carroceria
                    // (materiais claros ou com nomes específicos)
                    const matName = (mat.name || '').toLowerCase();
                    const isBodyPart = matName.includes('body') ||
                        matName.includes('chassis') ||
                        matName.includes('car') ||
                        matName.includes('paint') ||
                        matName.includes('livery');

                    // Se o material tem uma cor clara ou é identificado como carroceria
                    if (isBodyPart || (clonedMat.color && clonedMat.color.r > 0.5)) {
                        clonedMat.color = teamColor;
                    }

                    if (Array.isArray(child.material)) {
                        child.material[index] = clonedMat;
                    } else {
                        child.material = clonedMat;
                    }
                });
            }
        });
    }

    findWheels() {
        // Procurar por objetos que parecem ser rodas pelo nome
        this.mesh.traverse((child) => {
            const name = (child.name || '').toLowerCase();
            if (name.includes('wheel') || name.includes('tire') || name.includes('roda') || name.includes('pneu')) {
                this.wheels.push(child);
            }
            // Procurar asa DRS
            if (name.includes('drs') || name.includes('rear_wing') || name.includes('asa_traseira')) {
                this.drsWing = child;
            }
        });
    }

    updatePosition(x, y, heading, speed = 0) {
        // Converter coordenadas 2D para 3D
        // No FastF1, X e Y são coordenadas no plano horizontal
        // No Three.js, Y é vertical, então usamos X para X e Y para Z
        const scale = 0.1; // Escala para combinar com a pista

        const newX = x * scale;
        const newZ = y * scale;

        // Calcular direção do movimento baseado na posição atual vs anterior
        const dx = newX - this.lastPosition.x;
        const dz = newZ - this.lastPosition.z;
        const moveDistance = Math.sqrt(dx * dx + dz * dz);

        // Atualizar posição
        this.mesh.position.x = newX;
        this.mesh.position.z = newZ;

        // Calcular rotação baseado na direção do movimento (mais preciso)
        if (moveDistance > 0.001) {
            // O modelo tem o nariz apontando para X+ local
            // Queremos que o nariz aponte na direção (dx, dz)
            this.targetRotation = Math.atan2(-dx, -dz);
        }

        // Suavizar rotação para evitar giros bruscos
        let rotationDiff = this.targetRotation - this.mesh.rotation.y;

        // Normalizar diferença para -PI a PI
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

        // Interpolar rotação suavemente
        this.mesh.rotation.y += rotationDiff * 0.2;
        this.heading = this.mesh.rotation.y;

        // Guardar posição para próximo frame
        this.lastPosition.x = newX;
        this.lastPosition.z = newZ;

        // Guardar velocidade
        this.speed = speed;

        // TODO: Rotação das rodas desabilitada temporariamente para debug
        // const wheelRotationSpeed = (speed / 60) * 0.3;
        // this.wheels.forEach(wheel => {
        //     wheel.rotation.x += wheelRotationSpeed;
        // });
    }

    updateTelemetry(data) {
        // TODO: DRS desabilitado temporariamente para debug
        // if (this.drsWing) {
        //     const drsAngle = data.drs ? -0.1 : -0.3;
        //     this.drsWing.rotation.z = THREE.MathUtils.lerp(
        //         this.drsWing.rotation.z,
        //         drsAngle,
        //         0.1
        //     );
        // }

        // Atualizar luzes de freio
        const brakeIntensity = data.brake ? 2 : 0;
        this.brakeLights.forEach(light => {
            light.material.emissiveIntensity = brakeIntensity;
        });
    }

    setGhostMode(isGhost) {
        this.isGhost = isGhost;

        // Ajustar opacidade para modo fantasma
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = isGhost ? 0.4 : 1.0;
                    });
                } else {
                    child.material.transparent = true;
                    child.material.opacity = isGhost ? 0.4 : 1.0;
                }
            }
        });
    }

    /**
     * Aplica efeito de flash visual para ultrapassagem
     * @param {boolean} isGaining - true = verde (ganhou posição), false = vermelho (perdeu)
     */
    flashOvertake(isGaining) {
        const flashColor = isGaining ? new THREE.Color(0x00ff00) : new THREE.Color(0xff0000);
        const originalOpacity = this.isGhost ? 0.4 : 1.0;

        // Guardar cores originais e aplicar flash
        const materialsToReset = [];

        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach(mat => {
                    // Guardar estado original
                    const originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
                    const originalEmissiveIntensity = mat.emissiveIntensity || 0;

                    materialsToReset.push({
                        material: mat,
                        emissive: originalEmissive,
                        intensity: originalEmissiveIntensity
                    });

                    // Aplicar flash
                    if (mat.emissive) {
                        mat.emissive = flashColor;
                        mat.emissiveIntensity = 0.8;
                    }
                });
            }
        });

        // Resetar após 500ms
        setTimeout(() => {
            materialsToReset.forEach(({ material, emissive, intensity }) => {
                if (material.emissive) {
                    material.emissive = emissive;
                    material.emissiveIntensity = intensity;
                }
            });
        }, 500);
    }
}
