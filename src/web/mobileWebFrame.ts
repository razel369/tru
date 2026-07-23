import { Platform } from "react-native";

if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "pawpair-responsive-frame";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html, body, #root { min-height: 100%; width: 100%; }
      body {
        margin: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 15% 8%, rgba(255, 209, 103, .18), transparent 24rem),
          linear-gradient(135deg, #e8ded1 0%, #f5eee5 48%, #ded4c7 100%);
      }
      #root { align-items: stretch; display: flex; justify-content: center; }
      #root > div { height: 100dvh; max-width: 100%; width: 100%; }
      @media (min-width: 768px) {
        #root > div { box-shadow: 0 24px 80px rgba(42, 55, 72, .12); }
      }
    `;
    document.head.appendChild(style);
  }
}

export {};
