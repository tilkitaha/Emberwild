import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Simulation, terrainHeight, walkable, OBSTACLES } from './simulation';

export type CameraMode = 'orbit'|'follow'|'walk';
type Person = {root:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;head:THREE.Group;ring:THREE.Mesh};
type Hooks = {onSelect:(id:string)=>void;onReady:()=>void;onError:(s:string)=>void;onFrame:()=>void};
const TAU=Math.PI*2;
function randomGenerator(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export class WorldScene {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera:THREE.PerspectiveCamera;controls:OrbitControls;
  mode:CameraMode='orbit';selected:string|null=null;paused=false;speed=1;keys=new Set<string>();labels=new Map<string,HTMLButtonElement>();
  private people=new Map<string,Person>();private frame=0;private last=0;private stopped=false;private sun:THREE.DirectionalLight;private ambient:THREE.HemisphereLight;private sky:Sky;
  private width=1;private height=1;private resizeObserver:ResizeObserver;private fire:THREE.PointLight;private fireMesh:THREE.Mesh;private water:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;private particles:THREE.Points;
  private rain:THREE.LineSegments;private fireflies:THREE.Points;private stars:THREE.Points;private smoke:THREE.Points;private bench=new THREE.Group();private windows:THREE.MeshStandardMaterial;
  private raycaster=new THREE.Raycaster();private pointer=new THREE.Vector2();private down={x:0,y:0};private yaw=Math.PI;private pitch=0;private dragging=false;private visualTime=0;private uiTick=0;private lightTick=0;private sound:AudioContext|null=null;private volume:GainNode|null=null;private soundOn=false;private audioTimer:ReturnType<typeof setInterval>|null=null;
  private readonly rand=randomGenerator(9184);private readonly dummy=new THREE.Object3D();private readonly temp=new THREE.Vector3();private readonly target=new THREE.Vector3();
  constructor(private container:HTMLDivElement,public sim:Simulation,private hooks:Hooks){
    const mobile=window.innerWidth<800;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.5:1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.setClearColor('#829c91');
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D woodland. Drag to look around, scroll or pinch to zoom. Select inhabitants from the list.');
    this.renderer.domElement.tabIndex=0;container.appendChild(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(mobile?55:49,1,.15,550);
    this.camera.position.set(mobile?28:31,mobile?20:18,mobile?43:33);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.1,0);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=5;this.controls.maxDistance=75;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI/2-.07;this.controls.maxTargetRadius=35;this.controls.enablePan=true;
    this.scene.fog=new THREE.FogExp2('#a1b19a',.0075);
    this.ambient=new THREE.HemisphereLight('#c9e4de','#4c4e30',2.1);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#ffdab0',3.7);this.sun.position.set(-35,48,-24);this.sun.castShadow=true;this.sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);this.sun.shadow.camera.left=-42;this.sun.shadow.camera.right=42;this.sun.shadow.camera.top=42;this.sun.shadow.camera.bottom=-42;this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=150;this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.07;this.sun.shadow.radius=3;this.scene.add(this.sun);
    this.sky=new Sky();this.sky.scale.setScalar(4500);this.sky.material.uniforms.turbidity.value=5;this.sky.material.uniforms.rayleigh.value=1.1;this.sky.material.uniforms.mieCoefficient.value=.008;this.sky.material.uniforms.mieDirectionalG.value=.85;this.scene.add(this.sky);
    this.windows=new THREE.MeshStandardMaterial({color:'#ffc279',emissive:'#ff9c34',emissiveIntensity:1.5,roughness:.3});
    this.makeTerrain();this.makeForest(mobile?330:470);this.makeGroundCover(mobile?6500:11000);this.makeRocks();this.makeSettlement();
    this.water=this.makeWater();this.scene.add(this.water);
    const fireObjects=this.makeFire();this.fire=fireObjects.light;this.fireMesh=fireObjects.flame;this.particles=fireObjects.sparks;this.smoke=fireObjects.smoke;
    this.rain=this.makeRain();this.fireflies=this.makeFireflies();this.stars=this.makeStars();this.scene.add(this.rain,this.fireflies,this.stars);
    this.makeBench();this.scene.add(this.bench);
    for(const a of sim.agents){const p=this.makePerson(a.color,a.skin,a.hair,sim.agents.indexOf(a));p.root.position.set(a.x,terrainHeight(a.x,a.z),a.z);this.scene.add(p.root);this.people.set(a.id,p);const label=document.createElement('button');label.className='world-label hidden';label.style.setProperty('--agent-color',a.color);label.setAttribute('aria-label',`Meet ${a.name}, ${a.role.toLowerCase()}`);const speech=document.createElement('div');speech.className='speech';speech.hidden=true;const name=document.createElement('span');name.className='name';const dot=document.createElement('span');dot.className='label-dot';name.append(dot,document.createTextNode(a.name));label.append(speech,name);label.addEventListener('click',()=>this.hooks.onSelect(a.id));container.appendChild(label);this.labels.set(a.id,label);}
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.renderer.domElement.addEventListener('pointerdown',this.onDown);this.renderer.domElement.addEventListener('pointermove',this.onMove);this.renderer.domElement.addEventListener('pointerup',this.onUp);this.renderer.domElement.addEventListener('pointercancel',this.onCancel);
    this.renderer.domElement.addEventListener('webglcontextlost',this.onContextLost);window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onVisibility);
    this.updateLight();this.frame=requestAnimationFrame(this.animate);this.hooks.onReady();
  }
  private material(color:THREE.ColorRepresentation,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
  private mesh(geo:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=this.scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  private makeTerrain(){
    const geometry=new THREE.PlaneGeometry(440,440,180,180);geometry.rotateX(-Math.PI/2);const pos=geometry.attributes.position;const colors=new Float32Array(pos.count*3);const c=new THREE.Color();
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const d=Math.hypot(x,z);const mountains=d>80?Math.pow(Math.max(0,Math.sin(x*.021+1)*Math.cos(z*.015)+.22),2)*Math.min(36,(d-80)*.32):0;pos.setY(i,terrainHeight(x,z)+mountains);c.set('#697448');c.offsetHSL((this.rand()-.5)*.028,(this.rand()-.5)*.08,(this.rand()-.5)*.07);c.toArray(colors,i*3);}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1});
    mat.onBeforeCompile=(shader)=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGround;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGround = position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vGround;
        float hashGround(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noiseGround(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashGround(i),hashGround(i+vec2(1.,0.)),f.x),mix(hashGround(i+vec2(0.,1.)),hashGround(i+vec2(1.,1.)),f.x),f.y);}
      `).replace('#include <color_fragment>',`#include <color_fragment>
        vec2 p=vGround.xz;
        float n=noiseGround(p*1.8)*.5+noiseGround(p*9.)*.3+noiseGround(p*37.)*.2;
        float trail=min(abs(p.x+sin(p.y*.11)*2.),abs(p.y-4.-sin(p.x*.12)*2.));
        float clearing=1.-smoothstep(4.,8.,length(p-vec2(0.,1.)));
        float path=max(1.-smoothstep(1.0,2.8,trail+n),clearing);
        path*=1.-smoothstep(22.,42.,length(p));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.46,.35,.22),path*.8);
        diffuseColor.rgb*=.72+n*.6;
      `);
    };
    this.mesh(geometry,mat).castShadow=false;
  }
  private makeForest(count:number){
    const bark=new THREE.MeshStandardMaterial({color:'#655c45',roughness:1});
    const trunkGeo=new THREE.CylinderGeometry(.18,.46,1,8,3);trunkGeo.translate(0,.5,0);
    const trunks=new THREE.InstancedMesh(trunkGeo,bark,count);const foliageGeo=new THREE.ConeGeometry(1,1,9,2);foliageGeo.translate(0,.5,0);
    const foliage=new THREE.InstancedMesh(foliageGeo,this.material('#4a6343'),count*6);
    const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.09,1,5),bark,count*6);
    let actual=0;const c=new THREE.Color();
    for(let i=0;i<count;i++){
      let x=0,z=0;for(let trial=0;trial<70;trial++){const ang=this.rand()*TAU,r=19+Math.pow(this.rand(),.65)*130;x=Math.cos(ang)*r;z=Math.sin(ang)*r;if((Math.abs(x)>4||z>15)&&((x-25)**2/150+(z-9)**2/400)>1.15&&!(x>0&&x<40&&z>12&&z<43&&r<40))break;}
      const height=8+this.rand()*12,scale=.6+this.rand()*.55,y=terrainHeight(x,z);
      this.dummy.position.set(x,y,z);this.dummy.rotation.set((this.rand()-.5)*.06,this.rand()*TAU,(this.rand()-.5)*.05);this.dummy.scale.set(scale,height,scale);this.dummy.updateMatrix();trunks.setMatrixAt(i,this.dummy.matrix);
      c.setHSL(.245+this.rand()*.05,.19+this.rand()*.18,.15+this.rand()*.12);
      for(let layer=0;layer<6;layer++){
        const idx=i*6+layer,t=layer/6;const w=scale*(3.8-t*3.1),h=height*(.34-t*.1);
        this.dummy.position.set(x+(this.rand()-.5)*.45,y+height*(.2+t*.64),z+(this.rand()-.5)*.45);this.dummy.rotation.set(0,this.rand()*TAU,0);this.dummy.scale.set(w,h,w*(.85+this.rand()*.3));this.dummy.updateMatrix();foliage.setMatrixAt(idx,this.dummy.matrix);foliage.setColorAt(idx,c.clone().offsetHSL(0,0,layer*.006));
        const a=this.rand()*TAU;this.dummy.position.set(x+Math.cos(a)*w*.3,y+height*(.2+t*.6),z+Math.sin(a)*w*.3);this.dummy.rotation.set(Math.cos(a)*1.1,0,Math.sin(a)*1.1);this.dummy.scale.set(scale,w*.9,scale);this.dummy.updateMatrix();branches.setMatrixAt(idx,this.dummy.matrix);
      }actual++;
    }
    trunks.count=actual;trunks.castShadow=true;trunks.receiveShadow=true;foliage.castShadow=true;foliage.receiveShadow=true;branches.castShadow=true;this.scene.add(trunks,foliage,branches);
    // Broadleaf trees beside the settlement break up the pine canopy.
    const leafGeo=new THREE.IcosahedronGeometry(1,2);const leafMat=this.material('#778054');
    for(const [x,z,s] of [[-18,-8,1],[14,-16,.8],[-19,5,1.2]]){
      const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);this.scene.add(g);
      this.mesh(new THREE.CylinderGeometry(.22,.56,8*s,9),bark,0,4*s,0,g);
      for(let j=0;j<18;j++){const a=this.rand()*TAU,r=this.rand()*3.3*s;const m=this.mesh(leafGeo,leafMat,Math.cos(a)*r,7*s+this.rand()*3.5*s,Math.sin(a)*r,g);m.scale.set(1.5*s,(.8+this.rand())*s,1.4*s);}
    }
  }
  private makeGroundCover(count:number){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.06,0,0,.06,0,0,.04,.34,0,.04,.34,0,.06,0,0,.07,.6,.035],3));geo.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:'#889059',roughness:1,side:THREE.DoubleSide});
    mat.onBeforeCompile=(shader)=>{shader.uniforms.uWind={value:0};mat.userData.shader=shader;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uWind;').replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      transformed.x+=sin(uWind*1.4+instanceMatrix[3].x*.3+instanceMatrix[3].z*.2)*position.y*position.y*.2;
      #endif
    `);};
    const grass=new THREE.InstancedMesh(geo,mat,count);const c=new THREE.Color();let used=0;
    for(let i=0;i<count*2&&used<count;i++){
      const x=(this.rand()-.5)*116,z=(this.rand()-.5)*116;
      const trail=Math.min(Math.abs(x+Math.sin(z*.11)*2),Math.abs(z-4-Math.sin(x*.12)*2));
      if(terrainHeight(x,z)<-1||Math.hypot(x,z-1)<5.5||trail<2||OBSTACLES.some(o=>Math.hypot(x-o.x,z-o.z)<o.r))continue;
      this.dummy.position.set(x,terrainHeight(x,z),z);this.dummy.rotation.set(0,this.rand()*TAU,(this.rand()-.5)*.15);this.dummy.scale.setScalar(.5+this.rand()*1.4);this.dummy.updateMatrix();grass.setMatrixAt(used,this.dummy.matrix);c.setHSL(.2+this.rand()*.07,.25,.22+this.rand()*.16);grass.setColorAt(used,c);used++;
    }
    grass.count=used;grass.receiveShadow=true;this.scene.add(grass);this.scene.userData.grassMaterial=mat;
    // Wildflower stems and small blossoms at the path's edges.
    const flowerGeo=new THREE.IcosahedronGeometry(.065,0);const flower=new THREE.InstancedMesh(flowerGeo,this.material('#d9bd91'),220);
    for(let i=0;i<220;i++){const x=(this.rand()-.5)*45,z=(this.rand()-.5)*45;this.dummy.position.set(x,terrainHeight(x,z)+.4,z);this.dummy.scale.setScalar(.7+this.rand());this.dummy.updateMatrix();flower.setMatrixAt(i,this.dummy.matrix);flower.setColorAt(i,new THREE.Color(i%3?'#d7c99b':'#8b9aaf'));}this.scene.add(flower);
  }
  private makeRocks(){
    const geo=new THREE.IcosahedronGeometry(1,1);const rocks=new THREE.InstancedMesh(geo,this.material('#858879'),200);
    for(let i=0;i<200;i++){let x,z;if(i<80){const a=this.rand()*TAU;x=25+Math.cos(a)*(10+this.rand()*1.7);z=9+Math.sin(a)*(16+this.rand()*1.8);}else{x=(this.rand()-.5)*115;z=(this.rand()-.5)*115;}const s=.18+this.rand()*.8;this.dummy.position.set(x,terrainHeight(x,z)+s*.18,z);this.dummy.rotation.set(this.rand()*TAU,this.rand()*TAU,this.rand()*TAU);this.dummy.scale.set(s*(1+this.rand()),s*.65,s);this.dummy.updateMatrix();rocks.setMatrixAt(i,this.dummy.matrix);rocks.setColorAt(i,new THREE.Color().setHSL(.14,.06,.28+this.rand()*.2));}rocks.castShadow=true;rocks.receiveShadow=true;this.scene.add(rocks);
  }
  private makeSettlement(){
    this.makeCabin(-9,-6,1,0);this.makeCabin(8,-10,.82,-.2);
    const wood=this.material('#80705a'),dark=this.material('#3c352c');const workshop=new THREE.Group();workshop.position.set(-13,-.2,5);this.scene.add(workshop);
    for(const x of [-1.8,1.8])for(const z of [-1.3,1.3])this.mesh(new THREE.BoxGeometry(.16,3.5,.16),wood,x,1.75,z,workshop);
    const roof=this.mesh(new THREE.BoxGeometry(4.5,.17,3.8),dark,0,3.6,0,workshop);roof.rotation.z=.09;
    this.mesh(new THREE.BoxGeometry(3.5,.18,1.4),wood,0,1.4,0,workshop);
    for(let i=0;i<12;i++){const l=this.mesh(new THREE.CylinderGeometry(.18,.21,2.4,9),wood,-.9+(i%4)*.5,.3+Math.floor(i/4)*.36,-1.8);l.rotation.z=Math.PI/2;l.position.x-=13;l.position.z+=5;}
    const garden=new THREE.Group();garden.position.set(9,terrainHeight(9,-3),-3);this.scene.add(garden);
    for(let i=0;i<3;i++){
      const y=i*1.3;this.mesh(new THREE.BoxGeometry(3.4,.18,.88),this.material('#403b29'),0,.13,y,garden);
      for(const x of [-1.8,1.8])this.mesh(new THREE.BoxGeometry(.14,.38,1.05),wood,x,.2,y,garden);
      for(const z of [-.5,.5])this.mesh(new THREE.BoxGeometry(3.7,.38,.12),wood,0,.2,y+z,garden);
      for(let j=0;j<8;j++){const m=this.mesh(new THREE.IcosahedronGeometry(.23,1),this.material(j%2?'#536645':'#71804d'),-1.4+j*.4,.44,y,garden);m.scale.y=1.4;}
    }
    // Split-rail fencing and timber trail markers.
    for(let i=0;i<8;i++){const x=-14+i*3,z=-13;this.mesh(new THREE.CylinderGeometry(.09,.13,1.45,7),wood,x,.5,z);if(i<7)for(const y of [.55,1]){const rail=this.mesh(new THREE.CylinderGeometry(.06,.08,3.1,6),wood,x+1.5,y,z);rail.rotation.z=Math.PI/2;}}
    const post=this.mesh(new THREE.BoxGeometry(.16,2.6,.16),wood,3,1.1,-13);post.rotation.z=.06;this.mesh(new THREE.BoxGeometry(1.6,.32,.15),wood,3,2,-13);
    const barrelMat=this.material('#72614a');for(const [x,z] of [[-5.9,-3.1],[-6.9,-3.1],[10.9,-7.2]]){
      this.mesh(new THREE.CylinderGeometry(.43,.38,.95,12),barrelMat,x,.3,z);
      for(const y of [.02,.62])this.mesh(new THREE.TorusGeometry(.42,.03,5,12),dark,x,y,z).rotation.x=Math.PI/2;
    }
  }
  private makeCabin(x:number,z:number,scale:number,rotation:number){
    const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);g.rotation.y=rotation;this.scene.add(g);
    const wood=this.material('#76634b'),plank=this.material('#8b765a'),roof=this.material('#424940'),foundation=this.material('#7a7b6d');
    this.mesh(new THREE.BoxGeometry(6.5,.6,5),foundation,0,.05,0,g);
    this.mesh(new THREE.BoxGeometry(6.1,3.2,4.7),wood,0,1.8,0,g);
    const trims=[];
    for(let j=0;j<12;j++){
      const a=new THREE.BoxGeometry(6.22,.14,.12);a.translate(0,.45+j*.26,2.39);trims.push(a);
      const b=new THREE.BoxGeometry(.12,.14,4.8);b.translate(3.1,.45+j*.26,0);trims.push(b);
      const c=b.clone();c.translate(-6.2,0,0);trims.push(c);
    }
    const trimGeo=mergeGeometries(trims);if(trimGeo)this.mesh(trimGeo,plank,0,0,0,g);trims.forEach(t=>t.dispose());
    const triangle=new THREE.Shape();triangle.moveTo(-3.06,0);triangle.lineTo(3.06,0);triangle.lineTo(0,2.75);triangle.closePath();
    const roofWall=new THREE.ExtrudeGeometry(triangle,{depth:4.7,bevelEnabled:false});this.mesh(roofWall,plank,0,3.4,-2.35,g);
    for(const side of [-1,1]){
      const r=this.mesh(new THREE.BoxGeometry(4.4,.22,5.8),roof,side*1.64,4.78,0,g);r.rotation.z=-side*.731;
      for(let j=0;j<15;j++){const batten=this.mesh(new THREE.BoxGeometry(.07,.08,5.83),this.material('#55594a'),side*(j/14*3.35),6.28-j/14*2.98,0,g);batten.rotation.z=-side*.731;}
    }
    this.mesh(new THREE.BoxGeometry(1.2,2.25,.13),this.material('#342e25'),0,1.25,2.44,g);
    this.mesh(new THREE.BoxGeometry(1.32,.5,1.4),plank,0,.02,3,g);
    const frame=this.material('#352e25');
    for(const wx of [-1.95,1.95]){
      this.mesh(new THREE.BoxGeometry(1.3,1.5,.13),frame,wx,2.05,2.45,g);this.mesh(new THREE.PlaneGeometry(1.05,1.23),this.windows,wx,2.05,2.523,g).castShadow=false;
      this.mesh(new THREE.BoxGeometry(.065,1.35,.08),frame,wx,2.05,2.57,g);this.mesh(new THREE.BoxGeometry(1.13,.065,.08),frame,wx,2.05,2.57,g);
      this.mesh(new THREE.BoxGeometry(1.5,.15,.38),plank,wx,1.26,2.5,g);
    }
    this.mesh(new THREE.BoxGeometry(.73,2.15,.74),foundation,1.5,5.5,-1.1,g);this.mesh(new THREE.BoxGeometry(.94,.16,.94),frame,1.5,6.57,-1.1,g);
    this.mesh(new THREE.BoxGeometry(.18,.5,.18),this.windows,.9,2.1,2.7,g);
  }
  private makeBench(){
    this.bench.position.set(6.3,terrainHeight(6.3,1),1);this.bench.rotation.y=.2;const mat=this.material('#ad8b61');
    for(const x of [-.9,.9])for(const z of [-.3,.3])this.mesh(new THREE.BoxGeometry(.15,.65,.15),mat,x,.32,z,this.bench);
    for(const z of [-.25,0,.25])this.mesh(new THREE.BoxGeometry(2.6,.12,.22),mat,0,.67,z,this.bench);
    for(const x of [-.9,.9])this.mesh(new THREE.BoxGeometry(.12,1.4,.12),mat,x,.7,-.3,this.bench);
    for(const y of [1.02,1.29])this.mesh(new THREE.BoxGeometry(2.6,.2,.12),mat,0,y,-.3,this.bench);this.bench.visible=this.sim.built;
  }
  private makeWater(){
    const material=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uDay:{value:1}},vertexShader:`varying vec3 vPosition;varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.62+uTime*.55)*.045+sin(p.y*.5-uTime*.4)*.04;vPosition=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec3 vPosition;varying vec2 vUv;uniform float uTime;uniform float uDay;void main(){vec2 p=vUv*2.-1.;float d=p.x*p.x+p.y*p.y;if(d>1.)discard;float wave=sin(vPosition.x*2.8+vPosition.y*.7+uTime)*sin(vPosition.y*3.5-uTime*.5);float glint=pow(max(0.,wave),15.);vec3 col=mix(vec3(.08,.20,.18),vec3(.32,.47,.39),sin(vPosition.y*.24+uTime*.12)*.5+.5);col+=vec3(.55,.49,.29)*glint*.6;col*=.23+uDay*.77;float edge=smoothstep(.84,1.,d);col=mix(col,vec3(.32,.37,.23)*(.35+.65*uDay),edge);gl_FragColor=vec4(col,.92);}`});
    const water=new THREE.Mesh(new THREE.PlaneGeometry(20.3,33,32,48),material);water.rotation.x=-Math.PI/2;water.position.set(25,-1.2,9);return water;
  }
  private makeFire(){
    const stone=this.material('#777464'),wood=this.material('#4c382a');
    for(let i=0;i<14;i++){const a=i/14*TAU;const m=this.mesh(new THREE.IcosahedronGeometry(.31,1),stone,Math.cos(a)*1.17,.03,1+Math.sin(a)*1.17);m.scale.set(1,.6,1);}
    for(let i=0;i<5;i++){const a=i/5*TAU;const log=this.mesh(new THREE.CylinderGeometry(.15,.21,1.5,8),wood,Math.cos(a)*.27,.03,1+Math.sin(a)*.27);log.rotation.set(Math.PI/2,a,.1);}
    const flame=new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`varying vec3 vPos;uniform float time;void main(){vec3 p=position;p.x+=sin(p.y*13.+time*7.)*.08*(p.y+.5);p.y*=1.8;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec3 vPos;void main(){float t=(vPos.y+.48)/.96;vec3 c=mix(vec3(1.,.85,.26),vec3(1.,.19,.018),t);gl_FragColor=vec4(c,(1.-t)*.78);}`}));flame.position.set(0,.55,1);this.scene.add(flame);
    const light=new THREE.PointLight('#ffae4f',28,16,2);light.position.set(0,1.3,1);this.scene.add(light);
    const p=new Float32Array(65*3);for(let i=0;i<65;i++){p[i*3]=(this.rand()-.5)*.9;p[i*3+1]=this.rand()*4;p[i*3+2]=1+(this.rand()-.5)*.9;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));const sparks=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ffbb59',size:.044,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));this.scene.add(sparks);
    const smokePositions=new Float32Array(50*3);for(let i=0;i<50;i++){smokePositions[i*3]=(this.rand()-.5)*2;smokePositions[i*3+1]=2+this.rand()*10;smokePositions[i*3+2]=1+(this.rand()-.5)*2;}
    const smokeGeo=new THREE.BufferGeometry();smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokePositions,3));
    const smoke=new THREE.Points(smokeGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=120./-p.z;}`,fragmentShader:`void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.63,.64,.59,(1.-smoothstep(.0,1.,d))*.035);}`}));this.scene.add(smoke);
    return {light,flame,sparks,smoke};
  }
  private makeRain(){const p=new Float32Array(700*6);for(let i=0;i<700;i++){const x=(this.rand()-.5)*100,y=this.rand()*35,z=(this.rand()-.5)*100;p.set([x,y,z,x+.08,y-.65,z],i*6);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#cbd9ce',transparent:true,opacity:.28,depthWrite:false}));rain.visible=false;return rain;}
  private makeFireflies(){const p=new Float32Array(100*3);for(let i=0;i<100;i++){p.set([(this.rand()-.5)*60,.7+this.rand()*3,(this.rand()-.5)*60],i*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const f=new THREE.Points(g,new THREE.PointsMaterial({size:.07,color:'#dee99b',transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));return f;}
  private makeStars(){const p=new Float32Array(750*3);for(let i=0;i<750;i++){const a=this.rand()*TAU,y=.08+this.rand()*.92,r=Math.sqrt(1-y*y);p.set([Math.cos(a)*r*280,y*280,Math.sin(a)*r*280],i*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return new THREE.Points(g,new THREE.PointsMaterial({size:.5,color:'#d1dfef',transparent:true,opacity:0,depthWrite:false,fog:false}));}
  private makePerson(color:string,skinColor:string,hairColor:string,index:number):Person{
    const root=new THREE.Group();const cloth=this.material(new THREE.Color(color).multiplyScalar(.64)),skin=this.material(skinColor),hair=this.material(hairColor),boots=this.material('#352f29'),pants=this.material(index%2?'#514d40':'#5e594d');
    const torso=this.mesh(new THREE.CylinderGeometry(.24,.29,.64,10),cloth,0,1.05,0,root);torso.scale.z=.7;
    this.mesh(new THREE.CylinderGeometry(.294,.294,.07,10),boots,0,.83,0,root).scale.z=.73;
    this.mesh(new THREE.BoxGeometry(.08,.085,.04),this.material('#baa16f'),0,.83,.23,root);
    this.mesh(new THREE.CylinderGeometry(.075,.09,.13,9),skin,0,1.42,0,root);
    const head=new THREE.Group();head.position.y=1.59;root.add(head);
    const face=this.mesh(new THREE.SphereGeometry(.19,14,12),skin,0,0,0,head);face.scale.set(.88,1.13,.88);
    const hairMesh=this.mesh(new THREE.SphereGeometry(.197,14,10,0,TAU,0,1.65),hair,0,.055,-.015,head);hairMesh.scale.set(.9,1.08,1);
    for(const x of [-.062,.062])this.mesh(new THREE.SphereGeometry(.015,6,5),boots,x,.026,.151,head);
    this.mesh(new THREE.SphereGeometry(.032,7,6),skin,0,-.015,.17,head).scale.set(.65,1,1);
    if(index===1||index===3){const back=this.mesh(new THREE.SphereGeometry(.17,10,9),hair,0,-.09,-.1,head);back.scale.set(1,1.7,.75);}
    if(index===2||index===5){this.mesh(new THREE.CylinderGeometry(.22,.23,.16,12),this.material(index===2?'#837052':'#586455'),0,.2,0,head);this.mesh(new THREE.CylinderGeometry(.33,.33,.032,14),this.material(index===2?'#837052':'#586455'),0,.15,0,head);}
    const leg=(side:number)=>{const pivot=new THREE.Group();pivot.position.set(side*.14,.75,0);root.add(pivot);this.mesh(new THREE.CylinderGeometry(.095,.074,.59,9),pants,0,-.28,0,pivot);this.mesh(new THREE.BoxGeometry(.17,.18,.28),boots,0,-.62,.045,pivot);return pivot;};
    const arm=(side:number)=>{const pivot=new THREE.Group();pivot.position.set(side*.285,1.3,0);root.add(pivot);this.mesh(new THREE.CylinderGeometry(.083,.068,.31,8),cloth,side*.015,-.14,0,pivot);this.mesh(new THREE.CylinderGeometry(.064,.048,.27,8),skin,side*.026,-.4,.01,pivot);this.mesh(new THREE.SphereGeometry(.062,8,7),skin,side*.027,-.55,.018,pivot);return pivot;};
    const leftLeg=leg(-1),rightLeg=leg(1),leftArm=arm(-1),rightArm=arm(1);
    if(index===2||index===5){const bag=this.mesh(new THREE.BoxGeometry(.38,.43,.19),this.material('#756149'),0,1.1,-.24,root);bag.rotation.x=.08;}
    if(index===0||index===4)this.mesh(new THREE.BoxGeometry(.32,.43,.045),this.material('#695543'),0,.82,.22,root);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.53,.57,40),new THREE.MeshBasicMaterial({color:'#f0d49f',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.visible=false;root.add(ring);
    return {root,leftLeg,rightLeg,leftArm,rightArm,head,ring};
  }
  private resize(){this.width=this.container.clientWidth;this.height=this.container.clientHeight;if(this.width===0||this.height===0)return;this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.renderer.setSize(this.width,this.height);}
  select(id:string|null){this.selected=id;for(const [key,l] of this.labels)l.classList.toggle('selected',key===id);if(id){const a=this.sim.agents.find(a=>a.id===id);if(a&&this.mode==='orbit'){this.target.set(a.x,1.2,a.z);const delta=this.target.clone().sub(this.controls.target);this.controls.target.copy(this.target);this.camera.position.add(delta);}}}
  setMode(mode:CameraMode){
    if(mode==='follow'&&!this.selected){this.selected='rowan';this.hooks.onSelect('rowan');}
    if(mode==='walk'){
      this.controls.enabled=false;this.camera.position.set(4,terrainHeight(4,13)+1.85,13);this.yaw=.25;this.pitch=0;this.camera.rotation.order='YXZ';
    }else{
      if(this.mode==='walk'){this.camera.position.set(24,15,28);this.controls.target.set(0,1,0);}this.controls.enabled=true;this.camera.rotation.order='XYZ';this.controls.update();
    }
    this.keys.clear();this.mode=mode;
  }
  private onDown=(e:PointerEvent)=>{this.down={x:e.clientX,y:e.clientY};if(this.mode==='walk'){this.dragging=true;this.renderer.domElement.setPointerCapture(e.pointerId);}};
  private onMove=(e:PointerEvent)=>{if(this.mode==='walk'&&this.dragging){this.yaw-=e.movementX*.003;this.pitch=Math.max(-1.1,Math.min(1.1,this.pitch-e.movementY*.003));}};
  private onUp=(e:PointerEvent)=>{this.dragging=false;if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>7)return;const rect=this.container.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/this.width*2-1,-(e.clientY-rect.top)/this.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects([...this.people.values()].map(p=>p.root),true);if(hits[0]){let obj:THREE.Object3D|null=hits[0].object;while(obj){for(const [id,p] of this.people)if(obj===p.root){this.hooks.onSelect(id);return;}obj=obj.parent;}}};
  private onCancel=()=>{this.dragging=false;this.keys.clear();};
  private onKeyDown=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('input,textarea,[role="dialog"]'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();this.keys.add(e.key.toLowerCase());};
  private onKeyUp=(e:KeyboardEvent)=>this.keys.delete(e.key.toLowerCase());
  private onBlur=()=>this.keys.clear();
  private onVisibility=()=>{this.last=0;this.keys.clear();if(document.hidden){this.sim.save();void this.sound?.suspend();}else if(this.soundOn)void this.sound?.resume();};
  private onContextLost=(e:Event)=>{e.preventDefault();this.stopped=true;cancelAnimationFrame(this.frame);this.hooks.onError('The 3D view was interrupted. Reload to resume your saved world.');};
  private updateLight(){
    const hours=(this.sim.time%1440)/60,angle=(hours-6)/12*Math.PI;const day=THREE.MathUtils.clamp(Math.sin(angle)*1.4,.07,1);
    const elevation=Math.max(-.06,Math.sin(angle));this.sun.position.set(-Math.cos(angle)*55,Math.max(5,elevation*65),-28);
    this.sky.material.uniforms.sunPosition.value.set(-Math.cos(angle)*55,Math.sin(angle)*65,-28);
    const rain=this.sim.weather==='rain';this.sun.intensity=(.12+day*3.4)*(rain?.24:1);this.ambient.intensity=(.3+day*1.8)*(rain?.72:1);
    this.sun.color.set(day<.6?'#ffb879':'#ffdab0');this.ambient.color.set(day<.35?'#92acc6':'#c9e4de');
    const fog=this.scene.fog as THREE.FogExp2;fog.color.set(day<.3?'#243342':rain?'#6e837d':'#a1b19a');fog.density=rain?.014:.0075;
    this.water.material.uniforms.uDay.value=day;this.windows.emissiveIntensity=1.9-day*1.2;(this.fireflies.material as THREE.PointsMaterial).opacity=(1-day)*.9+.07;
    this.rain.visible=rain;this.fireMesh.visible=!rain;this.particles.visible=!rain;this.smoke.visible=!rain;
    (this.stars.material as THREE.PointsMaterial).opacity=rain?0:THREE.MathUtils.clamp((.4-day)*2.4,0,.9);
    this.sky.material.uniforms.rayleigh.value=day<.2?4:1.1;
  }
  private animate=(timestamp:number)=>{
    if(this.stopped)return;this.frame=requestAnimationFrame(this.animate);const dt=this.last?Math.min((timestamp-this.last)/1000,.05):0;this.last=timestamp;if(document.hidden)return;this.visualTime+=dt;const t=this.visualTime;
    this.sim.step(this.paused?0:dt*this.speed);
    this.bench.visible=this.sim.built;
    for(const a of this.sim.agents){const p=this.people.get(a.id)!;p.root.position.set(a.x,terrainHeight(a.x,a.z),a.z);let diff=a.heading-p.root.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));p.root.rotation.y+=diff*Math.min(1,dt*9);const move=a.moving&&!this.paused;const swing=move?Math.sin(this.sim.elapsed*7.5)*.54:0;p.leftLeg.rotation.x=swing;p.rightLeg.rotation.x=-swing;p.leftArm.rotation.x=-swing*.7;p.rightArm.rotation.x=swing*.7;p.root.position.y+=move?Math.abs(Math.sin(this.sim.elapsed*7.5))*.035:Math.sin(t*1.8+this.sim.agents.indexOf(a))*.008;p.ring.visible=a.id===this.selected;p.head.rotation.y=a.speech?Math.sin(t*1.2)*.09:0;}
    if(this.mode==='follow'&&this.selected){const a=this.sim.agents.find(a=>a.id===this.selected)!;this.target.set(a.x,1.1,a.z);const delta=this.target.clone().sub(this.controls.target).multiplyScalar(Math.min(1,dt*3));this.controls.target.add(delta);this.camera.position.add(delta);if(this.camera.position.distanceTo(this.controls.target)>14){this.temp.copy(this.camera.position).sub(this.controls.target).normalize().multiplyScalar(13).add(this.controls.target);this.camera.position.lerp(this.temp,dt*1.8);}}
    if(this.mode==='walk'){
      this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');let dx=0,dz=0;const f=(this.keys.has('w')||this.keys.has('arrowup')?1:0)-(this.keys.has('s')||this.keys.has('arrowdown')?1:0);const side=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0);dx=(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*side)*dt*4;dz=(-Math.cos(this.yaw)*f-Math.sin(this.yaw)*side)*dt*4;const x=this.camera.position.x+dx,z=this.camera.position.z+dz;if(walkable(x,z)){this.camera.position.x=x;this.camera.position.z=z;}this.camera.position.y=terrainHeight(this.camera.position.x,this.camera.position.z)+1.85;
    }else this.controls.update();
    this.camera.updateMatrixWorld();
    for(const a of this.sim.agents){const label=this.labels.get(a.id)!;this.temp.set(a.x,terrainHeight(a.x,a.z)+2.35,a.z).project(this.camera);const distance=this.camera.position.distanceTo(this.people.get(a.id)!.root.position);const visible=this.temp.z>-1&&this.temp.z<1&&Math.abs(this.temp.x)<.98&&Math.abs(this.temp.y)<.93&&distance<85;label.classList.toggle('hidden',!visible);if(visible){label.style.transform=`translate(${(this.temp.x*.5+.5)*this.width}px,${(-this.temp.y*.5+.5)*this.height}px) translate(-50%,-100%)`;label.style.zIndex=String(Math.round(100-distance));const speech=label.firstChild as HTMLElement;const show=!!a.speech&&distance<40;const small=this.width<700;speech.hidden=!show||(small&&a.id!==this.selected);if(speech.textContent!==a.speech)speech.textContent=a.speech;}}
    this.water.material.uniforms.uTime.value=t;(this.fireMesh.material as THREE.ShaderMaterial).uniforms.time.value=t;
    this.fire.intensity=this.sim.weather==='rain'?0:23+Math.sin(t*13)*3+Math.sin(t*21)*2;this.fireMesh.scale.set(1+Math.sin(t*17)*.1,1+Math.sin(t*9)*.13,1);
    const sparks=this.particles.geometry.attributes.position;for(let i=0;i<sparks.count;i++){let y=sparks.getY(i)+dt*(.8+i%3*.2);if(y>4)y=.2;sparks.setY(i,y);sparks.setX(i,Math.sin(t*.7+i)*y*.1);}sparks.needsUpdate=true;
    const smoke=this.smoke.geometry.attributes.position;for(let i=0;i<smoke.count;i++){let y=smoke.getY(i)+dt*.6;if(y>12)y=1.2;smoke.setY(i,y);smoke.setX(i,Math.sin(t*.25+i)*y*.13+y*.08);}smoke.needsUpdate=true;
    this.fireflies.rotation.y=Math.sin(t*.04)*.07;
    if(this.rain.visible){const rain=this.rain.geometry.attributes.position;for(let i=0;i<rain.count;i+=2){let y=rain.getY(i)-dt*22;if(y<-.5)y=35;rain.setY(i,y);rain.setY(i+1,y-.65);}rain.needsUpdate=true;}
    const grassMat=this.scene.userData.grassMaterial;if(grassMat.userData.shader)grassMat.userData.shader.uniforms.uWind.value=t;
    if(timestamp-this.lightTick>750){this.updateLight();this.lightTick=timestamp;}
    if(timestamp-this.uiTick>350){this.hooks.onFrame();this.uiTick=timestamp;}
    this.renderer.render(this.scene,this.camera);
  };
  async toggleAudio(){
    if(this.soundOn){this.soundOn=false;await this.sound?.suspend();return false;}
    if(!this.sound){
      this.sound=new AudioContext();this.volume=this.sound.createGain();this.volume.gain.value=.12;this.volume.connect(this.sound.destination);
      const buffer=this.sound.createBuffer(1,this.sound.sampleRate*4,this.sound.sampleRate);const data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.016)/1.018;data[i]=last*3;}
      const source=this.sound.createBufferSource();source.buffer=buffer;source.loop=true;const filter=this.sound.createBiquadFilter();filter.type='lowpass';filter.frequency.value=440;source.connect(filter);filter.connect(this.volume);source.start();
      this.audioTimer=setInterval(()=>{if(!this.soundOn||!this.sound||!this.volume||document.hidden)return;const now=this.sound.currentTime;const osc=this.sound.createOscillator(),gain=this.sound.createGain();osc.type='sine';osc.frequency.setValueAtTime(2100+Math.random()*700,now);osc.frequency.exponentialRampToValueAtTime(3400,now+.08);osc.frequency.exponentialRampToValueAtTime(2300,now+.21);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.035,now+.035);gain.gain.exponentialRampToValueAtTime(.0001,now+.28);osc.connect(gain);gain.connect(this.volume);osc.start();osc.stop(now+.3);osc.onended=()=>{osc.disconnect();gain.disconnect();};},4800);
    }
    await this.sound.resume();this.soundOn=true;return true;
  }
  dispose(){this.stopped=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.onDown);this.renderer.domElement.removeEventListener('pointermove',this.onMove);this.renderer.domElement.removeEventListener('pointerup',this.onUp);this.renderer.domElement.removeEventListener('pointercancel',this.onCancel);this.renderer.domElement.removeEventListener('webglcontextlost',this.onContextLost);window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);if(this.audioTimer)clearInterval(this.audioTimer);void this.sound?.close();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();this.container.replaceChildren();}
}
