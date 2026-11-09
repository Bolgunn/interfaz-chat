import { useQuery } from '@apollo/client';
import { Box, HStack, SimpleGrid, Text, Tooltip } from '@chakra-ui/react';

import { SERVICES } from '../api/queries';
import { SERVICE_LABELS } from '../lib/utils';

function Dot({ up }) {
  return <Box w="7px" h="7px" rounded="full" flexShrink={0} bg={up ? 'green.400' : 'red.400'} />;
}

/** Estado de cada microservicio, consultado al gateway cada 5 s. */
export default function ServiceStatus() {
  const { data, error } = useQuery(SERVICES, { pollInterval: 5000 });
  const gatewayDown = Boolean(error?.networkError);

  return (
    <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase"
          letterSpacing="wider">
          Servicios
        </Text>
        <Tooltip label="API Gateway GraphQL">
          <HStack spacing={1.5}>
            <Dot up={!gatewayDown && Boolean(data)} />
            <Text fontSize="xs" color="text.muted">gateway</Text>
          </HStack>
        </Tooltip>
      </HStack>
      <SimpleGrid columns={3} spacingX={2} spacingY={1.5}>
        {(data?.services || []).map((s) => (
          <Tooltip key={s.name} label={s.up ? `${s.name} · ${s.latencyMs} ms` : `${s.name} no responde`}>
            <HStack spacing={1.5} minW={0}>
              <Dot up={s.up && !gatewayDown} />
              <Text fontSize="xs" noOfLines={1}>{SERVICE_LABELS[s.name] || s.name}</Text>
            </HStack>
          </Tooltip>
        ))}
      </SimpleGrid>
    </Box>
  );
}
