
# 하자 점검 모바일 앱

Expo SDK 58, React Native, TypeScript로 만든 현장 점검 앱입니다. 기존 Next.js/Supabase 웹 앱과는 별도 프로젝트이며, 현재 점검 기록과 사진은 휴대폰 앱 저장 공간에 보관합니다.

## 구현 기능

- 401~430동 중 동 하나 선택 (기본 선택 없음)
- B3~B1, 1F~35F, 옥상 중 층 하나 선택
- 계단실·전실·승강기홀 중 하나 선택
- 하자 항목 복수 선택 및 항목 추가·수정·삭제
- 입력 내용 자동 보관, 필수 입력 확인 후 카메라 실행
- 사진 촬영, 미리보기, 취소 및 재촬영
- 위치·하자·촬영일 표를 JPG 사진에 실제 합성
- 원본 사진과 합성 사진을 앱 문서 저장 공간에 각각 보관
- 선택 시 사진 갤러리에도 결과 사진 저장
- 점검 기록 조회·수정·삭제

점검 정보를 Supabase와 동기화하는 기능은 아직 연결하지 않았습니다. 갤러리 권한은 갤러리 저장을 선택할 때만 요청합니다.

## Android 개발환경

Android Studio의 첫 실행 설정에서 **Standard**를 선택하고 Android SDK를 설치해야 합니다. Android Studio의 SDK Manager에서 SDK Platform, Android SDK Build-Tools, Android SDK Platform-Tools를 설치하고, 에뮬레이터를 쓸 경우 기기 이미지도 설치해 주세요.

이 PC에는 Android Studio가 설치되어 있으며 `ANDROID_HOME`과 `ANDROID_SDK_ROOT`는 사용자 환경 변수로 등록되어 있습니다. SDK 구성요소 설치 후에는 새 터미널을 열어 환경 변수를 적용합니다.

## 실행

프로젝트 폴더에서:

```powershell
npm install
npm run android
```

`npm run android`는 개발용 Android 앱을 빌드하고 에뮬레이터 또는 USB 디버깅이 허용된 기기에 설치합니다. 이후 JavaScript 변경을 반영할 때는:

```powershell
npm start
```

이 앱은 `react-native-view-shot` 네이티브 모듈을 사용하므로 **Expo Go가 아니라 개발 빌드**에서 실행해야 합니다. Android 에뮬레이터 실행과 카메라 촬영은 Android SDK 설치 후 확인할 수 있습니다.

## 검사 명령

```powershell
npm run typecheck
npm run lint
npx expo-doctor
```
