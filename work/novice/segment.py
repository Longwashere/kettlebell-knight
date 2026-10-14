import cv2, numpy as np, json, os
im = cv2.imread('work/novice/ref.png')
bg = np.array([38,38,38])
d = np.abs(im.astype(int)-bg).sum(2)
m = (d>38).astype(np.uint8)*255
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5,5),np.uint8))
n,lab,st,_ = cv2.connectedComponentsWithStats(m)
big = 1+np.argmax(st[1:,4]); m = ((lab==big)*255).astype(np.uint8)
# fill only small holes
inv = cv2.bitwise_not(m); n,lab,st,_ = cv2.connectedComponentsWithStats(inv)
for i in range(1,n):
    x,y,w,h,a = st[i]
    if a<400 and x>0 and y>0: m[lab==i]=255
H,W = m.shape
# priority-ordered polygons (first wins)
P = [
 ("hand_back",   [(350,520),(445,520),(450,625),(350,625)]),
 ("hand_front",  [(630,500),(710,500),(710,610),(630,610)]),
 ("forearm_back",[(340,425),(440,425),(450,520),(350,520)]),
 ("forearm_front",[(590,430),(690,430),(710,500),(630,500),(605,470)]),
 ("upperarm_back",[(370,235),(440,235),(450,345),(440,425),(340,425),(345,330)]),
 ("upperarm_front",[(580,240),(625,250),(650,320),(690,430),(590,430),(582,340)]),
 ("head",        [(430,40),(620,40),(620,232),(555,238),(480,232),(430,232)]),
 ("foot_back",   [(360,895),(480,895),(480,1000),(360,1000)]),
 ("foot_front",  [(550,895),(730,895),(730,1000),(550,1000)]),
 ("shin_back",   [(360,738),(500,738),(500,895),(360,895)]),
 ("shin_front",  [(530,738),(660,738),(660,895),(530,895)]),
 ("pelvis",      [(395,462),(615,462),(615,590),(600,640),(595,672),(510,672),(505,640),(430,640),(395,672)]),
 ("thigh_back",  [(370,560),(536,560),(536,692),(506,704),(500,738),(360,738)]),
 ("thigh_front", [(522,560),(660,560),(660,738),(534,738),(534,692)]),
 ("torso",       [(300,150),(700,150),(700,470),(300,470)]),
]
grow = {"torso":14,"pelvis":6,"thigh_back":10,"thigh_front":10,"shin_back":8,"shin_front":8,"upperarm_back":6,"upperarm_front":6,"forearm_back":6,"forearm_front":6,"hand_back":3,"hand_front":3,"head":3,"foot_back":3,"foot_front":3}
owner = np.full((H,W),-1,np.int32)
masks = {}
for i,(nm,poly) in enumerate(P):
    pm = np.zeros((H,W),np.uint8); cv2.fillPoly(pm,[np.array(poly,np.int32)],255)
    pm = (pm>0)&(m>0)&(owner<0)
    owner[pm]=i; masks[nm]=pm
un = (m>0)&(owner<0); print("unassigned px", un.sum())
os.makedirs('work/novice/parts',exist_ok=True)
info={}
for i,(nm,poly) in enumerate(P):
    g = grow[nm]
    mk = cv2.dilate(masks[nm].astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*g+1,2*g+1)))>0
    # growth stays inside silhouette but may not take pixels of limbs drawn in front for torso etc (accepted)
    mk &= (m>0)
    ys,xs = np.where(mk)
    x0,x1,y0,y1 = xs.min(),xs.max()+1,ys.min(),ys.max()+1
    rgba = cv2.cvtColor(im,cv2.COLOR_BGR2BGRA); rgba[...,3]=np.where(mk,255,0)
    cv2.imwrite(f'work/novice/parts/{nm}.png', rgba[y0:y1,x0:x1])
    info[nm]={"x":int(x0),"y":int(y0),"w":int(x1-x0),"h":int(y1-y0)}
json.dump(info,open('work/novice/layout.json','w'),indent=1)
vis = im.copy(); rng=np.random.RandomState(3)
for i,(nm,_) in enumerate(P):
    c = rng.randint(60,255,3); vis[masks[nm]] = (0.45*vis[masks[nm]]+0.55*c).astype(np.uint8)
    ys,xs=np.where(masks[nm]); cv2.putText(vis,nm,(int(xs.mean())-30,int(ys.mean())),0,0.4,(255,255,255),1)
cv2.imwrite('work/novice/segvis.png',vis)
