import json, math, cv2, numpy as np
D='public/assets/spine/novice_adventurer_side/'
S=json.load(open(D+'novice_adventurer_side.json'))
imgs={s['name']:cv2.imread(f"{D}images/{s['name']}.png",cv2.IMREAD_UNCHANGED) for s in S['slots']}
B={b['name']:b for b in S['bones']}
def samp(fr,t,keys):
    if not fr: return None
    if t<=fr[0]['time']: f=fr[0]; return [f.get(k,0) for k in keys]
    for a,b in zip(fr,fr[1:]):
        if a['time']<=t<=b['time']:
            u=(t-a['time'])/(b['time']-a['time']); return [a.get(k,0)+(b.get(k,0)-a.get(k,0))*u for k in keys]
    f=fr[-1]; return [f.get(k,0) for k in keys]
def pose(anim,t):
    world={}
    for b in S['bones']:
        n=b['name']; x,y,r=b.get('x',0),b.get('y',0),0
        ab=anim['bones'].get(n,{})
        if 'rotate' in ab: r+=samp(ab['rotate'],t,['value'])[0]
        if 'translate' in ab: dx,dy=samp(ab['translate'],t,['x','y']); x+=dx;y+=dy
        if 'parent' in b:
            p=world[b['parent']]; c,s=math.cos(p[2]),math.sin(p[2])
            wx=p[0]+x*c-y*s; wy=p[1]+x*s+y*c; wr=p[2]+math.radians(r)
        else: wx,wy,wr=x,y,math.radians(r)
        world[n]=(wx,wy,wr)
    return world
def render(anim,t,W=700,Hh=1000):
    w=pose(anim,t); canvas=np.full((Hh,W,3),43,np.uint8)
    for s in S['slots']:
        a=S['skins'][0]['attachments'][s['name']][s['name']]; bx,by,br=w[s['bone']]
        c,sn=math.cos(br),math.sin(br)
        cx=bx+a['x']*c-a['y']*sn; cy=by+a['x']*sn+a['y']*c
        im=imgs[s['name']]; h,ww=im.shape[:2]
        # rotation matrix in image space (y down): angle br CCW in spine = -br in image
        M=cv2.getRotationMatrix2D((ww/2,h/2),math.degrees(br),1)
        M[0,2]+=W/2+cx-ww/2; M[1,2]+=Hh-60-cy-h/2
        warp=cv2.warpAffine(im,M,(W,Hh),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0))
        al=warp[...,3:4]/255.0; canvas=(canvas*(1-al)+warp[...,:3]*al).astype(np.uint8)
    return canvas
rows=[]
for name,T in [('idle',2.4),('walk',.8),('run',.5),('attack',.9),('defend',1.0)]:
    a=S['animations'][name]
    fr=[render(a,T*k/5.0 if name not in('attack',) else [0,.25,.36,.5,.8][k]*1.0) for k in range(5)]
    row=np.hstack([cv2.resize(f,(350,500)) for f in fr]); cv2.putText(row,name,(8,24),0,0.8,(0,255,255),2); rows.append(row)
cv2.imwrite('work/novice/sheet.png',np.vstack(rows[:3])); cv2.imwrite('work/novice/sheet2.png',np.vstack(rows[3:]))
