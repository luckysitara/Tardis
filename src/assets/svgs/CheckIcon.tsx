import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const CheckIcon = ({ width = 24, height = 24, color = "#FFF", style }: any) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export default CheckIcon;
