// Character journeys. Points are place ids (named stops) or [x, y] map coordinates.
// mode: walk | boat | flight | under (Paths of the Dead) | funeral
// Great West Road through Anórien, along the northern foot of the White Mountains
const ANORIEN = [[680, 684], [730, 692], [768, 702], [788, 715]];
const ANORIEN_W = ANORIEN.slice().reverse();
const RIVER_DOWN = ['lorien', [692, 462], [712, 495], [742, 532], [762, 566], 'argonath', 'amonhen'];
const FELLOWSHIP = ['rivendell', [560, 300], 'hollin', [592, 386], 'caradhras', [590, 398], 'moria', [622, 410], 'lorien'];

export const JOURNEYS = [
  { id: 'bilbo', name: 'Bilbo Baggins', sub: 'There and Back Again · The Hobbit, 2941\u201342', color: '#f7c331', halo: '#6b4a00', lane: -3,
    summary: 'In 2941 Gandalf and thirteen dwarves led by Thorin Oakenshield recruited a reluctant Bilbo as their burglar. They were caught by trolls, rested in Rivendell, were captured by goblins under the Misty Mountains, where Bilbo found the Ring, and were rescued by eagles. After Beorn\u2019s hospitality came the starving trek through Mirkwood, the Wood-elves\u2019 dungeons and a barrel-ride to Lake-town. At the Lonely Mountain Bilbo matched wits with Smaug; the dragon was slain, the Battle of Five Armies was won, and Bilbo travelled home by Beorn\u2019s house and Rivendell.',
    segments: [
      { mode: 'walk', pts: ['bagend', 'bywater', [281, 262], 'bree', [430, 266], [505, 260], 'trollshaws', [562, 252], 'rivendell', [600, 240], 'goblintown'] },
      { mode: 'flight', pts: ['goblintown', [640, 226], 'carrock'] },
      { mode: 'walk', pts: ['carrock', 'beorn', [704, 232], [780, 222], [830, 190], 'thranduil'] },
      { mode: 'boat', pts: ['thranduil', [866, 190], [895, 202], 'laketown'] },
      { mode: 'walk', pts: ['laketown', [910, 172], 'dale', 'erebor'] },
      { mode: 'walk', pts: ['erebor', [880, 102], [790, 94], [712, 108], [694, 190], 'beorn', 'carrock', [640, 246], [612, 250], 'rivendell', [562, 252], 'trollshaws', [430, 264], 'bree', [281, 263], 'bywater', 'bagend'] }
    ] },
  { id: 'frodo', name: 'Frodo & Sam', sub: 'The Ring-bearer and his gardener, 3018\u201321', color: '#ff6a2b', halo: '#6a1d00', lane: 1,
    summary: 'Frodo left Bag End in September 3018 with Sam, gathered Merry and Pippin, slipped through the Old Forest and reached Bree, where Strider guided them to Rivendell despite the Black Riders. Frodo went south as Ring-bearer with the Fellowship; after it broke at Parth Galen he and Sam crossed the Emyn Muil and the Dead Marshes with Gollum, passed through Ithilien and climbed into Mordor by Cirith Ungol. On 25 March 3019 the Ring perished in the fire of Mount Doom. Eagles bore them out; they came home to free the Shire, and two years later Frodo sailed from the Grey Havens.',
    segments: [
      { mode: 'walk', pts: ['bagend', [255, 282], [283, 271], 'buckland', 'oldforest', [330, 288], 'barrowdowns', 'bree', 'weathertop', [505, 258], 'trollshaws', [562, 252], 'rivendell'] },
      { mode: 'walk', pts: FELLOWSHIP },
      { mode: 'boat', pts: RIVER_DOWN },
      { mode: 'walk', pts: ['amonhen', [782, 610], 'emynmuil', 'deadmarshes', [872, 608], [866, 640], 'henneth', [856, 740], 'minasmorgul', 'ciritungol', [918, 724], 'mountdoom'] },
      { mode: 'flight', pts: ['mountdoom', [900, 690], 'cormallen'] },
      { mode: 'walk', pts: ['cormallen', 'minastirith', ...ANORIEN_W, 'edoras', 'helmsdeep', 'isengard', [552, 596], [532, 540], [530, 470], [535, 420], 'hollin', [560, 300], 'rivendell', [505, 258], 'weathertop', 'bree', [281, 262], 'bywater', 'bagend'] },
      { mode: 'walk', pts: ['bagend', 'micheldelving', [166, 262], 'greyhavens'] }
    ] },
  { id: 'fellowship', name: 'The Fellowship', sub: 'The Nine Walkers, Rivendell to Parth Galen', color: '#b46cff', halo: '#3a0f6b', lane: 0,
    summary: 'The Nine Walkers chosen at the Council of Elrond were Frodo, Sam, Merry, Pippin, Gandalf, Aragorn, Legolas, Gimli and Boromir. Leaving Rivendell on 25 December 3018, they were driven back by the snows of Caradhras and took the dark road through Moria, where Gandalf fell. Galadriel sheltered them in Lothlórien, and they paddled elven boats down the Anduin past the Argonath. At Parth Galen the company was broken: Boromir fell, Frodo and Sam went east alone, and Merry and Pippin were carried off by Orcs.',
    segments: [{ mode: 'walk', pts: FELLOWSHIP }, { mode: 'boat', pts: RIVER_DOWN }] },
  { id: 'aragorn', name: 'Aragorn, Legolas & Gimli', sub: 'The Three Hunters and the Grey Company', color: '#3d8bff', halo: '#0b2a66', lane: 2,
    summary: 'After the Breaking of the Fellowship the Three Hunters ran for days across Rohan after the Orcs who had taken Merry and Pippin, and in Fangorn met Gandalf returned as the White. They rode with Théoden to Edoras and the defence of Helm\u2019s Deep, then to ruined Isengard. Aragorn wrested the palantír to his will, then led the Grey Company by the Paths of the Dead to Erech and Pelargir, where the Dead routed the Corsairs. Sailing the captured ships up the Anduin he turned the Battle of the Pelennor Fields, and marched with the Captains of the West to the Black Gate.',
    segments: [
      { mode: 'walk', pts: ['amonhen', [746, 604], [705, 592], [660, 570], 'fangorn', 'edoras', 'helmsdeep', 'isengard', [566, 602], 'helmsdeep', [600, 660], 'edoras', 'dunharrow'] },
      { mode: 'under', pts: ['dunharrow', 'pathsdead', 'erech'] },
      { mode: 'walk', pts: ['erech', [650, 800], [740, 815], 'pelargir'] },
      { mode: 'boat', pts: ['pelargir', [836, 790], [826, 755], [812, 742], 'minastirith'] },
      { mode: 'walk', pts: ['minastirith', 'osgiliath', [856, 740], [860, 690], [860, 650], 'blackgate'] }
    ] },
  { id: 'merrypippin', name: 'Merry & Pippin', sub: 'From captivity to the Pelennor', color: '#2bd46a', halo: '#0b4a22', lane: 3,
    summary: 'Seized by Saruman\u2019s Uruk-hai at Parth Galen, the two hobbits were carried across Rohan until the Riders of Rohan attacked their captors at the edge of Fangorn. They escaped into the forest, befriended Treebeard and went with the marching Ents to the fall of Isengard. Then they parted: Pippin rode with Gandalf on Shadowfax to Minas Tirith and swore service to Denethor, while Merry pledged himself to King Théoden, rode hidden with the Rohirrim to the Pelennor and helped Éowyn slay the Witch-king.',
    segments: [
      { mode: 'walk', pts: ['amonhen', [745, 598], [700, 584], [655, 566], 'fangorn', [604, 560], 'isengard'] },
      { mode: 'walk', pts: ['isengard', [566, 602], [600, 648], 'edoras', ...ANORIEN, 'minastirith'] },
      { mode: 'walk', pts: ['isengard', 'helmsdeep', [600, 660], 'edoras', 'dunharrow', 'edoras', [680, 684], [730, 692], 'druadan', [788, 715], 'minastirith'] }
    ] },
  { id: 'gandalf', name: 'Gandalf', sub: 'The Grey Pilgrim, returned as the White', color: '#f4f7ff', halo: '#2c3e66', lane: -1,
    summary: 'Gandalf urged Frodo to leave the Shire, then rode south to consult Saruman and was imprisoned atop Orthanc until the eagle Gwaihir bore him to Rohan. On Shadowfax he raced north, fought the Nazgûl on Weathertop and reached Rivendell. He led the Fellowship into Moria and fell with the Balrog, battling it up to the peak of Zirakzigil, where both perished. Sent back as Gandalf the White, he was carried to Lórien, met the Three Hunters in Fangorn, healed Théoden, brought relief to Helm\u2019s Deep, broke Saruman\u2019s staff, and guided the defence of Minas Tirith and the last stand at the Black Gate.',
    segments: [
      { mode: 'walk', pts: ['bagend', [282, 340], 'tharbad', [500, 520], 'fordsisen', 'isengard'] },
      { mode: 'flight', pts: ['isengard', [604, 630], 'edoras'] },
      { mode: 'walk', pts: ['edoras', 'fordsisen', [500, 520], 'tharbad', [282, 338], [250, 290], 'bagend', 'bree', 'weathertop', [505, 258], [562, 252], 'rivendell'] },
      { mode: 'walk', pts: FELLOWSHIP.slice(0, 7).concat([[612, 394]]) },
      { mode: 'flight', pts: [[612, 394], [640, 420], 'lorien'] },
      { mode: 'walk', pts: ['lorien', [640, 500], 'fangorn', 'edoras', 'helmsdeep', 'isengard', [566, 602], [640, 664], ...ANORIEN, 'minastirith', 'osgiliath', [856, 740], [858, 680], [860, 650], 'blackgate'] }
    ] },
  { id: 'boromir', name: 'Boromir', sub: 'Captain of Gondor', color: '#ff2d55', halo: '#5c0016', lane: -2,
    summary: 'Boromir, elder son of the Steward Denethor, set out to find Imladris after a prophetic dream troubled him and his brother. He rode north for more than a hundred days, losing his horse at the Greyflood crossing near Tharbad, and arrived just in time for the Council of Elrond. He went south with the Fellowship, but the Ring\u2019s lure grew in him until he tried to seize it from Frodo near Amon Hen. Repenting, he died defending Merry and Pippin from Orcs; his friends sent his body over the Falls of Rauros, and the boat drifted on down the Great River.',
    segments: [
      { mode: 'walk', pts: ['minastirith', ...ANORIEN_W, 'edoras', 'fordsisen', [500, 520], 'tharbad', [470, 340], [540, 275], 'rivendell'] },
      { mode: 'walk', pts: FELLOWSHIP },
      { mode: 'boat', pts: RIVER_DOWN },
      { mode: 'funeral', pts: ['amonhen', 'rauros', [788, 648], [803, 668], [815, 700], 'osgiliath'] }
    ] }
];

export const MODE_LABEL = { walk: 'on foot / horseback', boat: 'by boat', flight: 'borne by eagles', under: 'under the mountains', funeral: 'funeral boat' };
