import type { Agent, Point } from './simulation';

export type Item = 'wood' | 'stone' | 'berries' | 'herbs' | 'meals';
export type Inventory = Record<Item, number>;
export type ProjectId = 'lanterns' | 'garden' | 'lookout';
export type CampAction = 'cook' | 'share' | 'rest' | 'feast';
export type Intent = {kind:'gather';id:string} | {kind:'build';id:ProjectId} | {kind:'camp';id:CampAction} | {kind:'talk';id:string};
export type ResourceNode = Point & {id:string;item:Exclude<Item,'meals'>;label:string;yield:number;charges:number};
export const ITEMS:Record<Item,{label:string;color:string}>={wood:{label:'Timber',color:'#d8a971'},stone:{label:'Stone',color:'#adbbbe'},berries:{label:'Berries',color:'#d695a0'},herbs:{label:'Herbs',color:'#a6c289'},meals:{label:'Meals',color:'#e6c277'}};
export const RESOURCES:ResourceNode[]=[
  {id:'fallen-pine',item:'wood',label:'Fallen pine',x:-7,z:13,yield:3,charges:5},
  {id:'woodland-timber',item:'wood',label:'Woodland timber',x:-20,z:16,yield:3,charges:5},
  {id:'trail-branches',item:'wood',label:'Trail branches',x:-5,z:-16,yield:3,charges:5},
  {id:'river-stone',item:'stone',label:'River stones',x:12,z:16,yield:2,charges:6},
  {id:'old-quarry',item:'stone',label:'Rocky outcrop',x:-15,z:22,yield:3,charges:5},
  {id:'trail-stone',item:'stone',label:'Trail stones',x:6,z:-18,yield:2,charges:5},
  {id:'berry-patch',item:'berries',label:'Berry patch',x:4,z:11,yield:3,charges:5},
  {id:'wild-berries',item:'berries',label:'Wild berries',x:-18,z:-1,yield:3,charges:5},
  {id:'meadow-herbs',item:'herbs',label:'Meadow herbs',x:11,z:4,yield:2,charges:5},
  {id:'wild-herbs',item:'herbs',label:'Wild herbs',x:-5,z:20,yield:2,charges:5},
];
export const PROJECTS:Record<ProjectId,Point & {id:ProjectId;name:string;description:string;cost:Partial<Inventory>;xp:number;requires:ProjectId|null}>={
  lanterns:{id:'lanterns',name:'Trail lanterns',description:'Light the northern path. Unlock the community garden.',x:2,z:-12,cost:{wood:8,stone:4},xp:40,requires:null},
  garden:{id:'garden',name:'Community garden',description:'A second growing bed. Harvest one extra berry or herb each time.',x:7,z:5,cost:{wood:12,stone:8},xp:60,requires:'lanterns'},
  lookout:{id:'lookout',name:'Woodland lookout',description:'A timber deck to make this place your home.',x:-4,z:25,cost:{wood:16,stone:12},xp:90,requires:'garden'},
};
export const CAMP:Point={x:0,z:3.5};
export type Player={x:number;z:number;heading:number;energy:number;xp:number;inventory:Inventory;path:Point[];moving:boolean};
export type ProgressStats={gathered:Inventory;met:string[];shared:number;feasts:number;completed:string[];projects:ProjectId[]};
export type AdventureSave={version:2;player:Player;stats:ProgressStats;nodes:Record<string,{charges:number;regrowsAt:number}>;onboarded:boolean};
export type Quest={id:string;title:string;description:string;xp:number;tasks:{label:string;value:number;target:number}[];intent:Intent|null};
type World={elapsed:number;time:number;weather:'clear'|'rain';food:number;agents:Agent[];log:(kind:'speech'|'action'|'world',speaker:string,text:string,target?:string)=>void;remember:(a:Agent,text:string)=>void;say:(a:Agent,text:string,target?:string)=>void;event:(kind:'rain'|'gather'|'sunset')=>string};
type Navigation={findPath:(from:Point,to:Point)=>Point[];walkable:(x:number,z:number)=>boolean};
const emptyBag=():Inventory=>({wood:0,stone:0,berries:0,herbs:0,meals:0});
const validCount=(n:unknown,max=100000):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
const itemKeys=Object.keys(ITEMS) as Item[];

