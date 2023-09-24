import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import DataDisplay from './src/screens/DataDisplay';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <DataDisplay />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
    // justifyContent: 'center',
    // alignItems: 'center',
  },
});

export default App;
