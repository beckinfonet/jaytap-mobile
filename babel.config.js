module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets/plugin', // MUST be last; reanimated v4 ships its plugin here
  ],
};
