export const COLS = 18, ROWS = 12, CELL = 48;
export const TOWERS = {
  mina: {name:'미나', title:'공간의 사수', role:'속사', color:'#73e3f3', icon:'✧', cost:90, damage:16, interval:.53, range:2.8, kind:'bolt', portrait:'mina', text:'공간을 접어 광탄을 연사합니다. 빠른 적을 안정적으로 처리합니다.', upgrades:['이중 공간 · 공격력과 사거리 증가','공간 개방 · 3연발 공명탄'], lore:'미사를 잃은 뒤 리안 병원의 진실을 쫓는다. 이번에는 누군가를 잃기 전에 길을 지키기로 했다.'},
  rita: {name:'리타', title:'신호의 연결자', role:'연쇄', color:'#abe28b', icon:'ϟ', cost:125, damage:18, interval:1.06, range:2.65, kind:'chain', portrait:'rita', text:'전기 신호가 가까운 적 3기 사이를 연쇄합니다. 밀집한 적에게 효과적입니다.', upgrades:['신호 증폭 · 4기 연쇄','오버클록 · 5기 연쇄'], lore:'미나의 통신 담당. 이 외전에서는 공명 중계기로 드론을 해킹하는 기술 지원 캐릭터로 참전한다.'},
  time: {name:'시간의 소녀', title:'반복의 관측자', role:'감속', color:'#c2a5fc', icon:'◷', cost:110, damage:5, interval:1.15, range:2.55, kind:'slow', portrait:'time', text:'시간장을 펼쳐 범위 안의 모든 적을 45% 감속합니다. 보스에게도 적용됩니다.', upgrades:['늘어진 순간 · 감속 53%','정지에 가까운 밤 · 감속 61%'], lore:'도시의 멸망을 반복해서 목격한 이름 없는 소녀. 원작의 시간 능력자를 바탕으로, 이번 시간선에서는 미나를 돕는다.'},
  haeun: {name:'하은', title:'파동의 조율사', role:'범위', color:'#ffb984', icon:'◉', cost:150, damage:35, interval:1.65, range:2.9, kind:'splash', portrait:'haeun', text:'음향 아니마를 폭발시켜 착탄 지점 주변의 적을 함께 공격합니다.', upgrades:['배음 · 폭발 범위 확대','대공명 · 폭발 범위와 위력 증가'], lore:'[신규] 리안 병원 방송실에서 구조 신호를 보내던 소녀. 레이나의 불꽃 속에서 살아남았고 피난민들을 안내한다.'},
  yul: {name:'율', title:'경계의 관통자', role:'관통', color:'#f0d586', icon:'⌁', cost:170, damage:66, interval:1.9, range:3.8, kind:'beam', portrait:'yul', text:'긴 사거리의 공간창으로 일직선의 적을 관통합니다. 방어력을 무시합니다.', upgrades:['균열 조준 · 관통 폭 확대','지평선 · 사거리와 위력 증가'], lore:'[신규] 실험도시의 외벽을 수리하던 경계 기술자. 미나가 열어 둔 공간의 틈을 무기로 바꾼다.'},
  serin: {name:'세린', title:'기억의 수호자', role:'지원', color:'#f0a5cd', icon:'❋', cost:140, damage:0, interval:1, range:2.3, kind:'support', portrait:'serin', text:'주변 아군 공격력을 25% 높이고, 웨이브 완료마다 에테르 14를 만듭니다. 중복 증폭은 적용되지 않습니다.', upgrades:['기억의 합창 · 증폭 35%, 수입 20','새벽의 약속 · 증폭 45%, 수입 26'], lore:'[신규] 흡수되지 않은 기억을 지키는 공명 능력자. 아니마 잔상을 안정시켜 같은 인물의 여러 방어 거점을 유지한다.'}
};
export const ENEMIES = {
  drone:{name:'추적 드론',hp:57,speed:1.2,reward:12,armor:0,leak:1,color:'#fc8d87',sprite:'enemyA'},
  runner:{name:'질주체',hp:40,speed:2.15,reward:11,armor:0,leak:1,color:'#c6a0ff',sprite:'enemyB'},
  swarm:{name:'분열 잔상',hp:31,speed:1.5,reward:7,armor:0,leak:1,color:'#e5afcd',sprite:'enemyD'},
  tank:{name:'장갑 감시자',hp:185,speed:.78,reward:25,armor:.42,leak:3,color:'#ffb779',sprite:'enemyC'},
  shield:{name:'위상 방패',hp:110,speed:1.05,reward:19,armor:.16,shield:42,leak:2,color:'#7ed6ec',sprite:'enemyD'},
  jammer:{name:'교란기',hp:130,speed:1.1,reward:22,armor:.1,leak:2,color:'#c79dff',sprite:'enemyB'}
};
export const STAGES = [
  {id:0, title:'재가 내리는 거리', en:'THE EMBER DISTRICT', location:'리안 병원 · 동쪽 대피로', color:'#f2a076', money:440,
   path:[[0,3],[5,3],[5,8],[11,8],[11,3],[17,3]],
   pads:[[1,2],[3,2],[6,2],[9,2],[12,2],[15,2],[2,4],[4,4],[6,4],[10,4],[12,4],[15,4],[4,6],[6,6],[10,6],[12,6],[3,9],[5,9],[8,9],[11,9],[14,7],[16,9]],
   boss:{id:'reina',name:'레이나',title:'불꽃의 아니마',hp:2250,speed:.53,color:'#ff886b',sprite:'boss',portrait:'reina',ability:'화염 봉인',detail:'6초마다 가까운 방어 거점 2곳을 2초간 봉인합니다. 체력 50% 이하에서는 화염 장벽으로 피해를 줄입니다.'},
   story:'리안 병원의 폭발 이후, 레이나의 불꽃에 이끌린 감시 드론들이 대피로로 몰려든다. 미나는 공간의 잔상을 고정해 피난민들이 마지막 신호탑에 도착할 시간을 벌기로 한다.',
   dialogue:[['리타','피난 행렬이 이동 중이야. 아니마 잔상을 거점에 고정해. 신호탑까지 적이 닿으면 안 돼.'],['미나','이번에는 도망치지 않을 거야. 이 길은 내가 지켜.']],
   bossLine:'거짓 위에 세운 도시를 지켜서, 무엇이 달라지니?',
   ending:'불꽃이 잦아들자 레이나는 타지 않은 기억 조각을 건넸다. “병원의 감시망을 연 건 베스퍼야. 내 불꽃으로 진실을 드러낼 수 있다고 했지.” 미나는 그녀를 살려 두고 다음 신호를 추적한다.',
   waves:[['drone',8],['drone',7,'runner',5],['swarm',16,'tank',2],['runner',10,'shield',4],['tank',5,'drone',10],['drone',8,'shield',4,'boss',1]]},
  {id:1, title:'침묵한 중계국', en:'THE SILENT RELAY', location:'제7 통신구 · 중앙 중계국', color:'#bba1ef', money:550,
   path:[[0,8],[3,8],[3,2],[9,2],[9,9],[14,9],[14,4],[17,4]],
   pads:[[1,7],[2,9],[2,4],[4,7],[4,3],[6,1],[7,3],[10,3],[8,5],[10,6],[8,8],[10,10],[12,8],[13,10],[13,6],[15,6],[15,3],[17,5],[5,10],[6,6],[11,1],[16,8]],
   boss:{id:'vesper',name:'베스퍼',title:'침묵의 전도체',hp:3250,speed:.57,color:'#b99aff',portrait:'vesper',ability:'신호 탈취',detail:'7초마다 적 전체에 방어막을 씌우고, 근처 아군의 공격 주기를 늦춥니다. 율의 관통 공격으로 장갑을 무시하세요.'},
   story:'레이나에게 실험도시의 감시 기록을 넘긴 해커 베스퍼. 그는 병원의 아이들을 해방한다는 명분으로 대피 신호마저 차단했다. 끊어진 중계국을 되찾아 탈출 좌표를 방송해야 한다.',
   dialogue:[['베스퍼','레이나가 불을 붙였다면, 나는 문을 열었지. 이제 감시자의 신호는 어디에도 닿지 않아.'],['리타','하지만 구조 신호도 끊겼어. 미나, 중계국을 되찾자.']],
   bossLine:'누군가 들을 수 있는 신호는, 누군가 감시할 수 있는 신호야.',
   ending:'베스퍼의 침묵이 깨지고 구조 방송이 돌아온다. 그는 마지막 동료의 이름을 털어놓는다. 기억 보관소의 오르페. 레이나에게 병원의 기록을 보여 준 그가, 도시의 모든 기억을 한곳으로 모으고 있다.',
   waves:[['runner',10,'drone',5],['shield',7,'swarm',12],['tank',6,'runner',9],['jammer',5,'drone',12],['shield',8,'tank',6,'swarm',10],['jammer',5,'runner',10,'boss',1]]},
  {id:2, title:'기억의 새벽', en:'DAWN OF THE ARCHIVE', location:'도시 중심부 · 기억 보관소', color:'#83d5db', money:680,
   path:[[0,2],[5,2],[5,6],[2,6],[2,10],[11,10],[11,4],[15,4],[15,8],[17,8]],
   pads:[[1,1],[3,1],[4,3],[6,3],[6,5],[4,5],[1,5],[3,7],[1,9],[3,9],[5,11],[8,9],[10,11],[10,7],[12,7],[12,3],[14,3],[14,5],[16,5],[14,8],[16,9],[8,4],[8,7],[9,1]],
   boss:{id:'orphe',name:'오르페',title:'기억을 삼키는 자',hp:4800,speed:.63,color:'#80d3df',portrait:'orphe',ability:'기억의 군체',detail:'8초마다 자신의 위치에 잔상을 소환합니다. 체력이 절반 아래로 내려가면 소환 수와 이동 속도가 증가합니다. 범위 공격과 감속을 함께 사용하세요.'},
   story:'오르페는 실험도시의 고통을 없애기 위해 모두의 기억을 하나로 합치려 한다. 레이나의 분노와 베스퍼의 불신을 이어 붙인 계획. 마지막 신호탑을 지켜야 살아남은 사람들이 자신의 내일을 선택할 수 있다.',
   dialogue:[['오르페','레이나의 죄책감도, 베스퍼의 두려움도 내 안에서는 잠잠해져. 너희도 이제 쉬어.'],['미나','슬픈 기억까지 빼앗지는 마. 우리는 우리 힘으로 아침을 맞을 거야.']],
   bossLine:'모든 기억이 하나가 되면, 다시는 누구도 혼자가 아니야.',
   ending:'마지막 잔상이 흩어지고 새벽의 첫 구조 신호가 도시를 가로지른다. 레이나는 불꽃을 거두고, 베스퍼는 바깥으로 향하는 통신을 연다. 미나는 미사의 기억을 품은 채 살아남은 사람들과 함께 도시 밖으로 걸어간다. 이번 시간선은, 여기서 끝나지 않는다.',
   waves:[['swarm',20,'tank',5],['runner',14,'shield',8],['jammer',6,'tank',7],['swarm',24,'shield',8],['tank',10,'jammer',6,'runner',10],['shield',8,'tank',6,'boss',1]]}
];

export function makePath(points) {
  const tiles=[];
  for(let i=0;i<points.length-1;i++) {
    let [x,y]=points[i], [tx,ty]=points[i+1];
    const dx=Math.sign(tx-x),dy=Math.sign(ty-y);
    while(x!==tx || y!==ty) {tiles.push([x,y]);x+=dx;y+=dy;}
  }
  tiles.push(points.at(-1)); return tiles;
}
export function waveList(stage, wave) {
  const row=STAGES[stage].waves[wave-1], list=[];
  for(let i=0;i<row.length;i+=2) for(let n=0;n<row[i+1];n++) list.push(row[i]);
  // Spread mixed enemies through a wave; the boss always arrives last.
  const boss=list.filter(t=>t==='boss'), regular=list.filter(t=>t!=='boss');
  // Stable round-robin interleaving preserves every mixed enemy count.
  const buckets=Object.keys(ENEMIES).map(k=>regular.filter(t=>t===k));
  const result=[];while(buckets.some(b=>b.length)) for(const b of buckets) if(b.length) result.push(b.pop());
  return [...result,...boss];
}
