"""
F1 Race Data Extractor usando OpenF1 API
Extrai dados de telemetria da API OpenF1 e exporta para JSON
para uso no visualizador Three.js

OpenF1 é uma API pública gratuita que fornece dados históricos de F1.
Documentação: https://openf1.org
"""

import requests
import json
import numpy as np
from pathlib import Path
from datetime import datetime
import time

# Cores oficiais das equipes F1 2024
TEAM_COLORS = {
    "Red Bull Racing": "#3671C6",
    "Mercedes": "#6CD3BF",
    "Ferrari": "#F91536",
    "McLaren": "#F58020",
    "Aston Martin": "#358C75",
    "Alpine": "#2293D1",
    "Williams": "#37BEDD",
    "RB": "#6692FF",
    "AlphaTauri": "#5E8FAA",
    "Kick Sauber": "#52E252",
    "Sauber": "#52E252",
    "Alfa Romeo": "#C92D4B",
    "Haas F1 Team": "#B6BABD",
}

BASE_URL = "https://api.openf1.org/v1"


def get_session(year: int, location: str, session_name: str = "Race") -> dict:
    """
    Busca informações da sessão
    """
    print(f"Buscando sessão: {year} {location} - {session_name}")

    url = f"{BASE_URL}/sessions"
    params = {
        "year": year,
        "location": location,
        "session_name": session_name
    }

    r = requests.get(url, params=params)
    r.raise_for_status()

    sessions = r.json()
    if not sessions:
        raise ValueError(f"Sessão não encontrada: {year} {location} {session_name}")

    session = sessions[0]
    print(f"  - Session key: {session['session_key']}")
    print(f"  - Meeting key: {session['meeting_key']}")
    print(f"  - Circuit: {session['circuit_short_name']}")

    return session


def get_drivers(session_key: int) -> list:
    """
    Busca lista de pilotos da sessão
    """
    print("Buscando pilotos...")

    url = f"{BASE_URL}/drivers"
    params = {"session_key": session_key}

    r = requests.get(url, params=params)
    r.raise_for_status()

    drivers_data = r.json()

    drivers = []
    for d in drivers_data:
        team_name = d.get("team_name", "Unknown")
        team_color = d.get("team_colour", "")
        if team_color:
            team_color = f"#{team_color}"
        else:
            team_color = TEAM_COLORS.get(team_name, "#FFFFFF")

        drivers.append({
            "code": d.get("name_acronym", ""),
            "number": d.get("driver_number", 0),
            "name": d.get("full_name", d.get("name_acronym", "")),
            "team": team_name,
            "team_color": team_color,
        })

    print(f"  - {len(drivers)} pilotos encontrados")
    return drivers


def get_laps(session_key: int) -> dict:
    """
    Busca dados de voltas de todos os pilotos
    """
    print("Buscando voltas...")

    url = f"{BASE_URL}/laps"
    params = {"session_key": session_key}

    r = requests.get(url, params=params)
    r.raise_for_status()

    laps_data = r.json()

    # Organizar por piloto
    laps_by_driver = {}
    for lap in laps_data:
        driver_num = lap.get("driver_number")
        if driver_num not in laps_by_driver:
            laps_by_driver[driver_num] = []
        laps_by_driver[driver_num].append(lap)

    print(f"  - {len(laps_data)} voltas total")
    return laps_by_driver


def get_positions(session_key: int) -> dict:
    """
    Busca posições dos pilotos durante a corrida
    """
    print("Buscando posições...")

    url = f"{BASE_URL}/position"
    params = {"session_key": session_key}

    r = requests.get(url, params=params)
    r.raise_for_status()

    positions_data = r.json()

    # Organizar por piloto
    positions_by_driver = {}
    for pos in positions_data:
        driver_num = pos.get("driver_number")
        if driver_num not in positions_by_driver:
            positions_by_driver[driver_num] = []
        positions_by_driver[driver_num].append(pos)

    print(f"  - {len(positions_data)} entradas de posição")
    return positions_by_driver


