import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, AlertIcon, Avatar, Box, Button, Flex, HStack, Icon, IconButton, Input, Menu,
  MenuButton, MenuDivider, MenuItem, MenuList, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalOverlay, Skeleton, Stack, Text, Tooltip, useClipboard, useColorMode,
  useDisclosure, useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import {
  FiCopy, FiHash, FiLogOut, FiMoon, FiMoreVertical, FiPlus, FiSun, FiUsers,
} from 'react-icons/fi';
import { TbMathIntegral } from 'react-icons/tb';
import { NavLink, useNavigate } from 'react-router-dom';

import { CREATE_CHANNEL, LIST_CHANNELS } from '../api/queries';
import { useIdentity } from '../lib/identity';
import { errorText } from '../lib/utils';
import { IdentityForm } from './IdentityGate';
import Logo from './Logo';
import ServiceStatus from './ServiceStatus';

function NavItem({ to, icon, children }) {
  return (
    <Box as={NavLink} to={to} display="flex" alignItems="center" gap={2.5} px={3} py={2}
      rounded="lg" fontSize="sm" color="text.muted" fontWeight="medium"
      _hover={{ bg: 'bg.subtle', color: 'inherit' }}
      sx={{ '&.active': { bg: 'brand.50', color: 'brand.700', _dark: { bg: 'whiteAlpha.200', color: 'white' } } }}>
      <Icon as={icon} boxSize={4} flexShrink={0} />
      <Text noOfLines={1}>{children}</Text>
    </Box>
  );
}

function NewChannel() {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const [createChannel, { loading }] = useMutation(CREATE_CHANNEL, {
    refetchQueries: [LIST_CHANNELS],
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await createChannel({ variables: { name: name.trim() } });
      setName('');
      setOpen(false);
      navigate(`/canales/${data.createChannel.id}`);
    } catch (error) {
      toast({ status: 'error', title: 'No se pudo crear el canal', description: errorText(error) });
    }
  };

  if (!open) {
    return (
      <Tooltip label="Nuevo canal">
        <IconButton aria-label="Nuevo canal" icon={<FiPlus />} size="xs" variant="ghost"
          colorScheme="gray" onClick={() => setOpen(true)} />
      </Tooltip>
    );
  }
  return (
    <Box as="form" onSubmit={submit} position="absolute" left={3} right={3} top="100%" zIndex={2}
      bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p={2} shadow="md">
      <Input size="sm" autoFocus placeholder="nombre-del-canal" value={name} maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
      <HStack mt={2} justify="flex-end">
        <Button size="xs" variant="ghost" colorScheme="gray" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button size="xs" type="submit" isLoading={loading} isDisabled={!name.trim()}>Crear</Button>
      </HStack>
    </Box>
  );
}

function UserMenu() {
  const { user, signOut } = useIdentity();
  const { onCopy, hasCopied } = useClipboard(user.id);
  const switcher = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <HStack spacing={3} px={3} py={3} borderTopWidth="1px" borderColor="border.subtle">
      <Avatar size="sm" name={user.displayName} />
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{user.displayName}</Text>
        <Text fontSize="xs" color="text.muted" fontFamily="mono" noOfLines={1}>{user.id}</Text>
      </Box>
      <Menu placement="top-end">
        <MenuButton as={IconButton} aria-label="Opciones de usuario" icon={<FiMoreVertical />}
          size="sm" variant="ghost" colorScheme="gray" />
        <MenuList fontSize="sm">
          <MenuItem icon={<FiCopy />} onClick={onCopy} closeOnSelect={false}>
            {hasCopied ? 'ID copiado' : 'Copiar mi ID'}
          </MenuItem>
          <MenuItem icon={<FiUsers />} onClick={switcher.onOpen}>Cambiar de usuario</MenuItem>
          <MenuItem icon={colorMode === 'dark' ? <FiSun /> : <FiMoon />} onClick={toggleColorMode}>
            {colorMode === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<FiLogOut />} onClick={signOut}>Salir</MenuItem>
        </MenuList>
      </Menu>
      <Modal isOpen={switcher.isOpen} onClose={switcher.onClose} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody py={8}><IdentityForm onDone={switcher.onClose} /></ModalBody>
        </ModalContent>
      </Modal>
    </HStack>
  );
}

export default function Sidebar() {
  const { data, loading, error } = useQuery(LIST_CHANNELS, { pollInterval: 10000 });
  const channels = [...(data?.channels || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Flex direction="column" w="full" h="full">
      <HStack px={4} h="64px" spacing={3}>
        <Logo />
        <Box>
          <Text fontWeight="bold" lineHeight="short">Chat INF326</Text>
          <Text fontSize="xs" color="text.muted">Arquitectura de microservicios</Text>
        </Box>
      </HStack>

      <Stack px={3} pt={2} spacing={1}>
        <NavItem to="/integrales" icon={TbMathIntegral}>Calculadora de integrales</NavItem>
      </Stack>

      <HStack px={4} pt={6} pb={2} justify="space-between" position="relative">
        <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase"
          letterSpacing="wider">
          Canales
        </Text>
        <NewChannel />
      </HStack>

      <Stack px={3} spacing={0.5} flex="1" overflowY="auto" pb={3}>
        {loading && !data && [1, 2, 3].map((i) => <Skeleton key={i} h="32px" rounded="lg" />)}
        {error && !data && (
          <Alert status="error" fontSize="xs" rounded="md"><AlertIcon />{errorText(error)}</Alert>
        )}
        {data && channels.length === 0 && (
          <Text fontSize="sm" color="text.muted" px={3} py={2}>Aún no hay canales. Crea uno con +.</Text>
        )}
        {channels.map((c) => (
          <NavItem key={c.id} to={`/canales/${c.id}`} icon={FiHash}>{c.name}</NavItem>
        ))}
      </Stack>

      <ServiceStatus />
      <UserMenu />
    </Flex>
  );
}
