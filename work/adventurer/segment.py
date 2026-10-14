import cv2, numpy as np, json, sys
im = cv2.imread('work/adventurer/sheet.png')
d = (255 - im.astype(int)).sum(2)          # distance from white
m = (d > 45).astype(np.uint8) * 255
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8)
comps = [(i, *st[i]) for i in range(1, n) if st[i][4] > 400]
vis = im.copy()
for i, x, y, w, h, a in comps:
    cv2.rectangle(vis, (x, y), (x+w, y+h), (0,0,255), 1)
    cv2.putText(vis, str(i), (x, y+12), 0, 0.45, (0,0,255), 1)
    print(i, x, y, w, h, a)
cv2.imwrite('work/adventurer/comps.png', vis)
