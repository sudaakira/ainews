#!/usr/bin/env python3
"""Extract numbered broadcast markers; build a reproducible, explicitly non-GPS replay.

Input is a locally supplied 854x480 JRA 2026 Takarazuka replay, not redistributed.
Requires numpy + opencv-python-headless only for --video. --raw reuses detections.
The original pixels, match score, rejected detections and metric assumptions remain
separate. No missing point is represented as a measured GPS position.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import median

HERE = Path(__file__).resolve().parents[1]
LAPS = [12.4,11.1,11.9,12.4,12.5,12.,12.1,12.1,11.8,11.6,12.2]
# Frame timestamps/centres manually identified in the public broadcast graphic.
SEEDS = {1:[(100,322,434)],2:[(100,408,418)],3:[(100,403,442)],
 4:[(100,336,421)],5:[(100,444,431)],6:[(100,305,408)],7:[(100,370,422)],
 8:[(100,218,437)],9:[(100,534,432)],10:[(100,439,411)],11:[(100,269,425)],
 12:[(80,423,410),(100,455,423)],13:[(100,272,404)],14:[(100,221,413)],
 15:[(100,207,422)],16:[(100,478,430),(60,470,422),(40,294,410)],
 17:[(40,418,438),(80,291,416)],18:[(80,329,407),(60,370,408)]}
RUNNERS = [
 (1,1,'ダノンデサイル','戸崎 圭太',3,132.6),
 (2,1,'ミュージアムマイル','D.レーン',9,133.7),
 (3,2,'シュガークン','吉村 誠之助',17,135.3),
 (4,2,'ミクニインスパイア','丹内 祐次',12,134.5),
 (5,3,'クロワデュノール','北村 友一',2,132.2),
 (6,3,'ビザンチンドリーム','西村 淳也',15,135.1),
 (7,4,'ファミリータイム','幸 英明',6,133.5),
 (8,4,'タガノデュード','高杉 吏麒',5,133.5),
 (9,5,'コスモキュランダ','横山 武史',4,132.6),
 (10,5,'ジューンテイク','松山 弘平',8,133.7),
 (11,6,'シンエンペラー','坂井 瑠星',11,134.2),
 (12,6,'マイネルエンペラー','川田 将雅',10,133.8),
 (13,7,'シェイクユアハート','古川 吉洋',14,134.9),
 (14,7,'スティンガーグラス','岩田 望来',13,134.8),
 (15,7,'マイユニバース','横山 典弘',None,None),
 (16,8,'メイショウタバル','武 豊',1,132.1),
 (17,8,'レガレイラ','C.ルメール',7,133.7),
 (18,8,'ミステリーウェイ','松本 大輝',16,135.2)]

def extract(video):
 import cv2
 import numpy as np
 cv2.setNumThreads(1)
 cap = cv2.VideoCapture(str(video))
 if (cap.get(cv2.CAP_PROP_FRAME_WIDTH),cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) != (854,480):
  raise ValueError('Calibration requires the 854x480 official replay')
 templates = {}
 for no,seeds in SEEDS.items():
  templates[no] = []
  for t,x,y in seeds:
   cap.set(cv2.CAP_PROP_POS_MSEC,t*1000); ok,im = cap.read()
   if not ok: raise ValueError('Missing template frame')
   templates[no].append(im[y-8:y+9,x-8:x+9].copy())
 mask = np.uint8((np.indices((17,17))[0]-8)**2+(np.indices((17,17))[1]-8)**2<=7.5**2)*255
 frames = []
 for t in np.arange(17,145.01,.5):
  cap.set(cv2.CAP_PROP_POS_MSEC,float(t*1000)); ok,im = cap.read()
  if not ok: continue
  roi=im[370:454,195:580];peaks=[]
  for no,ts in templates.items():
   score=np.maximum.reduce([cv2.matchTemplate(roi,p,cv2.TM_CCOEFF_NORMED,mask=mask) for p in ts])
   score=np.nan_to_num(score,nan=-1,posinf=-1,neginf=-1)
   for _ in range(3):
    _,s,_,(x,y)=cv2.minMaxLoc(score)
    if s<.66: break
    peaks.append((no,float(s),x+203,y+378));score[max(0,y-7):y+8,max(0,x-7):x+8]=-1
  peaks.sort(key=lambda p:-p[1]);found={};occupied=[]
  for no,s,x,y in peaks:
   if no in found or any((x-a)**2+(y-b)**2<49 for a,b in occupied):continue
   found[no]=(x,y,s);occupied.append((x,y))
  frames.append({'videoTime':round(float(t),3),'markers':{str(no):[x,y,round(s,4)] for no,(x,y,s) in found.items() if s>=.80}})
  if len(frames)%20==0: print('frame',len(frames),'video seconds',t,flush=True)
 return frames

def leader_distance(t):
 before=0
 for i,lap in enumerate(LAPS):
  if t<=before+lap:return i*200+(t-before)/lap*200
  before+=lap
 return 2200+(t-before)*14.5

def build(raw,video_sha=None):
 # Broadcast-only calibration: effective offset includes approximately 0.2s
 # of graphic latency; scale is inferred using the graphic's 200m posts.
 offset=7.6;px_per_m=4.2666666667;by_horse={no:[] for no in SEEDS};accepted=set()
 orientations=[]
 for f in raw:
  p=f['markers'].get('9')
  if p and p[2]>=.84:orientations.append((f['videoTime'], -1 if p[0]<385 else 1))
 for f in raw:
  vt=f['videoTime'];t=round(vt-offset,3)
  if not 10<=t<=130:continue
  sign=min(orientations,key=lambda p:abs(vt-p[0]))[1]
  front=241 if sign<0 else 534
  for key,(x,y,score) in f['markers'].items():
   no=int(key)
   if score<(.90 if no==15 else .84):continue
   gap=(front-x)*sign/px_per_m
   if not -.75<=gap<=120:continue
   lane=9-((y-390) if sign<0 else (445-y))/px_per_m
   by_horse[no].append({'t':t,'s':round(leader_distance(t)-max(0,gap),3),
    'lane':round(max(-10.3,min(10.3,lane)),3),'kind':'video-observation',
    'videoTime':vt,'screen':[x,y],'direction':sign,'matchScore':score,'gap':gap})
 horses=[]
 for no,frame,name,jockey,finish,seconds in RUNNERS:
  samples=by_horse[no]
  # Reject isolated identity/overlap errors against the horse's local motion.
  clean=[]
  for p in samples:
   peers=[q['gap'] for q in samples if abs(q['t']-p['t'])<=3]
   if len(peers)>=3 and abs(p['gap']-median(peers))>8:continue
   if clean:
    dt=p['t']-clean[-1]['t'];speed=(p['s']-clean[-1]['s'])/dt
    if speed<2 or speed>32:continue
   clean.append(p)
  if len(clean)<10:raise ValueError('Insufficient accepted observations: '+name)
  for p in clean:
   accepted.add((p['videoTime'],str(no)));p.pop('gap')
  start={'t':0,'s':0,'lane':round((9.5-no)*1.20,3),'kind':'estimated-start'}
  # JRA publishes 0.1s times: preserve official order inside that rounding bin.
  render_finish=None
  if seconds is not None:
   ties=sorted([r[4] for r in RUNNERS if r[5]==seconds])
   render_finish=round(seconds+(ties.index(finish)-(len(ties)-1)/2)*.02,3)
   clean=[p for p in clean if p['t']<render_finish and p['s']<2200]
   clean.append({'t':render_finish,'s':2200,'lane':clean[-1]['lane'],'kind':'official-finish-clock'})
  horses.append({'no':no,'frame':frame,'name':name,'jockey':jockey,'finish':finish,
   'finishSeconds':seconds,'renderFinishSeconds':render_finish,'result':'DNF' if finish is None else 'FINISHED',
   'samples':[start]+clean})
 for f in raw:
  f['markers']={no:{'screen':[p[0],p[1]],'matchScore':p[2],
   'accepted':(f['videoTime'],no) in accepted} for no,p in f['markers'].items()}
 count=sum(sum(p['kind']=='video-observation' for p in h['samples']) for h in horses)
 return {'schemaVersion':1,'raceId':'takarazuka-2026','date':'2026-06-14','venue':'阪神',
  'distanceMeters':2200,'winnerSeconds':132.1,'going':'重','isGpsTracking':False,
  'status':'broadcast-marker-reconstruction','sources':{
   'result':'https://www.jra.go.jp/datafile/seiseki/g1/takara/result/takara2026.html',
   'course':'https://www.jra.go.jp/keiba/baba/overview/2026_3_hanshin.html',
   'videoPlayer':'https://jra.webcdn.stream.ne.jp/web/jra/onetag2020/eqPcPlayer2.html?target=202603090411'},
  'extraction':{'method':'numbered-marker-template-match','sampleStepSeconds':.5,
   'observationCount':count,'rawMarkerCount':sum(len(f['markers']) for f in raw),'sourceVideoSha256':video_sha,
   'matchScoreIsProbability':False,'independentAccuracyValidation':False,
   'calibration':{'videoDimensions':[854,480],'effectiveVideoOffsetSeconds':offset,
    'pixelsPerMeter':px_per_m,'scaleIsEstimated':True,'latencyIsEstimated':True,
    'leaderScreenX':{'left':241,'right':534},'lateralBaselineY':{'left':390,'right':445}},
   'limitations':['JRA生GPS座標ではない','馬番重複・低信頼・異常な移動量を除外','内外の位置と縮尺は推定','読み取れない区間は補間','ゴール後は仮定の流し動作','15番の中止時刻・地点は未取得']},
  'furlongSeconds':LAPS,'horses':horses,'screenObservations':raw}

def main():
 p=argparse.ArgumentParser();p.add_argument('--video',type=Path);p.add_argument('--raw',type=Path)
 p.add_argument('--raw-output',type=Path);p.add_argument('--output',type=Path,default=HERE/'data/takarazuka-2026-tracking.json')
 args=p.parse_args()
 if not args.video and not args.raw:p.error('--video or --raw is required')
 raw=json.loads(args.raw.read_text()) if args.raw else extract(args.video)
 if args.raw_output:args.raw_output.write_text(json.dumps(raw,separators=(',',':')))
 sha=hashlib.sha256(args.video.read_bytes()).hexdigest() if args.video else None
 data=build(raw,sha);args.output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 print('saved',args.output,'observations',data['extraction']['observationCount'])
 for h in data['horses']:print(h['no'],h['name'],len(h['samples']),h['samples'][-1]['t'])

if __name__=='__main__':main()
