import {
  Box, Button, HStack, IconButton, Text, Textarea, Tooltip,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { FiBarChart2, FiSend } from 'react-icons/fi';
import { TbMathIntegral } from 'react-icons/tb';

import { INTEGRAL_COMMAND } from '../lib/utils';
import Latex from './Latex';

/** Caja de texto con Enter para enviar. `onSend` devuelve una promesa; si falla no se borra el texto. */
export default function Composer({ placeholder, onSend, sending, onPoll, withTools = false }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const command = withTools ? text.trim().match(INTEGRAL_COMMAND) : null;

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    try {
      await onSend(content);
      setText('');
    } catch {
      /* quien llama muestra el error */
    }
    ref.current?.focus();
  };

  const insertIntegral = () => {
    setText((t) => (t.match(INTEGRAL_COMMAND) ? t : `/integralcalc ${t}`));
    ref.current?.focus();
  };

  return (
    <Box>
      {command?.[1] && (
        <HStack mb={2} px={3} py={2} rounded="lg" bg="bg.subtle" fontSize="sm" spacing={3} overflowX="auto">
          <Text color="text.muted" flexShrink={0}>Vista previa</Text>
          <Latex>{command[1]}</Latex>
        </HStack>
      )}
      <Box borderWidth="1px" borderColor="border.subtle" rounded="xl" bg="bg.panel"
        _focusWithin={{ borderColor: 'brand.400', boxShadow: '0 0 0 1px var(--chakra-colors-brand-400)' }}>
        <Textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={1}
          resize="none" border="none" _focusVisible={{ boxShadow: 'none' }} placeholder={placeholder}
          maxLength={4000} minH="44px" maxH="160px" py={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }} />
        <HStack justify="space-between" px={2} pb={2}>
          <HStack spacing={1}>
            {withTools && (
              <>
                <Tooltip label="Calcular una integral en el chat (/integralcalc)">
                  <Button size="sm" variant="ghost" colorScheme="purple" leftIcon={<TbMathIntegral />}
                    onClick={insertIntegral}>
                    Integral
                  </Button>
                </Tooltip>
                <Tooltip label="Crear una encuesta en este canal">
                  <Button size="sm" variant="ghost" colorScheme="green" leftIcon={<FiBarChart2 />}
                    onClick={onPoll}>
                    Encuesta
                  </Button>
                </Tooltip>
              </>
            )}
          </HStack>
          <IconButton aria-label="Enviar" icon={<FiSend />} size="sm" isLoading={sending}
            isDisabled={!text.trim()} onClick={send} />
        </HStack>
      </Box>
    </Box>
  );
}
