#!/usr/bin/env python3
"""Decode every frame: exact CFR PTS, unique digits, events, frame payload and CRC."""
import hashlib,json,pathlib,subprocess,tempfile
from signal_codec import crc8,GEOMETRY
ROOT=pathlib.Path(__file__).resolve().parents[1]

def verify_manifest(directory, manifest, keys=None):
    assert manifest['version']==2
    for key in keys or manifest['signals']:
        s=manifest['signals'][key]; p=directory/s['file']
        assert s['frameCode']==GEOMETRY,(key,'code geometry mismatch')
        assert hashlib.sha256(p.read_bytes()).hexdigest()==s['sha256'],f'{key}: SHA mismatch'
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0',
            '-show_streams','-show_frames','-show_entries',
            'stream=r_frame_rate,avg_frame_rate,nb_frames,width,height:frame=best_effort_timestamp_time',
            '-of','json',str(p)]))
        stream=probe['streams'][0]; frames=probe['frames']
        assert stream['r_frame_rate']==stream['avg_frame_rate']==f'{s["fps"]}/1'
        assert len(frames)==s['totalFrames']==int(stream['nb_frames'])
        assert (stream['width'],stream['height'])==(1280,720)
        for i,f in enumerate(frames):
            assert abs(float(f['best_effort_timestamp_time'])-i/s['fps'])<0.000002,(key,'non-CFR',i)
        with tempfile.TemporaryDirectory() as temporary:
            hashes=pathlib.Path(temporary)/'digits.md5'
            graph=('[0:v]split=3[id][code][event];[id]crop=1000:210:65:118[ids];'
                   '[code]crop=1088:2:62:650,scale=32:1:flags=neighbor,format=gray[c];'
                   '[event]crop=8:8:200:400,scale=32:1:flags=neighbor,format=gray[e];'
                   '[c][e]vstack=inputs=2,format=gray[data]')
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-filter_complex',graph,
                 '-map','[ids]','-f','framemd5',str(hashes),'-map','[data]','-f','rawvideo','-'])
            values=[line.split(',')[-1].strip() for line in hashes.read_text().splitlines() if not line.startswith('#')]
            assert len(values)==len(set(values))==s['totalFrames'],(key,'duplicate frame number region')
        assert len(raw)==s['totalFrames']*64,(key,'decoded raw count')
        event=0
        for i in range(s['totalFrames']):
            if event<len(s['events']) and i==s['events'][event]['frame']:event+=1
            row=raw[i*64:(i+1)*64]
            assert all(level<20 or level>235 for level in row[:32]),(key,'ambiguous bit',i)
            bits=''.join('1' if level>128 else '0' for level in row[:32])
            assert bits[:4]=='1010' and bits[-4:]=='0101',(key,'sync',i)
            decoded=int(bits[4:20],2)
            assert decoded==i,(key,'wrong machine-readable frame',i,decoded)
            assert int(bits[20:28],2)==crc8(decoded.to_bytes(2,'big')),(key,'CRC',i)
            level=sum(row[32:])/32
            assert (level>235 if event%2 else level<20),(key,'event square',i)
        print(f'PASS {key}: {len(frames)} frames; exact CFR PTS, unique digits, every event and frame16/CRC8 verified',flush=True)

if __name__=='__main__':
    directory=ROOT/'public/signals'
    verify_manifest(directory,json.loads((directory/'manifest.json').read_text()))
