import type { MetadataRoute } from "next";

const appBackgroundColor = "#f7f3ea";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Cards",
    short_name: "Life Cards",
    description:
      "写真・スクショ・言葉をカードにして、デッキで育てる知的チェキアプリ。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: appBackgroundColor,
    theme_color: appBackgroundColor,
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
