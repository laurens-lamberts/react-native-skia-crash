import {
  Group,
  Image,
  Rect,
  SkiaClockValue,
  SkiaValue,
  SkImage,
  useImage,
  useValue,
  useValueEffect,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';
import {Platform} from 'react-native';
import {BIRD_WIDTH, BIRD_HEIGHT, BIRD_X, SHOW_DEBUG} from './Config';

interface Props {
  birdY: SkiaValue<number>;
  clock: SkiaClockValue;
}

// Dynamically switching images is not working well yet.
const USE_STATIC_IMAGE = Platform.OS === 'android';

const Bird = ({birdY, clock}: Props) => {
  const image = useImage(require('./assets/yellowbird-upflap.png'));

  const images: (SkImage | null)[] = [
    useImage(require('./assets/yellowbird-upflap.png')),
    useImage(require('./assets/yellowbird-midflap.png')),
    useImage(require('./assets/yellowbird-downflap.png')),
  ];

  const currentImage = useValue(0);

  useValueEffect(clock, () => {
    if (clock.current % 10 === 0) {
      if (currentImage.current <= images.length - 2) {
        currentImage.current += 1;
      } else {
        currentImage.current = 0;
      }
    }
  });

  /* const rotateTransform = useDerivedValue(
    () => [{rotate: mix(progress.current, -Math.PI, 0)}],
    [progress],
  ); */

  const center = vec(BIRD_WIDTH / 2, BIRD_HEIGHT / 2 - 64);

  return (
    <Group origin={center} /* transform={transform} */>
      {SHOW_DEBUG && (
        <Rect
          x={BIRD_X}
          y={birdY}
          width={BIRD_WIDTH}
          height={BIRD_HEIGHT}
          color="yellow"
        />
      )}
      {USE_STATIC_IMAGE && !!image && (
        <Image
          x={BIRD_X}
          y={birdY}
          width={BIRD_WIDTH}
          height={BIRD_HEIGHT}
          image={image}
          fit="contain"
          opacity={1}
        />
      )}
      {!USE_STATIC_IMAGE && (
        <>
          {!!images[0] && (
            <Image
              x={BIRD_X}
              y={birdY}
              width={BIRD_WIDTH}
              height={BIRD_HEIGHT}
              image={images[0]}
              fit="contain"
              opacity={currentImage.current === 0 ? 1 : 0}
            />
          )}
          {!!images[1] && (
            <Image
              x={BIRD_X}
              y={birdY}
              width={BIRD_WIDTH}
              height={BIRD_HEIGHT}
              image={images[1]}
              fit="contain"
              opacity={currentImage.current === 1 ? 1 : 0}
            />
          )}
          {!!images[2] && (
            <Image
              x={BIRD_X}
              y={birdY}
              width={BIRD_WIDTH}
              height={BIRD_HEIGHT}
              image={images[2]}
              fit="contain"
              opacity={currentImage.current === 2 ? 1 : 0}
            />
          )}
        </>
      )}
    </Group>
  );
};

export default Bird;
