import { useMutation } from '@apollo/client';
import {
  Badge, Box, Button, HStack, Icon, Stack, Text, useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiBarChart2, FiCheckCircle, FiLock } from 'react-icons/fi';

import { CLOSE_POLL, VOTE_POLL } from '../api/queries';
import { getVote, rememberVote, useIdentity } from '../lib/identity';
import { errorText, parseDate } from '../lib/utils';

const STATUS = {
  open: { label: 'Abierta', color: 'green' },
  closed: { label: 'Cerrada', color: 'gray' },
  pending_announcement: { label: 'Publicando…', color: 'yellow' },
  creation_failed: { label: 'No publicada', color: 'red' },
};

function useCountdown(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = (parseDate(until)?.getTime() ?? now) - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export default function PollCard({ poll }) {
  const { user } = useIdentity();
  const toast = useToast();
  const [myVote, setMyVote] = useState(() => getVote(user.id, poll.id));
  const [voting, setVoting] = useState(null);
  const [vote] = useMutation(VOTE_POLL);
  const [close, closing] = useMutation(CLOSE_POLL);
  const remaining = useCountdown(poll.closesAt);

  useEffect(() => { setMyVote(getVote(user.id, poll.id)); }, [user.id, poll.id]);

  const isOpen = poll.status === 'open' && remaining !== null;
  const canVote = isOpen && !myVote;
  const status = poll.status === 'open' && !remaining ? STATUS.closed : STATUS[poll.status] || STATUS.open;
  const max = Math.max(1, ...poll.options.map((o) => o.voteCount));

  const castVote = async (optionId) => {
    setVoting(optionId);
    try {
      await vote({ variables: { pollId: poll.id, voterId: user.id, optionId } });
      rememberVote(user.id, poll.id, optionId);
      setMyVote(optionId);
    } catch (error) {
      const already = error.graphQLErrors?.[0]?.extensions?.status === 409 && poll.status === 'open';
      if (already) {
        rememberVote(user.id, poll.id, 'unknown');
        setMyVote('unknown');
      }
      toast({ status: 'warning', title: already ? 'Ya votaste en esta encuesta' : 'No se pudo votar',
        description: errorText(error) });
    } finally {
      setVoting(null);
    }
  };

  const closePoll = () => close({ variables: { pollId: poll.id, authorId: user.id } })
    .catch((error) => toast({ status: 'error', title: 'No se pudo cerrar', description: errorText(error) }));

  return (
    <Box borderWidth="1px" borderColor="border.subtle" rounded="xl" p={4} bg="bg.panel" maxW="460px" w="full">
      <HStack justify="space-between" align="flex-start" mb={3} spacing={3}>
        <HStack align="flex-start" spacing={2}>
          <Icon as={FiBarChart2} mt={1} color="brand.500" />
          <Text fontWeight="semibold">{poll.question}</Text>
        </HStack>
        <Badge colorScheme={status.color} flexShrink={0} rounded="md">{status.label}</Badge>
      </HStack>

      <Stack spacing={2}>
        {poll.options.map((o) => {
          const pct = poll.totalVotes ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0;
          const mine = myVote === o.id;
          return (
            <Box key={o.id} as={canVote ? 'button' : 'div'} type={canVote ? 'button' : undefined}
              position="relative" overflow="hidden" textAlign="left" rounded="lg" borderWidth="1px"
              borderColor={mine ? 'brand.400' : 'border.subtle'} px={3} py={2}
              cursor={canVote ? 'pointer' : 'default'} opacity={voting && voting !== o.id ? 0.6 : 1}
              _hover={canVote ? { borderColor: 'brand.400' } : undefined}
              onClick={canVote && !voting ? () => castVote(o.id) : undefined}>
              <Box position="absolute" inset={0} w={`${(o.voteCount / max) * 100}%`}
                bg={mine ? 'brand.100' : 'bg.subtle'} _dark={{ bg: mine ? 'brand.800' : 'whiteAlpha.100' }}
                transition="width .4s ease" />
              <HStack position="relative" justify="space-between" fontSize="sm">
                <HStack spacing={2}>
                  {mine && <Icon as={FiCheckCircle} color="brand.500" />}
                  <Text>{o.text}</Text>
                </HStack>
                <Text color="text.muted" fontVariantNumeric="tabular-nums">
                  {o.voteCount} · {pct}%
                </Text>
              </HStack>
            </Box>
          );
        })}
      </Stack>

      <HStack justify="space-between" mt={3} fontSize="xs" color="text.muted" flexWrap="wrap" gap={2}>
        <Text>
          {poll.totalVotes} voto{poll.totalVotes === 1 ? '' : 's'}
          {isOpen && ` · cierra en ${remaining}`}
          {canVote && ' · toca una alternativa para votar'}
          {myVote && isOpen && ' · ya votaste'}
        </Text>
        {isOpen && poll.authorId === user.id && (
          <Button size="xs" variant="outline" colorScheme="gray" leftIcon={<FiLock />}
            isLoading={closing.loading} onClick={closePoll}>
            Cerrar encuesta
          </Button>
        )}
      </HStack>
    </Box>
  );
}
