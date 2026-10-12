#!/usr/bin/env python3
"""Deterministic CFR H.264 signals. IDs and events are burned into decoded frames."""
import argparse, hashlib, json, pathlib, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/signals'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'

def sequence(fps):
    # Integer LCG, fixed seed: reproducible across Python versions and platforms.
    state, cursor, events = 0x56455952, fps, []
    for i in range(1, 101):
        state = (1664525 * state + 1013904223) & 0xffffffff
        hold = round((0.4 + (state % 401) / 1000) * fps)
        events.append({'id': i, 'frame': cursor, 'time': cursor / fps, 'bright': bool(i % 2), 'holdFrames': hold})
        cursor += hold
    return events, cursor

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--fps', nargs='+', type=int, default=[30,60,120]); args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {'version': 1, 'seed':'0x56455952', 'width':1280, 'height':720, 'signals':{}}
    for fps in args.fps:
        assert fps in [30,60,120]
        events, total = sequence(fps)
        def balanced(items):
            if len(items) == 1: return items[0]
            half = len(items) // 2
            return '(' + balanced(items[:half]) + '+' + balanced(items[half:]) + ')'
        expr = balanced([f'gte(n,{e["frame"]})' for e in events])
        escaped = expr.replace(',', r'\,')
        filters = ['drawbox=x=65:y=310:w=440:h=285:color=black:t=fill', f"drawbox=x=65:y=310:w=440:h=285:color=white:t=fill:enable='mod({escaped},2)'",
            f"drawtext=fontfile={FONT}:text='FRAME %{{eif\\:n\\:d\\:6}}':x=65:y=145:fontsize=102:fontcolor=white",
            f"drawtext=fontfile={FONT}:text='EVENT %{{eif\\:{escaped}\\:d\\:3}}':x=560:y=355:fontsize=60:fontcolor=white",
            f"drawtext=fontfile={FONT}:text='VEYRA LATENCY LAB  /  {fps} FPS CFR':x=65:y=80:fontsize=26:fontcolor=0xa7f37b",
            f"drawtext=fontfile={FONT}:text='BURNED-IN FRAME ID':x=560:y=450:fontsize=24:fontcolor=0x89949e",
            f"drawtext=fontfile={FONT}:text='SEQUENCE V1  /  SEED 56455952':x=65:y=630:fontsize=23:fontcolor=0x89949e"]
        for x,y in [(20,20),(1220,20),(20,660),(1220,660)]:
            filters += [f'drawbox=x={x}:y={y}:w=40:h=6:color=white:t=fill',f'drawbox=x={x}:y={y}:w=6:h=40:color=white:t=fill']
        master = OUT / f'signal-{fps}-100.mp4'
        with tempfile.NamedTemporaryFile(mode='w', suffix='.filter') as f:
            f.write(','.join(filters)); f.flush()
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'color=c=0x0b0e12:s=1280x720:r={fps}', '-filter_script:v',f.name,'-frames:v',str(total),'-an','-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p','-g',str(fps),'-bf','0','-threads','4','-movflags','+faststart',str(master)],check=True)
        for count in [20,50,100]:
            frames = events[count-1]['frame'] + events[count-1]['holdFrames']
            path = OUT / f'signal-{fps}-{count}.mp4'
            if count != 100:
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(master),'-map','0:v:0','-c','copy','-frames:v',str(frames),'-movflags','+faststart',str(path)],check=True)
            manifest['signals'][f'{fps}-{count}'] = {'file':path.name, 'fps':fps, 'eventCount':count, 'totalFrames':frames, 'duration':frames/fps, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'events':events[:count]}
        (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
        print(f'Generated {fps} FPS: {total} frames, {total/fps:.2f} s',flush=True)
if __name__ == '__main__': main()
