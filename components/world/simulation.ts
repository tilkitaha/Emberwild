import { Adventure } from './adventure';
export type Point = { x: number; z: number };
export type Memory = { text: string; time: number };
export type WorldEvent = { id: number; time: number; speaker: string; text: string; kind: 'speech' | 'action' | 'world'; target?: string };
export type Agent = {
  id: string; name: string; role: string; color: string; skin: string; hair: string;
  traits: string[]; bio: string; x: number; z: number; heading: number;
  energy: number; food: number; social: number; goal: string; activity: string;
  target: Point; destination: string; path: Point[]; hold: number; nextDecision: number;
  memories: Memory[]; relationships: Record<string, number>; speech: string; speechUntil: number;
  moving: boolean; work: number; meetings: number;
};
export type Snapshot = { agents: Agent[]; events: WorldEvent[]; time: number; elapsed: number; weather: 'clear' | 'rain'; gatherings: number; wood: number; food: number; built: boolean };
export const PLACES = {
  camp: { x: 0, z: 1, name: 'the campfire' },
  lodge: { x: -9, z: -1.5, name: 'the lodge' },
  workshop: { x: -11, z: 8, name: 'the workshop' },
  garden: { x: 9, z: -2, name: 'the herb garden' },
  woods: { x: -15, z: 17, name: 'the pine grove' },
  river: { x: 13, z: 12, name: 'the riverbank' },
  lookout: { x: 1, z: -16, name: 'the old trail' },
};
export const OBSTACLES = [
  { x: -9, z: -6, r: 4.5 }, { x: 8, z: -10, r: 4 }, { x: -13, z: 5, r: 2.5 },
];
export const terrainHeight = (x: number, z: number) => {
  const d = Math.hypot(x, z);
  const rim = Math.max(0, d - 22) * .055;
  const rolling = (Math.sin(x * .095) * Math.cos(z * .12) * 3 + Math.sin(z * .18 + x * .08) * .8);
  const flatten = Math.min(1, Math.max(0, (d - 13) / 25));
  const lake = Math.exp(-((x - 25) ** 2 / 100 + (z - 9) ** 2 / 260));
  return -.2 + rolling * flatten + rim - lake * 2.4;
};
export function walkable(x: number, z: number) {
  return Math.abs(x) < 40 && Math.abs(z) < 40 && ((x - 25) ** 2 / 100 + (z - 9) ** 2 / 260) > 1.07 && !OBSTACLES.some(o => Math.hypot(x - o.x, z - o.z) < o.r);
}

// Grid A* keeps agents out of buildings and water. Costs match diagonal movement.
export function findPath(from: Point, target: Point): Point[] {
  const step = 1.5;
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(from.x / step), sz = Math.round(from.z / step);
  const tx = Math.round(target.x / step), tz = Math.round(target.z / step);
  const start = key(sx, sz);
  const nodes = new Map<string, {x: number; z: number; g: number; f: number; parent: string | null}>();
  nodes.set(start, {x:sx,z:sz,g:0,f:Math.hypot(tx-sx,tz-sz),parent:null});
  const open = new Set([start]), closed = new Set<string>();
  let best = start, bestDistance = Infinity;
  for(let attempts=0;open.size && attempts<1800;attempts++) {
    let current = '', lowest = Infinity;
    for(const k of open){const n=nodes.get(k)!;if(n.f<lowest){lowest=n.f;current=k;}}
    const n=nodes.get(current)!;
    const distance=Math.hypot(n.x-tx,n.z-tz);
    if(distance<bestDistance){bestDistance=distance;best=current;}
    if(distance<1.1){best=current;break;}
    open.delete(current);closed.add(current);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=n.x+dx,z=n.z+dz,k=key(x,z);
      if(closed.has(k)||!walkable(x*step,z*step))continue;
      if(dx&&dz&&(!walkable((n.x+dx)*step,n.z*step)||!walkable(n.x*step,(n.z+dz)*step)))continue;
      const g=n.g+Math.hypot(dx,dz);
      if(!nodes.has(k)||g<nodes.get(k)!.g){nodes.set(k,{x,z,g,f:g+Math.hypot(tx-x,tz-z),parent:current});open.add(k);}
    }
  }
  const out:Point[]=[];let cursor:string|null=best;
  while(cursor && cursor!==start){const n: {x:number;z:number;parent:string|null}=nodes.get(cursor)!;out.unshift({x:n.x*step,z:n.z*step});cursor=n.parent;}
  if(walkable(target.x,target.z)&&Math.hypot((out.at(-1)?.x??from.x)-target.x,(out.at(-1)?.z??from.z)-target.z)<2.5)out.push({...target});
  return out;
}

