import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, AlertDescription, AlertIcon, Avatar, Box, Divider, Drawer, DrawerBody,
  DrawerCloseButton, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay, HStack, Skeleton,
  Stack, Text, useToast,
} from '@chakra-ui/react';

import { CREATE_REPLY, GET_CHANNEL_MESSAGES, GET_REPLIES } from '../api/queries';
import { useIdentity } from '../lib/identity';
import { errorText } from '../lib/utils';
import Composer from './Composer';
import { Author, MessageBody } from './Message';

/** Hilo de respuestas de un mensaje (servicio threads). */
export default function ThreadDrawer({ message, onClose }) {
  const { user } = useIdentity();
  const toast = useToast();
  const variables = message ? { channelId: message.channelId, messageId: message.id } : undefined;
  const { data, loading, error } = useQuery(GET_REPLIES, {
    variables, skip: !message, pollInterval: 3000,
  });
  const [createReply, { loading: sending }] = useMutation(CREATE_REPLY, {
    refetchQueries: [GET_REPLIES, GET_CHANNEL_MESSAGES],
  });

  const send = (content) => createReply({ variables: { ...variables, authorId: user.id, content } })
    .catch((err) => {
      toast({ status: 'error', title: 'No se pudo responder', description: errorText(err) });
      throw err;
    });

  const replies = data?.replies || [];

  return (
    <Drawer isOpen={Boolean(message)} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="border.subtle" fontSize="md">Hilo</DrawerHeader>
        <DrawerBody py={4}>
          {message && (
            <Stack spacing={4}>
              <HStack align="flex-start" spacing={3}>
                <Avatar size="sm" name={message.author?.displayName} />
                <Box flex="1" minW={0}>
                  <Author message={message} />
                  <MessageBody message={message} />
                </Box>
              </HStack>
              <HStack>
                <Text fontSize="xs" color="text.muted" flexShrink={0}>
                  {replies.length} respuesta{replies.length === 1 ? '' : 's'}
                </Text>
                <Divider />
              </HStack>
              {loading && !data && <Skeleton h="48px" rounded="md" />}
              {error && (
                <Alert status="error" rounded="md">
                  <AlertIcon /><AlertDescription fontSize="sm">{errorText(error)}</AlertDescription>
                </Alert>
              )}
              {replies.map((r) => (
                <HStack key={r.id} align="flex-start" spacing={3}>
                  <Avatar size="xs" name={r.author?.displayName} mt={1} />
                  <Box flex="1" minW={0}>
                    <Author message={r} />
                    <Box whiteSpace="pre-wrap" wordBreak="break-word" fontSize="sm">{r.content}</Box>
                  </Box>
                </HStack>
              ))}
            </Stack>
          )}
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px" borderColor="border.subtle" display="block">
          <Composer placeholder="Responder en el hilo…" onSend={send} sending={sending} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
