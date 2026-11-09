import { useQuery } from '@apollo/client';
import { Box, Center, Heading, Icon, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { FiBarChart2, FiHash, FiMessageCircle } from 'react-icons/fi';
import { TbMathIntegral } from 'react-icons/tb';
import { Navigate } from 'react-router-dom';

import { LIST_CHANNELS } from '../api/queries';
import { useIdentity } from '../lib/identity';

const FEATURES = [
  { icon: FiHash, title: 'Canales y mensajes', text: 'Servicios base users, channels y messages.' },
  { icon: TbMathIntegral, title: 'Integrales', text: 'Escribe /integralcalc en el chat o usa la calculadora.' },
  { icon: FiMessageCircle, title: 'Hilos', text: 'Responde a cualquier mensaje sin llenar el canal.' },
  { icon: FiBarChart2, title: 'Encuestas', text: 'Crea encuestas, vota y ve los resultados en vivo.' },
];

/** Abre el primer canal; si no hay, explica qué se puede hacer. */
export default function Home() {
  const { user } = useIdentity();
  const { data } = useQuery(LIST_CHANNELS);
  const first = [...(data?.channels || [])].sort((a, b) => a.name.localeCompare(b.name))[0];
  if (first) return <Navigate to={`/canales/${first.id}`} replace />;

  return (
    <Center h="full" p={6}>
      <Stack spacing={8} maxW="2xl" textAlign="center">
        <Stack spacing={2}>
          <Heading size="lg">Hola, {user.displayName}</Heading>
          <Text color="text.muted">Crea un canal con el botón + de la barra lateral para empezar.</Text>
        </Stack>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} textAlign="left">
          {FEATURES.map((f) => (
            <Box key={f.title} p={4} rounded="xl" borderWidth="1px" borderColor="border.subtle" bg="bg.panel">
              <Icon as={f.icon} color="brand.500" boxSize={5} />
              <Text fontWeight="semibold" mt={2}>{f.title}</Text>
              <Text fontSize="sm" color="text.muted">{f.text}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Stack>
    </Center>
  );
}