const PROFILES = [
  {id:'rowan',name:'Rowan',role:'Builder',color:'#dfa76f',skin:'#bd8c67',hair:'#47352b',traits:['Steadfast','Practical'],bio:'Building a place where strangers can feel at home.',x:-2,z:3,goal:'Finish the shared garden bench.'},
  {id:'mira',name:'Mira',role:'Botanist',color:'#b2c593',skin:'#c59577',hair:'#392f25',traits:['Curious','Considerate'],bio:'Knows which leaves heal, and which stories need listening to.',x:1,z:4,goal:'Gather herbs for the evening meal.'},
  {id:'finn',name:'Finn',role:'Forager',color:'#9cb9c0',skin:'#d5af89',hair:'#9c7146',traits:['Resourceful','Restless'],bio:'Always convinced the next trail leads somewhere wonderful.',x:7,z:2,goal:'Find provisions along the riverbank.'},
  {id:'elara',name:'Elara',role:'Storykeeper',color:'#c5a2b8',skin:'#95684c',hair:'#2b2824',traits:['Warm','Observant'],bio:'Remembers every arrival and makes sure nobody eats alone.',x:-3,z:9,goal:'Bring the settlement together.'},
  {id:'theo',name:'Theo',role:'Woodworker',color:'#c8bb86',skin:'#c6a283',hair:'#6b6250',traits:['Patient','Generous'],bio:'Speaks softly. Builds things that last.',x:-11,z:10,goal:'Collect wood for Rowan’s next project.'},
  {id:'ash',name:'Ash',role:'Explorer',color:'#a9b7cd',skin:'#ad8269',hair:'#332e29',traits:['Independent','Hopeful'],bio:'Arrived by the northern trail with a pack and a question.',x:2,z:-13,goal:'Explore the settlement and meet its people.'},
];

