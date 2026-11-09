import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, AlertIcon, Badge, Box, Button, ButtonGroup, Flex, Heading, HStack, Icon, IconButton,
  Select, Skeleton, Stack, Table, TableContainer, Tag, Tbody, Td, Text, Textarea, Th, Thead,
  Tooltip, Tr,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMessageSquare, FiZap } from 'react-icons/fi';
import { TbMathIntegral } from 'react-icons/tb';

import { CALCULATE_INTEGRAL, LIST_INTEGRALS } from '../api/queries';
import Latex from '../components/Latex';
import { errorText, formatTime } from '../lib/utils';

const EXAMPLES = [
  '\\int_0^1 x^2 \\, dx',
  '\\int \\sin(x) \\cos(x) \\, dx',
  '\\int_0^{\\infty} e^{-x^2} \\, dx',
  '\\int \\frac{1}{1+x^2} \\, dx',
  '\\int_1^e \\ln(x) \\, dx',
];

const ERRORS = {
  LATEX_INVALID: 'El LaTeX no se pudo interpretar.',
  NOT_AN_INTEGRAL: 'La expresión no es una integral.',
  UNSOLVABLE: 'SymPy no encontró una solución.',
  TIMEOUT: 'El cálculo superó el tiempo máximo (10 s).',
};

const PAGE = 8;

function resultLatex(integral) {
  const r = integral.result;
  return `${integral.latex} = ${r.latex}${r.indefinite ? ' + C' : ''}`;
}

function ResultCard({ integral }) {
  if (integral.status === 'failed') {
    return (
      <Alert status="warning" rounded="lg" alignItems="flex-start">
        <AlertIcon mt={1} />
        <Box>
          <Text fontWeight="semibold">{ERRORS[integral.error.code] || 'No se pudo calcular'}</Text>
          <Text fontSize="sm">{integral.error.message}</Text>
          <Badge mt={2} colorScheme="orange">{integral.error.code}</Badge>
        </Box>
      </Alert>
    );
  }
  return (
    <Box rounded="lg" borderWidth="1px" borderColor="green.300" bg="green.50" _dark={{ bg: 'green.900', borderColor: 'green.700' }} p={4}>
      <Latex display fontSize="lg">{resultLatex(integral)}</Latex>
      <HStack fontSize="sm" color="text.muted" spacing={4} mt={1}>
        {integral.result.numeric !== null && <Text>≈ {integral.result.numeric.toPrecision(10).replace(/\.?0+$/, '')}</Text>}
        <Text>{integral.durationMs} ms</Text>
      </HStack>
    </Box>
  );
}

function Calculator() {
  const [latex, setLatex] = useState(EXAMPLES[0]);
  const [calculate, { data, loading, error }] = useMutation(CALCULATE_INTEGRAL, {
    refetchQueries: [LIST_INTEGRALS],
  });
  const result = data?.calculateIntegral;

  const submit = (e) => {
    e.preventDefault();
    calculate({ variables: { latex: latex.trim() } }).catch(() => {});
  };

  return (
    <Box as="form" onSubmit={submit} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="xl" p={{ base: 4, md: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Text fontWeight="semibold" mb={2}>Integral en LaTeX</Text>
          <Textarea value={latex} onChange={(e) => setLatex(e.target.value)} fontFamily="mono"
            fontSize="sm" rows={2} maxLength={1000} placeholder="\int_0^1 x^2 \, dx"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
            }} />
        </Box>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontSize="xs" color="text.muted">Ejemplos:</Text>
          {EXAMPLES.map((ex) => (
            <Tag key={ex} size="sm" cursor="pointer" variant="subtle" colorScheme="purple"
              onClick={() => setLatex(ex)}>
              <Latex>{ex}</Latex>
            </Tag>
          ))}
        </HStack>
        <Box minH="64px" rounded="lg" bg="bg.subtle" px={4} py={2} display="flex" alignItems="center">
          {latex.trim() ? <Latex display>{latex}</Latex> : <Text color="text.muted" fontSize="sm">Vista previa</Text>}
        </Box>
        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          <Text fontSize="xs" color="text.muted">Ctrl+Enter para calcular</Text>
          <Button type="submit" leftIcon={<FiZap />} isLoading={loading} isDisabled={!latex.trim()}>
            Calcular
          </Button>
        </Flex>
        {error && <Alert status="error" rounded="lg"><AlertIcon />{errorText(error)}</Alert>}
        {result && <ResultCard integral={result} />}
      </Stack>
    </Box>
  );
}

