export default function PrivacyPage() {
  return <main style={{maxWidth:760,margin:'0 auto',padding:'48px 22px 80px',fontFamily:'system-ui',lineHeight:1.65,color:'#f2eadb',background:'#101916',minHeight:'100vh'}}>
    <h1>Emberwild Privacy Policy</h1>
    <p><strong>Last updated:</strong> September 6, 2026</p>
    <p>Emberwild is a living-world game published by TILKI LAB. We design the game to collect as little personal data as possible.</p>
    <h2>Local game data</h2>
    <p>World progress, inventory, relationships, remembered player facts, and settings are stored locally on your device. Deleting the app removes locally stored game data unless a future cloud-save feature is explicitly enabled.</p>
    <h2>Voice</h2>
    <p>Voice input is activated only when you press the microphone control. Your device or browser speech-recognition service may process audio to convert speech into text. Emberwild does not intentionally store microphone recordings.</p>
    <h2>Multiplayer</h2>
    <p>Multiplayer requires network communication to exchange a room identifier, temporary player identifier, position, level, and activity. The public web build may also support player-entered names and room chat. The App Store release is configured to use presence-focused multiplayer while moderation features are being completed.</p>
    <h2>Third-party infrastructure</h2>
    <p>Network providers and relay infrastructure may process ordinary technical data needed to deliver connections, such as IP address and connection metadata. We do not sell personal data or use advertising trackers in the current release.</p>
    <h2>Permissions</h2>
    <p>Microphone and speech-recognition access are requested only for the optional voice-conversation feature. You can deny or revoke these permissions in iOS Settings and continue playing with text controls.</p>
    <h2>Data requests</h2>
    <p>The current release does not operate user accounts or a server-side profile database. For support or privacy questions, use the project support page linked inside the app.</p>
    <p><a href="../support/" style={{color:'#e7c78f'}}>Support</a> · <a href="../" style={{color:'#e7c78f'}}>Return to Emberwild</a></p>
  </main>;
}
