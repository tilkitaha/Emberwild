import V3WorldApp from "@/components/world/v3-world-app";
import { AppStoreLinks } from "@/components/world/app-store-links";
import { V4ProfileOverlay } from "@/components/world/v4-profile-overlay";
import "./v3.css";
import "./v4.css";

export default function Home() {
  return <>
    <V3WorldApp />
    <V4ProfileOverlay />
    <AppStoreLinks />
  </>;
}
