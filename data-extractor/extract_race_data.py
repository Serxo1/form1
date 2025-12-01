"""
F1 Race Data Extractor
Extrai dados de telemetria do FastF1 e exporta para JSON
para uso no visualizador Three.js

IMPORTANTE: Se houver erros de SSL/certificado no Windows, execute:
    pip install pip-system-certs truststore

Em redes corporativas com inspeção SSL, pode ser necessário:
    - Usar uma rede diferente (ex: hotspot do celular)
    - Configurar proxy/certificados da empresa
    - Ou usar DISABLE_SSL_VERIFY=True (menos seguro, mas funciona)
"""

import os
import ssl
import urllib3

# Opção para desabilitar verificação SSL (use apenas se necessário)
DISABLE_SSL_VERIFY = os.environ.get('DISABLE_SSL_VERIFY', 'true').lower() == 'true'

if DISABLE_SSL_VERIFY:
    # Desabilitar avisos de SSL
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # Criar contexto SSL que não verifica certificados
    ssl._create_default_https_context = ssl._create_unverified_context

    # Patch requests para não verificar SSL
    import requests
    requests.packages.urllib3.disable_warnings()

    # Monkey patch para Session do requests
    old_request = requests.Session.request
    def patched_request(self, *args, **kwargs):
        kwargs['verify'] = False
        return old_request(self, *args, **kwargs)
    requests.Session.request = patched_request

    print("AVISO: Verificação SSL desabilitada para contornar problemas de certificado")
else:
    # Tentar usar truststore para usar certificados do sistema Windows
    try:
        import truststore
        truststore.inject_into_ssl()
        print("Usando certificados do sistema Windows (truststore)")
    except ImportError:
        pass

import fastf1
import pandas as pd
import numpy as np
import json
from pathlib import Path

