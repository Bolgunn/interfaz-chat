import { useMutation } from '@apollo/client';
import {
  Alert, AlertIcon, Button, FormControl, FormHelperText, FormLabel, HStack, IconButton, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField,
  NumberInputStepper, Stack, useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

import { CREATE_POLL } from '../api/queries';
import { useIdentity } from '../lib/identity';
import { errorText } from '../lib/utils';

const EMPTY = { question: '', options: ['', ''], duration: 5 };

export default function CreatePollModal({ channelId, isOpen, onClose, onCreated }) {
  const { user } = useIdentity();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [createPoll, { loading, error, reset }] = useMutation(CREATE_POLL);

  const options = form.options.map((o) => o.trim()).filter(Boolean);
  const duplicated = new Set(options.map((o) => o.toLowerCase())).size !== options.length;
  const valid = form.question.trim() && options.length >= 2 && !duplicated;

  const setOption = (i, value) => setForm((f) => ({
    ...f, options: f.options.map((o, j) => (i === j ? value : o)),
  }));

  const close = () => {
    setForm(EMPTY);
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await createPoll({
        variables: {
          input: {
            channelId, authorId: user.id, question: form.question.trim(), options,
            durationMinutes: Number(form.duration) || 5,
          },
        },
      });
      if (data.createPoll.status === 'pending_announcement') {
        toast({ status: 'info', title: 'Encuesta creada', description: 'Se publicará en el canal en cuanto messages responda.' });
      }
      onCreated?.();
      close();
    } catch {
      /* el error se muestra en el formulario */
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="md">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit}>
        <ModalHeader>Nueva encuesta</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Pregunta</FormLabel>
              <Input autoFocus value={form.question} placeholder="¿Dónde almorzamos?"
                onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </FormControl>
            <FormControl isInvalid={duplicated}>
              <FormLabel>Alternativas</FormLabel>
              <Stack spacing={2}>
                {form.options.map((o, i) => (
                  <HStack key={i}>
                    <Input value={o} placeholder={`Alternativa ${i + 1}`}
                      onChange={(e) => setOption(i, e.target.value)} />
                    <IconButton aria-label="Quitar alternativa" icon={<FiTrash2 />} variant="ghost"
                      colorScheme="gray" isDisabled={form.options.length <= 2}
                      onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} />
                  </HStack>
                ))}
              </Stack>
              <Button mt={2} size="sm" variant="ghost" leftIcon={<FiPlus />}
                isDisabled={form.options.length >= 10}
                onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}>
                Agregar alternativa
              </Button>
              <FormHelperText>{duplicated ? 'Hay alternativas repetidas.' : 'Entre 2 y 10 alternativas distintas.'}</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>Duración (minutos)</FormLabel>
              <NumberInput min={1} max={1440} value={form.duration}
                onChange={(v) => setForm({ ...form, duration: v })}>
                <NumberInputField />
                <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
              </NumberInput>
            </FormControl>
            {error && <Alert status="error" rounded="md"><AlertIcon />{errorText(error)}</Alert>}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" onClick={close}>Cancelar</Button>
          <Button type="submit" isLoading={loading} isDisabled={!valid}>Publicar encuesta</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
