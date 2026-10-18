import re, json
LEG = {
 'VERDANT_FOREST': ('verdant_forest', 'THE LEGEND: THE SWORD IN THE STONE', 'What the Old Pines Remember', [
   'Deep in the green, a bell-hilted blade sleeps in mossy granite. No arm has ever drawn it.',
   'The druids say the stone was never listening for arms. It listens for legs.',
   'Sink low and rise again beneath these pines, a hundred times and a hundred more, and one dusk the stone will rise from the moss to meet you.']),
 'DARK_FOREST': ('dark_forest', 'THE LEGEND: THE BLADE THAT WAITS', 'Whispers Among the Briars', [
   'The briars have not swallowed everything. Somewhere in the gloom, a sword of pale light still stands in its stone.',
   'A king who could no longer rise from his throne set it there, for those who still could.',
   'Squat deep in these woods, again and again. The stone is listening for knees that refuse to quit.']),
 'TOWN_SQUARE': ('town_square', 'THE LEGEND: THE HIGH STRIKER', 'A Carnival Game for Giants', [
   'When the fair still came to Oakhaven, a striker stood in the square, and the mallet beside it was no toy.',
   'Only one swing in a hundred ever rang the brass bell at the top. The showman never sold that mallet. He said it picks its own owner.',
   'Swing hard in these streets, and swing often. Some night the lanterns will relight, and the bell will be waiting.']),
 'TOWN_NIGHT': ('town_square', 'THE LEGEND: THE STRIKER AT MIDNIGHT', 'When the Lanterns Relight', [
   'On certain nights a phantom fair returns to the square: striped tents, a painted pole, a brass bell at its peak.',
   'It comes only for knights whose swings are heard across the rooftops.',
   'So swing like you mean to wake the dead. The louder the iron, the sooner the music starts.']),
 'SUNKEN_CISTERN': ('sunken_cistern', 'THE LEGEND: THE DROWNED ANCHOR', 'Chained Beneath the Black Water', [
   'The first kings sank an anchor at the heart of the cistern to hold the waters still. Its chain still hangs from the vault above.',
   'The tide drags it ever downward, and the tide never tires.',
   'Row the iron here, low and hard, until your back burns. Haul enough, and one day the chain will drift within your reach.']),
 'CATHEDRAL_CRYPT': ('cathedral_crypt', 'THE LEGEND: THE LAST VIGIL', 'The Censer That Never Went Out', [
   'In the deepest chapel one censer still swings above a ring of candles that must never go dark.',
   'Through the Lich’s winter, the martyrs kept them lit by circling iron around their heads, hour upon hour.',
   'Trace the halo in these halls, round and round. The candles remember the motion, and they will call you to keep the vigil.']),
 'BLOOD_CEMETERY': ('blood_cemetery', 'THE LEGEND: THE PALLBEARER’S GRAVE', 'A Coffin No Six Could Carry', [
   'Beneath the red moon lies a coffin too heavy for six pallbearers. They buried it with its weapon still inside.',
   'The gravediggers swear it stirs for whoever lifts the most from the earth, back straight, hips driving, again and again.',
   'Pull the dead weight up from this soil. When the eclipse comes, the grave will open for you. Only once.']),
 'BELFRY_RAMPARTS': ('belfry_ramparts', 'THE LEGEND: THE GREAT BELL', 'It Tolls With the Storm', [
   'The greatest bell of Aethelgard was never cast down. It hangs alone above the ramparts, and only thunder rings it.',
   'The old bell-wardens learned to snatch their iron skyward in time with the lightning.',
   'Snatch the bell here, high and fast, rep after rep. The storm will hear your rhythm, and then it will test it.']),
 'CATHEDRAL_VAULT': ('cathedral_vault', 'THE LEGEND: THE GILDED VAULT', 'The Artificer’s Last Lock', [
   'Behind the foundry lies a door with no keyhole, only a gauge of hissing steam.',
   'The artificer swore it would open for a body that could squat and press in a single breath, faster than the pressure fades.',
   'Drive the iron overhead in these halls, thrust upon thrust. Build the steam, and the door may finally show you its gold.']),
 'VOLCANIC_FORGE': ('volcanic_forge', 'THE LEGEND: THE TITAN’S ANVIL', 'A Blade Left Unfinished', [
   'On the oldest anvil lies a blade the first smiths never finished. After a thousand years, it still glows.',
   'It wants no hammer. It hardens under hands that clean the iron to the chest and press it to the sky.',
   'Clean and press in the heat of the forge until it becomes your heartbeat. Then the anvil will call, before the metal cools.']),
 'ELDRITCH_ALTAR': ('eldritch_altar', 'THE LEGEND: THE HOLLOW CHOIR', 'A Bell That Rings Inside Your Skull', [
   'Within the rift hangs a bell with an eye where its clapper should be. Its choir sings things that are not true.',
   'Only the balanced hear past the lies: one foot rooted, the body hinged and steady, the mind still.',
   'Hinge on one leg before this altar, over and over. When the rift opens, trust your count, not your eyes.']),
 'OBSIDIAN_THRONE': ('obsidian_throne', 'THE LEGEND: THE THIRTEEN LABOURS', 'The Blade That Answers Excalibell', [
   'Behind the Sovereign’s seat stands a second sword in a second stone: the dark twin of the forest blade.',
   'It will not stir for a stranger. It wakes only for the knight who already bears Excalibell.',
   'Every rep laid down in this hall is heard. Master all thirteen labours of the iron, and the twin blade will name its trial.']),
}
p='src/shared/stageLore.ts'; s=open(p).read()
def esc(t): return t.replace("'", "\\'")
for key,(d,ch,sub,text) in LEG.items():
    start=s.index(f"  {key}: {{\n")
    end=s.index("\n  },\n", start)
    block=s[start:end]
    # insert before the last scene (the sacrament / trial)
    i=block.rfind("      {\n        chapter:")
    lines="\n".join(f"          '{esc(t)}'," for t in text)
    scene=(f"      {{\n        chapter: '{esc(ch)}',\n        subtitle: '{esc(sub)}',\n        text: [\n{lines}\n        ],\n"
           f"        mood: 'legend',\n        image: '/assets/cinematics/{d}/chapter5_legend.jpg',\n      }},\n")
    block=block[:i]+scene+block[i:]
    s=s[:start]+block+s[end:]
s=s.replace("mood: 'former_glory' | 'ruin' | 'apex_terror' | 'iron_vow';","mood: 'former_glory' | 'ruin' | 'apex_terror' | 'legend' | 'iron_vow';",1)
open(p,'w').write(s)