def get_stints(session_key: int) -> dict:
    """
    Busca dados de stints (pneus) de todos os pilotos
    """
    print("Buscando stints (pneus)...")

    url = f"{BASE_URL}/stints"
    params = {"session_key": session_key}

    r = requests.get(url, params=params)
    r.raise_for_status()

    stints_data = r.json()

    # Organizar por piloto e volta
    tires_by_driver = {}
    for stint in stints_data:
        driver_num = stint.get("driver_number")
        compound = stint.get("compound", "UNKNOWN")
        lap_start = stint.get("lap_start") or 1
        lap_end = stint.get("lap_end") or 99

        if driver_num not in tires_by_driver:
            tires_by_driver[driver_num] = {}

        # Marcar compound para cada volta do stint
        for lap in range(lap_start, lap_end + 1):
            tires_by_driver[driver_num][str(lap)] = compound.upper() if compound else "UNKNOWN"

    print(f"  - {len(stints_data)} stints encontrados")
    return tires_by_driver


def get_car_data_sample(session_key: int, driver_number: int, date_start: str, limit: int = 100) -> list:
    """
    Busca amostra de dados de carro (telemetria)
    """
    url = f"{BASE_URL}/car_data"
    params = {
        "session_key": session_key,
        "driver_number": driver_number,
        "date>": date_start,
    }

    r = requests.get(url, params=params)
    if r.status_code == 200:
        return r.json()[:limit]
    return []


def generate_telemetry_from_laps(laps_by_driver: dict, drivers: list, session: dict) -> dict:
    """
    Gera telemetria simulada baseada nos dados de volta disponíveis
    Como a API OpenF1 tem limitações no endpoint de car_data,
    geramos uma telemetria simplificada baseada nas voltas
    """
    print("Gerando telemetria a partir dos dados de volta...")

    telemetry = {}

    # Criar mapa de driver_number -> driver_code
    driver_map = {d["number"]: d["code"] for d in drivers}

    # Gerar traçado simplificado da pista (oval)
    num_points = 500
    track_points = []
    for i in range(num_points):
        t = (i / num_points) * np.pi * 2
        x = np.cos(t) * 300 + np.cos(t * 3) * 50
        y = np.sin(t) * 150 + np.sin(t * 2) * 30
        track_points.append({"x": x * 3, "y": y * 3})

    for driver_num, laps in laps_by_driver.items():
        driver_code = driver_map.get(driver_num)
        if not driver_code:
            continue

        driver_telemetry = []

        # Ordenar voltas
        laps_sorted = sorted(laps, key=lambda x: x.get("lap_number", 0))

        cumulative_time = 0.0

        for lap in laps_sorted:
            lap_number = lap.get("lap_number", 1)
            lap_duration = lap.get("lap_duration")

            if lap_duration is None:
                lap_duration = 85.0  # Default ~85s

            # Gerar pontos ao longo da volta
            points_per_lap = 50
            for i in range(points_per_lap):
                progress = i / points_per_lap
                time_in_lap = progress * lap_duration

                # Posição no traçado
                point_idx = int(progress * len(track_points)) % len(track_points)
                next_idx = (point_idx + 1) % len(track_points)

                # Interpolar
                lerp = (progress * len(track_points)) % 1
                x = track_points[point_idx]["x"] * (1 - lerp) + track_points[next_idx]["x"] * lerp
                y = track_points[point_idx]["y"] * (1 - lerp) + track_points[next_idx]["y"] * lerp

                # Calcular heading
                dx = track_points[next_idx]["x"] - track_points[point_idx]["x"]
                dy = track_points[next_idx]["y"] - track_points[point_idx]["y"]
                heading = np.arctan2(dy, dx)

                # Velocidade baseada na duração da volta
                base_speed = 5793 / lap_duration * 3.6  # km/h aproximado
                curvature = abs(np.sin(progress * np.pi * 8))
                speed = int(base_speed * (1 - curvature * 0.3) + np.random.uniform(-5, 5))

                driver_telemetry.append({
                    "t": round(cumulative_time + time_in_lap, 3),
                    "x": float(x),
                    "y": float(y),
                    "heading": round(float(heading), 4),
                    "lap": int(lap_number),
                    "speed": int(max(50, min(350, speed))),
                    "gear": int(min(8, max(2, int(speed / 40)))),
                    "throttle": int(100 if curvature < 0.3 else 60),
                    "brake": bool(curvature > 0.5),
                    "drs": int(1 if speed > 280 and np.random.random() > 0.7 else 0),
                })

            cumulative_time += lap_duration

        if driver_telemetry:
            telemetry[driver_code] = driver_telemetry
            print(f"  - {driver_code}: {len(driver_telemetry)} pontos")

    return telemetry, track_points


