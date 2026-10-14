import json, math, os, shutil, subprocess
L = json.load(open('work/novice/layout.json'))
CX, GY = 520, 975
def sp(px,py): return (px-CX, GY-py)
# name: (parent, pixel joint)
BONES = [
 ("root",None,(520,975)),
 ("hip","root",(520,600)),
 ("torso","hip",(520,470)),
 ("head","torso",(515,228)),
 ("upperarm_back","torso",(405,270)),
 ("forearm_back","upperarm_back",(385,430)),
 ("hand_back","forearm_back",(395,525)),
 ("upperarm_front","torso",(598,270)),
 ("forearm_front","upperarm_front",(640,432)),
 ("hand_front","forearm_front",(665,512)),
 ("thigh_back","hip",(480,600)),
 ("shin_back","thigh_back",(440,738)),
 ("foot_back","shin_back",(425,897)),
 ("thigh_front","hip",(565,600)),
 ("shin_front","thigh_front",(590,738)),
 ("foot_front","shin_front",(600,897)),
]
pix = {b[0]:b[2] for b in BONES}
par = {b[0]:b[1] for b in BONES}
children = {}
for n,p,_ in BONES:
    if p: children.setdefault(p,[]).append(n)
bones=[]
for n,p,j in BONES:
    wx,wy = sp(*j)
    if p: px_,py_ = sp(*pix[p]); b={"name":n,"parent":p,"x":wx-px_,"y":wy-py_}
    else: b={"name":n}
    ch = children.get(n)
    if ch:
        cx,cy = sp(*pix[ch[0]]); b["length"]=round(math.hypot(cx-wx,cy-wy),1)
    else: b["length"]=40
    bones.append(b)
ORDER = [("foot_back","foot_back"),("shin_back","shin_back"),("thigh_back","thigh_back"),
 ("foot_front","foot_front"),("shin_front","shin_front"),("thigh_front","thigh_front"),
 ("torso","torso"),("pelvis","hip"),("head","head"),
 ("upperarm_back","upperarm_back"),("forearm_back","forearm_back"),("hand_back","hand_back"),
 ("upperarm_front","upperarm_front"),("forearm_front","forearm_front"),("hand_front","hand_front")]
slots=[]; att={}
for part,bone in ORDER:
    slots.append({"name":part,"bone":bone,"attachment":part})
    l = L[part]; cxp = l["x"]+l["w"]/2; cyp = l["y"]+l["h"]/2
    bj = pix[bone]
    att[part]={part:{"x":round(cxp-bj[0],1),"y":round(-(cyp-bj[1]),1),"width":l["w"],"height":l["h"]}}
# ---------- animation helpers ----------
def ease_rot(t1,v1,t2,v2): d=t2-t1; return [round(t1+d*.33,4),v1,round(t1+d*.67,4),v2]
def ease_tr(t1,a1,b1,t2,a2,b2): d=t2-t1; return [round(t1+d*.33,4),a1,round(t1+d*.67,4),a2,round(t1+d*.33,4),b1,round(t1+d*.67,4),b2]
def rot_keys(pts, smooth=True):
    out=[]
    for i,(t,v) in enumerate(pts):
        k={"time":round(t,4),"value":round(v,2)}
        if smooth and i<len(pts)-1: k["curve"]=ease_rot(t,v,*pts[i+1])
        out.append(k)
    return out
def tr_keys(pts, smooth=True):
    out=[]
    for i,(t,x,y) in enumerate(pts):
        k={"time":round(t,4),"x":round(x,2),"y":round(y,2)}
        if smooth and i<len(pts)-1: k["curve"]=ease_tr(t,x,y,*pts[i+1])
        out.append(k)
    return out
def cyc(fn,T,N=16): return [(T*i/N, fn(2*math.pi*i/N)) for i in range(N+1)]
def cyct(fn,T,N=16):
    return [(T*i/N,)+tuple(fn(2*math.pi*i/N)) for i in range(N+1)]
def A(): return {"bones":{}}
def setrot(a,bone,pts,smooth=True): a["bones"].setdefault(bone,{})["rotate"]=rot_keys(pts,smooth)
def settr(a,bone,pts,smooth=True): a["bones"].setdefault(bone,{})["translate"]=tr_keys(pts,smooth)
def poses(a,T,table,smooth=True):
    """table: bone -> list of (time, value) or (time,x,y) for hip translate"""
    for b,pts in table.items():
        if len(pts[0])==3: settr(a,b,pts,smooth)
        else: setrot(a,b,pts,smooth)
