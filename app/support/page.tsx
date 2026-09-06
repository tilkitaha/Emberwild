export default function SupportPage() {
  return <main style={{maxWidth:760,margin:'0 auto',padding:'48px 22px 80px',fontFamily:'system-ui',lineHeight:1.65,color:'#f2eadb',background:'#101916',minHeight:'100vh'}}>
    <h1>Emberwild Support</h1>
    <p>If Emberwild crashes, voice input fails, multiplayer cannot connect, or your save behaves unexpectedly, include your device model, iOS version, and a short description of what happened.</p>
    <h2>Support channel</h2>
    <p><a href="https://github.com/tilkitaha/Emberwild/issues" style={{color:'#e7c78f'}}>Open an Emberwild support issue on GitHub</a></p>
    <h2>Useful checks</h2>
    <p>For voice, confirm Microphone and Speech Recognition permissions are enabled. For multiplayer, confirm the device has internet access and both players are using the same room code.</p>
    <p><a href="../privacy/" style={{color:'#e7c78f'}}>Privacy Policy</a> · <a href="../" style={{color:'#e7c78f'}}>Return to Emberwild</a></p>
  </main>;
}