# Configurar cache do FastF1 com caminho absoluto
# É importante usar caminho absoluto para evitar problemas
CACHE_DIR = Path(__file__).parent.resolve() / "cache"
CACHE_DIR.mkdir(exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

# Desabilitar logging excessivo (opcional)
# fastf1.set_log_level('WARNING')

# Cores oficiais das equipes F1 2024
TEAM_COLORS = {
    "Red Bull Racing": {"primary": "#3671C6", "secondary": "#FFD700"},
    "Mercedes": {"primary": "#6CD3BF", "secondary": "#000000"},
    "Ferrari": {"primary": "#F91536", "secondary": "#FFEB3B"},
    "McLaren": {"primary": "#F58020", "secondary": "#000000"},
    "Aston Martin": {"primary": "#358C75", "secondary": "#FFFFFF"},
    "Alpine": {"primary": "#2293D1", "secondary": "#F596C8"},
    "Williams": {"primary": "#37BEDD", "secondary": "#FFFFFF"},
    # 2024 - RB (antes AlphaTauri)
    "RB": {"primary": "#6692FF", "secondary": "#FFFFFF"},
    "AlphaTauri": {"primary": "#5E8FAA", "secondary": "#FFFFFF"},
    # 2024 - Kick Sauber (antes Alfa Romeo)
    "Kick Sauber": {"primary": "#52E252", "secondary": "#000000"},
    "Alfa Romeo": {"primary": "#C92D4B", "secondary": "#FFFFFF"},
    "Haas F1 Team": {"primary": "#B6BABD", "secondary": "#E10600"},
}

# Números dos pilotos para identificação
DRIVER_NUMBERS_2023 = {
    "VER": 1, "PER": 11,  # Red Bull
    "HAM": 44, "RUS": 63,  # Mercedes
    "LEC": 16, "SAI": 55,  # Ferrari
    "NOR": 4, "PIA": 81,   # McLaren
    "ALO": 14, "STR": 18,  # Aston Martin
    "GAS": 10, "OCO": 31,  # Alpine
    "ALB": 23, "SAR": 2,   # Williams
    "TSU": 22, "DEV": 21, "RIC": 3, "LAW": 40,  # AlphaTauri
    "BOT": 77, "ZHO": 24,  # Alfa Romeo
    "MAG": 20, "HUL": 27,  # Haas
}


def extract_session_data(year: int, race: str, session_type: str = "R"):
    """
    Extrai dados de uma sessão de F1

    Args:
        year: Ano da temporada
        race: Nome do GP (ex: "Monza", "Monaco")
        session_type: Tipo de sessão ("R"=Race, "Q"=Quali, "FP1", etc)

    Returns:
        dict com dados da sessão
    """
    print(f"Carregando sessão: {year} {race} - {session_type}")

    # Carregar sessão
    session = fastf1.get_session(year, race, session_type)

    # Carregar TODOS os dados - a documentação recomenda isso porque
    # FastF1 mistura dados de múltiplas fontes para corrigir erros
    # e adicionar informações. Weather e messages são opcionais.
    print("Carregando dados (isso pode levar alguns minutos na primeira vez)...")
    session.load()

    print(f"Sessão carregada: {session.event['EventName']}")
    print(f"  - Pilotos: {len(session.drivers)}")

    # Verificar se laps foi carregado
    try:
        laps_count = len(session.laps) if session.laps is not None else 0
        print(f"  - Voltas disponíveis: {laps_count}")
    except Exception as e:
        print(f"  - Aviso: Não foi possível verificar voltas: {e}")

    return session


def extract_track_data(session) -> dict:
    """
    Extrai dados do circuito (traçado da pista)
    """
    print("Extraindo dados do circuito...")

    # Tentar pegar info do circuito (pode falhar)
    circuit_info = None
    try:
        circuit_info = session.get_circuit_info()
    except Exception as e:
        print(f"  Aviso: Não foi possível obter info do circuito: {e}")

    # Tentar obter o traçado de um dos pilotos
    track_data = None
    for driver in session.drivers:
        try:
            driver_laps = session.laps.pick_driver(driver)
            if driver_laps.empty:
                continue
            lap = driver_laps.pick_fastest()
            if lap is not None:
                pos_data = lap.get_pos_data()
                if pos_data is not None and not pos_data.empty:
                    track_data = pos_data
                    print(f"  - Usando dados de posição do piloto {driver}")
                    break
        except Exception as e:
            continue

    if track_data is None:
        raise ValueError("Não foi possível extrair dados do circuito")

    # Extrair coordenadas X, Y do traçado
    track_points = []
    for _, row in track_data.iterrows():
        track_points.append({
            "x": float(row["X"]),
            "y": float(row["Y"]),
        })

    # Calcular comprimento estimado da pista
    track_length = 5.0  # Default
    if circuit_info is not None and hasattr(circuit_info, 'corners') and len(circuit_info.corners) > 0:
        try:
            track_length = float(circuit_info.corners["Distance"].max()) / 1000
        except Exception:
            pass

    # Informações do circuito
    track_info = {
        "name": session.event["EventName"],
        "country": session.event["Country"],
        "circuit": session.event.get("CircuitShortName", session.event["EventName"]),
        "length_km": track_length,
        "corners": [],
        "track_points": track_points,
    }

    # Adicionar informações das curvas (se disponíveis)
    if circuit_info is not None and hasattr(circuit_info, 'corners'):
        try:
            for _, corner in circuit_info.corners.iterrows():
                track_info["corners"].append({
                    "number": int(corner["Number"]),
                    "letter": corner.get("Letter", ""),
                    "distance": float(corner["Distance"]),
                    "angle": float(corner["Angle"]) if "Angle" in corner else 0,
                })
        except Exception as e:
            print(f"  Aviso: Não foi possível extrair curvas: {e}")

    print(f"  - {len(track_points)} pontos do traçado extraídos")
    print(f"  - {len(track_info['corners'])} curvas identificadas")

    return track_info


def extract_drivers_data(session) -> list:
    """
    Extrai informações dos pilotos
    """
    print("Extraindo dados dos pilotos...")

    drivers = []

    for driver_code in session.drivers:
        try:
            driver_info = session.get_driver(driver_code)

            # Obter nome da equipe
            team_name = driver_info.get("TeamName", "Unknown")

            # Cores da equipe
            colors = TEAM_COLORS.get(team_name, {"primary": "#FFFFFF", "secondary": "#000000"})

            # Tentar obter cor oficial do FastF1
            try:
                team_color = fastf1.plotting.get_team_color(team_name, session)
                if team_color:
                    colors["primary"] = team_color
            except Exception:
                pass

            drivers.append({
                "code": driver_code,
                "number": int(driver_info.get("DriverNumber", DRIVER_NUMBERS_2023.get(driver_code, 0))),
                "name": driver_info.get("FullName", driver_code),
                "team": team_name,
                "team_color": colors["primary"],
                "secondary_color": colors["secondary"],
            })

        except Exception as e:
            print(f"  Aviso: Erro ao processar piloto {driver_code}: {e}")

    print(f"  - {len(drivers)} pilotos extraídos")
    return drivers


def extract_telemetry_data(session, sample_rate_ms: int = 100) -> dict:
    """
    Extrai dados de telemetria (posição ao longo do tempo) de todos os pilotos

    Args:
        session: Sessão do FastF1
        sample_rate_ms: Taxa de amostragem em milissegundos (100ms = 10 amostras/segundo)

    Returns:
        dict com telemetria de cada piloto
    """
    print("Extraindo telemetria dos pilotos...")

    telemetry = {}

    for driver_code in session.drivers:
        try:
            driver_laps = session.laps.pick_driver(driver_code)

            if driver_laps.empty:
                continue

            driver_telemetry = []

            # Processar cada volta
            for lap_idx, (_, lap) in enumerate(driver_laps.iterrows()):
                try:
                    # Obter dados de posição da volta
                    pos_data = lap.get_pos_data()

                    if pos_data is None or pos_data.empty:
                        continue

                    # Obter telemetria adicional (velocidade, etc)
                    tel_data = lap.get_telemetry()

                    # Mesclar dados
                    if tel_data is not None and not tel_data.empty:
                        # Reamostrar para taxa desejada
                        for i in range(0, len(pos_data), max(1, sample_rate_ms // 10)):
                            if i >= len(pos_data):
                                break

                            pos_row = pos_data.iloc[i]

                            # Encontrar telemetria correspondente
                            tel_row = None
                            if i < len(tel_data):
                                tel_row = tel_data.iloc[i]

                            # Calcular timestamp global
                            lap_start_time = lap["LapStartTime"]
                            if pd.isna(lap_start_time):
                                lap_start_time = pd.Timedelta(0)

                            time_in_lap = pos_row.get("Time", pd.Timedelta(seconds=i * 0.1))
                            if isinstance(time_in_lap, pd.Timedelta):
                                time_seconds = time_in_lap.total_seconds()
                            else:
                                time_seconds = float(time_in_lap) if not pd.isna(time_in_lap) else i * 0.1

                            global_time = lap_start_time.total_seconds() + time_seconds if isinstance(lap_start_time, pd.Timedelta) else time_seconds

                            point = {
                                "t": round(global_time, 3),  # Timestamp em segundos
                                "x": float(pos_row["X"]),
                                "y": float(pos_row["Y"]),
                                "lap": int(lap["LapNumber"]) if not pd.isna(lap["LapNumber"]) else lap_idx + 1,
                            }

                            # Adicionar dados extras se disponíveis
                            if tel_row is not None:
                                if "Speed" in tel_row and not pd.isna(tel_row["Speed"]):
                                    point["speed"] = int(tel_row["Speed"])
                                if "Throttle" in tel_row and not pd.isna(tel_row["Throttle"]):
                                    point["throttle"] = int(tel_row["Throttle"])
                                if "Brake" in tel_row and not pd.isna(tel_row["Brake"]):
                                    point["brake"] = bool(tel_row["Brake"])
                                if "DRS" in tel_row and not pd.isna(tel_row["DRS"]):
                                    point["drs"] = int(tel_row["DRS"])
                                if "nGear" in tel_row and not pd.isna(tel_row["nGear"]):
                                    point["gear"] = int(tel_row["nGear"])

                            driver_telemetry.append(point)

                except Exception as e:
                    continue

            if driver_telemetry:
                # Ordenar por tempo
                driver_telemetry.sort(key=lambda x: x["t"])
                telemetry[driver_code] = driver_telemetry
                print(f"  - {driver_code}: {len(driver_telemetry)} pontos")

        except Exception as e:
            print(f"  Aviso: Erro ao processar telemetria de {driver_code}: {e}")

    return telemetry


def extract_tire_stints(session) -> dict:
    """
    Extrai dados de compound de pneu para cada piloto por volta

    Returns:
        dict com compound de cada piloto por volta: {"VER": {"1": "MEDIUM", "25": "HARD"}, ...}
    """
    print("Extraindo dados de pneus...")

    tire_data = {}

    for driver_code in session.drivers:
        try:
            driver_laps = session.laps.pick_driver(driver_code)

            if driver_laps.empty:
                continue

            driver_tires = {}

            for _, lap in driver_laps.iterrows():
                lap_num = int(lap["LapNumber"]) if not pd.isna(lap["LapNumber"]) else 0
                compound = lap.get("Compound", None)

                if compound is not None and not pd.isna(compound):
                    driver_tires[str(lap_num)] = str(compound).upper()

            if driver_tires:
                tire_data[driver_code] = driver_tires
                # Mostrar resumo dos stints
                compounds_used = list(set(driver_tires.values()))
                print(f"  - {driver_code}: {len(driver_tires)} voltas, compounds: {', '.join(compounds_used)}")

        except Exception as e:
            print(f"  Aviso: Erro ao extrair pneus de {driver_code}: {e}")

    return tire_data


def extract_race_info(session) -> dict:
    """
    Extrai informações gerais da corrida (total de voltas, etc)
    """
    print("Extraindo informações da corrida...")

    try:
        laps_data = session.laps

        # Total de voltas completadas (máximo lap number de qualquer piloto)
        total_laps = int(laps_data["LapNumber"].max()) if not laps_data.empty else 0

        print(f"  - Total de voltas: {total_laps}")

        return {
            "total_laps": total_laps,
        }
    except Exception as e:
        print(f"  Aviso: Erro ao extrair info da corrida: {e}")
        return {"total_laps": 0}


def calculate_headings(telemetry: dict) -> dict:
    """
    Calcula o heading (direção) de cada carro baseado nas posições consecutivas
    """
    print("Calculando headings dos carros...")

    for driver_code, points in telemetry.items():
        for i in range(len(points)):
            if i < len(points) - 1:
                dx = points[i + 1]["x"] - points[i]["x"]
                dy = points[i + 1]["y"] - points[i]["y"]
                heading = np.arctan2(dy, dx)
                points[i]["heading"] = round(float(heading), 4)
            else:
                # Último ponto usa o heading anterior
                points[i]["heading"] = points[i - 1].get("heading", 0) if i > 0 else 0

    return telemetry


def export_to_json(data: dict, output_path: str):
    """
    Exporta dados para arquivo JSON
    """
    print(f"Exportando para {output_path}...")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    file_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"  - Arquivo salvo: {file_size:.2f} MB")


def main():
    """
    Função principal - extrai dados e exporta JSON
    """
    # Configurações da corrida
    # Nota: Corridas mais antigas (2023 e antes) tendem a ter dados mais estáveis
    YEAR = 2023
    RACE = "Monza"  # GP da Itália
    SESSION = "R"    # Race

    OUTPUT_DIR = Path(__file__).parent.parent / "data"
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=" * 60)
    print(f"F1 Data Extractor - {YEAR} {RACE}")
    print("=" * 60)

    # Extrair dados
    session = extract_session_data(YEAR, RACE, SESSION)

    track_data = extract_track_data(session)
    drivers_data = extract_drivers_data(session)
    telemetry_data = extract_telemetry_data(session)
    telemetry_data = calculate_headings(telemetry_data)
    tire_data = extract_tire_stints(session)
    race_info = extract_race_info(session)

    # Preparar dados finais
    race_data = {
        "meta": {
            "year": YEAR,
            "race": RACE,
            "session": SESSION,
            "event_name": session.event["EventName"],
            "date": str(session.event["EventDate"]),
            "total_laps": race_info["total_laps"],
        },
        "track": track_data,
        "drivers": drivers_data,
        "telemetry": telemetry_data,
        "tires": tire_data,
    }

    # Exportar
    output_file = OUTPUT_DIR / f"race_{YEAR}_{RACE.lower().replace(' ', '_')}.json"
    export_to_json(race_data, str(output_file))

    # Exportar também uma versão compacta (sem indentação) para produção
    output_file_min = OUTPUT_DIR / f"race_{YEAR}_{RACE.lower().replace(' ', '_')}.min.json"
    with open(output_file_min, "w", encoding="utf-8") as f:
        json.dump(race_data, f, ensure_ascii=False)

    print("=" * 60)
    print("Extração concluída com sucesso!")
    print(f"Arquivos gerados em: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
