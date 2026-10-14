#!/bin/sh
# Rebuild the adventurer rig end to end with the spine-animation skill scripts.
set -e
cd "$(dirname "$0")/../.."
SK=.agents/skills/spine-animation/scripts
OUT=public/assets/spine/adventurer
python3 work/adventurer/extract.py >/dev/null
python3 work/adventurer/gen_config.py
mkdir -p $OUT && rm -rf $OUT/parts && cp -R work/adventurer/parts $OUT/parts
cp work/adventurer/config.json $OUT/config.json
python3 $SK/build_spine_json.py --config $OUT/config.json --output $OUT/adventurer.json >/dev/null
# build_spine_json.py stamps 4.2.0; an FK rig without constraints is identical in the 4.3 format
python3 -c "import json,sys; p=sys.argv[1]; d=json.load(open(p)); d['skeleton']['spine']='4.3.00'; json.dump(d,open(p,'w'),indent=2)" $OUT/adventurer.json
python3 $SK/make_atlas.py --parts $OUT/parts --output $OUT --name adventurer >/dev/null
ln -sfn parts $OUT/images
python3 $SK/generate_spine_player.py --skeleton $OUT/adventurer.json --atlas $OUT/adventurer.atlas \
  --atlas-image $OUT/adventurer.png --output $OUT/preview.html --animation idle --title "Adventurer — Spine 4.3" >/dev/null
sed -i '' 's#spine-player@4\.2\.\*#spine-player@4.3.13#g; s/  new spine.SpinePlayer("player-container"/  window.spinePlayer = new spine.SpinePlayer("player-container"/' $OUT/preview.html
echo "built $OUT"