def convert_tires_to_driver_code(tires_by_driver: dict, drivers: list) -> dict:
    """
    Converte chaves de driver_number para driver_code
    """
    driver_map = {d["number"]: d["code"] for d in drivers}

    tires = {}
    for driver_num, lap_tires in tires_by_driver.items():
        driver_code = driver_map.get(driver_num)
        if driver_code:
            tires[driver_code] = lap_tires

    return tires


def export_to_json(data: dict, output_path: str):
    """
    Exporta dados para arquivo JSON
    """
    print(f"Exportando para {output_path}...")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    import os
    file_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"  - Arquivo salvo: {file_size:.2f} MB")


def main():
    """
    Função principal - extrai dados e exporta JSON
    """
    # Configurações da corrida
    YEAR = 2023
    LOCATION = "Monza"  # GP da Itália
    SESSION_NAME = "Race"

    OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "data"
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=" * 60)
    print(f"OpenF1 Data Extractor - {YEAR} {LOCATION}")
    print("=" * 60)

    # Buscar sessão
    session = get_session(YEAR, LOCATION, SESSION_NAME)
    session_key = session["session_key"]

    # Buscar dados
    drivers = get_drivers(session_key)
    laps_by_driver = get_laps(session_key)
    positions_by_driver = get_positions(session_key)
    tires_by_driver_num = get_stints(session_key)

    # Converter tires para usar driver_code
    tires = convert_tires_to_driver_code(tires_by_driver_num, drivers)

    # Gerar telemetria
    telemetry, track_points = generate_telemetry_from_laps(laps_by_driver, drivers, session)

    # Calcular total de voltas
    total_laps = 0
    for driver_laps in laps_by_driver.values():
        for lap in driver_laps:
            lap_num = lap.get("lap_number", 0)
            total_laps = max(total_laps, lap_num)

    print(f"  - Total de voltas: {total_laps}")

    # Preparar dados finais
    race_data = {
        "meta": {
            "year": YEAR,
            "race": LOCATION,
            "session": SESSION_NAME[0].upper(),
            "event_name": session.get("country_name", LOCATION) + " Grand Prix",
            "date": session.get("date_start", "")[:10],
            "total_laps": total_laps,
        },
        "track": {
            "name": session.get("country_name", LOCATION) + " Grand Prix",
            "country": session.get("country_name", ""),
            "circuit": session.get("circuit_short_name", LOCATION),
            "length_km": 5.793,  # Monza
            "track_points": track_points,
            "corners": [],
        },
        "drivers": drivers,
        "telemetry": telemetry,
        "tires": tires,
    }

    # Exportar
    output_file = OUTPUT_DIR / f"race_{YEAR}_{LOCATION.lower().replace(' ', '_')}.json"
    export_to_json(race_data, str(output_file))

    # Versão compacta
    output_file_min = OUTPUT_DIR / f"race_{YEAR}_{LOCATION.lower().replace(' ', '_')}.min.json"
    with open(output_file_min, "w", encoding="utf-8") as f:
        json.dump(race_data, f, ensure_ascii=False)

    print("=" * 60)
    print("Extração concluída com sucesso!")
    print(f"Arquivos gerados em: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
