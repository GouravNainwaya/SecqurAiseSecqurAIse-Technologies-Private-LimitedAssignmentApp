import {
  AppState,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
  Alert,
  View,
} from 'react-native';
import React, {useState, useEffect} from 'react';

import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataDisplay = () => {
  const [internetStatus, setInternetStatus] = useState('Unknown');
  const [batteryStatus, setBatteryStatus] = useState('Unknown');
  const [batteryPercentage, setBatteryPercentage] = useState('Unknown');
  const [location, setLocation] = useState('Unknown');
  const [timestamp, setTimestamp] = useState('');
  const [captureCount, setCaptureCount] = useState(0); // Initialize capture count
  const [appState, setAppState] = useState(AppState.currentState); // Track app state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [captureFrequency, setCaptureFrequency] = useState(15); // Default frequency: 15 minutes
  const [newFrequency, setNewFrequency] = useState(captureFrequency.toString());

  const LeftToRightText = ({left, right}) => {
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: responsiveWidth(80),
          marginVertical: 10,
        }}>
        <Text
          style={{
            color: 'white',
            fontWeight: '500',
            fontSize: responsiveFontSize(2.4),
            textTransform: 'capitalize',
          }}>
          {left}
        </Text>
        <Text
          style={{
            color: 'green',
            fontWeight: '500',
            fontSize: responsiveFontSize(1.9),
            textTransform: 'uppercase',
          }}>
          {right}
        </Text>
      </View>
    );
  };

  const MyButton = ({text, onPress}) => {
    return (
      <TouchableOpacity onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{text}</Text>
      </TouchableOpacity>
    );
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // Permission granted, get location
        Geolocation.getCurrentPosition(
          position => {
            setLocation(
              `${position.coords.latitude}, ${position.coords.longitude}`,
            );
          },
          error => {
            setLocation(`Location Error: ${error.message}`);
          },
          {enableHighAccuracy: true, Temp: 20000, maximumAge: 1000},
        );
      } else {
        // Permission not granted, ask again
        requestLocationPermission();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const saveDataLocally = async data => {
    try {
      await AsyncStorage.setItem('localData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data locally:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Internet Connectivity
      const netInfoState = await NetInfo.fetch();
      setInternetStatus(
        netInfoState.isConnected ? 'Connected' : 'Disconnected',
      );

      // Battery Status
      const isCharging = await DeviceInfo.isBatteryCharging();
      setBatteryStatus(isCharging ? 'Charging' : 'Not Charging');
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      setBatteryPercentage(`${(batteryLevel * 100).toFixed(2)}%`);

      // Check battery level and show an alert if it's less than 20%
      if (!isCharging && batteryLevel < 0.2) {
        Alert.alert(
          'Low Battery',
          'Your battery is running low (less than 20%)!',
          [
            {
              text: 'OK',
              onPress: () => console.log('OK Pressed'),
            },
          ],
          {cancelable: false},
        );
      }

      // Store data locally using AsyncStorage
      const dataToStore = {
        internetStatus,
        batteryStatus,
        batteryPercentage,
        location,
        timestamp,
        captureCount,
      };

      await saveDataLocally(dataToStore);

      // Location (Example: Get current location)
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted == PermissionsAndroid.RESULTS.GRANTED) {
        Geolocation.getCurrentPosition(
          position => {
            setLocation(
              `{position.coords.latitude},${position.coords.longitude}`,
            );
          },
          error => {
            setLocation(`Location Error: ${error.message}`);
          },
          {enableHighAccuracy: true, Temp: 20000, maximumAge: 1000},
        );
      } else {
        // Permission not granted, ask again
        requestLocationPermission();
      }

      // Timestamp
      setTimestamp(new Date().toLocaleString());

      // Upload Data
      const dataToUpload = {
        internetStatus,
        batteryStatus,
        batteryPercentage,
        location,
        timestamp,
        captureCount,
      };

      if (internetStatus === 'Connected') {
        // Upload data if internet is available
        const databaseRef = database().ref('deviceInfo');
        await databaseRef.push(dataToUpload);
      } else {
        // Save data locally if no internet
        await saveDataLocally(dataToUpload);
      }

      // Increment the capture count
      setCaptureCount(prevCount => prevCount + 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleManualDataRefresh = async () => {
    try {
      // Fetch data manually
      fetchData();

      // Retrieve locally stored data
      const storedData = await AsyncStorage.getItem('localData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setInternetStatus(parsedData.internetStatus);
        setBatteryStatus(parsedData.batteryStatus);
        setBatteryPercentage(parsedData.batteryPercentage);
        setLocation(parsedData.location);
        setTimestamp(parsedData.timestamp);
        setCaptureCount(parsedData.captureCount);
      }

      // Store data locally using AsyncStorage
      const dataToStore = {
        internetStatus,
        batteryStatus,
        batteryPercentage,
        location,
        timestamp,
        captureCount,
      };

      await saveDataLocally(dataToStore);

      // Prepare data to push to Firebase Realtime Database
      const dataToUpload = {
        internetStatus,
        batteryStatus,
        batteryPercentage,
        location,
        timestamp,
        captureCount,
      };

      // Push data to Firebase Realtime Database
      const databaseRef = database().ref('deviceInfo');
      const newDataRef = databaseRef.push();
      await newDataRef.set(dataToUpload);

      // Increment the capture count
      setCaptureCount(prevCount => prevCount + 1);
    } catch (error) {
      console.error('Error fetching or uploading data:', error);
    }
  };

  const openModal = () => {
    setIsModalVisible(true);
    setNewFrequency(captureFrequency.toString());
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const saveNewFrequency = () => {
    // Validate and save the new frequency
    const parsedFrequency = parseInt(newFrequency);
    if (!isNaN(parsedFrequency) && parsedFrequency > 0) {
      setCaptureFrequency(parsedFrequency);
      closeModal();
    } else {
      // Display an error message or handle invalid input
    }
  };

  // Handle changes in app state (foreground/background)
  useEffect(() => {
    AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App is in the foreground again, reset the capture count
        setCaptureCount(0);
      }
      setAppState(nextAppState);
    });
  }, [appState]);

  useEffect(() => {
    // Fetch data initially
    fetchData();

    const Temp = async () => {
      // Internet Connectivity
      const netInfoState = await NetInfo.fetch();
      setInternetStatus(
        netInfoState.isConnected ? 'Connected' : 'Disconnected',
      );

      // Battery Status
      const isCharging = await DeviceInfo.isBatteryCharging();
      setBatteryStatus(isCharging ? 'Charging' : 'Not Charging');
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      setBatteryPercentage(`${(batteryLevel * 100).toFixed(2)}%`);

      // Check battery level and show an alert if it's less than 20%
      if (!isCharging && batteryLevel < 0.2) {
        Alert.alert(
          'Low Battery',
          'Your battery is running low (less than 20%)!',
          [
            {
              text: 'OK',
              onPress: () => console.log('OK Pressed'),
            },
          ],
          {cancelable: false},
        );
      }
    };

    const RealTimeForChargingStatusAndInternetStatus = setInterval(Temp, 1000);

    // Cleanup the subscription when the component unmounts

    // Set up an interval to fetch data and upload every 15 minutes
    const intervalId = setInterval(fetchData, captureFrequency * 60 * 1000);

    // Clean up the interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [captureFrequency]);

  return (
    <View style={{flex: 1, alignItems: 'center'}}>
      <View style={{flex: 0.2, alignItems: 'center'}}>
        <Image
          style={styles.tinyLogo}
          source={require('../assets/SecqurAIse-removebg-preview.png')}
        />
        <Text
          style={{
            color: 'white',
            fontWeight: '500',
            fontSize: responsiveFontSize(2),
            textTransform: 'capitalize',
          }}>
          {timestamp}
        </Text>
      </View>
      <View style={{flex: 0.4}}>
        <LeftToRightText
          left={'Internet Status'}
          right={internetStatus === 'Connected' ? 'ON' : 'OFF'}
        />
        <LeftToRightText
          left={'Battery Charging'}
          right={batteryStatus === 'Charging' ? 'ON' : 'OFF'}
        />
        <LeftToRightText left={'attery Percentage'} right={batteryPercentage} />
        <LeftToRightText left={'Location'} right={location} />
        <LeftToRightText left={'Capture Count'} right={captureCount} />
        <TouchableOpacity onPress={openModal}>
          <LeftToRightText left={'Frequency (min)'} right={captureFrequency} />
        </TouchableOpacity>
      </View>
      <View style={{position: 'absolute', bottom: responsiveHeight(5)}}>
        <MyButton
          text={'Manual Data Refresh'}
          onPress={handleManualDataRefresh}
        />
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
        visible={isModalVisible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TextInput
              placeholder="Enter new frequency in minutes"
              value={newFrequency}
              onChangeText={text => setNewFrequency(text)}
              style={styles.input}
              placeholderTextColor={'white'}
              keyboardType="number-pad"
            />
            <MyButton text={'Save'} onPress={saveNewFrequency} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DataDisplay;

const styles = StyleSheet.create({
  tinyLogo: {
    width: responsiveWidth(100),
    height: responsiveHeight(5.5),
  },
  button: {
    backgroundColor: '#3498db', // Button background color
    paddingVertical: 10, // Vertical padding
    marginVertical: 10, // Vertical padding
    width: responsiveWidth(60), // Horizontal padding
    borderRadius: 5, // Border radius for rounded corners
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
    elevation: 3, // Shadow on Android
    shadowColor: '#000', // Shadow color (iOS)
    shadowOffset: {width: 0, height: 2}, // Shadow offset (iOS)
    shadowOpacity: 0.3, // Shadow opacity (iOS)
    shadowRadius: 2, // Shadow radius (iOS)
  },
  buttonText: {
    color: '#fff', // Text color
    fontSize: responsiveFontSize(2), // Font size
    fontWeight: 'bold', // Text weight
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 22,
  },
  modalView: {
    margin: 20,
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: 'black',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    color: 'white',
  },
});
