# Assembled pose: top-left of each part on a 400x760 canvas (feet near y=705, centre x=200).
W, H = 400, 760
PLACE = {
 "head":        (142, 58),
 "torso":       (126, 150),
 "r_upper_arm": (100, 186),
 "r_forearm":   (84, 246),
 "l_upper_arm": (246, 190),
 "l_forearm":   (246, 258),
 "r_thigh":     (115, 338),
 "l_thigh":     (182, 338),
 "r_shin":      (133, 514),
 "l_shin":      (208, 506),
 "r_boot":      (106, 610),
 "l_boot":      (220, 612),
}
SCALE = {"l_forearm": 1.1}
# back -> front
ORDER = ["l_upper_arm", "l_forearm",
         "r_shin", "l_shin", "r_boot", "l_boot", "l_thigh", "r_thigh",
         "torso", "head", "r_upper_arm", "r_forearm"]
