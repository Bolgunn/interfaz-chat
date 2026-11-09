import {
  Avatar, Badge, Box, Button, HStack, Icon, Text,
} from '@chakra-ui/react';
import { FiCornerDownRight, FiMessageCircle } from 'react-icons/fi';
import { TbMathIntegral } from 'react-icons/tb';

import { BOT_NAME, INTEGRAL_COMMAND, formatTime } from '../lib/utils';
import Latex, { IntegralReply } from './Latex';
import PollCard from './PollCard';

/** Contenido según el tipo de mensaje: anuncio de encuesta, comando o respuesta de integrales, texto. */
export function MessageBody({ message }) {
  const { content } = message;

  if (message.pollId) {
    if (message.poll) return <PollCard poll={message.poll} />;
    return (
      <Box>
        <Box whiteSpace="pre-wrap" color="text.muted">{content}</Box>
        <Badge mt={1} colorScheme="orange" textTransform="none">Servicio de encuestas no disponible: no se pueden mostrar los votos</Badge>
      </Box>
    );
  }

  if (message.author?.displayName === BOT_NAME) {
    return (
      <Box borderLeftWidth="3px" borderColor="purple.400" pl={3} py={1}>
        <IntegralReply content={content} />
      </Box>
    );
  }

  const command = content.trim().match(INTEGRAL_COMMAND);
  if (command) {
    return (
      <HStack spacing={2} align="center" flexWrap="wrap">
        <Badge colorScheme="purple" display="inline-flex" alignItems="center" gap={1} textTransform="none">
          <Icon as={TbMathIntegral} />/integralcalc
        </Badge>
        {command[1] ? <Latex>{command[1].replace(/^\$|\$$/g, '')}</Latex> : <Text color="text.muted">(sin integral)</Text>}
      </HStack>
    );
  }

  if (content.startsWith('📊 Encuesta finalizada')) {
    return (
      <Box whiteSpace="pre-wrap" fontSize="sm" bg="bg.subtle" rounded="lg" px={3} py={2} display="inline-block">
        {content}
      </Box>
    );
  }

  return <Box whiteSpace="pre-wrap" wordBreak="break-word">{content}</Box>;
}

export function Author({ message, size = 'sm' }) {
  const name = message.author?.displayName;
  return (
    <HStack spacing={2}>
      <Text fontWeight="semibold" fontSize={size}>{name || 'Usuario desconocido'}</Text>
      {name === BOT_NAME && <Badge colorScheme="purple" fontSize="2xs">bot</Badge>}
      <Text fontSize="xs" color="text.muted">{formatTime(message.createdAt)}</Text>
    </HStack>
  );
}

export default function Message({ message, compact, onOpenThread }) {
  const name = message.author?.displayName || '?';
  const threadsDown = message.replyCount === null || message.replyCount === undefined;

  return (
    <HStack align="flex-start" spacing={3} px={{ base: 3, md: 6 }} py={compact ? 0.5 : 2}
      role="group" _hover={{ bg: 'bg.subtle' }}>
      <Box w="36px" flexShrink={0}>
        {!compact && <Avatar size="sm" name={name}
          bg={name === BOT_NAME ? 'purple.500' : undefined} color={name === BOT_NAME ? 'white' : undefined} />}
      </Box>
      <Box flex="1" minW={0}>
        {!compact && <Author message={message} />}
        <MessageBody message={message} />
        {onOpenThread && (
          <HStack mt={1} spacing={2} minH="24px">
            {message.replyCount > 0 && (
              <Button size="xs" variant="ghost" leftIcon={<FiCornerDownRight />} onClick={onOpenThread}>
                {message.replyCount} respuesta{message.replyCount === 1 ? '' : 's'}
              </Button>
            )}
            {message.replyCount === 0 && (
              <Button size="xs" variant="ghost" colorScheme="gray" leftIcon={<FiMessageCircle />}
                opacity={0} _groupHover={{ opacity: 1 }} _focus={{ opacity: 1 }} onClick={onOpenThread}>
                Responder
              </Button>
            )}
            {threadsDown && (
              <Text fontSize="xs" color="text.muted" opacity={0} _groupHover={{ opacity: 1 }}>
                Hilos no disponibles en este momento
              </Text>
            )}
          </HStack>
        )}
      </Box>
    </HStack>
  );
}
