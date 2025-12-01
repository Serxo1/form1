# F1 3D Race Replay

Visualizador 3D de replays de corridas de F1 usando Three.js e dados do FastF1.

## Estrutura do Projeto

```
frontend/
├── index.html          # Página principal
├── styles.css          # Estilos da interface
├── src/
│   ├── main.js         # Entrada principal, inicialização
│   ├── Scene.js        # Configuração da cena Three.js
│   ├── Track.js        # Geração da pista 3D
│   ├── Car.js          # Modelos dos carros F1
│   ├── Camera.js       # Controles de câmera
│   ├── Replay.js       # Controle de replay/telemetria
│   ├── UI.js           # Interface do usuário
│   └── Minimap.js      # Minimapa da pista
└── assets/
    └── models/
        ├── car.glb     # Modelo do carro F1
        └── Models/GLTF format/  # Kit de modelos de pista
```

## Modelos 3D Disponíveis

### Localização: `frontend/assets/models/Models/GLTF format/`

### Essenciais (em uso)

| Modelo | Arquivo | Uso |
|--------|---------|-----|
| Barreiras | `barrierRed.glb`, `barrierWhite.glb` | Bordas da pista |
| Arquibancadas | `grandStand.glb`, `grandStandCovered.glb` | Público |
| Bandeira | `flagCheckers.glb` | Linha de chegada |
| Postes | `lightPostLarge.glb` | Iluminação |
| Outdoors | `billboard.glb` | Publicidade |
| Overhead | `overhead.glb` | Estrutura na largada |

### Disponíveis (não implementados)

| Categoria | Arquivos |
|-----------|----------|
| Cercas | `fenceStraight.glb`, `fenceCurved.glb` |
| Torres | `bannerTowerGreen.glb`, `bannerTowerRed.glb` |
| Semáforos | `lightRed.glb`, `lightRedDouble.glb` |
| Boxes | `pitsGarage.glb`, `pitsOffice.glb` |
| Bandeiras | `flagGreen.glb`, `flagRed.glb` |
| Câmeras | `camera_exclusive.glb` |
| Segmentos pista | `roadStraight.glb`, `roadCorner*.glb` |

## Configurações de Escala

| Elemento | Escala | Notas |
|----------|--------|-------|
| Carro | 0.3 | Ajustado para sensação de velocidade |
| Pista | 0.1 | Normalização dos dados FastF1 |
| Câmera chase | dist: 5, alt: 2 | Proporcional ao carro |
| Barreiras | 0.5 | Modelos do kit |
| Arquibancadas | 2.0 | Modelos do kit |

## Arquivos Principais

### Car.js
- Carrega modelo GLB do carro
- Aplica cor da equipe automaticamente
- Escala: 0.3 (30%)
- Rotação das rodas e DRS desabilitados (aguardando modelo compatível)

### Track.js
- Gera pista proceduralmente a partir de pontos
- Carrega modelos 3D de decoração
- Barreiras alternadas vermelho/branco
- Arquibancadas em 4 posições estratégicas

### Camera.js
- Modos: chase, cockpit, helicopter, free
- FOV dinâmico baseado na velocidade
- Shake da câmera em alta velocidade

## Comandos

```bash
# Servir localmente (necessário para carregar GLB)
npx serve frontend
# ou
python -m http.server 8000 --directory frontend
```
