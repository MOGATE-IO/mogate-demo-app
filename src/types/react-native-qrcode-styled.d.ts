declare module 'react-native-qrcode-styled' {
  import type { ComponentType } from 'react';
  import type { ColorValue } from 'react-native';
  import type { SvgProps } from 'react-native-svg';

  type EyeOptions = {
    borderRadius?: number | number[];
    color?: ColorValue;
  };

  type QrCodeStyledProps = SvgProps & {
    color?: ColorValue;
    data: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    innerEyesOptions?: EyeOptions;
    outerEyesOptions?: EyeOptions;
    padding?: number;
    pieceBorderRadius?: number | number[];
    pieceSize?: number;
  };

  const QRCodeStyled: ComponentType<QrCodeStyledProps>;
  export default QRCodeStyled;
}
