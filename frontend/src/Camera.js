/**
 * Camera.js - Controles de câmera
 * Implementa diferentes modos de câmera para seguir os carros
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.mode = 'chase'; // chase, cockpit, helicopter, free
        this.target = null;

        // Parâmetros da câmera (ajustados para escala 0.3 do carro)
        this.distance = 5;
        this.height = 2;
        this.smoothness = 0.12;

        // Posição e rotação atuais (para suavização)
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // OrbitControls para modo livre
        this.orbitControls = new OrbitControls(camera, domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.enabled = false;

        // Shake da câmera para realismo
        this.shakeIntensity = 0;
        this.shakeOffset = new THREE.Vector3();

        // FOV dinâmico
        this.baseFov = 60;
        this.currentSpeed = 0;
    }

    setTarget(target) {
        this.target = target;
    }

    setMode(mode) {
        this.mode = mode;

        // Ativar/desativar OrbitControls
        this.orbitControls.enabled = mode === 'free';

        // Ajustar parâmetros por modo
        switch (mode) {
            case 'chase':
                this.distance = 5;
                this.height = 2;
                break;
            case 'cockpit':
                this.distance = 0;
                this.height = 0.8;
                break;
            case 'helicopter':
                this.distance = 50;
                this.height = 80;
                break;
            case 'free':
                // Manter posição atual
                this.orbitControls.target.copy(this.currentLookAt);
                break;
        }
    }

    setDistance(distance) {
        this.distance = distance;
    }

    setHeight(height) {
        this.height = height;
    }

    update(targetMesh, targetHeading, speed = 0) {
        if (!targetMesh) return;

        this.currentSpeed = speed;

        // Atualizar shake baseado na velocidade
        this.setShakeIntensity(speed);

        // Modo livre usa OrbitControls
        if (this.mode === 'free') {
            this.orbitControls.update();
            return;
        }

        const targetPosition = targetMesh.position;
        let desiredPosition = new THREE.Vector3();
        let desiredLookAt = new THREE.Vector3();

        switch (this.mode) {
            case 'chase':
                desiredPosition = this.calculateChasePosition(targetPosition, targetHeading);
                desiredLookAt = this.calculateChaseLookAt(targetPosition, targetHeading);
                break;

            case 'cockpit':
                desiredPosition = this.calculateCockpitPosition(targetPosition, targetHeading);
                desiredLookAt = this.calculateCockpitLookAt(targetPosition, targetHeading);
                break;

            case 'helicopter':
                desiredPosition = this.calculateHelicopterPosition(targetPosition);
                desiredLookAt.copy(targetPosition);
                break;
        }

        // Adicionar shake baseado na velocidade
        this.updateShake();
        desiredPosition.add(this.shakeOffset);

        // Cockpit mode: sem suavização, câmera fixa ao carro
        if (this.mode === 'cockpit') {
            this.currentPosition.copy(desiredPosition);
            this.currentLookAt.copy(desiredLookAt);
        } else {
            // Outros modos: suavizar movimento da câmera
            this.currentPosition.lerp(desiredPosition, this.smoothness);
            this.currentLookAt.lerp(desiredLookAt, this.smoothness * 1.5);
        }

        // Aplicar à câmera
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);

        // FOV dinâmico baseado na velocidade
        this.updateDynamicFov();
    }

    calculateChasePosition(targetPos, heading) {
        // Câmera atrás e acima do carro
        // heading é rotation.y do Three.js onde 0 = Z negativo
        const offset = new THREE.Vector3(
            Math.sin(heading) * this.distance,
            this.height,
            Math.cos(heading) * this.distance
        );

        return new THREE.Vector3().copy(targetPos).add(offset);
    }

    calculateChaseLookAt(targetPos, heading) {
        // Olhar um pouco à frente do carro
        const lookAheadDistance = 15;
        const offset = new THREE.Vector3(
            -Math.sin(heading) * lookAheadDistance,
            1.5,
            -Math.cos(heading) * lookAheadDistance
        );

        return new THREE.Vector3().copy(targetPos).add(offset);
    }

    calculateCockpitPosition(targetPos, heading) {
        // Posição do capacete do piloto
        const offset = new THREE.Vector3(
            -Math.sin(heading) * 0.5,
            this.height,
            -Math.cos(heading) * 0.5
        );

        return new THREE.Vector3().copy(targetPos).add(offset);
    }

    calculateCockpitLookAt(targetPos, heading) {
        // Olhar para frente do carro
        const lookDistance = 100;
        const offset = new THREE.Vector3(
            -Math.sin(heading) * lookDistance,
            this.height,
            -Math.cos(heading) * lookDistance
        );

        return new THREE.Vector3().copy(targetPos).add(offset);
    }

    calculateHelicopterPosition(targetPos) {
        // Câmera bem acima, olhando para baixo
        return new THREE.Vector3(
            targetPos.x + 20,
            this.height,
            targetPos.z + 20
        );
    }

    updateShake() {
        // Shake sutil para simular vibração
        const intensity = this.shakeIntensity * 0.01;
        this.shakeOffset.set(
            (Math.random() - 0.5) * intensity,
            (Math.random() - 0.5) * intensity * 0.5,
            (Math.random() - 0.5) * intensity
        );
    }

    setShakeIntensity(speed) {
        // Mais shake em velocidades altas
        this.shakeIntensity = Math.min(speed / 300, 1) * 0.5;
    }

    updateDynamicFov() {
        // FOV aumenta com velocidade para sensação de speed
        // Base: 60, Max: 80 em velocidade máxima (~350 km/h)
        const speedFactor = Math.min(this.currentSpeed / 350, 1);
        const targetFov = this.baseFov + speedFactor * 20;

        // Suavizar transição de FOV
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08);
        this.camera.updateProjectionMatrix();
    }
}
