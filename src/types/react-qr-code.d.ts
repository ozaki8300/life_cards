declare module "react-qr-code" {
  import * as React from "react";

  export interface QRCodeProps extends React.SVGProps<SVGSVGElement> {
    bgColor?: React.CSSProperties["backgroundColor"];
    fgColor?: React.CSSProperties["color"];
    level?: "L" | "M" | "Q" | "H";
    size?: number;
    title?: string;
    value: string;
  }

  export default class QRCode extends React.Component<QRCodeProps> {}
}
