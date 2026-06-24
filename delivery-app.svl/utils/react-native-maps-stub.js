import React from 'react';
import { View, StyleSheet } from 'react-native';

const MapViewWeb = ({ region, initialRegion, style, children }) => {
  const lat = region?.latitude || initialRegion?.latitude || 50.4501;
  const lng = region?.longitude || initialRegion?.longitude || 30.5234;
  
  // Create an OpenStreetMap embed URL centered at the coordinates with a marker
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.015}%2C${lat-0.015}%2C${lng+0.015}%2C${lat+0.015}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <View style={[styles.container, style]}>
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="Map"
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e5e3df',
  },
});

const MockComponent = ({ children, ...props }) => <View {...props}>{children}</View>;

export const Marker = MockComponent;
export const Polyline = MockComponent;
export const Callout = MockComponent;
export const Circle = MockComponent;
export const Polygon = MockComponent;
export const Heatmap = MockComponent;
export const Overlay = MockComponent;

export default MapViewWeb;
