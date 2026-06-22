import React from 'react';
import { View } from 'react-native';

const MockComponent = ({ children, ...props }) => <View {...props}>{children}</View>;

export const Marker = MockComponent;
export const Polyline = MockComponent;
export const Callout = MockComponent;
export const Circle = MockComponent;
export const Polygon = MockComponent;
export const Heatmap = MockComponent;
export const Overlay = MockComponent;

export default MockComponent;