export class Adventure {
  player:Player={x:4,z:8,heading:Math.PI,energy:100,xp:0,inventory:emptyBag(),path:[],moving:false};
  stats:ProgressStats={gathered:emptyBag(),met:[],shared:0,feasts:0,completed:[],projects:[]};
  nodes:Record<string,{charges:number;regrowsAt:number}>=Object.fromEntries(RESOURCES.map(n=>[n.id,{charges:n.charges,regrowsAt:0}]));
  intent:Intent|null=null;
  action:{label:string;started:number;duration:number;intent:Intent}|null=null;
  notices:{id:number;text:string;kind:'reward'|'info'|'error'}[]=[];
  onboarded=false;
  private serial=0;
  private world:World;
  private nav:Navigation;
  constructor(world:World,nav:Navigation){this.world=world;this.nav=nav;}
  get level(){return this.player.xp>=380?4:this.player.xp>=180?3:this.player.xp>=60?2:1;}
  get title(){return ['','Traveler','Helper','Caretaker','Heart of the Hollow'][this.level];}
  get quest(){return this.quests().find(q=>!this.stats.completed.includes(q.id))??null;}
  get finished(){return this.stats.completed.includes('home');}
  get progress(){return this.action?Math.min(1,(this.world.elapsed-this.action.started)/this.action.duration):0;}
  get destination():Point|null{return this.intent?this.targetFor(this.intent):null;}
  notify(text:string,kind:'reward'|'info'|'error'='info'){this.notices.push({id:++this.serial,text,kind});this.notices=this.notices.slice(-12);}
  private nearestResource(item:Item){return RESOURCES.filter(n=>n.item===item&&this.nodes[n.id].charges>0).sort((a,b)=>this.distance(a)-this.distance(b))[0]??RESOURCES.find(n=>n.item===item)!;}
  quests():Quest[]{
    const g=this.stats.gathered;
    const nextPerson=this.world.agents.find(a=>!this.stats.met.includes(a.id));
    const shortage:Item=g.wood<6?'wood':g.stone<4?'stone':'berries';
    return [
      {id:'welcome',title:'A warm welcome',description:'Meet three people who call Mosswood home.',xp:30,tasks:[{label:'Meet inhabitants',value:this.stats.met.length,target:3}],intent:nextPerson?{kind:'talk',id:nextPerson.id}:null},
      {id:'provisions',title:'A useful pair of hands',description:'Gather timber, stone, and something fresh to eat.',xp:45,tasks:[{label:'Timber gathered',value:g.wood,target:6},{label:'Stone gathered',value:g.stone,target:4},{label:'Berries gathered',value:g.berries,target:3}],intent:{kind:'gather',id:this.nearestResource(shortage).id}},
      {id:'light',title:'A light on the trail',description:'Build lanterns to welcome anyone arriving after dark.',xp:35,tasks:[{label:'Build trail lanterns',value:+this.stats.projects.includes('lanterns'),target:1}],intent:{kind:'build',id:'lanterns'}},
      {id:'supper',title:'A meal to share',description:'Cook at the campfire and contribute three meals.',xp:45,tasks:[{label:'Meals shared',value:this.stats.shared,target:3}],intent:{kind:'camp',id:this.player.inventory.meals?'share':'cook'}},
      {id:'grow',title:'Room to grow',description:'Build the community garden and help it flourish.',xp:55,tasks:[{label:'Build community garden',value:+this.stats.projects.includes('garden'),target:1}],intent:{kind:'build',id:'garden'}},
      {id:'home',title:'A place to call home',description:'Build the lookout, then celebrate with a feast.',xp:80,tasks:[{label:'Build woodland lookout',value:+this.stats.projects.includes('lookout'),target:1},{label:'Host a campfire feast',value:this.stats.feasts,target:1}],intent:this.stats.projects.includes('lookout')?{kind:'camp',id:'feast'}:{kind:'build',id:'lookout'}},
    ];
  }
  distance(p:Point){return Math.hypot(this.player.x-p.x,this.player.z-p.z);}
  targetFor(intent:Intent):Point|null{
    if(intent.kind==='camp')return CAMP;
    if(intent.kind==='build')return PROJECTS[intent.id]??null;
    if(intent.kind==='gather')return RESOURCES.find(n=>n.id===intent.id)??null;
    return this.world.agents.find(a=>a.id===intent.id)??null;
  }
  labelFor(intent:Intent){return intent.kind==='gather'?RESOURCES.find(n=>n.id===intent.id)?.label??'Gather':intent.kind==='build'?PROJECTS[intent.id].name:intent.kind==='talk'?`Meet ${this.world.agents.find(a=>a.id===intent.id)?.name??'an inhabitant'}`:{cook:'Cook a meal',share:'Share a meal',rest:'Rest by the fire',feast:'Host a feast'}[intent.id];}
  travel(intent:Intent){
    const target=this.targetFor(intent);if(!target)return false;
    this.cancel();this.intent={...intent};
    if(this.distance(target)<=2.6){this.begin();return true;}
    // Stop beside the target, leaving the object itself free of the player.
    const dx=this.player.x-target.x,dz=this.player.z-target.z,d=Math.hypot(dx,dz)||1;
    const beside={x:target.x+dx/d*1.75,z:target.z+dz/d*1.75};
    this.player.path=this.nav.findPath(this.player,this.nav.walkable(beside.x,beside.z)?beside:target);
    if(!this.player.path.length){this.intent=null;this.notify('That path is blocked. Try approaching from the clearing.','error');return false;}
    if(intent.kind==='talk'){const a=this.world.agents.find(a=>a.id===intent.id)!;a.hold=this.world.elapsed+35;a.moving=false;a.activity='Waiting to meet you';}
    return true;
  }
  cancel(){this.player.path=[];this.player.moving=false;this.intent=null;this.action=null;}
  move(dx:number,dz:number){
    if(!dx&&!dz)return;this.cancel();
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
    for(let i=0;i<steps;i++){
      const x=this.player.x+dx/steps,z=this.player.z+dz/steps;
      if(this.nav.walkable(x,z)){this.player.x=x;this.player.z=z;this.player.moving=true;}
      else if(this.nav.walkable(x,this.player.z)){this.player.x=x;this.player.moving=true;}
      else if(this.nav.walkable(this.player.x,z)){this.player.z=z;this.player.moving=true;}
    }
    if(this.player.moving)this.player.heading=Math.atan2(dx,dz);
  }
  canBuild(id:ProjectId){
    const p=PROJECTS[id];if(this.stats.projects.includes(id))return 'Already built';
    if(p.requires&&!this.stats.projects.includes(p.requires))return `Build ${PROJECTS[p.requires].name.toLowerCase()} first`;
    const missing=itemKeys.filter(k=>(p.cost[k]??0)>this.player.inventory[k]);
    return missing.length?`Need ${missing.map(k=>`${(p.cost[k]??0)-this.player.inventory[k]} ${ITEMS[k].label.toLowerCase()}`).join(', ')}`:null;
  }
  nextStep(intent:Intent):Intent{
    const bag=this.player.inventory;
    if(intent.kind==='build'){
      const project=PROJECTS[intent.id];
      if(project.requires&&!this.stats.projects.includes(project.requires))return this.nextStep({kind:'build',id:project.requires});
      const missing=itemKeys.find(k=>bag[k]<(project.cost[k]??0));
      if(missing)return this.nextStep({kind:'gather',id:this.nearestResource(missing).id});
    }
    if(intent.kind==='camp'){
      if((intent.id==='share'&&bag.meals<1)||(intent.id==='feast'&&bag.meals<3))return this.nextStep({kind:'camp',id:'cook'});
      if(intent.id==='cook'&&(bag.berries<2||bag.herbs<1))return this.nextStep({kind:'gather',id:this.nearestResource(bag.berries<2?'berries':'herbs').id});
    }
    if(intent.kind==='gather'&&this.player.energy<4)return {kind:'camp',id:'rest'};
    return intent;
  }
  private reason(intent:Intent){
    if(intent.kind==='gather'){
      const node=RESOURCES.find(n=>n.id===intent.id);if(!node)return 'Unknown resource';
      if(this.nodes[node.id].charges<=0)return `This spot replenishes in ${Math.ceil(Math.max(0,this.nodes[node.id].regrowsAt-this.world.elapsed))} seconds.`;
      if(this.player.energy<4)return 'Rest at the campfire to regain energy.';
    }
    if(intent.kind==='build')return this.canBuild(intent.id);
    if(intent.kind==='camp'){
      const bag=this.player.inventory;
      if(intent.id==='cook'&&(bag.berries<2||bag.herbs<1))return 'A meal needs 2 berries and 1 herb.';
      if(intent.id==='share'&&bag.meals<1)return 'Cook a meal before sharing it.';
      if(intent.id==='feast'&&bag.meals<3)return 'A feast needs 3 cooked meals.';
      if(intent.id==='feast'&&this.world.weather==='rain')return 'Wait for clear skies before hosting the feast.';
    }
    return null;
  }
  private begin(){
    if(!this.intent)return;
    const reason=this.reason(this.intent);if(reason){this.notify(reason,'error');this.cancel();return;}
    const duration=this.intent.kind==='gather'?1.35:this.intent.kind==='build'?4:this.intent.kind==='talk'?1.1:this.intent.id==='rest'?5:this.intent.id==='feast'?3:2;
    this.action={label:this.labelFor(this.intent),started:this.world.elapsed,duration,intent:{...this.intent}};this.player.path=[];
  }
  step(dt:number){
    if(dt<=0)return;
    this.player.moving=false;
    for(const node of RESOURCES){const n=this.nodes[node.id];if(n.charges===0&&this.world.elapsed>=n.regrowsAt){n.charges=node.charges;n.regrowsAt=0;}}
    if(this.player.path.length){
      const next=this.player.path[0],dx=next.x-this.player.x,dz=next.z-this.player.z,d=Math.hypot(dx,dz),travel=dt*3.8;
      this.player.heading=Math.atan2(dx,dz);this.player.moving=true;
      if(d<=travel+.02){this.player.x=next.x;this.player.z=next.z;this.player.path.shift();}
      else{this.player.x+=dx/d*travel;this.player.z+=dz/d*travel;}
    }
    if(this.intent&&!this.player.path.length&&!this.action){
      const t=this.targetFor(this.intent);
      if(t&&this.distance(t)<=3)this.begin();
      else{const intent=this.intent;this.cancel();if(intent.kind==='talk')this.travel(intent);else this.notify('Move closer to interact.','error');}
    }
    if(this.action&&this.world.elapsed-this.action.started>=this.action.duration)this.finish();
  }
  private finish(){
    if(!this.action)return;const intent=this.action.intent;
    const reason=this.reason(intent);if(reason){this.notify(reason,'error');this.cancel();return;}
    const bag=this.player.inventory;
    if(intent.kind==='gather'){
      const n=RESOURCES.find(n=>n.id===intent.id)!;const bonus=this.stats.projects.includes('garden')&&['berries','herbs'].includes(n.item)?1:0;
      bag[n.item]+=n.yield+bonus;this.stats.gathered[n.item]+=n.yield+bonus;this.player.energy=Math.max(0,this.player.energy-4);this.player.xp+=2;
      const node=this.nodes[n.id];node.charges--;if(node.charges===0)node.regrowsAt=this.world.elapsed+120;
      this.notify(`+${n.yield+bonus} ${ITEMS[n.item].label.toLowerCase()}`,'reward');
    }else if(intent.kind==='build'){
      const p=PROJECTS[intent.id];for(const k of itemKeys)bag[k]-=p.cost[k]??0;
      this.stats.projects.push(intent.id);this.player.xp+=p.xp;this.world.log('world','You',`Built ${p.name.toLowerCase()} for Mosswood Hollow.`);
      for(const a of this.world.agents)this.world.remember(a,`The traveler helped us build ${p.name.toLowerCase()}.`);
      this.notify(`${p.name} complete · +${p.xp} XP`,'reward');
    }else if(intent.kind==='talk'){
      this.meet(intent.id);const a=this.world.agents.find(a=>a.id===intent.id)!;a.hold=this.world.elapsed+7;this.world.say(a,`Welcome. I’m ${a.name}. ${a.bio}`,'You');
    }else if(intent.id==='cook'){
      bag.berries-=2;bag.herbs--;bag.meals++;this.stats.gathered.meals++;this.player.xp+=4;this.notify('A warm meal is ready.','reward');
    }else if(intent.id==='share'){
      bag.meals--;this.stats.shared++;this.world.food+=4;this.player.xp+=6;this.player.energy=Math.min(100,this.player.energy+15);this.world.log('action','You','Shared a warm meal with the settlement.');this.notify('Meal shared · the food stores and your energy recover.','reward');
    }else if(intent.id==='rest'){
      this.player.energy=100;this.notify('Rested and ready. Energy restored.');
    }else{
      bag.meals-=3;this.stats.feasts++;this.player.xp+=25;this.world.event('gather');this.world.food+=12;this.world.log('world','You','Hosted a feast for everyone in the clearing.');for(const a of this.world.agents)this.world.remember(a,'The traveler cooked a feast for all of us.');this.notify('The feast is ready. Everyone is gathering.','reward');
    }
    this.cancel();this.checkQuests();
  }
  meet(id:string){if(this.world.agents.some(a=>a.id===id)&&!this.stats.met.includes(id)){this.stats.met.push(id);this.player.xp+=5;this.notify(`You met ${this.world.agents.find(a=>a.id===id)!.name}.`);this.checkQuests();}}
  private checkQuests(){
    for(const q of this.quests()){
      if(this.stats.completed.includes(q.id))continue;
      if(!q.tasks.every(t=>t.value>=t.target))break;
      this.stats.completed.push(q.id);this.player.xp+=q.xp;this.world.log('world','Your journey',`Completed “${q.title}”.`);this.notify(`${q.title} · +${q.xp} XP`,'reward');
    }
  }
  interactNearby(){
    if(this.action||this.intent)return;
    const resource=RESOURCES.filter(n=>this.nodes[n.id].charges>0).sort((a,b)=>this.distance(a)-this.distance(b))[0];
    const person=[...this.world.agents].sort((a,b)=>this.distance(a)-this.distance(b))[0];
    if(resource&&this.distance(resource)<2.8&&(!person||this.distance(resource)<this.distance(person)))this.travel({kind:'gather',id:resource.id});
    else if(person&&this.distance(person)<3)this.travel({kind:'talk',id:person.id});
    else if(this.distance(CAMP)<3)this.travel({kind:'camp',id:'rest'});
    else this.notify('Approach a resource or an inhabitant. You can also choose one from your field guide.');
  }
  export():AdventureSave{return {version:2,player:{...this.player,path:[],moving:false},stats:this.stats,nodes:this.nodes,onboarded:this.onboarded};}
  import(data:unknown){
    if(!data||typeof data!=='object')return false;const d=data as AdventureSave;
    if(d.version!==2||!d.player||!d.stats||!d.nodes)return false;
    const p=d.player,st=d.stats;
    if(!this.nav.walkable(p.x,p.z)||!Number.isFinite(p.heading)||!validCount(p.energy,100)||!validCount(p.xp)||!p.inventory||!itemKeys.every(k=>validCount(p.inventory[k])&&Number.isInteger(p.inventory[k])))return false;
    if(!st.gathered||!itemKeys.every(k=>validCount(st.gathered[k]))||!validCount(st.shared)||!validCount(st.feasts)||!Array.isArray(st.met)||!Array.isArray(st.projects)||!Array.isArray(st.completed))return false;
    const questIds=['welcome','provisions','light','supper','grow','home'];
    if(st.met.some(id=>!this.world.agents.some(a=>a.id===id))||st.projects.some(id=>!Object.hasOwn(PROJECTS,id))||st.completed.some(id=>!questIds.includes(id)))return false;
    if(!RESOURCES.every(n=>d.nodes[n.id]&&Number.isInteger(d.nodes[n.id].charges)&&validCount(d.nodes[n.id].charges,n.charges)&&validCount(d.nodes[n.id].regrowsAt,1e10)))return false;
    this.player={...p,path:[],moving:false,inventory:{...p.inventory}};this.stats={...st,gathered:{...st.gathered},met:[...new Set(st.met)],projects:[...new Set(st.projects)],completed:[...new Set(st.completed)]};this.nodes=Object.fromEntries(RESOURCES.map(n=>[n.id,{...d.nodes[n.id]}]));this.onboarded=!!d.onboarded;this.cancel();return true;
  }
}