function History() {
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const { data, loading, error } = useQuery(LIST_INTEGRALS, {
    variables: { limit: PAGE, offset, status: status || null },
    pollInterval: 5000,
  });
  const page = data?.integrals;

  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="xl" overflow="hidden">
      <Flex px={{ base: 4, md: 6 }} py={4} justify="space-between" align="center" gap={3} flexWrap="wrap">
        <Box>
          <Heading size="sm">Historial</Heading>
          <Text fontSize="xs" color="text.muted">Cálculos desde la calculadora y desde el chat</Text>
        </Box>
        <Select size="sm" w="auto" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">Todos</option>
          <option value="calculated">Calculados</option>
          <option value="failed">Fallidos</option>
        </Select>
      </Flex>
      {error && !page && <Alert status="error"><AlertIcon />{errorText(error)}</Alert>}
      {loading && !page && <Stack px={6} pb={6}>{[1, 2, 3].map((i) => <Skeleton key={i} h="40px" />)}</Stack>}
      {page && (
        <>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Integral y resultado</Th>
                  <Th>Estado</Th>
                  <Th>Origen</Th>
                  <Th isNumeric>Tiempo</Th>
                  <Th>Fecha</Th>
                </Tr>
              </Thead>
              <Tbody>
                {page.items.length === 0 && (
                  <Tr><Td colSpan={5} textAlign="center" color="text.muted" py={8}>Sin cálculos todavía.</Td></Tr>
                )}
                {page.items.map((it) => (
                  <Tr key={it.id}>
                    <Td maxW="420px" overflowX="auto" whiteSpace="nowrap">
                      {it.status === 'calculated'
                        ? <Latex>{resultLatex(it)}</Latex>
                        : (
                          <Tooltip label={it.error?.message}>
                            <Box><Latex>{it.latex}</Latex></Box>
                          </Tooltip>
                        )}
                    </Td>
                    <Td>
                      <Badge colorScheme={it.status === 'calculated' ? 'green' : 'orange'}>
                        {it.status === 'calculated' ? 'calculada' : it.error?.code}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1} fontSize="xs">
                        <Icon as={it.source.kind === 'chat' ? FiMessageSquare : TbMathIntegral} />
                        <Text>{it.source.kind === 'chat' ? 'Chat' : 'REST'}</Text>
                      </HStack>
                    </Td>
                    <Td isNumeric fontSize="xs">{it.durationMs} ms</Td>
                    <Td fontSize="xs" color="text.muted">{formatTime(it.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Flex px={{ base: 4, md: 6 }} py={3} justify="space-between" align="center" borderTopWidth="1px" borderColor="border.subtle">
            <Text fontSize="xs" color="text.muted">
              {page.total === 0 ? '0' : `${offset + 1}–${Math.min(offset + PAGE, page.total)}`} de {page.total}
            </Text>
            <ButtonGroup size="sm" variant="ghost" colorScheme="gray">
              <IconButton aria-label="Anterior" icon={<FiChevronLeft />} isDisabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))} />
              <IconButton aria-label="Siguiente" icon={<FiChevronRight />}
                isDisabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)} />
            </ButtonGroup>
          </Flex>
        </>
      )}
    </Box>
  );
}

export default function IntegralsPage() {
  return (
    <Box h="full" overflowY="auto">
      <Stack maxW="5xl" mx="auto" p={{ base: 3, md: 8 }} spacing={6}>
        <HStack spacing={3}>
          <Icon as={TbMathIntegral} boxSize={7} color="purple.500" />
          <Box>
            <Heading size="md">Calculadora de integrales</Heading>
            <Text fontSize="sm" color="text.muted">Servicio integrals · también disponible en el chat con /integralcalc</Text>
          </Box>
        </HStack>
        <Calculator />
        <History />
      </Stack>
    </Box>
  );
}
