#!/usr/bin/env python3
"""
F1 Race Data Extractor for Electron IPC
Uses OpenF1 API for real telemetry data
"""

import sys
import json
import argparse
import math
from datetime import datetime

def send_message(msg_type: str, data=None, status: str = None, percent: int = None):
    """Send JSON message to stdout for IPC"""
    message = {'type': msg_type}
    if data is not None:
        message['data'] = data
    if status is not None:
        message['status'] = status
    if percent is not None:
        message['percent'] = percent
    print(json.dumps(message))
    sys.stdout.flush()

def send_progress(status: str, percent: int):
    send_message('progress', status=status, percent=percent)

def send_result(data):
    send_message('result', data=data)

def send_error(error: str):
    send_message('error', data={'error': error})

# Team colors for 2024 season
TEAM_COLORS = {
    'Red Bull Racing': '#3671C6',
    'Mercedes': '#27F4D2',
    'Ferrari': '#E8002D',
    'McLaren': '#FF8000',
    'Aston Martin': '#229971',
    'Alpine': '#FF87BC',
    'Williams': '#64C4FF',
    'AlphaTauri': '#5E8FAA',
    'RB': '#6692FF',
    'Alfa Romeo': '#C92D4B',
    'Haas F1 Team': '#B6BABD',
    'Kick Sauber': '#52E252',
}

def extract_with_openf1(year: int, race: str, session: str = 'R'):
    """Extract data using OpenF1 API with real location data"""
    import requests

    send_progress('Conectando à API OpenF1...', 5)

    base_url = 'https://api.openf1.org/v1'

    # Get session
    session_name = 'Race' if session == 'R' else session
    params = {'year': year, 'session_name': session_name}

    # Try to find by country/location
    resp = requests.get(f'{base_url}/sessions', params={**params, 'country_name': race}, timeout=30)
    sessions = resp.json()

    if not sessions:
        # Try by meeting name
        resp = requests.get(f'{base_url}/sessions', params={**params, 'meeting_name': race}, timeout=30)
        sessions = resp.json()

    if not sessions:
        # List available sessions
        resp = requests.get(f'{base_url}/sessions', params={'year': year, 'session_name': session_name}, timeout=30)
        all_sessions = resp.json()
        available = [s.get('meeting_name', s.get('country_name', '')) for s in all_sessions[:10]]
        raise Exception(f"Session not found. Available: {', '.join(available)}")

    session_info = sessions[0]
    session_key = session_info['session_key']

    send_progress('Buscando dados dos pilotos...', 15)

    # Get drivers
    resp = requests.get(f'{base_url}/drivers', params={'session_key': session_key}, timeout=30)
    drivers_data = resp.json()

    drivers = []
    driver_numbers = {}
    for drv in drivers_data:
        team = drv.get('team_name', 'Unknown')
        color = drv.get('team_colour')
        if color and not color.startswith('#'):
            color = f'#{color}'
        drivers.append({
            'code': drv['name_acronym'],
            'number': drv['driver_number'],
            'name': drv['full_name'].upper(),
            'team': team,
            'team_color': color or TEAM_COLORS.get(team, '#FFFFFF')
        })
        driver_numbers[drv['driver_number']] = drv['name_acronym']

    send_progress('Buscando dados de posição (isso pode demorar)...', 25)

    # Get location data - this is the real position data
    resp = requests.get(
        f'{base_url}/location',
        params={'session_key': session_key},
        timeout=120
    )
    location_data = resp.json()

    send_progress(f'Processando {len(location_data)} pontos de posição...', 40)

    # Parse location data into telemetry
    telemetry = {drv['code']: [] for drv in drivers}

    # Group locations by driver
    for loc in location_data:
        driver_num = loc.get('driver_number')
        code = driver_numbers.get(driver_num)
        if not code:
            continue

        # Parse timestamp
        date_str = loc.get('date', '')
        try:
            if date_str:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                t = dt.timestamp()
            else:
                t = 0
        except:
            t = 0

        telemetry[code].append({
            't': t,
            'x': loc.get('x', 0),
            'y': loc.get('y', 0),
            'heading': 0,  # Will calculate from movement
            'lap': 0,
            'speed': 0,
            'gear': 0,
            'throttle': 0,
            'brake': False,
            'drs': 0
        })

    send_progress('Calculando heading e velocidade...', 60)

    # Calculate heading from movement and normalize timestamps
    track_points = []
    track_points_set = set()

    for code in telemetry:
        frames = telemetry[code]
        if len(frames) < 2:
            continue

        # Sort by timestamp
        frames.sort(key=lambda f: f['t'])

        # Normalize timestamps (start from 0)
        t0 = frames[0]['t']

        for i, frame in enumerate(frames):
            frame['t'] = frame['t'] - t0

            # Calculate heading from next point
            if i < len(frames) - 1:
                next_frame = frames[i + 1]
                dx = next_frame['x'] - frame['x']
                dy = next_frame['y'] - frame['y']
                frame['heading'] = math.atan2(dy, dx)

                # Estimate speed from distance/time
                dt = next_frame['t'] - frame['t']
                if dt > 0:
                    dist = math.sqrt(dx * dx + dy * dy)
                    frame['speed'] = (dist / dt) * 3.6  # m/s to km/h
            else:
                # Use previous heading for last point
                frame['heading'] = frames[i-1]['heading'] if i > 0 else 0
                frame['speed'] = frames[i-1]['speed'] if i > 0 else 0

            # Add to track points (deduplicated)
            key = (round(frame['x'] / 10), round(frame['y'] / 10))
            if key not in track_points_set:
                track_points_set.add(key)
                track_points.append({'x': frame['x'], 'y': frame['y']})

    send_progress('Buscando dados de voltas...', 75)

    # Get lap data for lap numbers
    resp = requests.get(f'{base_url}/laps', params={'session_key': session_key}, timeout=30)
    laps_data = resp.json()

    # Build lap timing lookup
    lap_times = {}
    for lap in laps_data:
        driver_num = lap.get('driver_number')
        code = driver_numbers.get(driver_num)
        if not code:
            continue
        if code not in lap_times:
            lap_times[code] = []

        lap_start = lap.get('date_start', '')
        if lap_start:
            try:
                dt = datetime.fromisoformat(lap_start.replace('Z', '+00:00'))
                lap_times[code].append({
                    'lap': lap.get('lap_number', 1),
                    't': dt.timestamp()
                })
            except:
                pass

    # Assign lap numbers to telemetry frames
    for code in telemetry:
        frames = telemetry[code]
        if code not in lap_times or not lap_times[code]:
            # Assign incrementing lap numbers
            for i, frame in enumerate(frames):
                frame['lap'] = max(1, int(frame['t'] / 90) + 1)
            continue

        lap_info = sorted(lap_times[code], key=lambda x: x['t'])
        t0 = lap_info[0]['t'] if lap_info else 0

        for frame in frames:
            frame_t = frame['t'] + t0  # Absolute time
            current_lap = 1
            for li in lap_info:
                if frame_t >= li['t']:
                    current_lap = li['lap']
            frame['lap'] = current_lap

    send_progress('Gerando pneus...', 85)

    # Generate tire data (synthetic since OpenF1 doesn't have detailed tire info)
    tires = {}
    max_lap = max(
        max((f['lap'] for f in frames), default=1)
        for frames in telemetry.values()
        if frames
    ) if telemetry else 50

    for driver in drivers:
        code = driver['code']
        tires[code] = {}
        for lap in range(1, max_lap + 1):
            if lap <= max_lap * 0.3:
                tires[code][lap] = 'SOFT'
            elif lap <= max_lap * 0.7:
                tires[code][lap] = 'MEDIUM'
            else:
                tires[code][lap] = 'HARD'

    send_progress('Finalizando...', 95)

    # Calculate duration
    duration = 0
    for frames in telemetry.values():
        if frames:
            duration = max(duration, frames[-1]['t'])

    meta = {
        'year': year,
        'race': race,
        'session': session,
        'event_name': session_info.get('meeting_name', race),
        'date': session_info.get('date_start', ''),
        'total_laps': max_lap,
        'duration': duration
    }

    return {
        'meta': meta,
        'track': {
            'name': meta['event_name'],
            'country': session_info.get('country_name', ''),
            'circuit': session_info.get('circuit_short_name', race),
            'length_km': 5.0,
            'track_points': track_points,
            'corners': []
        },
        'drivers': drivers,
        'telemetry': telemetry,
        'tires': tires
    }

