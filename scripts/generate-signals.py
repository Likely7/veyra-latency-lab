#!/usr/bin/env python3
"""Generate and verify deterministic CFR H.264 before publishing the manifest."""
import argparse, hashlib, importlib.util, json, os, pathlib, subprocess, tempfile
from signal_codec import GEOMETRY, balanced_sum, bit_expressions
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/signals'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'

def sequence(fps):
    state, cursor, events = 0x56455952, fps, []
    for i in range(1, 101):
        state = (1664525 * state + 1013904223) & 0xffffffff
        hold = round((0.4 + (state % 401) / 1000) * fps)
        events.append({'id': i, 'frame': cursor, 'time': cursor / fps,
                       'bright': bool(i % 2), 'holdFrames': hold})
        cursor += hold
    return events, cursor

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fps', nargs='+', type=int, choices=[30, 60, 120], default=[30, 60, 120])
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    previous = json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else None
    if previous and previous['version'] != 2 and set(args.fps) != {30,60,120}:
        parser.error('First V2 generation must include all three FPS modes.')
    manifest = previous if previous and previous['version'] == 2 else {
        'version': 2, 'seed':'0x56455952', 'width':1280, 'height':720, 'signals':{}}
    spec = importlib.util.spec_from_file_location('verifier', ROOT/'scripts/verify-signals.py')
    verifier = importlib.util.module_from_spec(spec); spec.loader.exec_module(verifier)
    keys = []
    with tempfile.TemporaryDirectory(prefix='.signal-stage-', dir=OUT) as directory:
        stage = pathlib.Path(directory)
        for fps in args.fps:
            events, total = sequence(fps)
            assert total < 65536
            expr = balanced_sum([f'gte(n,{e["frame"]})' for e in events])
            escaped = expr.replace(',', r'\,')
            filters = [
                'drawbox=x=65:y=330:w=500:h=250:color=black:t=fill',
                f"drawbox=x=65:y=330:w=500:h=250:color=white:t=fill:enable='mod({escaped},2)'",
                f"drawtext=fontfile={FONT}:text='VEYRA LATENCY LAB  /  {fps} FPS CFR':x=65:y=40:fontsize=24:fontcolor=0xa7f37b",
                f"drawtext=fontfile={FONT}:text='FRAME ID':x=65:y=85:fontsize=24:fontcolor=0x89949e",
                f"drawtext=fontfile={FONT}:text='%{{eif\\:n\\:d\\:6}}':x=65:y=120:fontsize=250:fontcolor=white",
                f"drawtext=fontfile={FONT}:text='EVENT %{{eif\\:{escaped}\\:d\\:3}}':x=620:y=370:fontsize=70:fontcolor=white",
                f"drawtext=fontfile={FONT}:text='BURNED-IN FRAME ID':x=620:y=485:fontsize=22:fontcolor=0x89949e",
                f"drawtext=fontfile={FONT}:text='V2 / FRAME16 + CRC8 / SEED 56455952':x=65:y=603:fontsize=19:fontcolor=0x89949e"]
            for i, bit in enumerate(bit_expressions()):
                x, y, size = GEOMETRY['x'] + GEOMETRY['pitch']*i, GEOMETRY['y'], GEOMETRY['cellSize']
                filters += [f'drawbox=x={x}:y={y}:w={size}:h={size}:color=0x58616b:t=1',
                            f'drawbox=x={x+1}:y={y+1}:w={size-2}:h={size-2}:color=black:t=fill',
                            f"drawbox=x={x+1}:y={y+1}:w={size-2}:h={size-2}:color=white:t=fill:enable='{bit}'"]
            for x,y in [(20,20),(1220,20),(20,660),(1220,660)]:
                filters += [f'drawbox=x={x}:y={y}:w=40:h=6:color=white:t=fill',
                            f'drawbox=x={x}:y={y}:w=6:h=40:color=white:t=fill']
            master = stage / f'signal-v2-{fps}-100.mp4'
            filter_file = stage/'signal.filter'; filter_file.write_text(','.join(filters))
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
                            f'color=c=0x0b0e12:s=1280x720:r={fps}','-filter_script:v',str(filter_file),
                            '-frames:v',str(total),'-an','-c:v','libx264','-preset','veryfast','-crf','18',
                            '-pix_fmt','yuv420p','-g',str(fps),'-bf','0','-threads','4','-movflags','+faststart',str(master)],check=True)
            for count in [20,50,100]:
                key = f'{fps}-{count}'
                frames = events[count-1]['frame'] + events[count-1]['holdFrames']
                path = stage / f'signal-v2-{fps}-{count}.mp4'
                if count != 100:
                    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(master),
                                    '-map','0:v:0','-c','copy','-frames:v',str(frames),'-movflags','+faststart',str(path)],check=True)
                signal = {'version':2, 'file':path.name,'fps':fps,'eventCount':count,'totalFrames':frames,
                          'duration':frames/fps,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                          'events':events[:count], 'frameCode':GEOMETRY.copy()}
                if previous and key in previous['signals']:
                    old = previous['signals'][key]
                    assert old['events'] == signal['events'] and old['totalFrames'] == frames, 'Event timing changed'
                manifest['signals'][key] = signal; keys.append(key)
            print(f'Encoded {fps} FPS: {total} frames; original event timing preserved',flush=True)
        verifier.verify_manifest(stage,manifest,keys)
        # No manifest/asset publication occurs before every new file passes.
        for key in keys:
            filename = manifest['signals'][key]['file']; os.replace(stage/filename,OUT/filename)
        pending = OUT/'manifest.pending.json'; pending.write_text(json.dumps(manifest,indent=2)+'\n')
        os.replace(pending,OUT/'manifest.json')
        for obsolete in OUT.glob('signal-*.mp4'):
            if obsolete.name not in {s['file'] for s in manifest['signals'].values()}:
                obsolete.unlink()
    print('Published validated V2 manifest and assets.',flush=True)
if __name__ == '__main__': main()
