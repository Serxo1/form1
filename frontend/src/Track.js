/**
 * Track.js - Geração da pista 3D
 * Cria a geometria do circuito baseado nos dados do FastF1
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Cache de modelos carregados
const modelCache = new Map();
const loader = new GLTFLoader();

async function loadModel(path) {
    if (modelCache.has(path)) {
        return modelCache.get(path).clone();
    }

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                modelCache.set(path, gltf.scene);
                resolve(gltf.scene.clone());
            },
            undefined,
            (error) => {
                console.warn(`Erro ao carregar modelo ${path}:`, error);
                resolve(null);
            }
        );
    });
}

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.trackGroup = new THREE.Group();
        this.trackWidth = 15; // Largura da pista em metros
        this.kerbWidth = 2;   // Largura das zebras

        // Caminhos dos modelos 3D
        this.modelPaths = {
            barrierRed: '../assets/models/Models/gltf/barrierRed.glb',
            barrierWhite: '../assets/models/Models/gltf/barrierWhite.glb',
            grandStand: '../assets/models/Models/gltf/grandStand.glb',
            grandStandCovered: '../assets/models/Models/gltf/grandStandCovered.glb',
            flagCheckers: '../assets/models/Models/gltf/flagCheckers.glb',
            lightPostLarge: '../assets/models/Models/gltf/lightPostLarge.glb',
            billboard: '../assets/models/Models/gltf/billboard.glb',
            overhead: '../assets/models/Models/gltf/overhead.glb',
        };
    }

    async build(trackData) {
        const points = trackData.track_points;

        if (!points || points.length < 10) {
            console.warn('Dados de pista insuficientes, usando circuito padrão');
            return;
        }

        // Normalizar e escalar pontos
        const normalizedPoints = this.normalizePoints(points);

        // Salvar pontos normalizados para uso em decorações
        this.centerPoints = normalizedPoints;

        // Criar superfície da pista
        this.createTrackSurface(normalizedPoints);

        // Encontrar trechos retos (após criar a superfície, que define inner/outerPoints)
        this.straightSections = this.findStraightSections(normalizedPoints);
        console.log('Trechos retos encontrados:', this.straightSections.length);

        // Criar zebras (kerbs)
        this.createKerbs(normalizedPoints);

        // Criar bordas da pista
        this.createTrackBorders(normalizedPoints);

        // Criar linhas da pista
        this.createTrackLines(normalizedPoints);

        // Decorações removidas - pista flutuante apenas

        this.scene.add(this.trackGroup);

        return this;
    }

    normalizePoints(points) {
        // Encontrar bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        // Centralizar e escalar
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const scale = 0.1; // Ajustar escala conforme necessário

        return points.map(p => ({
            x: (p.x - centerX) * scale,
            y: (p.y - centerY) * scale
        }));
    }

    // Calcular curvatura em um ponto da pista
    calculateCurvature(points, idx) {
        const prev = points[(idx - 1 + points.length) % points.length];
        const curr = points[idx];
        const next = points[(idx + 1) % points.length];

        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;

        const cross = v1x * v2y - v1y * v2x;
        const dot = v1x * v2x + v1y * v2y;
        return Math.abs(Math.atan2(cross, dot));
    }

    // Encontrar trechos retos da pista
    findStraightSections(points, minLength = 20) {
        const straights = [];
        let currentStart = 0;
        let inStraight = true;

        for (let i = 0; i < points.length; i++) {
            const curvature = this.calculateCurvature(points, i);

            if (curvature > 0.08) { // Curva detectada
                if (inStraight && i - currentStart >= minLength) {
                    straights.push({
                        start: currentStart,
                        end: i - 1,
                        length: i - currentStart,
                        midpoint: Math.floor((currentStart + i) / 2)
                    });
                }
                inStraight = false;
                currentStart = i + 1;
            } else {
                if (!inStraight) {
                    currentStart = i;
                }
                inStraight = true;
            }
        }

        // Verificar se termina em reta
        if (inStraight && points.length - currentStart >= minLength) {
            straights.push({
                start: currentStart,
                end: points.length - 1,
                length: points.length - currentStart,
                midpoint: Math.floor((currentStart + points.length) / 2)
            });
        }

        // Ordenar por tamanho (maior primeiro)
        return straights.sort((a, b) => b.length - a.length);
    }

    // Calcular perpendicular para um ponto
    getPerpendicularAt(points, idx) {
        const current = points[idx];
        const next = points[(idx + 1) % points.length];

        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return { x: 0, y: 0, dx: 0, dy: 0 };

        return {
            perpX: -dy / len,
            perpY: dx / len,
            dx: dx / len,
            dy: dy / len
        };
    }

    createTrackSurface(points) {
        // Criar shape da pista usando pontos internos e externos
        const shape = new THREE.Shape();
        const innerPoints = [];
        const outerPoints = [];

        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];

            // Calcular direção perpendicular
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len === 0) continue;

            const perpX = -dy / len;
            const perpY = dx / len;

            // Pontos internos e externos
            innerPoints.push({
                x: current.x + perpX * this.trackWidth / 2,
                y: current.y + perpY * this.trackWidth / 2
            });

            outerPoints.push({
                x: current.x - perpX * this.trackWidth / 2,
                y: current.y - perpY * this.trackWidth / 2
            });
        }

        // Criar geometria da pista como ribbon
        const trackGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];

        for (let i = 0; i < innerPoints.length; i++) {
            const inner = innerPoints[i];
            const outer = outerPoints[i];

            // Adicionar vértices (y é a altura no Three.js)
            vertices.push(inner.x, 0.01, inner.y);
            vertices.push(outer.x, 0.01, outer.y);

            // UVs
            const u = i / innerPoints.length;
            uvs.push(u, 0);
            uvs.push(u, 1);

            // Índices para triângulos
            if (i < innerPoints.length - 1) {
                const baseIdx = i * 2;
                indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
                indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
            }
        }

        // Fechar o circuito
        const lastIdx = (innerPoints.length - 1) * 2;
        indices.push(lastIdx, lastIdx + 1, 0);
        indices.push(lastIdx + 1, 1, 0);

        trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        trackGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        trackGeometry.setIndex(indices);
        trackGeometry.computeVertexNormals();

        // Material do asfalto
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.receiveShadow = true;
        this.trackGroup.add(trackMesh);

        // Guardar referência para outros métodos
        this.innerPoints = innerPoints;
        this.outerPoints = outerPoints;
    }

    createKerbs(points) {
        // Criar zebras vermelha/branca nas bordas
        const kerbColors = [0xff0000, 0xffffff];

        for (let side = 0; side < 2; side++) {
            const basePoints = side === 0 ? this.innerPoints : this.outerPoints;
            const direction = side === 0 ? -1 : 1;

            const kerbGeometry = new THREE.BufferGeometry();
            const vertices = [];
            const colors = [];

            for (let i = 0; i < basePoints.length; i++) {
                const current = basePoints[i];
                const next = basePoints[(i + 1) % basePoints.length];

                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len === 0) continue;

                const perpX = -dy / len * direction;
                const perpY = dx / len * direction;

                // Ponto interno da kerb (borda da pista)
                vertices.push(current.x, 0.02, current.y);
                // Ponto externo da kerb
                vertices.push(
                    current.x + perpX * this.kerbWidth,
                    0.02,
                    current.y + perpY * this.kerbWidth
                );

                // Cores alternadas
                const colorIdx = Math.floor(i / 5) % 2;
                const color = new THREE.Color(kerbColors[colorIdx]);
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
            }

            kerbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            kerbGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            // Criar índices
            const indices = [];
            const numPoints = basePoints.length;
            for (let i = 0; i < numPoints - 1; i++) {
                const baseIdx = i * 2;
                indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
                indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
            }
            // Fechar
            indices.push((numPoints - 1) * 2, (numPoints - 1) * 2 + 1, 0);
            indices.push((numPoints - 1) * 2 + 1, 1, 0);

            kerbGeometry.setIndex(indices);
            kerbGeometry.computeVertexNormals();

            const kerbMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.6,
                metalness: 0.0,
                side: THREE.DoubleSide,
            });

            const kerbMesh = new THREE.Mesh(kerbGeometry, kerbMaterial);
            kerbMesh.receiveShadow = true;
            this.trackGroup.add(kerbMesh);
        }
    }

    createTrackBorders(points) {
        // Criar barreiras/muros nas bordas externas
        const barrierHeight = 1.2;
        const barrierWidth = 0.5;

        for (let side = 0; side < 2; side++) {
            const basePoints = side === 0 ? this.innerPoints : this.outerPoints;
            const direction = side === 0 ? -1 : 1;
            const offset = this.kerbWidth + 2;

            const barrierGeometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];

            for (let i = 0; i < basePoints.length; i++) {
                const current = basePoints[i];
                const next = basePoints[(i + 1) % basePoints.length];

                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len === 0) continue;

                const perpX = -dy / len * direction;
                const perpY = dx / len * direction;

                const x = current.x + perpX * offset;
                const z = current.y + perpY * offset;

                // Base da barreira
                vertices.push(x, 0, z);
                // Topo da barreira
                vertices.push(x, barrierHeight, z);
            }

            // Criar faces da barreira
            const numPoints = basePoints.length;
            for (let i = 0; i < numPoints - 1; i++) {
                const baseIdx = i * 2;
                // Frente
                indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
                indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
            }

            barrierGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            barrierGeometry.setIndex(indices);
            barrierGeometry.computeVertexNormals();

            const barrierMaterial = new THREE.MeshStandardMaterial({
                color: side === 0 ? 0x888888 : 0x666666,
                roughness: 0.9,
                metalness: 0.1
            });

            const barrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrierMesh.castShadow = true;
            barrierMesh.receiveShadow = true;
            this.trackGroup.add(barrierMesh);
        }
    }

    createGrassArea(points) {
        // Criar área verde ao redor da pista
        const grassGeometry = new THREE.PlaneGeometry(2000, 2000);
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c35,
            roughness: 0.9,
            metalness: 0.0
        });

        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.01;
        grass.receiveShadow = true;
        this.trackGroup.add(grass);
    }

    createGravelTraps(points) {
        // Áreas de cascalho (simplificado como faixas ao redor das kerbs)
        const gravelOffset = this.kerbWidth + 0.5;
        const gravelWidth = 8;

        for (let side = 0; side < 2; side++) {
            const basePoints = side === 0 ? this.innerPoints : this.outerPoints;
            const direction = side === 0 ? -1 : 1;

            const vertices = [];
            const indices = [];

            for (let i = 0; i < basePoints.length; i++) {
                const current = basePoints[i];
                const next = basePoints[(i + 1) % basePoints.length];

                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len === 0) continue;

                const perpX = -dy / len * direction;
                const perpY = dx / len * direction;

                // Borda interna do cascalho
                vertices.push(
                    current.x + perpX * gravelOffset,
                    0.005,
                    current.y + perpY * gravelOffset
                );
                // Borda externa do cascalho
                vertices.push(
                    current.x + perpX * (gravelOffset + gravelWidth),
                    0.005,
                    current.y + perpY * (gravelOffset + gravelWidth)
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            const numPoints = basePoints.length;
            for (let i = 0; i < numPoints - 1; i++) {
                const baseIdx = i * 2;
                indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
                indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
            }
            indices.push((numPoints - 1) * 2, (numPoints - 1) * 2 + 1, 0);
            indices.push((numPoints - 1) * 2 + 1, 1, 0);

            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            const gravelMaterial = new THREE.MeshStandardMaterial({
                color: 0xc2b280,
                roughness: 1.0,
                metalness: 0.0
            });

            const gravelMesh = new THREE.Mesh(geometry, gravelMaterial);
            gravelMesh.receiveShadow = true;
            this.trackGroup.add(gravelMesh);
        }
    }

    createTrackLines(points) {
        // Linha central tracejada
        const lineGeometry = new THREE.BufferGeometry();
        const lineVertices = [];

        for (let i = 0; i < points.length; i += 10) {
            if (Math.floor(i / 10) % 2 === 0) {
                const start = points[i];
                const end = points[Math.min(i + 5, points.length - 1)];

                lineVertices.push(start.x, 0.02, start.y);
                lineVertices.push(end.x, 0.02, end.y);
            }
        }

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2
        });

        const line = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.trackGroup.add(line);
    }

    async createDecorations(points) {
        // Adicionar algumas árvores ao redor
        this.createTrees(points);

        // Carregar e posicionar modelos 3D
        await this.create3DBarriers(points);
        await this.create3DGrandstands(points);
        await this.create3DDecorations(points);
    }

    createTrees(points) {
        const treePositions = [];

        // Distribuir árvores aleatoriamente, mas longe da pista
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 1500;
            const z = (Math.random() - 0.5) * 1500;

            // Verificar se está longe o suficiente da pista
            let tooClose = false;
            for (const point of points) {
                const dist = Math.sqrt((x - point.x) ** 2 + (z - point.y) ** 2);
                if (dist < 50) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                treePositions.push({ x, z });
            }
        }

        // Criar geometria de árvore simples (cone + cilindro)
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });

        const foliageGeometry = new THREE.ConeGeometry(3, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });

        treePositions.forEach(pos => {
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(pos.x, 2, pos.z);
            trunk.castShadow = true;
            this.trackGroup.add(trunk);

            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(pos.x, 8, pos.z);
            foliage.castShadow = true;
            this.trackGroup.add(foliage);
        });
    }

    createGrandstands(points) {
        // Método legado - mantido para fallback
    }

    async create3DBarriers(points) {
        // Carregar modelos de barreira
        const barrierRed = await loadModel(this.modelPaths.barrierRed);
        const barrierWhite = await loadModel(this.modelPaths.barrierWhite);

        if (!barrierRed && !barrierWhite) {
            console.warn('Modelos de barreira não encontrados');
            return;
        }

        const spacing = 15; // Espaçamento entre barreiras
        const barrierOffset = 3; // Distância adicional para fora da borda

        // Colocar barreiras ao longo da borda EXTERNA
        for (let i = 0; i < this.outerPoints.length; i += spacing) {
            const outerPt = this.outerPoints[i];
            const centerPt = this.centerPoints[i];

            // Direção do centro para fora (já é a direção correta)
            const dirX = outerPt.x - centerPt.x;
            const dirY = outerPt.y - centerPt.y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            if (len === 0) continue;

            const normX = dirX / len;
            const normY = dirY / len;

            // Alternar entre vermelho e branco
            const barrier = (Math.floor(i / spacing) % 2 === 0 && barrierRed)
                ? barrierRed.clone()
                : (barrierWhite ? barrierWhite.clone() : barrierRed?.clone());

            if (!barrier) continue;

            // Posicionar um pouco além da borda externa
            barrier.position.set(
                outerPt.x + normX * barrierOffset,
                0,
                outerPt.y + normY * barrierOffset
            );

            // Rotacionar para alinhar com a pista (tangente)
            const { dx, dy } = this.getPerpendicularAt(this.centerPoints, i);
            barrier.rotation.y = Math.atan2(dx, dy);
            barrier.scale.set(0.8, 0.8, 0.8);

            barrier.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.trackGroup.add(barrier);
        }
    }

    async create3DGrandstands(points) {
        // Carregar modelos de arquibancada
        const grandStand = await loadModel(this.modelPaths.grandStand);
        const grandStandCovered = await loadModel(this.modelPaths.grandStandCovered);

        if (!grandStand && !grandStandCovered) {
            console.warn('Modelos de arquibancada não encontrados');
            return;
        }

        // Usar trechos retos encontrados (até 4 arquibancadas)
        const straights = this.straightSections || [];
        const numStands = Math.min(straights.length, 4);

        if (numStands === 0) {
            console.warn('Nenhum trecho reto encontrado para arquibancadas');
            return;
        }

        const standOffset = 25; // Distância da borda externa

        for (let i = 0; i < numStands; i++) {
            const straight = straights[i];
            const idx = straight.midpoint; // Ponto central da reta

            // Verificar se o índice é válido
            if (idx >= this.outerPoints.length || idx >= this.centerPoints.length) continue;

            const outerPt = this.outerPoints[idx];
            const centerPt = this.centerPoints[idx];

            // Direção do centro para fora
            const dirX = outerPt.x - centerPt.x;
            const dirY = outerPt.y - centerPt.y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            if (len === 0) continue;

            const normX = dirX / len;
            const normY = dirY / len;

            // Alternar entre coberta e descoberta
            const model = (i % 2 === 0)
                ? (grandStandCovered?.clone() || grandStand?.clone())
                : (grandStand?.clone() || grandStandCovered?.clone());

            if (!model) continue;

            // Posicionar além da borda externa
            model.position.set(
                outerPt.x + normX * standOffset,
                0,
                outerPt.y + normY * standOffset
            );

            // Rotacionar para ficar de frente para a pista
            const { dx, dy } = this.getPerpendicularAt(this.centerPoints, idx);
            model.rotation.y = Math.atan2(-normX, -normY);
            model.scale.set(3, 3, 3);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.trackGroup.add(model);
        }
    }

    async create3DDecorations(points) {
        // Carregar modelos de decoração
        const [flagCheckers, lightPost, billboard, overhead] = await Promise.all([
            loadModel(this.modelPaths.flagCheckers),
            loadModel(this.modelPaths.lightPostLarge),
            loadModel(this.modelPaths.billboard),
            loadModel(this.modelPaths.overhead),
        ]);

        // Encontrar a linha de chegada (primeira reta mais longa ou ponto 0)
        const straights = this.straightSections || [];
        const finishLineIdx = straights.length > 0 ? straights[0].start : 0;

        // Bandeira quadriculada na linha de chegada
        if (flagCheckers && this.outerPoints[finishLineIdx]) {
            const outerPt = this.outerPoints[finishLineIdx];
            const centerPt = this.centerPoints[finishLineIdx];

            // Direção para fora
            const dirX = outerPt.x - centerPt.x;
            const dirY = outerPt.y - centerPt.y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);

            if (len > 0) {
                const normX = dirX / len;
                const normY = dirY / len;

                const flag = flagCheckers.clone();
                flag.position.set(
                    outerPt.x + normX * 5,
                    0,
                    outerPt.y + normY * 5
                );

                const { dx, dy } = this.getPerpendicularAt(this.centerPoints, finishLineIdx);
                flag.rotation.y = Math.atan2(dx, dy);
                flag.scale.set(2, 2, 2);
                this.trackGroup.add(flag);
            }
        }

        // Postes de luz ao redor da pista (borda externa)
        if (lightPost) {
            const lightSpacing = 40;
            const lightOffset = 15;

            for (let i = 0; i < this.outerPoints.length; i += lightSpacing) {
                if (i >= this.centerPoints.length) continue;

                const outerPt = this.outerPoints[i];
                const centerPt = this.centerPoints[i];

                const dirX = outerPt.x - centerPt.x;
                const dirY = outerPt.y - centerPt.y;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                if (len === 0) continue;

                const normX = dirX / len;
                const normY = dirY / len;

                const light = lightPost.clone();
                light.position.set(
                    outerPt.x + normX * lightOffset,
                    0,
                    outerPt.y + normY * lightOffset
                );
                light.scale.set(1.5, 1.5, 1.5);
                this.trackGroup.add(light);
            }
        }

        // Outdoors/Billboards nas retas encontradas
        if (billboard && straights.length > 0) {
            const billboardOffset = 35;

            // Colocar billboard no meio de cada reta (até 4)
            for (let i = 0; i < Math.min(straights.length, 4); i++) {
                const straight = straights[i];
                // Usar ponto a 1/3 da reta para não sobrepor com arquibancadas
                const idx = straight.start + Math.floor((straight.end - straight.start) / 3);

                if (idx >= this.outerPoints.length || idx >= this.centerPoints.length) continue;

                const outerPt = this.outerPoints[idx];
                const centerPt = this.centerPoints[idx];

                const dirX = outerPt.x - centerPt.x;
                const dirY = outerPt.y - centerPt.y;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                if (len === 0) continue;

                const normX = dirX / len;
                const normY = dirY / len;

                const board = billboard.clone();
                board.position.set(
                    outerPt.x + normX * billboardOffset,
                    0,
                    outerPt.y + normY * billboardOffset
                );
                board.rotation.y = Math.atan2(-normX, -normY);
                board.scale.set(2, 2, 2);
                this.trackGroup.add(board);
            }
        }

        // Estrutura overhead na linha de chegada (atravessando a pista)
        if (overhead && this.innerPoints[finishLineIdx] && this.outerPoints[finishLineIdx]) {
            const innerPt = this.innerPoints[finishLineIdx];
            const outerPt = this.outerPoints[finishLineIdx];

            // Posicionar no centro da pista
            const centerX = (innerPt.x + outerPt.x) / 2;
            const centerY = (innerPt.y + outerPt.y) / 2;

            const oh = overhead.clone();
            oh.position.set(centerX, 0, centerY);

            // Rotacionar perpendicular à pista (atravessando)
            const { perpX, perpY } = this.getPerpendicularAt(this.centerPoints, finishLineIdx);
            oh.rotation.y = Math.atan2(perpX, perpY);
            oh.scale.set(3, 3, 3);
            this.trackGroup.add(oh);
        }
    }
}
