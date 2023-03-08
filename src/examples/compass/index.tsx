import {
  Canvas,
  Circle,
  Group,
  useComputedValue,
  useSharedValueEffect,
  useValue,
  vec,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';
import React, {useCallback, useEffect} from 'react';
import {
  Alert,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  IOSReferenceFrame,
  SensorType,
  useAnimatedSensor,
} from 'react-native-reanimated';
import {
  bearing,
  generateLocation,
  getDistanceFromLatLonInKm,
} from './helpers/geo';
import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';
import Arrow from './components/Arrow';

const MARGIN = 20;
const ARROW_HEIGHT = 160;

const Compass = () => {
  const {height, width} = useWindowDimensions();
  //const {sensor} = useAnimatedSensor(SensorType.ROTATION, {interval: 'auto'});
  const {sensor: magnet} = useAnimatedSensor(SensorType.MAGNETIC_FIELD, {
    interval: 'auto',
    iosReferenceFrame: IOSReferenceFrame.XTrueNorthZVertical,
  });

  const middleX = width / 2;
  const compassRadius = middleX - MARGIN;
  const middleY = height / 2 - compassRadius / 2;
  const origin = vec(middleX, middleY);

  const enableCompass = useValue(false);

  const compassRotationValue = useValue(Math.PI);
  const compassRotationTransform = useComputedValue(
    () => [{rotate: compassRotationValue.current}],
    [compassRotationValue],
  );
  const destinationRotationValue = useValue(0);
  const destinationRotationTransform = useComputedValue(
    () => [{rotate: destinationRotationValue.current}],
    [destinationRotationValue],
  );

  const calibrationX = useValue(0);
  const calibrationY = useValue(0);
  const calibrationZ = useValue(0);

  const currentLat = useValue(0);
  const currentLong = useValue(0);
  const currentlocationUpdateDateTime = useValue('');

  const destinationLat = useValue(0);
  const destinationLong = useValue(0);
  const destinationBearing = useValue(0);
  const destinationDistance = useValue(0);

  const debugText = useValue('no destination yet');
  const accuracyText = useValue('');

  const calibrate = () => {
    let {x, y, z} = magnet.value;
    calibrationX.current = x;
    calibrationY.current = y;
    calibrationZ.current = z;
  };
  const generateRandomDestination = useCallback(async () => {
    if (!currentLat.current || !currentLong.current) {
      Alert.alert('', 'no current location');
      return;
    }
    const maxDistanceInMeters = 80;
    const minDistanceInMeters = 5;
    const randomLatLong = generateLocation(
      currentLat.current,
      currentLong.current,
      maxDistanceInMeters,
      minDistanceInMeters,
    );
    destinationLat.current = randomLatLong.latitude;
    destinationLong.current = randomLatLong.longitude;
    console.log(
      'random destination',
      randomLatLong.latitude,
      randomLatLong.longitude,
    );
  }, [currentLat, currentLong, destinationLat, destinationLong]);

  useSharedValueEffect(() => {
    if (!enableCompass.current) return;
    //const {yaw} = sensor.value;

    let {x, y, z} = magnet.value;
    if (!calibrationX.current) {
      calibrate(); // auto calibrate
    }

    const correctionX = calibrationX.current || x;
    const correctionY = calibrationY.current || y;
    const correctionZ = calibrationZ.current || z;
    x -= correctionX;
    y -= correctionY;
    z -= correctionZ;
    const heading = Math.atan2(y, x) * (180 / Math.PI); // calculateAngle(x, y);
    //console.log(yaw);

    //let heading = Math.atan2(y, x) * (180 / Math.PI);
    //console.log(heading);

    // rotation scale: -PI to PI
    compassRotationValue.current = (heading * Math.PI) / -180;
  }, magnet);

  const calculateBearingToDestination = useCallback(() => {
    if (!enableCompass.current) return;
    // calculate the bearing from the current location to the destination
    const newBearing = bearing(
      currentLat.current,
      currentLong.current,
      destinationLat.current,
      destinationLong.current,
    );

    const distance = getDistanceFromLatLonInKm(
      currentLat.current,
      currentLong.current,
      destinationLat.current,
      destinationLong.current,
    );

    if (newBearing !== destinationBearing.current) {
      const text =
        'head ' +
        Math.round(newBearing) +
        ' degrees to destination. distance: ' +
        Math.round(distance * 1000) +
        ' m';
      debugText.current = text;
    }
    destinationBearing.current = newBearing;
    destinationDistance.current = distance;

    destinationRotationValue.current = (newBearing * Math.PI) / 180;
  }, [
    currentLat,
    currentLong,
    debugText,
    destinationBearing,
    destinationDistance,
    destinationLat,
    destinationLong,
    destinationRotationValue,
    enableCompass,
  ]);

  const processCurrentLocation = useCallback(
    (pos: GeolocationResponse) => {
      // get current location
      const {latitude, longitude, accuracy} = pos.coords;
      currentLat.current = latitude;
      currentLong.current = longitude;

      accuracyText.current =
        'current location accuracy: ' + Math.round(accuracy) + ' m';

      if (destinationLat.current === 0) {
        // generate a random destination
        generateRandomDestination();
      }

      calculateBearingToDestination();

      //alert('pos: ' + JSON.stringify(pos));
    },
    [
      accuracyText,
      calculateBearingToDestination,
      currentLat,
      currentLong,
      destinationLat,
      generateRandomDestination,
    ],
  );

  const forceGetCurrentLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      pos => {
        currentlocationUpdateDateTime.current =
          'location updated at ' + new Date().toLocaleTimeString();
        processCurrentLocation(pos);
      },
      error => {
        alert('woops');
      },
      {
        maximumAge: 0,
        // enableHighAccuracy: true, // does not work
      },
    );
  }, [currentlocationUpdateDateTime, processCurrentLocation]);

  const watchPosition = useCallback(() => {
    Geolocation.watchPosition(
      pos => {
        currentlocationUpdateDateTime.current =
          'location updated at ' + new Date().toLocaleTimeString();
        processCurrentLocation(pos);
      },
      () => {
        alert('error');
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        maximumAge: 0,
      },
    );
  }, [currentlocationUpdateDateTime, processCurrentLocation]);

  const init = useCallback(() => {
    Geolocation.requestAuthorization(
      success => {},
      error => {
        alert(error);
      },
    );

    // 1. determine a random radius between 5 and 100 meters
    // 2. determine a random angle between 0 and 360 degrees
    // 3. convert the radius + angle to a cartesian coordinate
    // 4. determine the bearing from the current location to the random coordinate
    watchPosition();

    // 5. draw a circle within the circle to where the random coordinate is, maximum to the edge of the circle
    // 6. this should allow us to see us heading towards the random coordinate
  }, [watchPosition]);

  useEffect(() => {
    init();
  }, [init, watchPosition]);

  const font = useFont(
    require('../../assets/fonts/SFPRODISPLAYREGULAR.otf'),
    14,
  );

  if (!font) return null;

  return (
    <View style={{flex: 1, backgroundColor: 'black'}}>
      <Canvas style={{flex: 1}}>
        <Circle
          cx={middleX}
          cy={middleY}
          r={compassRadius}
          color="white"
          style="stroke"
          strokeWidth={4}
        />
        <Group transform={compassRotationTransform} origin={origin}>
          {/* This group points north */}
          <SkiaText
            x={middleX - 16}
            y={middleY + compassRadius + 10}
            font={font}
            color="red"
            text={'N'}
            transform={[{rotate: Math.PI}]}
            origin={vec(middleX, middleY + compassRadius - 10)}
          />
          {/* <Rect
            x={middleX - NEEDLE_WIDTH / 2}
            y={middleY}
            width={NEEDLE_WIDTH}
            height={NEEDLE_HEIGHT}
            color="white"
          /> */}
          <Group
            transform={destinationRotationTransform}
            origin={vec(middleX, middleY)}>
            {/* This group points towards the destination. Relative to north. */}

            <Arrow
              translateX={middleX - ARROW_HEIGHT * 0.2}
              translateY={middleY}
              height={ARROW_HEIGHT}
            />
            <Circle
              cx={middleX}
              cy={middleY + compassRadius}
              r={12}
              color="lime"
            />
            <SkiaText
              x={middleX - 16}
              y={middleY + compassRadius + 10}
              font={font}
              color="lime"
              text={'DEST'}
              transform={[{rotate: Math.PI}]}
              origin={vec(middleX, middleY + compassRadius - 10)}
            />
          </Group>
        </Group>
        {/* <Circle cx={middleX} cy={middleY} r={12} color="red" /> */}
        <SkiaText x={40} y={40} font={font} color="white" text={debugText} />
        <SkiaText x={40} y={60} font={font} color="white" text={accuracyText} />
        <SkiaText
          x={40}
          y={80}
          font={font}
          color="white"
          text={currentlocationUpdateDateTime}
        />
      </Canvas>
      <View
        style={{
          alignSelf: 'center',
          bottom: MARGIN * 4,
        }}>
        <View
          style={{
            flexDirection: 'row',
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: 'tomato',
              padding: 8,
              borderRadius: 4,
              marginRight: 8,
            }}
            onPress={calibrate}>
            <Text style={{textAlign: 'center'}}>Calibrate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: 'tomato',
              padding: 8,
              borderRadius: 4,
            }}
            onPress={() => {
              generateRandomDestination();
              calculateBearingToDestination();
            }}>
            <Text style={{textAlign: 'center'}}>New dest</Text>
          </TouchableOpacity>
        </View>
        <View
          style={{
            flexDirection: 'row',
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: 'tomato',
              padding: 8,
              borderRadius: 4,
              marginTop: 8,
              marginRight: 8,
            }}
            onPress={() => {
              if (!enableCompass.current) {
                calibrate();
                init();
                forceGetCurrentLocation();
              }

              enableCompass.current = !enableCompass.current;
            }}>
            <Text style={{textAlign: 'center'}}>start/stop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: 'tomato',
              padding: 8,
              borderRadius: 4,
              marginTop: 8,
            }}
            onPress={forceGetCurrentLocation}>
            <Text style={{textAlign: 'center'}}>force get pos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Compass;