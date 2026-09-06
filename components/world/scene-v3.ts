import * as THREE from 'three';
import { WorldScene } from './scene';
import { terrainHeight } from './simulation';
import type { SimulationV3 } from './simulation-v3';
import type { MultiplayerPlayer } from './multiplayer';

type RemoteAvatar = { root: THREE.Group; target: THREE.Vector3; heading: number; label: HTMLDivElement };

const palette = ['#78bfa8','#c79cc8','#d4b06f','#86a7ce','#d68f7f','#9bc37d'];

export class V3WorldScene extends WorldScene {
  private remotePlayers = new Map<string, RemoteAvatar>();

  constructor(container: HTMLDivElement, sim: SimulationV3, hooks: ConstructorParameters<typeof WorldScene>[2]) {
    super(container, sim, hooks);
  }

  private makeRemoteAvatar(player: MultiplayerPlayer) {
    const root = new THREE.Group();
    const color = palette[Math.abs([...player.id].reduce((a,c)=>a+c.charCodeAt(0),0)) % palette.length];
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .82 });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#bd9476', roughness: .9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#3d342e', roughness: .95 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.28,.72,5,10), bodyMat);body.position.y=1.02;body.castShadow=true;root.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.28,14,10), skinMat);head.position.y=1.72;head.castShadow=true;root.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.285,12,8,0,Math.PI*2,0,Math.PI*.52), darkMat);hair.position.y=1.79;hair.castShadow=true;root.add(hair);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(.42,.55,.2), darkMat);pack.position.set(0,1.05,-.27);pack.castShadow=true;root.add(pack);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.44,.48,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;root.add(ring);
    root.position.set(player.x,terrainHeight(player.x,player.z),player.z);root.rotation.y=player.heading;this.scene.add(root);

    const label=document.createElement('div');label.className='v3-remote-label';label.textContent=player.name;this.renderer.domElement.parentElement?.appendChild(label);
    return { root, target:new THREE.Vector3(player.x,terrainHeight(player.x,player.z),player.z), heading:player.heading, label };
  }

  setRemotePlayers(players: MultiplayerPlayer[], localId: string) {
    const remote = players.filter(p=>p.id!==localId);
    const ids = new Set(remote.map(p=>p.id));
    for (const [id, avatar] of this.remotePlayers) {
      if (ids.has(id)) continue;
      avatar.root.removeFromParent();avatar.label.remove();this.remotePlayers.delete(id);
    }
    for (const player of remote) {
      let avatar=this.remotePlayers.get(player.id);
      if(!avatar){avatar=this.makeRemoteAvatar(player);this.remotePlayers.set(player.id,avatar);}
      avatar.target.set(player.x,terrainHeight(player.x,player.z),player.z);avatar.heading=player.heading;avatar.label.textContent=`${player.name} · Lv.${player.level}`;
      avatar.root.position.lerp(avatar.target,.72);
      let diff=avatar.heading-avatar.root.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));avatar.root.rotation.y+=diff*.7;
      const projected=new THREE.Vector3(avatar.root.position.x,avatar.root.position.y+2.25,avatar.root.position.z).project(this.camera);
      const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1;
      avatar.label.classList.toggle('hidden',!visible);
      if(visible){const rect=this.renderer.domElement.getBoundingClientRect();avatar.label.style.transform=`translate(${(projected.x*.5+.5)*rect.width}px,${(-projected.y*.5+.5)*rect.height}px) translate(-50%,-100%)`;}
    }
  }

  dispose(){for(const avatar of this.remotePlayers.values())avatar.label.remove();this.remotePlayers.clear();super.dispose();}
}
