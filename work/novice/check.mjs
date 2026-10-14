import fs from 'fs';
import { TextureAtlas, AtlasAttachmentLoader, SkeletonJson } from '@esotericsoftware/spine-core';
const atlas = new TextureAtlas(fs.readFileSync('public/assets/spine/knight/HulkForm2.atlas','utf8'));
const sd = new SkeletonJson(new AtlasAttachmentLoader(atlas)).readSkeletonData(fs.readFileSync('public/assets/spine/knight/HulkForm2.json','utf8'));
console.log('ok', sd.version, sd.animations.length, ['IDLE','ATTACK1','ATTACK2','ATTACK3','ATTACK4','SKILL1','DEFENSE','HIT1'].map(n=>!!sd.findAnimation(n)).join());