export function clockLabel(time: number) { const mins=Math.floor(time%1440);return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`; }
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export class Simulation {
  game:Adventure;
  agents:Agent[];events:WorldEvent[]=[];time=16*60+20;elapsed=0;weather:'clear'|'rain'='clear';gatherings=0;wood=5;food=18;built=false;
  private serial=0;private rainUntil=0;private meetingUntil=0;private nextTalk=4;private pairs=new Map<string,number>();
  private replies:{at:number;agent:string;text:string;target:string}[]=[];
  constructor() {
    this.agents=PROFILES.map((p,i)=>({...p,heading:0,energy:74+i*3,food:71+i*2,social:64+i*4,activity:'Settling in',target:{x:p.x,z:p.z},destination:'camp',path:[],hold:i<2?9:0,nextDecision:2+i*3,memories:[{time:this.time,text:p.id==='ash'?'I arrived at Mosswood Hollow by the northern trail.':`I settled in Mosswood Hollow as its ${p.role.toLowerCase()}.`}],relationships:{},speech:'',speechUntil:0,moving:false,work:0,meetings:0}));
    this.game=new Adventure(this,{findPath,walkable});
    this.log('world','Mosswood Hollow','The settlement wakes into a golden afternoon. Six lives, one shared clearing.');
  }
  snapshot():Snapshot {return {agents:this.agents,events:this.events,time:this.time,elapsed:this.elapsed,weather:this.weather,gatherings:this.gatherings,wood:this.wood,food:this.food,built:this.built};}
  log(kind:WorldEvent['kind'],speaker:string,text:string,target?:string){this.events.unshift({id:++this.serial,time:this.time,speaker,text,kind,target});this.events=this.events.slice(0,160);}
  remember(a:Agent,text:string){a.memories.unshift({text,time:this.time});a.memories=a.memories.slice(0,30);}
  say(a:Agent,text:string,target?:string){a.speech=text;a.speechUntil=this.elapsed+8;this.log('speech',a.name,text,target);}
  go(a:Agent,place:keyof typeof PLACES,goal:string){const p=PLACES[place];const angle=this.agents.indexOf(a)*1.05;const spread=place==='camp'?2.5:1.1;a.target={x:p.x+Math.cos(angle)*spread,z:p.z+Math.sin(angle)*spread};a.path=findPath(a,a.target);a.destination=place;a.goal=goal;a.activity=`Walking to ${p.name}`;a.nextDecision=this.elapsed+45;a.hold=0;a.work=0;}
  private decide(a:Agent){
    if(this.weather==='rain'){this.go(a,'lodge','Find shelter until the rain passes.');return;}
    if(this.elapsed<this.meetingUntil){this.go(a,'camp','Join everyone around the campfire.');return;}
    const hour=(this.time%1440)/60;
    if(a.energy<30 || (hour>22 || hour<6)){this.go(a,'lodge','Rest and recover at the lodge.');return;}
    if(a.food<40){this.go(a,'camp','Eat something warm by the fire.');return;}
    if(a.social<45){this.go(a,'camp','Find someone to share a moment with.');return;}
    const turn=Math.floor(this.elapsed/36)+this.agents.indexOf(a);
    if(turn%3===0){this.go(a,'camp','Check in with the others at the campfire.');return;}
    const choices:Record<string,[keyof typeof PLACES,string][]>={
      rowan:[['workshop','Shape timber for the garden bench.'],['garden',this.built?'Check the bench and the garden.':'Build a bench for everyone to share.']],
      mira:[['garden','Tend the herbs for tonight’s meal.'],['woods','Find wild herbs among the pines.']],
      finn:[['river','Look for provisions by the water.'],['woods','Gather berries along the woodland trail.']],
      elara:[['camp','Make time to listen to the others.'],['lookout','Find a quiet moment and a new story.']],
      theo:[['woods','Collect fallen branches for the workshop.'],['workshop','Prepare timber for Rowan’s bench.']],
      ash:[['lookout','Learn where the northern path leads.'],['river','Explore the edge of the river.']],
    };
    const c=choices[a.id][turn%2];this.go(a,c[0],c[1]);
  }
  step(dt:number){
    if(dt<=0)return;this.elapsed+=dt;this.time+=dt*.6;
    if(this.weather==='rain'&&this.elapsed>this.rainUntil){this.weather='clear';this.log('world','The sky','The rain has passed. Sunlight returns to the clearing.');for(const a of this.agents)a.nextDecision=this.elapsed+2;}
    for(const a of this.agents){
      a.energy=clamp(a.energy-dt*.043);a.food=clamp(a.food-dt*.072);a.social=clamp(a.social-dt*.062);a.moving=false;
      if(a.speechUntil<this.elapsed)a.speech='';
      if(a.hold>this.elapsed)continue;
      if(a.path.length){
        const next=a.path[0],dx=next.x-a.x,dz=next.z-a.z,d=Math.hypot(dx,dz),dist=dt*(this.weather==='rain'?2.1:1.15);
        if(d<dist+.08){a.x=next.x;a.z=next.z;a.path.shift();}
        else{a.x+=dx/d*dist;a.z+=dz/d*dist;a.heading=Math.atan2(dx,dz);a.moving=true;}
        if(!a.path.length){a.activity=a.destination==='lodge'?'Resting':a.destination==='camp'?'By the campfire':a.id==='ash'?'Exploring':a.id==='elara'?'Reflecting':'Working';a.nextDecision=this.elapsed+13+this.agents.indexOf(a)*1.2;}
      }else{
        a.work+=dt;
        if(a.destination==='lodge')a.energy=clamp(a.energy+dt*.9);
        if(a.destination==='camp'){
          a.social=clamp(a.social+dt*.35);
          if(a.food<85&&this.food>0){a.food=clamp(a.food+dt*.8);this.food=Math.max(0,this.food-dt*.016);}
        }
        if(a.work>10){
          a.work=0;
          if(a.id==='theo'&&a.destination==='woods'){this.wood+=3;this.log('action',a.name,'Collected fallen branches for the workshop.');this.remember(a,'I brought back dry branches for Rowan’s project.');}
          if((a.id==='mira'||a.id==='finn')&&['woods','garden','river'].includes(a.destination)){this.food+=3;this.log('action',a.name,'Added fresh provisions to the shared stores.');this.remember(a,'I found fresh provisions and shared them with the settlement.');}
          if(a.id==='rowan'&&a.destination==='garden'&&!this.built&&this.wood>=8){this.built=true;this.wood-=8;this.log('world','A place to stay','Rowan finished the garden bench with Theo’s timber.');for(const p of this.agents)this.remember(p,'Rowan built our garden bench with wood that Theo gathered.');}
        }
        if(this.elapsed>=a.nextDecision)this.decide(a);
      }
    }
    for(const r of this.replies.filter(r=>r.at<=this.elapsed)){const a=this.agents.find(a=>a.id===r.agent)!;this.say(a,r.text,r.target);}
    this.replies=this.replies.filter(r=>r.at>this.elapsed);
    if(this.elapsed>this.nextTalk){this.nextTalk=this.elapsed+6;this.converse();}
    this.game.step(dt);
  }
  private converse(){
    const candidates=this.agents.flatMap((a,i)=>this.agents.slice(i+1).map(b=>({a,b,d:Math.hypot(a.x-b.x,a.z-b.z)}))).filter(p=>p.d<4.8 && this.elapsed>p.a.hold && this.elapsed>p.b.hold && this.elapsed>(this.pairs.get([p.a.id,p.b.id].sort().join(':'))??-100)+32).sort((p,q)=>p.d-q.d);
    if(!candidates.length)return;
    const {a,b}=candidates[0],key=[a.id,b.id].sort().join(':');this.pairs.set(key,this.elapsed);
    a.hold=b.hold=this.elapsed+10;a.activity=`Talking with ${b.name}`;b.activity=`Talking with ${a.name}`;
    a.heading=Math.atan2(b.x-a.x,b.z-a.z);b.heading=a.heading+Math.PI;
    const n=a.relationships[b.id]??0;
    const dialogue=this.dialogue(a,b,n);
    this.say(a,dialogue[0],b.name);this.replies.push({at:this.elapsed+4,agent:b.id,text:dialogue[1],target:a.name});
    a.relationships[b.id]=clamp(n+9);b.relationships[a.id]=clamp((b.relationships[a.id]??0)+9);a.social=clamp(a.social+13);b.social=clamp(b.social+13);a.meetings++;b.meetings++;
    this.remember(a,`I spoke with ${b.name}: “${dialogue[1]}”`);this.remember(b,`${a.name} told me: “${dialogue[0]}”`);
  }
  private dialogue(a:Agent,b:Agent,n:number):[string,string]{
    if(this.weather==='rain')return ['The rain caught us. There’s room under the lodge roof.','Good idea. We can pick this up when the sky clears.'];
    if(this.elapsed<this.meetingUntil)return [`${b.name}, come closer. There’s room by the fire.`,n>0?'It’s good to sit with a familiar face. Tell me about your day.':'Thank you. I’m glad I found this place.'];
    if(n===0&&b.id==='ash')return ['You came by the northern trail? You’re welcome to stay.','I did. I wasn’t sure what I’d find here. Thank you.'];
    if(n===0&&a.id==='ash')return ['I’m Ash. Is there anything I can do to help around here?','Welcome, Ash. Stay for supper. We’ll find something together.'];
    if(this.built&&['rowan','theo'].includes(a.id))return ['The garden bench is finished. Come try it when you have a moment.','You’ve made the clearing feel a little more like home.'];
    const topics:[string,string][]=[
      [`${b.name}, how is your day going?`,'Better now. I could use a little company.'],
      ['I found a quiet spot along the river. We should go sometime.','I’d like that. Let’s finish here and take the trail together.'],
      ['There’s something about this place. It makes me want to stay.','Then stay. There’s always another place at the fire.'],
      [n>10?'I was thinking about what you said last time.':'What brought you to Mosswood?','A fresh start, mostly. And the chance to make something useful.'],
    ];
    if(a.id==='mira')return ['The herbs are coming along. I’ll put some aside for tonight.','I’ll help bring them in. Supper tastes better when it’s shared.'];
    if(a.id==='theo'&&b.id==='rowan')return ['I found some straight branches. Will these work for the bench?','They’re exactly what I needed. Leave them by the workshop.'];
    if(a.id==='rowan'&&b.id==='mira')return ['I’m making a bench for the garden. Where would you put it?','Beside the herbs, where the evening light reaches. Thank you.'];
    if(a.id==='finn')return ['There are berries near the water. I brought enough to share.','Leave some by the fire. Everyone will appreciate that.'];
    return topics[Math.floor(this.elapsed/20+a.meetings)%topics.length];
  }
  event(kind:'rain'|'gather'|'sunset'){
    if(kind==='rain'){this.weather=this.weather==='rain'?'clear':'rain';this.rainUntil=this.elapsed+85;this.log('world','The sky',this.weather==='rain'?'Rain rolls through the valley. The inhabitants head for shelter.':'The clouds part over Mosswood Hollow.');for(const a of this.agents){a.hold=0;this.decide(a);this.remember(a,this.weather==='rain'?'A sudden rainstorm sent us to the lodge for shelter.':'The rain passed and the clearing warmed again.');}return this.weather==='rain'?'Rain is arriving. Watch them seek shelter.':'The skies are clearing.';}
    if(kind==='gather'){this.gatherings++;this.meetingUntil=this.elapsed+90;this.log('world','A shared evening','Everyone is invited to gather around the campfire.');for(const a of this.agents){this.go(a,'camp','Join the gathering around the fire.');this.remember(a,'We were invited to gather around the campfire.');}return 'The campfire gathering has begun.';}
    this.time=Math.floor(this.time/1440)*1440+19*60+10;this.log('world','Evening falls','The last sunlight stretches across the clearing.');return 'Golden hour gives way to evening.';
  }
  chat(id:string,message:string){
    const a=this.agents.find(a=>a.id===id);if(!a)return '';
    const text=message.trim().slice(0,240);if(!text)return '';
    this.log('speech','You',text,a.name);const lower=text.toLowerCase();let reply='';
    if(/\b(go|come|meet|gather|join)\b/.test(lower)&&/fire|camp|together/.test(lower)){
      this.go(a,'camp','Meet the visitor at the campfire.');reply='I’ll meet you by the campfire. There’s a good place to sit.';
    }else if(/\b(rest|sleep|tired|shelter)\b/.test(lower)){
      this.go(a,'lodge','Take the visitor’s advice and rest at the lodge.');reply='A little rest sounds sensible. I’ll head to the lodge.';
    }else if(/remember|memory|memories|recall/.test(lower)){
      reply=a.memories[0]?.text??'This clearing is the beginning of my story.';
    }else if(/friend|who.*(like|know)|relationship/.test(lower)){
      const top=Object.entries(a.relationships).sort((x,y)=>y[1]-x[1])[0];reply=top?`I’ve been getting to know ${this.agents.find(p=>p.id===top[0])!.name}. We’ve shared a few good moments.`:'I’m still getting to know everyone. A conversation is a good start.';
    }else if(/plan|doing|goal|working|help|job/.test(lower)){
      reply=`My plan is to ${a.goal.charAt(0).toLowerCase()+a.goal.slice(1)} ${a.id==='rowan'&&!this.built?'Theo is helping me gather the wood.':a.energy<35?'I could use a rest first.':'You’re welcome to keep me company.'}`;
    }else if(/weather|rain|sun/.test(lower)){
      reply=this.weather==='rain'?'We’ll wait out the rain at the lodge. The herbs will be glad of it.':'The clearing is peaceful today. It’s a good time to be outdoors.';
    }else if(/hungry|food|eat|dinner|supper/.test(lower)){
      reply=`There are ${Math.floor(this.food)} portions in the shared stores. You’ll find everyone eating by the fire.`;
    }else if(/\b(hello|hi|hey|merhaba|selam)\b/.test(lower)){
      reply=`Hello, traveler. I’m ${a.name}, the ${a.role.toLowerCase()}. ${a.bio}`;
    }else if(/who are|tell me about yourself|your name/.test(lower)){
      reply=`I’m ${a.name}. ${a.bio}`;
    }else if(/thank|nice|beautiful|love/.test(lower)){
      reply='I’m glad you’re here. It means something to have company.';
    }else{
      reply='I know about life here in Mosswood. Ask about my plans, friends, or memories—or ask me to meet you by the fire.';
    }
    this.game.meet(id);this.remember(a,`The visitor said: “${text}”`);this.say(a,reply,'You');a.social=clamp(a.social+5);return reply;
  }
  save(){try{localStorage.setItem('emberwild-world-v2',JSON.stringify({...this.snapshot(),adventure:this.game.export(),rainUntil:this.rainUntil,meetingUntil:this.meetingUntil,serial:this.serial}));return true;}catch{return false;}}
  restore(){
    const count=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1e10;
    const point=(p:unknown):p is Point=>!!p&&typeof p==='object'&&Number.isFinite((p as Point).x)&&Number.isFinite((p as Point).z)&&Math.abs((p as Point).x)<45&&Math.abs((p as Point).z)<45;
    for(const key of ['emberwild-world-v2','emberwild-world-v1']){try{
      const raw=localStorage.getItem(key);if(!raw)continue;const d=JSON.parse(raw);
      if(!d||!Array.isArray(d.agents)||d.agents.length!==6||![d.time,d.elapsed,d.wood,d.food].every(count))continue;
      if(!d.agents.every((a:Agent,i:number)=>a&&a.id===PROFILES[i].id&&point(a)&&[a.energy,a.food,a.social].every(count)))continue;
      const agents:Agent[]=d.agents.map((a:Agent,i:number)=>({
        ...this.agents[i],...PROFILES[i],x:a.x,z:a.z,heading:Number.isFinite(a.heading)?a.heading:0,
        energy:clamp(a.energy),food:clamp(a.food),social:clamp(a.social),
        goal:typeof a.goal==='string'?a.goal.slice(0,400):PROFILES[i].goal,activity:typeof a.activity==='string'?a.activity.slice(0,100):'Settling in',
        destination:typeof a.destination==='string'&&Object.hasOwn(PLACES,a.destination)?a.destination:'camp',
        target:point(a.target)?{x:a.target.x,z:a.target.z}:{x:a.x,z:a.z},path:Array.isArray(a.path)?a.path.filter(point).slice(0,200).map(p=>({x:p.x,z:p.z})):[],
        memories:Array.isArray(a.memories)?a.memories.filter(m=>m&&typeof m.text==='string'&&count(m.time)).slice(0,30).map(m=>({text:m.text.slice(0,1000),time:m.time})):[],
        relationships:Object.fromEntries(Object.entries(a.relationships&&typeof a.relationships==='object'?a.relationships:{}).filter(([id,n])=>PROFILES.some(p=>p.id===id)&&count(n)).map(([id,n])=>[id,clamp(n)])),
        hold:count(a.hold)?a.hold:0,nextDecision:count(a.nextDecision)?a.nextDecision:d.elapsed+2,work:count(a.work)?a.work:0,meetings:count(a.meetings)?a.meetings:0,speech:'',speechUntil:0,moving:false,
      }));
      const events:WorldEvent[]=Array.isArray(d.events)?d.events.filter((e:WorldEvent)=>e&&count(e.id)&&count(e.time)&&typeof e.speaker==='string'&&typeof e.text==='string'&&['world','action','speech'].includes(e.kind)&&(!e.target||typeof e.target==='string')).slice(0,160):[];
      this.agents=agents;this.events=events;this.time=d.time;this.elapsed=d.elapsed;this.wood=d.wood;this.food=d.food;this.built=!!d.built;this.weather=d.weather==='rain'?'rain':'clear';this.gatherings=count(d.gatherings)?d.gatherings:0;this.rainUntil=count(d.rainUntil)?d.rainUntil:0;this.meetingUntil=count(d.meetingUntil)?d.meetingUntil:0;this.serial=Math.max(count(d.serial)?d.serial:0,...events.map(e=>e.id));this.nextTalk=this.elapsed+4;this.replies=[];this.pairs.clear();
      this.game=new Adventure(this,{findPath,walkable});
      if(d.adventure&&!this.game.import(d.adventure))this.game.notify('Your settlement is restored. Your traveler starts a fresh journey.');
      return true;
    }catch{ /* Try the earlier save without overwriting it. */ }}
    return false;
  }
}