def list_races(year: int):
    """List available races for a year"""
    import requests
    resp = requests.get(
        'https://api.openf1.org/v1/sessions',
        params={'year': year, 'session_name': 'Race'},
        timeout=30
    )
    sessions = resp.json()
    races = []
    seen = set()
    for s in sessions:
        name = s.get('meeting_name', '')
        if name and name not in seen:
            seen.add(name)
            races.append({
                'name': name,
                'location': s.get('location', ''),
                'country': s.get('country_name', ''),
                'date': s.get('date_start', '')
            })
    return races

def main():
    parser = argparse.ArgumentParser(description='F1 Race Data Extractor')
    parser.add_argument('year', type=int, nargs='?', help='Year of the race')
    parser.add_argument('race', type=str, nargs='?', help='Race name or country')
    parser.add_argument('session', type=str, nargs='?', default='R', help='Session type')
    parser.add_argument('--list-races', action='store_true', help='List available races')

    args = parser.parse_args()

    try:
        if args.list_races:
            if not args.year:
                send_error('Year required for listing races')
                return
            races = list_races(args.year)
            send_result(races)
            return

        if not args.year or not args.race:
            send_error('Year and race are required')
            return

        data = extract_with_openf1(args.year, args.race, args.session)

        send_progress('Concluído!', 100)
        send_result(data)

    except Exception as e:
        send_error(str(e))
        sys.exit(1)

if __name__ == '__main__':
    main()
