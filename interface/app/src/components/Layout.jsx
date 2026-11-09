import {
  Box, Drawer, DrawerBody, DrawerContent, DrawerOverlay, Flex, HStack, IconButton, Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import { Outlet, useLocation } from 'react-router-dom';

import Logo from './Logo';
import Sidebar from './Sidebar';

export default function Layout() {
  const drawer = useDisclosure();
  const location = useLocation();

  // En móvil, cerrar el menú al navegar.
  useEffect(() => { drawer.onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Flex h="100%" overflow="hidden">
      <Box display={{ base: 'none', md: 'flex' }} w="280px" flexShrink={0}
        borderRightWidth="1px" borderColor="border.subtle" bg="bg.sidebar">
        <Sidebar />
      </Box>

      <Drawer isOpen={drawer.isOpen} onClose={drawer.onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent maxW="290px" bg="bg.sidebar">
          <DrawerBody p={0} display="flex"><Sidebar /></DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex="1" minW={0}>
        <HStack display={{ base: 'flex', md: 'none' }} px={3} h="56px" spacing={3}
          borderBottomWidth="1px" borderColor="border.subtle" bg="bg.sidebar">
          <IconButton aria-label="Abrir menú" icon={<FiMenu />} variant="ghost"
            colorScheme="gray" onClick={drawer.onOpen} />
          <Logo size={28} />
          <Text fontWeight="bold">Chat INF326</Text>
        </HStack>
        <Box flex="1" minH={0}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
