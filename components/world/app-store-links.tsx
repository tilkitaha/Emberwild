'use client';

export function AppStoreLinks() {
  return <nav aria-label="Legal and support" style={{position:'fixed',zIndex:90,left:'max(12px, env(safe-area-inset-left))',bottom:'max(10px, env(safe-area-inset-bottom))',display:'flex',gap:8,fontFamily:'system-ui',fontSize:11}}>
    <a href="./privacy/" style={{color:'#f2eadb',background:'rgba(16,25,22,.72)',border:'1px solid rgba(255,255,255,.14)',borderRadius:999,padding:'7px 10px',textDecoration:'none',backdropFilter:'blur(12px)'}}>Privacy</a>
    <a href="./support/" style={{color:'#f2eadb',background:'rgba(16,25,22,.72)',border:'1px solid rgba(255,255,255,.14)',borderRadius:999,padding:'7px 10px',textDecoration:'none',backdropFilter:'blur(12px)'}}>Support</a>
  </nav>;
}
