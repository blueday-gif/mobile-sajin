import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { InspectionProvider } from '../store/InspectionProvider';

export default function RootLayout() {
  return (
    <InspectionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </InspectionProvider>
  );
}
