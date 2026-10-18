#!/bin/zsh
# usage: work/trialshot.sh <id> [extra steps...]  → prints png path (2x upscale copy)
id=$1; shift
out=$(npm run shot -- --route "/tv?view=TRIAL&trial=$id" idle wait:1200 canvas:$id "$@" 2>&1)
echo "$out" | grep -iE "error|exception|✗" | head -5
f=$(echo "$out" | grep -oE "work/shots/[^ ]+/$id\.png" | head -1)
python3 -c "from PIL import Image; im=Image.open('$f'); im.resize((im.width*3,im.height*3),Image.NEAREST).save('work/trialshots/$id.png')"
echo work/trialshots/$id.png
