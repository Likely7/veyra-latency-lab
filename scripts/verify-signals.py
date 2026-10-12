#!/usr/bin/env python3
"""Check CFR timestamps, frame counts, digest, unique burned frame regions and all event boundaries."""
import hashlib,json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'public/signals'
manifest=json.loads((OUT/'manifest.json').read_text())
for key,s in manifest['signals'].items():
 p=OUT/s['file']; assert hashlib.sha256(p.read_bytes()).hexdigest()==s['sha256'],f'{key}: SHA mismatch'
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=r_frame_rate,avg_frame_rate,nb_frames,width,height:frame=best_effort_timestamp_time','-of','json',str(p)]))
 stream=probe['streams'][0]; frames=probe['frames']; assert stream['r_frame_rate']==f'{s["fps"]}/1'; assert stream['avg_frame_rate']==f'{s["fps"]}/1'; assert len(frames)==s['totalFrames']; assert (stream['width'],stream['height'])==(1280,720)
 for i,f in enumerate(frames): assert abs(float(f['best_effort_timestamp_time'])-i/s['fps'])<0.000002,f'{key}: non-CFR frame {i}'
 if s['eventCount']==100:
  hashes=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vf','crop=1150:125:65:140','-f','framemd5','-']).decode()
  values=[line.split(',')[-1].strip() for line in hashes.splitlines() if not line.startswith('#')]
  assert len(values)==s['totalFrames']; assert len(set(values))==len(values),f'{key}: duplicate burned frame region'
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vf','crop=8:8:200:400,format=gray','-f','rawvideo','-'])
  assert len(raw)==s['totalFrames']*64
  event=0
  for i in range(s['totalFrames']):
   if event<len(s['events']) and i==s['events'][event]['frame']:event+=1
   level=sum(raw[i*64:(i+1)*64])/64
   assert (level>230 if event%2 else level<10),f'{key}: wrong square at frame {i}'
 print(f'PASS {key}: {len(frames)} CFR frames, exact digest'+(', unique frame regions, all event boundaries' if s['eventCount']==100 else ''),flush=True)