def gait(T,thigh,shin_k,bob,lean,arm,elbow,N=16,bounce=0):
    a=A(); c=math.cos; s=math.sin
    tf=lambda p: thigh*c(p); tb=lambda p: thigh*c(p+math.pi)
    sf=lambda p: -shin_k*max(0,-s(p))-4; sb=lambda p: -shin_k*max(0,s(p))-4
    setrot(a,"thigh_front",cyc(tf,T,N),False); setrot(a,"thigh_back",cyc(tb,T,N),False)
    setrot(a,"shin_front",cyc(sf,T,N),False); setrot(a,"shin_back",cyc(sb,T,N),False)
    setrot(a,"foot_front",cyc(lambda p:-(tf(p)+sf(p))*.6,T,N),False)
    setrot(a,"foot_back",cyc(lambda p:-(tb(p)+sb(p))*.6,T,N),False)
    settr(a,"hip",cyct(lambda p:(0,-bob*c(2*p)+bounce),T,N),False)
    setrot(a,"torso",cyc(lambda p:lean+1.5*c(p),T,N),False)
    setrot(a,"head",cyc(lambda p:-lean*.7-1.5*c(p),T,N),False)
    uf=lambda p: arm*c(p+math.pi); ub=lambda p: arm*c(p)
    setrot(a,"upperarm_front",cyc(uf,T,N),False); setrot(a,"upperarm_back",cyc(ub,T,N),False)
    setrot(a,"forearm_front",cyc(lambda p:elbow+.35*max(0,uf(p)),T,N),False)
    setrot(a,"forearm_back",cyc(lambda p:elbow+.35*max(0,ub(p)),T,N),False)
    setrot(a,"hand_front",cyc(lambda p:4+.15*uf(p),T,N),False); setrot(a,"hand_back",cyc(lambda p:4+.15*ub(p),T,N),False)
    return a
anims={}
# idle
a=A(); T=2.4
settr(a,"hip",cyct(lambda p:(0,3*math.sin(p)),T,8),False)
setrot(a,"torso",cyc(lambda p:1.2*math.sin(p),T,8),False)
setrot(a,"head",cyc(lambda p:-1.5*math.sin(p-.6),T,8),False)
setrot(a,"upperarm_front",cyc(lambda p:3+2*math.sin(p-.4),T,8),False)
setrot(a,"upperarm_back",cyc(lambda p:-3-2*math.sin(p-.4),T,8),False)
setrot(a,"forearm_front",cyc(lambda p:8+2*math.sin(p-.8),T,8),False)
setrot(a,"forearm_back",cyc(lambda p:8+2*math.sin(p-.8),T,8),False)
anims["idle"]=a
anims["walk"]=gait(0.8,26,42,5,-4,22,16)
anims["run"]=gait(0.5,46,85,10,-14,38,75,bounce=9)
# attack (one-shot overhead strike)
T=0.9; tm=[0,.25,.36,.5,.9]
a=A()
poses(a,T,{
 "hip":[(0,0,0),(.25,-14,-12),(.36,24,-8),(.5,22,-8),(.9,0,0)],
 "torso":[(t,v) for t,v in zip(tm,[0,10,-18,-14,0])],
 "head":[(t,v) for t,v in zip(tm,[0,-6,10,8,0])],
 "upperarm_front":list(zip(tm,[0,135,62,58,0])),
 "forearm_front":list(zip(tm,[0,-35,18,12,0])),
 "hand_front":list(zip(tm,[0,-10,-12,-8,0])),
 "upperarm_back":list(zip(tm,[0,-32,38,32,0])),
 "forearm_back":list(zip(tm,[0,45,65,55,0])),
 "thigh_front":list(zip(tm,[0,-8,32,28,0])),
 "shin_front":list(zip(tm,[0,-10,-20,-16,0])),
 "foot_front":list(zip(tm,[0,10,-10,-8,0])),
 "thigh_back":list(zip(tm,[0,12,-24,-22,0])),
 "shin_back":list(zip(tm,[0,-16,-10,-8,0])),
 "foot_back":list(zip(tm,[0,4,30,26,0])),
})
anims["attack"]=a
# defend (guard up, hold, release)
T=1.0; tm=[0,.18,.5,.82,1.0]
a=A()
poses(a,T,{
 "hip":[(0,0,0),(.18,-10,-22),(.5,-10,-25),(.82,-10,-22),(1,0,0)],
 "torso":list(zip(tm,[0,-9,-10,-9,0])),
 "head":list(zip(tm,[0,8,9,8,0])),
 "upperarm_front":list(zip(tm,[0,42,46,42,0])),
 "forearm_front":list(zip(tm,[0,118,124,118,0])),
 "hand_front":list(zip(tm,[0,12,14,12,0])),
 "upperarm_back":list(zip(tm,[0,30,34,30,0])),
 "forearm_back":list(zip(tm,[0,125,130,125,0])),
 "hand_back":list(zip(tm,[0,12,14,12,0])),
 "thigh_front":list(zip(tm,[0,38,40,38,0])),
 "shin_front":list(zip(tm,[0,-46,-50,-46,0])),
 "foot_front":list(zip(tm,[0,8,10,8,0])),
 "thigh_back":list(zip(tm,[0,-16,-18,-16,0])),
 "shin_back":list(zip(tm,[0,-30,-32,-30,0])),
 "foot_back":list(zip(tm,[0,46,50,46,0])),
})
anims["defend"]=a
spine={"skeleton":{"hash":"novice_side","spine":"4.2.00","x":-260,"y":-10,"width":520,"height":930,"images":"./images/","audio":""},
 "bones":bones,"slots":slots,"skins":[{"name":"default","attachments":att}],"animations":anims}
out='public/assets/spine/novice_adventurer_side'
os.makedirs(out,exist_ok=True)
shutil.rmtree(out+'/images',ignore_errors=True); shutil.copytree('work/novice/parts',out+'/images')
json.dump(spine,open(out+'/novice_adventurer_side.json','w'),indent=1)
