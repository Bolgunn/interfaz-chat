import { Center, Icon } from '@chakra-ui/react';
import { FiMessageSquare } from 'react-icons/fi';

export default function Logo({ size = 32 }) {
  return (
    <Center w={`${size}px`} h={`${size}px`} rounded="xl" bg="brand.600" color="white" flexShrink={0}>
      <Icon as={FiMessageSquare} boxSize={`${Math.round(size * 0.5)}px`} />
    </Center>
  );
}
