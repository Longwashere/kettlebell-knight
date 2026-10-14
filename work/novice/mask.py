import cv2, numpy as np
im = cv2.imread('work/novice/ref.png')
print(im.shape)
bg = np.median(np.concatenate([im[:40,:].reshape(-1,3), im[-40:,:].reshape(-1,3)]),axis=0)
print(bg)
d = np.abs(im.astype(int)-bg).sum(2)
m = (d>38).astype(np.uint8)*255
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5,5),np.uint8))
n,lab,st,_ = cv2.connectedComponentsWithStats(m)
big = 1+np.argmax(st[1:,4]); m = ((lab==big)*255).astype(np.uint8)
# fill holes
ff = m.copy(); h,w=m.shape; mk=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,mk,(0,0),255)
m = m | cv2.bitwise_not(ff)
cv2.imwrite('work/novice/mask.png', m)
vis = im.copy(); vis[m==0] = (255,0,255)
for g in range(0,1024,50):
    cv2.line(vis,(g,0),(g,1023),(0,255,255),1); cv2.line(vis,(0,g),(1023,g),(0,255,255),1)
    cv2.putText(vis,str(g),(g+2,12),0,0.4,(255,255,0),1); cv2.putText(vis,str(g),(2,g+12),0,0.4,(255,255,0),1)
cv2.imwrite('work/novice/grid.png', vis)
print(m.sum()/255)
