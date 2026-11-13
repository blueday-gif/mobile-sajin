import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, getLocalInspectionDate } from '../constants';
import { useInspection } from '../store/InspectionProvider';

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const { updateDraft } = useInspection();

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.94,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        throw new Error('촬영된 사진 파일을 확인할 수 없습니다.');
      }

      const captureDate = getLocalInspectionDate();
      updateDraft({ inspection_date: captureDate });
      router.push({
        pathname: '/preview',
        params: { photoUri: photo.uri, captureDate },
      });
    } catch (error) {
      Alert.alert(
        '사진 촬영 실패',
        error instanceof Error ? error.message : '카메라 촬영 중 오류가 발생했습니다.',
      );
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.permissionText}>카메라 권한을 확인하고 있습니다.</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style="dark" />
        <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
        <Text style={styles.permissionText}>
          점검 사진을 촬영하려면 카메라 접근을 허용해 주세요.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={() => {
              void requestPermission();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>권한 허용</Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionText}>
            기기 설정에서 이 앱의 카메라 권한을 허용해 주세요.
          </Text>
        )}
        <Pressable onPress={() => router.back()} style={styles.cancelPermission}>
          <Text style={styles.cancelText}>입력 화면으로 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <CameraView
        onCameraReady={() => setCameraReady(true)}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>취소</Text>
          </Pressable>
          <Text style={styles.cameraTitle}>점검 사진 촬영</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.bottomBar}>
          <Text style={styles.hint}>점검 위치가 잘 보이도록 촬영해 주세요.</Text>
          <Pressable
            accessibilityLabel="사진 촬영"
            accessibilityRole="button"
            disabled={!cameraReady || capturing}
            onPress={() => void takePhoto()}
            style={[
              styles.shutterOuter,
              (!cameraReady || capturing) && styles.disabledShutter,
            ]}
          >
            {capturing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#101317', flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: { minWidth: 48 },
  backText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cameraTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  shutterOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D5DCE7',
    borderRadius: 38,
    borderWidth: 3,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  shutterInner: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    height: 54,
    width: 54,
  },
  disabledShutter: { opacity: 0.55 },
  permissionScreen: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 24,
    minWidth: 180,
    padding: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  cancelPermission: { marginTop: 22, padding: 12 },
  cancelText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
});
