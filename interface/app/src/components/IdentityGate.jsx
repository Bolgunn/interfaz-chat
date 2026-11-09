import { useLazyQuery, useMutation } from '@apollo/client';
import {
  Alert, AlertIcon, Avatar, Box, Button, Center, Divider, FormControl, FormHelperText,
  FormLabel, Heading, HStack, IconButton, Input, Stack, Tab, TabList, TabPanel, TabPanels,
  Tabs, Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiX } from 'react-icons/fi';

import { CREATE_USER, GET_USER } from '../api/queries';
import { useIdentity } from '../lib/identity';
import { errorText } from '../lib/utils';
import Logo from './Logo';

/** Pide elegir o crear un usuario antes de entrar al chat. */
export default function IdentityGate({ children }) {
  const { user } = useIdentity();
  if (user) return children;
  return (
    <Center minH="100%" p={4} bg="bg.app">
      <Box w="full" maxW="420px" bg="bg.panel" borderWidth="1px" borderColor="border.subtle"
        rounded="2xl" p={{ base: 6, md: 8 }} shadow="sm">
        <IdentityForm />
      </Box>
    </Center>
  );
}

export function IdentityForm({ onDone }) {
  const { signIn, known, forget } = useIdentity();
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [createUser, created] = useMutation(CREATE_USER);
  const [findUser, found] = useLazyQuery(GET_USER, { fetchPolicy: 'network-only' });
  const [notFound, setNotFound] = useState(false);

  const enter = (u) => {
    signIn({ id: u.id, displayName: u.displayName });
    onDone?.();
  };

  const submitNew = async (e) => {
    e.preventDefault();
    const { data } = await createUser({ variables: { displayName: name.trim() } }).catch(() => ({}));
    if (data?.createUser) enter(data.createUser);
  };

  const submitExisting = async (e) => {
    e.preventDefault();
    setNotFound(false);
    const { data } = await findUser({ variables: { id: userId.trim() } });
    if (data?.user) enter(data.user);
    else if (data) setNotFound(true);
  };

  return (
    <Stack spacing={6}>
      <Stack spacing={3} align="center" textAlign="center">
        <Logo size={44} />
        <Heading size="md">Entrar al chat</Heading>
        <Text color="text.muted" fontSize="sm">
          El chat no tiene contraseñas: elige con qué usuario quieres escribir.
        </Text>
      </Stack>

      {known.length > 0 && (
        <Stack spacing={2}>
          <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase">
            Usados en este navegador
          </Text>
          {known.map((u) => (
            <HStack key={u.id} borderWidth="1px" borderColor="border.subtle" rounded="lg" pl={3} pr={1} py={1}>
              <Avatar size="xs" name={u.displayName} />
              <Button variant="ghost" colorScheme="gray" flex="1" justifyContent="flex-start"
                size="sm" onClick={() => enter(u)}>
                {u.displayName}
              </Button>
              <IconButton aria-label={`Olvidar ${u.displayName}`} icon={<FiX />} size="sm"
                variant="ghost" colorScheme="gray" onClick={() => forget(u.id)} />
            </HStack>
          ))}
          <Divider pt={2} />
        </Stack>
      )}

      <Tabs variant="soft-rounded" size="sm" isFitted>
        <TabList>
          <Tab>Usuario nuevo</Tab>
          <Tab>Tengo un ID</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={5}>
            <form onSubmit={submitNew}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nombre visible</FormLabel>
                  <Input value={name} maxLength={80} autoFocus placeholder="ana"
                    onChange={(e) => setName(e.target.value)} />
                </FormControl>
                {created.error && (
                  <Alert status="error" rounded="md"><AlertIcon />{errorText(created.error)}</Alert>
                )}
                <Button type="submit" isLoading={created.loading} isDisabled={!name.trim()}>
                  Crear y entrar
                </Button>
              </Stack>
            </form>
          </TabPanel>
          <TabPanel px={0} pt={5}>
            <form onSubmit={submitExisting}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>ID de usuario</FormLabel>
                  <Input value={userId} fontFamily="mono" fontSize="sm"
                    placeholder="3f0c…" onChange={(e) => setUserId(e.target.value)} />
                  <FormHelperText>El ID que entrega el servicio users.</FormHelperText>
                </FormControl>
                {notFound && <Alert status="warning" rounded="md"><AlertIcon />No existe ese usuario.</Alert>}
                {found.error && <Alert status="error" rounded="md"><AlertIcon />{errorText(found.error)}</Alert>}
                <Button type="submit" isLoading={found.loading} isDisabled={!userId.trim()}>
                  Entrar
                </Button>
              </Stack>
            </form>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
