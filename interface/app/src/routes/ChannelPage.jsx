import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, AlertDescription, AlertIcon, AlertTitle, Box, Center, Flex, Heading, HStack, Icon,
  SimpleGrid, Spinner, Stack, Tab, TabList, Tabs, Text, useDisclosure, useToast,
} from '@chakra-ui/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiBarChart2, FiHash } from 'react-icons/fi';
import { useParams } from 'react-router-dom';

import { GET_CHANNEL_MESSAGES, LIST_POLLS, SEND_MESSAGE } from '../api/queries';
import Composer from '../components/Composer';
import CreatePollModal from '../components/CreatePollModal';
import Message from '../components/Message';
import PollCard from '../components/PollCard';
import ThreadDrawer from '../components/ThreadDrawer';
import { useIdentity } from '../lib/identity';
import { errorText, parseDate } from '../lib/utils';

const GROUP_MS = 5 * 60 * 1000;

function sameGroup(prev, msg) {
  if (!prev || prev.authorId !== msg.authorId || prev.pollId || msg.pollId) return false;
  return parseDate(msg.createdAt) - parseDate(prev.createdAt) < GROUP_MS;
}

function MessageList({ messages, onOpenThread }) {
  const ref = useRef(null);
  const stick = useRef(true);
  const last = messages[messages.length - 1]?.id;

  // Baja al último mensaje si el usuario ya estaba abajo.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [last, messages.length]);

  if (messages.length === 0) {
    return (
      <Center flex="1" color="text.muted" flexDirection="column" gap={2} px={6} textAlign="center">
        <Text fontWeight="medium">Todavía no hay mensajes</Text>
        <Text fontSize="sm">Escribe algo, prueba <code>/integralcalc \int_0^1 x^2 \, dx</code> o crea una encuesta.</Text>
      </Center>
    );
  }

  return (
    <Box ref={ref} flex="1" overflowY="auto" py={4}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}>
      {messages.map((m, i) => (
        <Message key={m.id} message={m} compact={sameGroup(messages[i - 1], m)}
          onOpenThread={() => onOpenThread(m.id)} />
      ))}
    </Box>
  );
}

function PollsTab({ channelId }) {
  const { data, loading, error } = useQuery(LIST_POLLS, { variables: { channelId }, pollInterval: 4000 });
  if (loading && !data) return <Center flex="1"><Spinner /></Center>;
  if (error && !data?.polls) {
    return (
      <Box p={6}>
        <Alert status="error" rounded="lg"><AlertIcon />{errorText(error)}</Alert>
      </Box>
    );
  }
  const polls = data?.polls || [];
  return (
    <Box flex="1" overflowY="auto" p={{ base: 3, md: 6 }}>
      {polls.length === 0 ? (
        <Center color="text.muted" py={16} flexDirection="column" gap={2}>
          <Icon as={FiBarChart2} boxSize={6} />
          <Text>No hay encuestas en este canal.</Text>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          {polls.map((p) => <PollCard key={p.id} poll={p} />)}
        </SimpleGrid>
      )}
    </Box>
  );
}

export default function ChannelPage() {
  const { channelId } = useParams();
  const { user } = useIdentity();
  const toast = useToast();
  const pollModal = useDisclosure();
  const [tab, setTab] = useState(0);
  const [threadId, setThreadId] = useState(null);

  const { data, loading, error, refetch } = useQuery(GET_CHANNEL_MESSAGES, {
    variables: { channelId }, pollInterval: 2500,
  });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  useEffect(() => { setTab(0); setThreadId(null); }, [channelId]);

  const send = (content) => sendMessage({ variables: { channelId, authorId: user.id, content } })
    .then(() => refetch())
    .catch((err) => {
      toast({ status: 'error', title: 'No se pudo enviar', description: errorText(err) });
      throw err;
    });

  if (loading && !data) return <Center h="full"><Spinner /></Center>;

  const channel = data?.channel;
  const messages = data?.messages;

  if (!messages) {
    return (
      <Center h="full" p={6}>
        <Alert status="error" rounded="lg" maxW="lg" flexDirection="column" textAlign="center" py={6}>
          <AlertIcon boxSize={6} mr={0} mb={2} />
          <AlertTitle>No se pudieron cargar los mensajes</AlertTitle>
          <AlertDescription fontSize="sm">{errorText(error)}</AlertDescription>
        </Alert>
      </Center>
    );
  }

  const thread = messages.find((m) => m.id === threadId) || null;

  return (
    <Flex direction="column" h="full">
      <HStack px={{ base: 3, md: 6 }} h="64px" flexShrink={0} borderBottomWidth="1px"
        borderColor="border.subtle" bg="bg.panel" justify="space-between" spacing={4}>
        <HStack spacing={2} minW={0}>
          <Icon as={FiHash} color="text.muted" />
          <Heading size="sm" noOfLines={1}>{channel?.name || 'Canal'}</Heading>
        </HStack>
        <Tabs index={tab} onChange={setTab} size="sm" variant="soft-rounded" colorScheme="brand">
          <TabList>
            <Tab>Mensajes</Tab>
            <Tab>Encuestas</Tab>
          </TabList>
        </Tabs>
      </HStack>

      {tab === 0 ? (
        <>
          <MessageList messages={messages} onOpenThread={setThreadId} />
          <Stack px={{ base: 3, md: 6 }} pb={4} pt={2} spacing={1}>
            <Composer withTools placeholder={`Mensaje en #${channel?.name || 'canal'}`}
              onSend={send} sending={sending} onPoll={pollModal.onOpen} />
            <Text fontSize="xs" color="text.muted" px={1}>
              Enter para enviar · Shift+Enter para salto de línea
            </Text>
          </Stack>
        </>
      ) : (
        <PollsTab channelId={channelId} />
      )}

      <CreatePollModal channelId={channelId} isOpen={pollModal.isOpen} onClose={pollModal.onClose}
        onCreated={() => refetch()} />
      <ThreadDrawer message={thread} onClose={() => setThreadId(null)} />
    </Flex>
  );
}
